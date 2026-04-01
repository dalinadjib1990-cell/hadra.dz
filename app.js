import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    signOut, 
    GoogleAuthProvider, 
    signInWithPopup, 
    onAuthStateChanged,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    query, 
    orderBy, 
    onSnapshot, 
    serverTimestamp,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    arrayUnion,
    arrayRemove,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js";

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyDg_T6I4mksgG1mgxTnhQI0DA4MhBYGDqU",
    authDomain: "hadra-dz.firebaseapp.com",
    projectId: "hadra-dz",
    storageBucket: "hadra-dz.appspot.com",
    messagingSenderId: "765723444730",
    appId: "1:765723444730:web:4d816875f8e8a45f939043"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

// Global Variables
let currentUser = null;
let onlineUsers = new Set();
let messagesListener = null;
let postsListener = null;
let notificationsListener = null;

// DOM Elements
const loginPage = document.getElementById("login-page");
const appPage = document.getElementById("app-page");
const loginSubmit = document.getElementById("login-submit");
const googleLogin = document.getElementById("google-login");
const registerSubmit = document.getElementById("register-submit");
const logoutBtn = document.getElementById("logout-btn");
const profileDropdown = document.querySelector(".profile-menu");
const dropdownMenu = document.getElementById("dropdown-menu");
const postInput = document.getElementById("post-input");
const submitPostBtn = document.getElementById("submit-post-btn");
const imageUploadBtn = document.getElementById("image-upload-btn");
const imageFile = document.getElementById("image-file");
const postsContainer = document.getElementById("posts-container");
const searchUsers = document.getElementById("search-users");
const messagesBtn = document.getElementById("messages-btn");
const notificationsBtn = document.getElementById("notifications-btn");
const chatWindow = document.getElementById("chat-window");
const notificationsWindow = document.getElementById("notifications-window");
const closeChat = document.getElementById("close-chat");
const closeNotifications = document.getElementById("close-notifications");
const onlineUsersList = document.getElementById("online-users-list");
const suggestionsList = document.getElementById("suggestions-list");

// Tab Switching
