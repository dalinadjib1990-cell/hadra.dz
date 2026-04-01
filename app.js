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

let currentUser = null;
let currentChatUser = null;
let messagesUnsubscribe = null;

// Hide splash
setTimeout(() => {
    const splash = document.getElementById("splash-screen");
    if (splash) splash.style.display = "none";
}, 1500);

// Auth Tabs
document.querySelectorAll(".auth-tab").forEach(btn => {
    btn.addEventListener("click", () => {
        const tab = btn.dataset.tab;
        document.querySelectorAll(".auth-tab").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        document.querySelectorAll(".auth-form").forEach(form => form.classList.remove("active"));
        document.getElementById(`${tab}-form`).classList.add("active");
    });
});

// Register
document.getElementById("register-btn")?.addEventListener("click", async () => {
    const firstName = document.getElementById("reg-firstname").value;
    const lastName = document.getElementById("reg-lastname").value;
    const specialty = document.getElementById("reg-specialty").value;
    const level = document.getElementById("reg-level").value;
    const wilaya = document.getElementById("reg-wilaya").value;
    const email = document.getElementById("reg-email").value;
    const password = document.getElementById("reg-password").value;

    if (!firstName || !lastName || !specialty || !level || !wilaya || !email || !password) {
        alert("الرجاء ملء جميع الحقول");
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await updateProfile(user, { displayName: `${firstName} ${lastName}` });
        
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            firstName, lastName,
            fullName: `${firstName} ${lastName}`,
            specialty, level, wilaya,
            email: email,
            avatar: `https://ui-avatars.com/api/?background=8b5cf6&color=fff&size=200&name=${firstName}+${lastName}`,
            createdAt: serverTimestamp(),
            friends: [],
            online: true,
            lastSeen: serverTimestamp(),
            postsCount: 0
        });
        
        alert("✅ تم إنشاء الحساب بنجاح!");
        document.querySelector(".auth-tab[data-tab='login']").click();
        
        document.getElementById("reg-firstname").value = "";
        document.getElementById("reg-lastname").value = "";
        document.getElementById("reg-email").value = "";
        document.getElementById("reg-password").value = "";
        
    } catch (error) {
        alert("❌ " + error.message);
    }
});

// Login
document.getElementById("login-btn")?.addEventListener("click", async () => {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        alert("❌ " + error.message);
    }
});

// Google Login
document.getElementById("google-btn")?.addEventListener("click", async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists()) {
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                firstName: user.displayName?.split(" ")[0] || "",
                lastName: user.displayName?.split(" ")[1] || "",
                fullName: user.displayName || user.email,
                specialty: "غير محدد",
                level: "غير محدد",
                wilaya: "غير محدد",
                email: user.email,
                avatar: user.photoURL || `https://ui-avatars.com/api/?background=8b5cf6&color=fff&size=200&name=${user.displayName || user.email}`,
                createdAt: serverTimestamp(),
                friends: [],
                online: true,
                lastSeen: serverTimestamp(),
                postsCount: 0
            });
        } else {
            await updateDoc(doc(db, "users", user.uid), { online: true, lastSeen: serverTimestamp() });
        }
    } catch (error) {
        alert("❌ " + error.message);
    }
});

// Logout
document.getElementById("logout-action")?.addEventListener("click", async () => {
    if (currentUser) {
        await updateDoc(doc(db, "users", currentUser.uid), { online: false });
    }
    await signOut(auth);
});

// Auth State
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        document.getElementById("login-page").classList.remove("active");
        document.getElementById("app-page").classList.add("active");
        
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            document.getElementById("profile-name").textContent = userData.fullName;
            document.getElementById("profile-specialty").textContent = userData.specialty;
            document.getElementById("nav-avatar").src = userData.avatar;
            document.getElementById("profile-avatar").src = userData.avatar;
            document.getElementById("post-avatar").src = userData.avatar;
            document.getElementById("friends-count").textContent = userData.friends?.length || 0;
        }
        
        await updateDoc(doc(db, "users", user.uid), { online: true });
        
        loadPosts();
        loadOnlineUsers();
        loadSuggestions();
        loadNotifications();
        loadChats();
        
    } else {
        currentUser = null;
        document.getElementById("login-page").classList.add("active");
        document.getElementById("app-page").classList.remove("active");
    }
});

// Load Posts
async function loadPosts() {
    const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
    
    onSnapshot(q, async (snapshot) => {
        const feed = document.getElementById("posts-feed");
        feed.innerHTML = "";
        
        for (const docSnap of snapshot.docs) {
            const post = docSnap.data();
            const userDoc = await getDoc(doc(db, "users", post.userId));
            const userData = userDoc.exists() ? userDoc.data() : null;
            
            const postDiv = document.createElement("div");
            postDiv.className = "post-card";
            
            const timeAgo = post.timestamp ? getTimeAgo(post.timestamp.toDate()) : "الآن";
            const isLiked = post.likes?.includes(currentUser?.uid);
            
            postDiv.innerHTML = `
                <div class="post-header">
                    <div class="post-user">
                        <img src="${userData?.avatar || 'https://via.placeholder.com/50'}" alt="">
                        <div class="post-user-info">
                            <h4>${userData?.fullName || 'مستخدم'}</h4>
                            <p>${userData?.specialty || ''} • ${timeAgo}</p>
                        </div>
                    </div>
                </div>
                <div class="post-content">
                    <p>${post.text || ''}</p>
                    ${post.imageUrl ? `<img src="${post.imageUrl}" class="post-image">` : ''}
                </div>
                <div class="post-stats">
                    <button class="like-btn ${isLiked ? 'liked' : ''}" data-id="${docSnap.id}">
                        <i class="fas fa-heart"></i> ${post.likes?.length || 0}
                    </button>
                    <button class="comment-btn" data-id="${docSnap.id}">
                        <i class="fas fa-comment"></i> ${post.comments?.length || 0}
                    </button>
                </div>
            `;
            
            feed.appendChild(postDiv);
        }
        
        document.getElementById("posts-count").textContent = snapshot.size;
        
        // Add like listeners
        document.querySelectorAll(".like-btn").forEach(btn => {
            btn.addEventListener("click", async () => {
                const postId = btn.dataset.id;
                const postRef = doc(db, "posts", postId);
                const postDoc = await getDoc(postRef);
                const postData = postDoc.data();
                
                if (postData.likes?.includes(currentUser.uid)) {
                    await updateDoc(postRef, { likes: arrayRemove(currentUser.uid) });
                } else {
                    await updateDoc(postRef, { likes: arrayUnion(currentUser.uid) });
                }
            });
        });
    });
}

// Create Post
document.getElementById("submit-post")?.addEventListener("click", async () => {
    const text = document.getElementById("post-text").value.trim();
    if (!text) {
        alert("الرجاء كتابة محتوى المنشور");
        return;
    }
    
    try {
        let imageUrl = null;
        const imageFile = document.getElementById("post-image").files[0];
        
        if (imageFile) {
            const storageRef = ref(storage, `posts/${Date.now()}_${imageFile.name}`);
            await uploadBytes(storageRef, imageFile);
            imageUrl = await getDownloadURL(storageRef);
        }
        
        await addDoc(collection(db, "posts"), {
            userId: currentUser.uid,
            text: text,
            imageUrl: imageUrl,
            timestamp: serverTimestamp(),
            likes: [],
            comments: []
        });
        
        document.getElementById("post-text").value = "";
        document.getElementById("post-image").value = "";
        alert("✅ تم نشر المنشور!");
        
    } catch (error) {
        alert("❌ " + error.message);
    }
});

// Load Online Users
async function loadOnlineUsers() {
    const q = query(collection(db, "users"), where("online", "==", true));
    
    onSnapshot(q, (snapshot) => {
        const onlineList = document.getElementById("online-list");
        onlineList.innerHTML = "";
        
        snapshot.forEach((doc) => {
            const user = doc.data();
            if (user.uid !== currentUser?.uid) {
                const item = document.createElement("div");
                item.className = "online-item";
                item.onclick = () => startChat(user);
                item.innerHTML = `
                    <img src="${user.avatar}" class="online-avatar">
                    <div class="online-info">
                        <h5>${user.fullName}</h5>
                        <p>${user.specialty}</p>
                    </div>
                `;
                onlineList.appendChild(item);
            }
        });
    });
}

// Load Suggestions
async function loadSuggestions() {
    const q = query(collection(db, "users"));
    const snapshot = await getDocs(q);
    
    const suggestionsList = document.getElementById("suggestions-list");
    suggestionsList.innerHTML = "";
    
    snapshot.forEach((doc) => {
        const user = doc.data();
        if (user.uid !== currentUser?.uid) {
            const item = document.createElement("div");
            item.className = "suggestion-item";
            item.innerHTML = `
                <div class="suggestion-info">
                    <h5>${user.fullName}</h5>
                    <p>${user.specialty}</p>
                </div>
                <button class="add-friend" data-id="${user.uid}">➕ إضافة</button>
            `;
            suggestionsList.appendChild(item);
        }
    });
    
    document.querySelectorAll(".add-friend").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            await updateDoc(doc(db, "users", currentUser.uid), {
                friends: arrayUnion(btn.dataset.id)
            });
            alert("✅ تم إضافة الصديق!");
        });
    });
}

// Load Notifications
async function loadNotifications() {
    if (!currentUser) return;
    
    const q = query(collection(db, "notifications"), where("userId", "==", currentUser.uid), orderBy("timestamp", "desc"));
    
    onSnapshot(q, (snapshot) => {
        const notifList = document.getElementById("notifications-list");
        const unreadCount = snapshot.docs.filter(doc => !doc.data().read).length;
        document.getElementById("notif-badge").textContent = unreadCount;
        
        notifList.innerHTML = "";
        snapshot.forEach((doc) => {
            const notif = doc.data();
            const item = document.createElement("div");
            item.className = `notification-item ${!notif.read ? 'unread' : ''}`;
            item.innerHTML = `
                <div class="notif-icon"><i class="fas fa-${notif.type === 'like' ? 'heart' : 'comment'}"></i></div>
                <div><p>${notif.type === 'like' ? 'أعجب بمنشورك' : 'علق على منشورك'}</p></div>
            `;
            notifList.appendChild(item);
        });
    });
}

// Load Chats
async function loadChats() {
    if (!currentUser) return;
    
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    const friendsIds = userDoc.data()?.friends || [];
    
    const chatsList = document.getElementById("chats-list");
    chatsList.innerHTML = "";
    
    for (const id of friendsIds) {
        const friendDoc = await getDoc(doc(db, "users", id));
        if (friendDoc.exists()) {
            const friend = friendDoc.data();
            const item = document.createElement("div");
            item.className = "chat-item";
            item.onclick = () => startChat(friend);
            item.innerHTML = `
                <img src="${friend.avatar}" alt="">
                <div><h4>${friend.fullName}</h4></div>
            `;
            chatsList.appendChild(item);
        }
    }
}

function startChat(user) {
    currentChatUser = user;
    const chatPanel = document.getElementById("chat-panel");
    const chatsList = document.getElementById("chats-list");
    const conversation = document.getElementById("chat-conversation");
    
    chatPanel.classList.add("open");
    chatsList.classList.add("hidden");
    conversation.classList.remove("hidden");
    
    document.getElementById("conv-name").textContent = user.fullName;
    document.getElementById("conv-avatar").src = user.avatar;
    document.getElementById("conv-status").textContent = user.online ? "🟢 متصل" : "⚫ غير متصل";
    
    loadMessages(user.uid);
}

function loadMessages(userId) {
    const chatId = [currentUser.uid, userId].sort().join("_");
    const messagesDiv = document.getElementById("conv-messages");
    
    if (messagesUnsubscribe) messagesUnsubscribe();
    
    const q = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "asc"));
    messagesUnsubscribe = onSnapshot(q, (snapshot) => {
        messagesDiv.innerHTML = "";
        snapshot.forEach((doc) => {
            const msg = doc.data();
            const messageDiv = document.createElement("div");
            messageDiv.className = `message ${msg.senderId === currentUser.uid ? 'sent' : 'received'}`;
            messageDiv.textContent = msg.text;
            messagesDiv.appendChild(messageDiv);
        });
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
}

document.getElementById("send-message")?.addEventListener("click", async () => {
    if (!currentChatUser) return;
    const input = document.getElementById("message-input");
    const text = input.value.trim();
    if (!text) return;
    
    const chatId = [currentUser.uid, currentChatUser.uid].sort().join("_");
    await addDoc(collection(db, "chats", chatId, "messages"), {
        senderId: currentUser.uid,
        text: text,
        timestamp: serverTimestamp()
    });
    input.value = "";
});

document.getElementById("message-input")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") document.getElementById("send-message").click();
});

document.getElementById("back-to-chats")?.addEventListener("click", () => {
    document.getElementById("chats-list").classList.remove("hidden");
    document.getElementById("chat-conversation").classList.add("hidden");
    if (messagesUnsubscribe) messagesUnsubscribe();
});

// Toggle Panels
document.getElementById("chat-toggle")?.addEventListener("click", () => {
    document.getElementById("chat-panel").classList.toggle("open");
    document.getElementById("notif-panel").classList.remove("open");
});

document.getElementById("notif-toggle")?.addEventListener("click", () => {
    document.getElementById("notif-panel").classList.toggle("open");
    document.getElementById("chat-panel").classList.remove("open");
});

document.getElementById("close-chat")?.addEventListener("click", () => {
    document.getElementById("chat-panel").classList.remove("open");
});

document.getElementById("close-notif")?.addEventListener("click", () => {
    document.getElementById("notif-panel").classList.remove("open");
});

// Profile Menu
document.querySelector(".profile-menu")?.addEventListener("click", (e) => {
    e.stopPropagation();
    document.getElementById("profile-dropdown").classList.toggle("show");
});

document.addEventListener("click", () => {
    document.getElementById("profile-dropdown")?.classList.remove("show");
});

// Avatar Upload
document.getElementById("avatar-upload")?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file || !currentUser) return;
    
    try {
        const storageRef = ref(storage, `avatars/${currentUser.uid}`);
        await uploadBytes(storageRef, file);
        const avatarUrl = await getDownloadURL(storageRef);
        await updateDoc(doc(db, "users", currentUser.uid), { avatar: avatarUrl });
        await updateProfile(auth.currentUser, { photoURL: avatarUrl });
        alert("✅ تم تحديث الصورة!");
        location.reload();
    } catch (error) {
        alert("❌ فشل رفع الصورة");
    }
});

// Edit Profile
document.getElementById("edit-profile-link")?.addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("edit-profile-modal").classList.add("open");
});

document.querySelectorAll(".close-modal").forEach(btn => {
    btn.addEventListener("click", () => {
        document.getElementById("edit-profile-modal").classList.remove("open");
    });
});

document.getElementById("save-profile")?.addEventListener("click", async () => {
    if (!currentUser) return;
    
    const firstName = document.getElementById("edit-firstname").value;
    const lastName = document.getElementById("edit-lastname").value;
    const specialty = document.getElementById("edit-specialty").value;
    const level = document.getElementById("edit-level").value;
    const wilaya = document.getElementById("edit-wilaya").value;
    
    try {
        await updateDoc(doc(db, "users", currentUser.uid), {
            firstName, lastName,
            fullName: `${firstName} ${lastName}`,
            specialty, level, wilaya
        });
        alert("✅ تم تحديث الملف!");
        document.getElementById("edit-profile-modal").classList.remove("open");
        location.reload();
    } catch (error) {
        alert("❌ " + error.message);
    }
});

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return "الآن";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ساعة`;
    return date.toLocaleDateString("ar-DZ");
}

console.log("✅ DZ Teach App Ready!");
