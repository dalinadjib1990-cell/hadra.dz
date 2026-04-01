import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";

// Firebase config
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

// Elements
const loginDiv = document.getElementById("login-div");
const chatDiv = document.getElementById("chat-div");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
const googleBtn = document.getElementById("google-btn");
const logoutBtn = document.getElementById("logout-btn");
const sendBtn = document.getElementById("send-btn");
const messageInput = document.getElementById("message-input");
const messagesDiv = document.getElementById("messages");

// Login with Email
loginBtn.addEventListener("click", async () => {
  try {
    await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
  } catch (error) {
    alert(error.message);
  }
});

// Login with Google
googleBtn.addEventListener("click", async () => {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    alert(error.message);
  }
});

// Logout
logoutBtn.addEventListener("click", () => signOut(auth));

// Auth state
onAuthStateChanged(auth, user => {
  if(user) {
    loginDiv.classList.add("hidden");
    chatDiv.classList.remove("hidden");
    loadMessages();
  } else {
    loginDiv.classList.remove("hidden");
    chatDiv.classList.add("hidden");
  }
});

// Send message
sendBtn.addEventListener("click", async () => {
  if(messageInput.value.trim() === "") return;
  await addDoc(collection(db, "messages"), {
    uid: auth.currentUser.uid,
    name: auth.currentUser.email,
    text: messageInput.value,
    timestamp: serverTimestamp()
  });
  messageInput.value = "";
});

// Load messages in real-time
function loadMessages() {
  const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));
  onSnapshot(q, snapshot => {
    messagesDiv.innerHTML = "";
    snapshot.forEach(doc => {
      const msg = doc.data();
      const div = document.createElement("div");
      div.innerHTML = `<span class="user">${msg.name}:</span> ${msg.text}`;
      messagesDiv.appendChild(div);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
  });
}
