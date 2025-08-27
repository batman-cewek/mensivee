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
  doc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

console.log("script.js: Skrip mulai dimuat.");

// Mendeklarasikan variabel global untuk Firebase (disediakan oleh persekitaran Canvas)
// Nilai fallback untuk pengujian lokal di luar Canvas.
// =================================================================================================
// PENTING SEKALI: GANTI NILAI PLACEHOLDER INI DENGAN KONFIGURASI FIREBASE PROYEK ANDA SENDIRI!
// Anda bisa mendapatkan ini dari Firebase Console -> Project settings -> Your apps -> Pilih aplikasi web Anda -> Firebase SDK snippet (pilih "Config")
// =================================================================================================
const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id"; // Biarkan ini seperti adanya
const firebaseConfig = {
  apiKey: "AIzaSyBuQ35XFnW9SW-BEZlT-qkNtaU3stoDFsc",
  authDomain: "songfess-6cae9.firebaseapp.com",
  projectId: "songfess-6cae9",
  storageBucket: "songfess-6cae9.appspot.com",
  messagingSenderId: "939416112749",
  appId: "1:939416112749:web:d7fcb29b17420001b0b964",
};
const initialAuthToken =
  typeof __initial_auth_token !== "undefined" ? __initial_auth_token : null; // Biarkan ini seperti adanya

// =================================================================================================
// PENTING SEKALI: GANTI NILAI PLACEHOLDER INI DENGAN KUNCI SPOTIFY API ANDA!
// Anda bisa mendapatkan ini dari Spotify Developer Dashboard: https://developer.spotify.com/dashboard/applications
// Buat aplikasi di sana untuk mendapatkan Client ID dan Client Secret.
// Peringatan: Mengekspos Client Secret di aplikasi sisi klien (frontend) seperti ini adalah risiko keamanan untuk aplikasi produksi.
// Untuk proyek pribadi/demonstrasi, ini dapat diterima, tetapi untuk aplikasi publik, Anda harus menggunakan backend.
// =================================================================================================
const SPOTIFY_CLIENT_ID = "256ed70938184db7a0aacb88daa8b9a3"; // <--- GANTI INI
const SPOTIFY_CLIENT_SECRET = "94aec0f4b9c34695a27145665e877b0d"; // <--- GANTI INI

// =================================================================================================
// PENTING SEKALI: GANTI NILAI PLACEHOLDER INI DENGAN ID PLAYLIST SPOTIFY ANDA!
// Anda bisa mendapatkan ID playlist dari URL playlist Spotify.
// Contoh: https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M -> IDnya adalah 37i9dQZF1DXcBWIGoYBM5M
// =================================================================================================
const YOUR_SPOTIFY_PLAYLIST_ID = "0YIceDsDdwZBK6S7M1iUzL?"; // <--- GANTI INI

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
  { src: "images/1.jpg", caption: "Saat ingin denganmu.." },
  { src: "images/2.jpg", caption: "About you - The 1975" },
  { src: "images/3.jpg", caption: "Wahhh ada apa ya kira-kira?" },
  { src: "images/4.jpg", caption: "Lihat-lihat, betapa gemasnyaa" },
  { src: "images/5.jpg", caption: "Love letterr buat Sasaa" },
  { src: "images/6.jpg", caption: "Cinta kita terlukis indah" },
];

// Mendapatkan referensi ke elemen UI
const navHomeBtn = document.getElementById("nav-home");
const navMessageBtn = document.getElementById("nav-message");
const navGalleryBtn = document.getElementById("nav-gallery");
const navPlaylistBtn = document.getElementById("nav-playlist");
const navbar = document.getElementById("navbar");
const mainContentWrapper = document.getElementById("main-content-wrapper");

const homeSection = document.getElementById("home-section");
const messageSection = document.getElementById("message-section");
const gallerySection = document.getElementById("gallery-section");
const playlistSection = document.getElementById("playlist-section");
const spotifyPlaylistEmbedDiv = document.getElementById(
  "spotify-playlist-embed"
);

const newMessageInput = document.getElementById("new-message-input");
const spotifySearchInput = document.getElementById("spotify-search-input");
const spotifySearchResultsDiv = document.getElementById(
  "spotify-search-results"
);
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

// Elemen baru untuk hamburger menu
const hamburgerBtn = document.getElementById("hamburger-btn");
const closeSidebarBtn = document.getElementById("close-sidebar-btn");
const overlay = document.getElementById("overlay");

console.log("script.js: Referensi elemen UI berhasil didapatkan.");

let currentPage = "home"; // State halaman awal

// --- Logika Navigasi ---
function navigateTo(page) {
  console.log(`Navigasi ke halaman: ${page}`);
  // Sembunyikan semua bagian
  homeSection.classList.add("hidden");
  messageSection.classList.add("hidden");
  gallerySection.classList.add("hidden");
  playlistSection.classList.add("hidden");

  // Hapus kelas aktif dari semua tombol navigasi
  navHomeBtn.classList.remove("bg-purple-500", "text-white", "shadow-md");
  navMessageBtn.classList.remove("bg-purple-500", "text-white", "shadow-md");
  navGalleryBtn.classList.remove("bg-purple-500", "text-white", "shadow-md");
  navPlaylistBtn.classList.remove("bg-purple-500", "text-white", "shadow-md");
  navHomeBtn.classList.add("text-gray-700", "hover:bg-gray-100");
  navMessageBtn.classList.add("text-gray-700", "hover:bg-gray-100");
  navGalleryBtn.classList.add("text-gray-700", "hover:bg-gray-100");
  navPlaylistBtn.classList.add("text-gray-700", "hover:bg-gray-100");

  // Tutup sidebar jika terbuka (untuk mobile)
  closeSidebar();

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
      case "playlist":
        playlistSection.classList.remove("hidden");
        navPlaylistBtn.classList.add(
          "bg-purple-500",
          "text-white",
          "shadow-md"
        );
        navPlaylistBtn.classList.remove("text-gray-700", "hover:bg-gray-100");
        renderSpotifyPlaylist(); // Panggil fungsi render playlist
        break;
    }
    currentPage = page; // Perbarui state halaman semasa

    // Animasi masuk konten utama
    mainContentWrapper.classList.remove("scale-95", "opacity-0");
    mainContentWrapper.classList.add("scale-100", "opacity-100");
  }, 300); // Penundaan singkat untuk efek transisi
}

// --- Logika Sidebar Mobile ---
function openSidebar() {
  console.log("openSidebar dipanggil.");
  navbar.classList.remove("translate-x-full");
  navbar.classList.add("translate-x-0", "navbar-open"); // Tambahkan kelas kustom
  overlay.classList.remove("hidden");
}

function closeSidebar() {
  console.log("closeSidebar dipanggil.");
  navbar.classList.remove("translate-x-0", "navbar-open"); // Hapus kelas kustom
  navbar.classList.add("translate-x-full");
  overlay.classList.add("hidden");
}

// --- Inisialisasi dan Otentikasi Firebase ---
async function initFirebase() {
  console.log("initFirebase dipanggil.");
  try {
    if (!app) {
      // Inisialisasi hanya sekali
      app = initializeApp(firebaseConfig);
      db = getFirestore(app);
      auth = getAuth(app);
      console.log("Firebase app, db, auth diinisialisasi.");

      onAuthStateChanged(auth, async (user) => {
        if (user) {
          currentUserId = user.uid;
          displayUserIdSpan.textContent = user.uid;
          console.log(
            "Firebase Auth State Changed: Pengguna masuk dengan UID:",
            user.uid
          );
        } else {
          currentUserId = null;
          displayUserIdSpan.textContent = "Mencuba log masuk...";
          console.log("Firebase Auth State Changed: Pengguna keluar.");
        }
        isFirebaseReady = true;
        sendMessageBtn.disabled = !(isFirebaseReady && auth.currentUser);
        console.log(
          "isFirebaseReady diatur ke true. Tombol kirim diaktifkan:",
          !sendMessageBtn.disabled
        );
        setupFirestoreListener();
      });

      if (initialAuthToken) {
        console.log("Mencoba masuk dengan custom token...");
        await signInWithCustomToken(auth, initialAuthToken);
        console.log("Berhasil masuk dengan custom token.");
      } else {
        console.log("Mencoba masuk secara anonim...");
        await signInAnonymously(auth);
        console.log("Berhasil masuk secara anonim.");
      }
    } else {
      console.log("Firebase sudah diinisialisasi sebelumnya.");
      isFirebaseReady = true;
      sendMessageBtn.disabled = !(isFirebaseReady && auth.currentUser);
      setupFirestoreListener();
    }
  } catch (error) {
    console.error(
      "Kesalahan saat menginisialisasi Firebase atau masuk:",
      error
    );
    messageErrorDisplay.textContent = `Gagal menyambung ke pangkalan data: ${error.message}. Sila cuba muat semula.`;
    messageErrorDisplay.classList.remove("hidden");
    isFirebaseReady = true; // Tetap diatur ke true untuk menghindari loading tak terbatas, tetapi dengan error
    sendMessageBtn.disabled = true; // Nonaktifkan tombol kirim saat terjadi error
  }
}

// --- Logika Pesan Firestore ---
function setupFirestoreListener() {
  if (isFirebaseReady && db) {
    console.log("Menyiapkan listener Firestore.");
    const messagesCollectionRef = collection(
      db,
      `artifacts/${appId}/public/data/mensive_messages`
    );
    const q = query(messagesCollectionRef);

    onSnapshot(
      q,
      (snapshot) => {
        console.log("Data Firestore diterima.");
        const messagesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp
            ? doc.data().timestamp.toDate()
            : new Date(0),
        }));
        messagesData.sort(
          (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
        );
        renderMessages(messagesData);
        console.log("Pesan diperbarui, jumlah:", messagesData.length);
      },
      (error) => {
        console.error("Kesalahan saat mengambil pesan dari Firestore:", error);
        messageErrorDisplay.textContent = `Gagal memuatkan mesej: ${error.message}. Sila cuba lagi.`;
        messageErrorDisplay.classList.remove("hidden");
      }
    );
  } else {
    console.log(
      "Firestore listener tidak disiapkan: isFirebaseReady =",
      isFirebaseReady,
      "db =",
      db
    );
  }
}

function renderMessages(messages) {
  messagesContainer.innerHTML = "";
  if (messages.length === 0) {
    messagesContainer.innerHTML =
      '<p class="text-gray-600">Belum ada mesej. Jadilah yang pertama menulis!</p>';
  } else {
    messages.forEach((msg) => {
      const messageCard = document.createElement("div");
      // Menghapus kelas 'relative' dan tombol hapus
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
                <!-- Tombol hapus telah dihapus dari sini -->
            `;
      messagesContainer.appendChild(messageCard);
    });

    // Event listener untuk tombol hapus juga tidak diperlukan lagi karena tombolnya dihapus
    // document.querySelectorAll('.delete-message-btn').forEach(button => {
    //     button.addEventListener('click', (event) => {
    //         const messageId = event.target.dataset.id;
    //         showCustomConfirm('Apakah Anda yakin ingin menghapus pesan ini?', () => {
    //             deleteMessage(messageId);
    //         });
    //     });
    // });
  }
}

function showCustomConfirm(message, onConfirm) {
  const existingModal = document.getElementById("custom-confirm-modal");
  if (existingModal) existingModal.remove();

  const modalHtml = `
        <div id="custom-confirm-modal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div class="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full relative transform transition-all duration-300 scale-95 opacity-0 modal-transition-enter">
                <p class="text-gray-800 text-lg mb-6 text-center">${message}</p>
                <div class="flex justify-center gap-4">
                    <button id="confirm-yes-btn" class="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-5 rounded-full shadow-md transition-all duration-300">Ya</button>
                    <button id="confirm-no-btn" class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-5 rounded-full shadow-md transition-all duration-300">Tidak</button>
                </div>
            </div>
        </div>
    `;
  document.body.insertAdjacentHTML("beforeend", modalHtml);

  const modalElement = document.getElementById("custom-confirm-modal");
  const modalContent = modalElement.querySelector("div");

  setTimeout(() => {
    modalContent.classList.add("modal-transition-enter-active");
    modalContent.classList.remove("modal-transition-enter");
  }, 10);

  document.getElementById("confirm-yes-btn").addEventListener("click", () => {
    onConfirm();
    closeCustomConfirm();
  });
  document.getElementById("confirm-no-btn").addEventListener("click", () => {
    closeCustomConfirm();
  });

  modalElement.addEventListener("click", (e) => {
    if (e.target === modalElement) {
      closeCustomConfirm();
    }
  });
}

function closeCustomConfirm() {
  const modalElement = document.getElementById("custom-confirm-modal");
  if (modalElement) {
    const modalContent = modalElement.querySelector("div");
    modalContent.classList.add("modal-transition-exit-active");
    modalContent.classList.remove("modal-transition-exit");
    setTimeout(() => {
      modalElement.remove();
    }, 300);
  }
}

// Fungsi deleteMessage ini tidak akan dipanggil lagi karena tombolnya dihapus dari UI
async function deleteMessage(messageId) {
  if (!isFirebaseReady || !db || !auth.currentUser) {
    messageErrorDisplay.textContent =
      "Pangkalan data belum bersedia atau pengguna tidak disahkan. Sila cuba lagi.";
    messageErrorDisplay.classList.remove("hidden");
    console.error(
      "Mencoba menghapus pesan sebelum Firebase siap atau pengguna diautentikasi."
    );
    return;
  }

  try {
    const messageRef = doc(
      db,
      `artifacts/${appId}/public/data/mensive_messages`,
      messageId
    );
    await deleteDoc(messageRef);
    console.log("Pesan berhasil dihapus:", messageId);
    messageErrorDisplay.classList.add("hidden");
  } catch (error) {
    console.error("Kesalahan saat menghapus pesan:", error);
    messageErrorDisplay.textContent = `Gagal menghapus pesan: ${error.message}. Sila cuba lagi.`;
    messageErrorDisplay.classList.remove("hidden");
  }
}

function extractSpotifyTrackId(url) {
  if (!url) return null;
  const regex =
    /(?:spotify\.com\/(?:track|embed\/track)\/|spotify:track:)([a-zA-Z0-9]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// --- Logika Spotify API ---
async function getSpotifyAccessToken() {
  if (
    SPOTIFY_CLIENT_ID === "GANTI_DENGAN_CLIENT_ID_SPOTIFY_ANDA" ||
    SPOTIFY_CLIENT_SECRET === "GANTI_DENGAN_CLIENT_SECRET_SPOTIFY_ANDA"
  ) {
    messageErrorDisplay.textContent =
      "Error Spotify: Sila masukkan Client ID dan Client Secret Spotify Anda di script.js.";
    messageErrorDisplay.classList.remove("hidden");
    console.error("Spotify API keys belum diatur.");
    return;
  }

  try {
    console.log("Mencoba mendapatkan token akses Spotify...");
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
      console.log("Token akses Spotify berhasil didapatkan.");
      messageErrorDisplay.classList.add("hidden");
    } else {
      console.error("Gagal mendapatkan token akses Spotify:", data);
      messageErrorDisplay.textContent =
        "Gagal mendapatkan token Spotify. Pastikan Client ID dan Secret benar.";
      messageErrorDisplay.classList.remove("hidden");
    }
  } catch (error) {
    console.error("Kesalahan saat mengambil token akses Spotify:", error);
    messageErrorDisplay.textContent =
      "Terjadi kesalahan saat menyambung ke Spotify API.";
    messageErrorDisplay.classList.remove("hidden");
  }
}

async function searchSpotifyTracks(keyword) {
  if (!keyword.trim()) {
    spotifySearchResultsDiv.innerHTML = "";
    spotifySearchResultsDiv.classList.add("hidden");
    return;
  }
  if (!spotifyAccessToken) {
    console.log(
      "Token akses Spotify belum ada, mencoba mendapatkannya sebelum mencari..."
    );
    await getSpotifyAccessToken();
    if (!spotifyAccessToken) {
      console.log("Masih tidak ada token Spotify, pencarian dibatalkan.");
      return;
    }
  }

  try {
    console.log(`Mencari lagu Spotify dengan kata kunci: "${keyword}"`);
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
    if (response.status === 401) {
      // Token expired or invalid
      console.warn(
        "Spotify token mungkin tidak valid, mencoba mendapatkan yang baru..."
      );
      spotifyAccessToken = ""; // Clear old token
      await getSpotifyAccessToken(); // Get new token
      if (spotifyAccessToken) {
        // If new token obtained, retry search
        return searchSpotifyTracks(keyword);
      } else {
        console.error(
          "Tidak dapat memperbarui token Spotify, pencarian gagal."
        );
        messageErrorDisplay.textContent =
          "Token Spotify tidak valid atau kadaluarsa. Coba muat ulang halaman.";
        messageErrorDisplay.classList.remove("hidden");
        return;
      }
    }
    renderSpotifySearchResults(data.tracks.items);
  } catch (error) {
    console.error("Kesalahan saat mencari Spotify:", error);
    messageErrorDisplay.textContent = "Gagal mencari lagu di Spotify.";
    messageErrorDisplay.classList.remove("hidden");
  }
}

function renderSpotifySearchResults(tracks) {
  spotifySearchResultsDiv.innerHTML = "";
  if (tracks.length === 0) {
    spotifySearchResultsDiv.innerHTML =
      '<p class="text-gray-600 text-sm p-2">Tiada hasil ditemukan.</p>';
    spotifySearchResultsDiv.classList.add("hidden");
    return;
  }

  const ul = document.createElement("ul");
  ul.className = "w-full";

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
      spotifySearchInput.value = selectedSpotifyTrackName;
      spotifySearchResultsDiv.innerHTML = "";
      spotifySearchResultsDiv.classList.add("hidden");
      console.log("Lagu Spotify dipilih, ID:", selectedSpotifyTrackId);
    });
    ul.appendChild(li);
  });
  spotifySearchResultsDiv.appendChild(ul);
  spotifySearchResultsDiv.classList.remove("hidden");
}

let searchTimeout;
spotifySearchInput.addEventListener("input", () => {
  clearTimeout(searchTimeout);
  selectedSpotifyTrackId = null;
  selectedSpotifyTrackName = "";
  const keyword = spotifySearchInput.value;
  if (keyword.length > 2) {
    searchTimeout = setTimeout(() => {
      searchSpotifyTracks(keyword);
    }, 500);
  } else {
    spotifySearchResultsDiv.innerHTML = "";
    spotifySearchResultsDiv.classList.add("hidden");
  }
});

spotifySearchInput.addEventListener("blur", () => {
  setTimeout(() => {
    spotifySearchResultsDiv.innerHTML = "";
    spotifySearchResultsDiv.classList.add("hidden");
  }, 200);
});

sendMessageBtn.addEventListener("click", async () => {
  const newMessage = newMessageInput.value.trim();
  const senderName = senderNameInput.value.trim();
  const trackIdToSave = selectedSpotifyTrackId;

  console.log("Tombol Kirim Pesan diklik.");
  console.log("isFirebaseReady:", isFirebaseReady);
  console.log("auth.currentUser:", auth.currentUser);

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
      "Gagal mengirim: Firebase belum siap atau pengguna belum diautentikasi."
    );
    return;
  }

  sendMessageBtn.disabled = true;
  messageErrorDisplay.classList.add("hidden");
  sendMessageBtn.innerHTML = `<svg class="animate-spin h-5 w-5 text-white mr-3" viewBox="0 0 24 24">
                                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg> Kirim Pesan`;

  try {
    console.log("Mencoba menambahkan dokumen ke Firestore...");
    const messagesCollectionRef = collection(
      db,
      `artifacts/${appId}/public/data/mensive_messages`
    );
    await addDoc(messagesCollectionRef, {
      message: newMessage,
      sender: senderName || "Anonim",
      spotifyTrackId: trackIdToSave,
      timestamp: serverTimestamp(),
      userId: auth.currentUser.uid,
    });
    console.log("Dokumen berhasil ditambahkan ke Firestore.");
    newMessageInput.value = "";
    senderNameInput.value = "";
    spotifySearchInput.value = "";
    selectedSpotifyTrackId = null;
    selectedSpotifyTrackName = "";
  } catch (error) {
    console.error("Kesalahan saat menambahkan dokumen ke Firestore:", error);
    messageErrorDisplay.textContent = `Gagal menghantar mesej: ${error.message}. Sila cuba lagi.`;
    messageErrorDisplay.classList.remove("hidden");
  } finally {
    sendMessageBtn.disabled = false;
    sendMessageBtn.innerHTML = "Kirim Pesan";
  }
});

function renderGallery() {
  galleryGrid.innerHTML = "";
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

function openImageModal(imageSrc, caption) {
  modalImage.src = imageSrc;
  modalImage.alt = caption;
  modalCaption.textContent = caption;
  imageModal.classList.remove("hidden");
  setTimeout(() => {
    imageModal
      .querySelector("div")
      .classList.add("modal-transition-enter-active");
    imageModal.querySelector("div").classList.remove("modal-transition-enter");
  }, 10);
}

function closeImageModal() {
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
    imageModal.querySelector("div").classList.add("modal-transition-enter");
    modalImage.src = "";
    modalCaption.textContent = "";
  }, 300);
}

function renderSpotifyPlaylist() {
  if (YOUR_SPOTIFY_PLAYLIST_ID === "GANTI_DENGAN_ID_PLAYLIST_ANDA") {
    spotifyPlaylistEmbedDiv.innerHTML =
      '<p class="text-red-600">Sila masukkan ID Playlist Spotify Anda di script.js untuk melihat playlist.</p>';
    return;
  }
  spotifyPlaylistEmbedDiv.innerHTML = `
        <iframe
            src="https://open.spotify.com/embed/playlist/${YOUR_SPOTIFY_PLAYLIST_ID}?utm_source=generator"
            width="100%"
            height="100%"
            frameBorder="0"
            allowFullScreen=""
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            title="Spotify Playlist Embed"
        ></iframe>
    `;
}

window.onload = async () => {
  console.log("window.onload dipanggil.");
  initFirebase();
  renderGallery();
  await getSpotifyAccessToken();

  // Animasi pemuatan awal (navbar dan main content)
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
  navPlaylistBtn.addEventListener("click", () => navigateTo("playlist"));
  closeModalBtn.addEventListener("click", closeImageModal);
  imageModal.addEventListener("click", (e) => {
    if (e.target === imageModal) {
      closeImageModal();
    }
  });

  // Event listeners for hamburger menu
  if (hamburgerBtn) {
    hamburgerBtn.addEventListener("click", openSidebar);
    console.log("Listener klik tombol hamburger terpasang.");
  } else {
    console.error("Tombol hamburger tidak ditemukan!");
  }

  if (closeSidebarBtn) {
    closeSidebarBtn.addEventListener("click", closeSidebar);
    console.log("Listener klik tombol tutup sidebar terpasang.");
  } else {
    console.error("Tombol tutup sidebar tidak ditemukan!");
  }

  if (overlay) {
    overlay.addEventListener("click", closeSidebar);
    console.log("Listener klik overlay terpasang.");
  } else {
    console.error("Overlay tidak ditemukan!");
  }

  // Close sidebar when a nav item is clicked
  document.querySelectorAll("#navbar button").forEach((button) => {
    button.addEventListener("click", () => {
      if (!window.matchMedia("(min-width: 768px)").matches) {
        closeSidebar();
      }
    });
  });
};

