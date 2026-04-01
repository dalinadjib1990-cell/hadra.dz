import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getFirestore,
  addDoc,
  collection,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 🔥 ضع config تاعك كما هو
const firebaseConfig = {
  apiKey: "AIzaSyDg_T6I4mksgG1mgxTnhQI0DA4MhBYGDqU",
  authDomain: "hadra-dz.firebaseapp.com",
  projectId: "hadra-dz"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// عناصر
const loginDiv = document.getElementById("login");
const appDiv = document.getElementById("app");
const postsDiv = document.getElementById("posts");

// تسجيل
window.signup = async () => {
  await createUserWithEmailAndPassword(
    auth,
    email.value,
    password.value
  );
};

// دخول
window.login = async () => {
  await signInWithEmailAndPassword(
    auth,
    email.value,
    password.value
  );
};

// خروج
window.logout = () => signOut(auth);

// حالة المستخدم
onAuthStateChanged(auth, user => {
  if (user) {
    loginDiv.style.display = "none";
    appDiv.style.display = "block";
    loadPosts();
  } else {
    loginDiv.style.display = "block";
    appDiv.style.display = "none";
  }
});

// نشر
window.addPost = async () => {
  if (!postInput.value) return;

  await addDoc(collection(db, "posts"), {
    text: postInput.value
  });

  postInput.value = "";
};

// عرض
function loadPosts() {
  const q = query(collection(db, "posts"), orderBy("text"));

  onSnapshot(q, snapshot => {
    postsDiv.innerHTML = "";

    snapshot.forEach(doc => {
      const post = doc.data();

      const div = document.createElement("div");
      div.className = "post";
      div.innerText = post.text;

      postsDiv.appendChild(div);
    });
  });
}
