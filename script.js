// Firebase SDKs (dimuat dari CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  onSnapshot,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Mendeklarasikan variabel global untuk Firebase (disediakan oleh persekitaran Canvas)
// Nilai fallback untuk pengujian lokal di luar Canvas.
// PENTING: Ganti nilai placeholder ini dengan konfigurasi Firebase projek Anda sendiri
// jika Anda ingin menjalankan ini secara lokal dengan Firestore.
const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
const firebaseConfig = {
  apiKey: "AIzaSyBuQ35XFnW9SW-BEZlT-qkNtaU3stoDFsc",
  authDomain: "songfess-6cae9.firebaseapp.com",
  projectId: "songfess-6cae9",
  storageBucket: "songfess-6cae9.appspot.com",
  messagingSenderId: "939416112749",
  appId: "1:939416112749:web:d7fcb29b17420001b0b964",
};
const initialAuthToken =
  typeof __initial_auth_token !== "undefined" ? __initial_auth_token : null;

// SPOTIFY API CONFIGURATION (GANTI DENGAN KUNCI ANDA)
// PENTING: JANGAN PERNAH MENGEKSPOS CLIENT_SECRET DI APLIKASI PRODUKSI SISI KLIEN!
// Untuk tujuan demonstrasi/pembelajaran, Anda perlu mendapatkan ini dari Spotify Developer Dashboard.
// Buat aplikasi di https://developer.spotify.com/dashboard/applications
const SPOTIFY_CLIENT_ID = "256ed70938184db7a0aacb88daa8b9a3"; // Ganti ini dengan Client ID Spotify Anda
const SPOTIFY_CLIENT_SECRET = "94aec0f4b9c34695a27145665e877b0d"; // Ganti ini dengan Client Secret Spotify Anda

let spotifyAccessToken = "";
let selectedSpotifyTrackId = null; // Untuk menyimpan ID lagu Spotify yang dipilih
let selectedSpotifyTrackName = ""; // Untuk menyimpan nama lagu Spotify yang dipilih

// Instance Firebase (diinisialisasi sekali)
let app;
let db;
let auth;
let isFirebaseReady = false;
let currentUserId = null;

// Data untuk item galeri
const galleryItems = [
  { src: "images/1.jpg", caption: "Foto Pertama" },
  { src: "images/bgus gk.jpg", caption: "Foto Kedua" },
  { src: "images/webcam1.jpg", caption: "Foto ketiga" },
  { src: "images/webcam2.jpg", caption: "Foto keempat" },
  // ...
];

// Mendapatkan referensi ke elemen UI
const navHomeBtn = document.getElementById("nav-home");
const navMessageBtn = document.getElementById("nav-message");
const navGalleryBtn = document.getElementById("nav-gallery");
const navbar = document.getElementById("navbar");
const mainContentWrapper = document.getElementById("main-content-wrapper");

const homeSection = document.getElementById("home-section");
const messageSection = document.getElementById("message-section");
const gallerySection = document.getElementById("gallery-section");

const newMessageInput = document.getElementById("new-message-input");
const spotifySearchInput = document.getElementById("spotify-search-input"); // Referensi input carian baru
const spotifySearchResultsDiv = document.getElementById(
  "spotify-search-results"
); // Referensi div hasil carian
const senderNameInput = document.getElementById("sender-name-input");
const sendMessageBtn = document.getElementById("send-message-btn");
const messageErrorDisplay = document.getElementById("message-error");
const messagesContainer = document.getElementById("messages-container");

const galleryGrid = document.getElementById("gallery-grid");
const imageModal = document.getElementById("image-modal");
const closeModalBtn = document.getElementById("close-modal-btn");
const modalImage = document.getElementById("modal-image");
const modalCaption = document.getElementById("modal-caption");
const displayUserIdSpan = document.getElementById("display-user-id");

let currentPage = "home"; // State halaman awal

// --- Logika Navigasi ---
function navigateTo(page) {
  // Sembunyikan semua bagian
  homeSection.classList.add("hidden");
  messageSection.classList.add("hidden");
  gallerySection.classList.add("hidden");

  // Hapus kelas aktif dari semua tombol navigasi
  navHomeBtn.classList.remove("bg-purple-500", "text-white", "shadow-md");
  navMessageBtn.classList.remove("bg-purple-500", "text-white", "shadow-md");
  navGalleryBtn.classList.remove("bg-purple-500", "text-white", "shadow-md");
  navHomeBtn.classList.add("text-gray-700", "hover:bg-gray-100");
  navMessageBtn.classList.add("text-gray-700", "hover:bg-gray-100");
  navGalleryBtn.classList.add("text-gray-700", "hover:bg-gray-100");

  // Animasi keluar konten utama
  mainContentWrapper.classList.remove("scale-100", "opacity-100");
  mainContentWrapper.classList.add("scale-95", "opacity-0");

  setTimeout(() => {
    // Tampilkan bagian yang dipilih
    switch (page) {
      case "home":
        homeSection.classList.remove("hidden");
        navHomeBtn.classList.add("bg-purple-500", "text-white", "shadow-md");
        navHomeBtn.classList.remove("text-gray-700", "hover:bg-gray-100");
        break;
      case "message":
        messageSection.classList.remove("hidden");
        navMessageBtn.classList.add("bg-purple-500", "text-white", "shadow-md");
        navMessageBtn.classList.remove("text-gray-700", "hover:bg-gray-100");
        break;
      case "gallery":
        gallerySection.classList.remove("hidden");
        navGalleryBtn.classList.add("bg-purple-500", "text-white", "shadow-md");
        navGalleryBtn.classList.remove("text-gray-700", "hover:bg-gray-100");
        break;
    }
    currentPage = page; // Perbarui state halaman semasa

    // Animasi masuk konten utama
    mainContentWrapper.classList.remove("scale-95", "opacity-0");
    mainContentWrapper.classList.add("scale-100", "opacity-100");
  }, 300); // Penundaan singkat untuk efek transisi
}

// --- Inisialisasi dan Otentikasi Firebase ---
async function initFirebase() {
  try {
    if (!app) {
      // Inisialisasi hanya sekali
      app = initializeApp(firebaseConfig);
      db = getFirestore(app);
      auth = getAuth(app);

      onAuthStateChanged(auth, async (user) => {
        if (user) {
          currentUserId = user.uid;
          displayUserIdSpan.textContent = user.uid; // Menampilkan ID pengguna
          console.log(
            "Firebase Auth State Changed: User signed in with UID:",
            user.uid
          );
        } else {
          currentUserId = null;
          displayUserIdSpan.textContent = "Mencuba log masuk...";
          console.log("Firebase Auth State Changed: User signed out.");
        }
        isFirebaseReady = true; // Firebase siap setelah status otentikasi diperiksa
        // Aktifkan tombol kirim jika otentikasi siap
        sendMessageBtn.disabled = !(isFirebaseReady && auth.currentUser);
        // Mulai mendengarkan pesan setelah Firebase siap
        setupFirestoreListener();
      });

      if (initialAuthToken) {
        await signInWithCustomToken(auth, initialAuthToken);
        console.log("Signed in with custom token.");
      } else {
        await signInAnonymously(auth);
        console.log("Signed in anonymously.");
      }
    }
  } catch (error) {
    console.error("Error initializing Firebase or signing in:", error);
    messageErrorDisplay.textContent =
      "Gagal menyambung ke pangkalan data. Sila cuba muat semula.";
    messageErrorDisplay.classList.remove("hidden");
    isFirebaseReady = true; // Tetap diatur ke true untuk menghindari loading tak terbatas, tetapi dengan error
    sendMessageBtn.disabled = true; // Nonaktifkan tombol kirim saat terjadi error
  }
}

// --- Logika Pesan Firestore ---
function setupFirestoreListener() {
  if (isFirebaseReady && db) {
    console.log("Firebase is ready, setting up Firestore listener.");
    const messagesCollectionRef = collection(
      db,
      `artifacts/${appId}/public/data/mensive_messages`
    );
    const q = query(messagesCollectionRef);

    onSnapshot(
      q,
      (snapshot) => {
        const messagesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp
            ? doc.data().timestamp.toDate()
            : new Date(0),
        }));
        messagesData.sort(
          (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
        ); // Urutkan pesan terbaru dahulu
        renderMessages(messagesData);
        console.log("Messages updated:", messagesData.length);
      },
      (error) => {
        console.error("Error fetching messages:", error);
        messageErrorDisplay.textContent =
          "Gagal memuatkan mesej. Sila cuba lagi.";
        messageErrorDisplay.classList.remove("hidden");
      }
    );
  }
}

function renderMessages(messages) {
  messagesContainer.innerHTML = ""; // Hapus pesan yang ada
  if (messages.length === 0) {
    messagesContainer.innerHTML =
      '<p class="text-gray-600">Belum ada pesannn, kirim buru!!!</p>';
  } else {
    messages.forEach((msg) => {
      const messageCard = document.createElement("div");
      messageCard.className =
        "bg-white p-6 rounded-2xl shadow-lg text-left transform transition-all duration-300 hover:scale-[1.02]";
      messageCard.innerHTML = `
                <p class="text-gray-800 text-lg leading-relaxed mb-3 whitespace-pre-wrap">${
                  msg.message
                }</p>
                ${
                  msg.spotifyTrackId
                    ? `
                    <div class="mt-4 mb-3">
                        <iframe
                            src="https://open.spotify.com/embed/track/${msg.spotifyTrackId}?utm_source=generator"
                            width="100%"
                            height="80"
                            frameBorder="0"
                            allowFullScreen=""
                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                            loading="lazy"
                            title="Spotify Embed"
                            class="rounded-lg"
                        ></iframe>
                    </div>
                `
                    : ""
                }
                <p class="text-gray-600 text-sm font-medium">
                    — ${msg.sender}
                    ${
                      msg.timestamp
                        ? `
                        <span class="text-gray-500 ml-2 text-xs">
                            (${new Date(msg.timestamp).toLocaleDateString(
                              "id-ID",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )})
                        </span>
                    `
                        : ""
                    }
                </p>
            `;
      messagesContainer.appendChild(messageCard);
    });
  }
}

// --- Logika Spotify API ---
async function getSpotifyAccessToken() {
  // Pastikan CLIENT_ID dan CLIENT_SECRET telah diisi
  if (
    SPOTIFY_CLIENT_ID === "YOUR_SPOTIFY_CLIENT_ID" ||
    SPOTIFY_CLIENT_SECRET === "YOUR_SPOTIFY_CLIENT_SECRET"
  ) {
    messageErrorDisplay.textContent =
      "Error Spotify: Sila masukkan Client ID dan Client Secret Spotify Anda di script.js.";
    messageErrorDisplay.classList.remove("hidden");
    return;
  }

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " + btoa(SPOTIFY_CLIENT_ID + ":" + SPOTIFY_CLIENT_SECRET),
      },
      body: "grant_type=client_credentials",
    });
    const data = await response.json();
    if (data.access_token) {
      spotifyAccessToken = data.access_token;
      console.log("Spotify Access Token obtained.");
      messageErrorDisplay.classList.add("hidden"); // Sembunyikan error jika berhasil
    } else {
      console.error("Failed to get Spotify Access Token:", data);
      messageErrorDisplay.textContent =
        "Gagal mendapatkan token Spotify. Pastikan Client ID dan Secret benar.";
      messageErrorDisplay.classList.remove("hidden");
    }
  } catch (error) {
    console.error("Error fetching Spotify Access Token:", error);
    messageErrorDisplay.textContent =
      "Terjadi kesalahan saat menyambung ke Spotify API.";
    messageErrorDisplay.classList.remove("hidden");
  }
}

async function searchSpotifyTracks(keyword) {
  if (!keyword.trim()) {
    spotifySearchResultsDiv.innerHTML = ""; // Hapus hasil jika kata kunci kosong
    spotifySearchResultsDiv.classList.add("hidden");
    return;
  }
  if (!spotifyAccessToken) {
    await getSpotifyAccessToken(); // Cuba dapatkan token jika belum ada
    if (!spotifyAccessToken) return; // Jika masih tiada token, keluar
  }

  try {
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(
        keyword
      )}&type=track&limit=5`,
      {
        headers: {
          Authorization: "Bearer " + spotifyAccessToken,
        },
      }
    );
    const data = await response.json();
    renderSpotifySearchResults(data.tracks.items);
  } catch (error) {
    console.error("Error searching Spotify:", error);
    messageErrorDisplay.textContent = "Gagal mencari lagu di Spotify.";
    messageErrorDisplay.classList.remove("hidden");
  }
}

function renderSpotifySearchResults(tracks) {
  spotifySearchResultsDiv.innerHTML = ""; // Hapus hasil sebelumnya
  if (tracks.length === 0) {
    spotifySearchResultsDiv.innerHTML =
      '<p class="text-gray-600 text-sm p-2">Tiada hasil ditemukan.</p>';
    spotifySearchResultsDiv.classList.remove("hidden");
    return;
  }

  const ul = document.createElement("ul");
  ul.className = "w-full"; // Tailwind class for full width

  tracks.forEach((track) => {
    const li = document.createElement("li");
    li.className =
      "p-2 cursor-pointer hover:bg-purple-100 flex items-center border-b border-gray-100 last:border-b-0";
    li.innerHTML = `
            <img src="${
              track.album.images[0]?.url ||
              "https://placehold.co/50x50/cccccc/ffffff?text=No+Art"
            }" class="w-10 h-10 rounded-md mr-3" alt="Album Art">
            <div>
                <div class="font-medium text-gray-800">${track.name}</div>
                <div class="text-sm text-gray-600">${track.artists
                  .map((artist) => artist.name)
                  .join(", ")} - ${track.album.name}</div>
            </div>
        `;
    li.dataset.trackId = track.id;
    li.dataset.trackName = `${track.name} - ${track.artists
      .map((artist) => artist.name)
      .join(", ")}`;
    li.addEventListener("click", (e) => {
      selectedSpotifyTrackId = e.currentTarget.dataset.trackId;
      selectedSpotifyTrackName = e.currentTarget.dataset.trackName;
      spotifySearchInput.value = selectedSpotifyTrackName; // Set input ke nama lagu yang dipilih
      spotifySearchResultsDiv.innerHTML = ""; // Hapus dropdown
      spotifySearchResultsDiv.classList.add("hidden"); // Sembunyikan div hasil carian
      console.log("Selected Spotify Track ID:", selectedSpotifyTrackId);
    });
    ul.appendChild(li);
  });
  spotifySearchResultsDiv.appendChild(ul);
  spotifySearchResultsDiv.classList.remove("hidden"); // Tampilkan div hasil carian
}

// --- Event Listener untuk Input Carian Spotify (dengan Debounce) ---
let searchTimeout;
spotifySearchInput.addEventListener("input", () => {
  clearTimeout(searchTimeout);
  selectedSpotifyTrackId = null; // Reset pilihan apabila input baru
  selectedSpotifyTrackName = "";
  const keyword = spotifySearchInput.value;
  if (keyword.length > 2) {
    // Hanya cari jika lebih dari 2 karakter
    searchTimeout = setTimeout(() => {
      searchSpotifyTracks(keyword);
    }, 500); // Debounce selama 500ms
  } else {
    spotifySearchResultsDiv.innerHTML = ""; // Hapus hasil jika kata kunci terlalu pendek
    spotifySearchResultsDiv.classList.add("hidden");
  }
});

// Sembunyikan hasil carian apabila input kehilangan fokus, dengan sedikit penundaan
// untuk membenarkan peristiwa klik pada item dropdown didaftarkan
spotifySearchInput.addEventListener("blur", () => {
  setTimeout(() => {
    spotifySearchResultsDiv.innerHTML = "";
    spotifySearchResultsDiv.classList.add("hidden");
  }, 200);
});

// --- Event listener untuk tombol kirim pesan ---
sendMessageBtn.addEventListener("click", async () => {
  const newMessage = newMessageInput.value.trim();
  const senderName = senderNameInput.value.trim();
  // Gunakan selectedSpotifyTrackId yang telah disimpan
  let trackIdToSave = selectedSpotifyTrackId;
  // Jika user mengetik link Spotify langsung, ambil trackId dari URL
  if (!trackIdToSave && spotifySearchInput.value) {
    const url = spotifySearchInput.value.trim();
    // Cek apakah input adalah link Spotify track
    const match = url.match(/spotify\.com\/track\/([a-zA-Z0-9]+)/);
    if (match && match[1]) {
      trackIdToSave = match[1];
    }
  }

  if (!newMessage) {
    messageErrorDisplay.textContent = "Mesej tidak boleh kosong.";
    messageErrorDisplay.classList.remove("hidden");
    return;
  }

  if (!isFirebaseReady || !auth.currentUser) {
    messageErrorDisplay.textContent =
      "Pangkalan data belum bersedia atau pengguna tidak disahkan. Sila cuba lagi.";
    messageErrorDisplay.classList.remove("hidden");
    console.error(
      "Attempted to send message before Firebase is ready or user is authenticated."
    );
    return;
  }

  sendMessageBtn.disabled = true; // Nonaktifkan tombol saat mengirim
  messageErrorDisplay.classList.add("hidden"); // Sembunyikan error sebelumnya
  sendMessageBtn.innerHTML = `<svg class="animate-spin h-5 w-5 text-white mr-3" viewBox="0 0 24 24">
                                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg> Kirim Pesan`;

  try {
    const messagesCollectionRef = collection(
      db,
      `artifacts/${appId}/public/data/mensive_messages`
    );
    await addDoc(messagesCollectionRef, {
      message: newMessage,
      sender: senderName || "Anonim",
      spotifyTrackId: trackIdToSave, // Simpan ID lagu yang dipilih
      timestamp: serverTimestamp(),
      userId: auth.currentUser.uid,
    });
    newMessageInput.value = "";
    senderNameInput.value = "";
    spotifySearchInput.value = ""; // Kosongkan input carian
    selectedSpotifyTrackId = null; // Reset pilihan
    selectedSpotifyTrackName = "";
    console.log("Message sent successfully!");
  } catch (error) {
    console.error("Error sending message:", error);
    messageErrorDisplay.textContent = `Gagal menghantar mesej: ${error.message}. Sila cuba lagi.`;
    messageErrorDisplay.classList.remove("hidden");
  } finally {
    sendMessageBtn.disabled = false;
    sendMessageBtn.innerHTML = "Kirim Pesan";
  }
});

// --- Logika Galeri ---
function renderGallery() {
  galleryGrid.innerHTML = ""; // Hapus item yang ada
  galleryItems.forEach((item, index) => {
    const galleryCard = document.createElement("div");
    galleryCard.className =
      "bg-gray-100 rounded-xl shadow-md overflow-hidden cursor-pointer transform transition-transform duration-300 hover:scale-105";
    galleryCard.innerHTML = `
            <img src="${item.src}" alt="${item.caption}" class="w-full h-48 object-cover" />
            <p class="p-4 text-gray-700 font-medium">${item.caption}</p>
        `;
    galleryCard.addEventListener("click", () =>
      openImageModal(item.src, item.caption)
    );
    galleryGrid.appendChild(galleryCard);
  });
}

// --- Logika Modal Gambar ---
function openImageModal(imageSrc, caption) {
  modalImage.src = imageSrc;
  modalImage.alt = caption;
  modalCaption.textContent = caption;
  imageModal.classList.remove("hidden");
  // Animasi masuk modal
  setTimeout(() => {
    imageModal
      .querySelector("div")
      .classList.add("modal-transition-enter-active");
    imageModal.querySelector("div").classList.remove("modal-transition-enter");
  }, 10);
}

function closeImageModal() {
  // Animasi keluar modal
  imageModal.querySelector("div").classList.add("modal-transition-exit-active");
  imageModal.querySelector("div").classList.remove("modal-transition-exit");
  setTimeout(() => {
    imageModal.classList.add("hidden");
    imageModal
      .querySelector("div")
      .classList.remove(
        "modal-transition-enter-active",
        "modal-transition-exit-active"
      );
    imageModal.querySelector("div").classList.add("modal-transition-enter"); // Reset for next open
    modalImage.src = "";
    modalCaption.textContent = "";
  }, 300); // Sesuaikan dengan durasi transisi
}

// --- Pengaturan Awal dan Event Listener ---
window.onload = async () => {
  // Jadikan onload async untuk menunggu token Spotify
  initFirebase(); // Inisialisasi Firebase saat halaman dimuat
  renderGallery(); // Render item galeri saat halaman dimuat
  await getSpotifyAccessToken(); // Dapatkan token akses Spotify saat halaman dimuat

  // Animasi pemuatan halaman awal
  navbar.classList.remove("scale-95", "opacity-0");
  navbar.classList.add("scale-100", "opacity-100");

  mainContentWrapper.classList.remove("scale-95", "opacity-0");
  mainContentWrapper.classList.add("scale-100", "opacity-100");

  // Atur halaman awal ke 'home'
  navigateTo("home");

  // Tambahkan event listener navigasi
  navHomeBtn.addEventListener("click", () => navigateTo("home"));
  navMessageBtn.addEventListener("click", () => navigateTo("message"));
  navGalleryBtn.addEventListener("click", () => navigateTo("gallery"));
  closeModalBtn.addEventListener("click", closeImageModal);
  imageModal.addEventListener("click", (e) => {
    // Tutup modal saat mengklik di luar konten
    if (e.target === imageModal) {
      closeImageModal();
    }
  });
};
