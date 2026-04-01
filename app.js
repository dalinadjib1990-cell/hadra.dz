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
    getDocs,
    deleteDoc
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
let currentChatUser = null;
let messagesUnsubscribe = null;
let postsUnsubscribe = null;
let notificationsUnsubscribe = null;

// DOM Elements
const splashScreen = document.getElementById("splash-screen");
const loginPage = document.getElementById("login-page");
const appPage = document.getElementById("app-page");

// Hide splash after 1.5 seconds
setTimeout(() => {
    if (splashScreen) splashScreen.style.opacity = "0";
    setTimeout(() => {
        if (splashScreen) splashScreen.style.display = "none";
    }, 500);
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

// Helper Functions
function showMessage(message, type = "error") {
    alert(message);
}

function formatTimeAgo(date) {
    if (!date) return "الآن";
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return "الآن";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ساعة`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} يوم`;
    return date.toLocaleDateString("ar-DZ");
}

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// Register User
document.getElementById("register-btn")?.addEventListener("click", async () => {
    const firstName = document.getElementById("reg-firstname").value;
    const lastName = document.getElementById("reg-lastname").value;
    const specialty = document.getElementById("reg-specialty").value;
    const level = document.getElementById("reg-level").value;
    const wilaya = document.getElementById("reg-wilaya").value;
    const email = document.getElementById("reg-email").value;
    const password = document.getElementById("reg-password").value;

    if (!firstName || !lastName || !specialty || !level || !wilaya || !email || !password) {
        showMessage("الرجاء ملء جميع الحقول");
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await updateProfile(user, { displayName: `${firstName} ${lastName}` });
        
        const avatarUrl = `https://ui-avatars.com/api/?background=8b5cf6&color=fff&size=200&name=${firstName}+${lastName}`;
        
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            firstName,
            lastName,
            fullName: `${firstName} ${lastName}`,
            specialty,
            level,
            wilaya,
            email,
            avatar: avatarUrl,
            createdAt: serverTimestamp(),
            friends: [],
            online: true,
            lastSeen: serverTimestamp(),
            postsCount: 0
        });
        
        showMessage("✅ تم إنشاء الحساب بنجاح!", "success");
        document.querySelector(".auth-tab[data-tab='login']").click();
        
        // Clear form
        document.getElementById("reg-firstname").value = "";
        document.getElementById("reg-lastname").value = "";
        document.getElementById("reg-specialty").value = "";
        document.getElementById("reg-level").value = "";
        document.getElementById("reg-wilaya").value = "";
        document.getElementById("reg-email").value = "";
        document.getElementById("reg-password").value = "";
        
    } catch (error) {
        showMessage("❌ " + error.message);
    }
});

// Login
document.getElementById("login-btn")?.addEventListener("click", async () => {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    
    if (!email || !password) {
        showMessage("الرجاء إدخال البريد الإلكتروني وكلمة المرور");
        return;
    }
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        let errorMessage = "حدث خطأ في تسجيل الدخول";
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = "المستخدم غير موجود";
                break;
            case 'auth/wrong-password':
                errorMessage = "كلمة المرور غير صحيحة";
                break;
            case 'auth/invalid-email':
                errorMessage = "البريد الإلكتروني غير صالح";
                break;
            default:
                errorMessage = error.message;
        }
        showMessage("❌ " + errorMessage);
    }
});

// Google Login
document.getElementById("google-login-btn")?.addEventListener("click", async () => {
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
        let errorMessage = "حدث خطأ في تسجيل الدخول عبر Google";
        if (error.code === 'auth/popup-blocked') {
            errorMessage = "الرجاء السماح للنوافذ المنبثقة في المتصفح";
        }
        showMessage("❌ " + errorMessage);
    }
});

// Logout
document.getElementById("logout-btn")?.addEventListener("click", async () => {
    if (currentUser) {
        await updateDoc(doc(db, "users", currentUser.uid), { online: false });
    }
    await signOut(auth);
});

// Auth State
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        loginPage.classList.remove("active");
        appPage.classList.add("active");
        
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            updateUI(userData);
        }
        
        await updateDoc(doc(db, "users", user.uid), { online: true });
        
        loadPosts();
        loadOnlineUsers();
        loadSuggestions();
        loadNotifications();
        loadChats();
        
    } else {
        currentUser = null;
        loginPage.classList.add("active");
        appPage.classList.remove("active");
        
        if (postsUnsubscribe) postsUnsubscribe();
        if (notificationsUnsubscribe) notificationsUnsubscribe();
        if (messagesUnsubscribe) messagesUnsubscribe();
    }
});

// Update UI
function updateUI(userData) {
    document.getElementById("profile-name").textContent = userData.fullName;
    document.getElementById("profile-specialty").textContent = userData.specialty;
    document.getElementById("profile-level").textContent = userData.level;
    document.getElementById("friends-count").textContent = userData.friends?.length || 0;
    
    const avatarUrl = userData.avatar;
    document.getElementById("nav-avatar").src = avatarUrl;
    document.getElementById("profile-avatar").src = avatarUrl;
    document.getElementById("post-avatar").src = avatarUrl;
    
    // Fill edit form
    document.getElementById("edit-firstname").value = userData.firstName || "";
    document.getElementById("edit-lastname").value = userData.lastName || "";
    document.getElementById("edit-specialty").value = userData.specialty;
    document.getElementById("edit-level").value = userData.level;
    document.getElementById("edit-wilaya").value = userData.wilaya;
}

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
        
        showMessage("✅ تم تحديث الصورة بنجاح!", "success");
        location.reload();
    } catch (error) {
        showMessage("❌ فشل رفع الصورة: " + error.message);
    }
});

// Save Profile
document.getElementById("save-profile")?.addEventListener("click", async () => {
    if (!currentUser) return;
    
    const firstName = document.getElementById("edit-firstname").value;
    const lastName = document.getElementById("edit-lastname").value;
    const specialty = document.getElementById("edit-specialty").value;
    const level = document.getElementById("edit-level").value;
    const wilaya = document.getElementById("edit-wilaya").value;
    
    try {
        await updateDoc(doc(db, "users", currentUser.uid), {
            firstName,
            lastName,
            fullName: `${firstName} ${lastName}`,
            specialty,
            level,
            wilaya
        });
        
        await updateProfile(auth.currentUser, { displayName: `${firstName} ${lastName}` });
        
        showMessage("✅ تم تحديث الملف الشخصي!", "success");
        document.getElementById("edit-profile-modal").classList.remove("open");
        location.reload();
    } catch (error) {
        showMessage("❌ " + error.message);
    }
});

// Load Posts
async function loadPosts() {
    const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
    
    postsUnsubscribe = onSnapshot(q, async (snapshot) => {
        const postsFeed = document.getElementById("posts-feed");
        postsFeed.innerHTML = "";
        
        for (const docSnap of snapshot.docs) {
            const post = docSnap.data();
            const userDoc = await getDoc(doc(db, "users", post.userId));
            const userData = userDoc.exists() ? userDoc.data() : null;
            
            const postElement = createPostElement(docSnap.id, post, userData);
            postsFeed.appendChild(postElement);
        }
        
        document.getElementById("posts-count").textContent = snapshot.size;
    });
}

function createPostElement(postId, post, userData) {
    const div = document.createElement("div");
    div.className = "post-card";
    
    const isLiked = post.likes?.includes(currentUser?.uid);
    const timeAgo = post.timestamp ? formatTimeAgo(post.timestamp.toDate()) : "الآن";
    
    div.innerHTML = `
        <div class="post-header">
            <div class="post-user">
                <img src="${userData?.avatar || 'https://via.placeholder.com/50'}" alt="">
                <div class="post-user-info">
                    <h4>${escapeHtml(userData?.fullName || 'مستخدم')}</h4>
                    <p>${escapeHtml(userData?.specialty || '')} • ${timeAgo}</p>
                </div>
            </div>
        </div>
        <div class="post-content">
            <p>${escapeHtml(post.text || '')}</p>
            ${post.imageUrl ? `<img src="${post.imageUrl}" class="post-image" alt="">` : ''}
        </div>
        <div class="post-stats">
            <button class="like-btn ${isLiked ? 'liked' : ''}" data-id="${postId}">
                <i class="fas fa-heart"></i> ${post.likes?.length || 0}
            </button>
            <button class="comment-btn" data-id="${postId}">
                <i class="fas fa-comment"></i> ${post.comments?.length || 0}
            </button>
        </div>
        <div class="comments-section" id="comments-${postId}" style="display: none;">
            <div class="comment-input">
                <input type="text" id="comment-input-${postId}" placeholder="اكتب تعليقاً...">
                <button class="comment-submit" data-id="${postId}">نشر</button>
            </div>
            <div id="comments-list-${postId}"></div>
        </div>
    `;
    
    const likeBtn = div.querySelector(".like-btn");
    if (likeBtn) likeBtn.addEventListener("click", () => toggleLike(postId));
    
    const commentBtn = div.querySelector(".comment-btn");
    if (commentBtn) commentBtn.addEventListener("click", () => toggleComments(postId));
    
    const commentSubmit = div.querySelector(".comment-submit");
    if (commentSubmit) commentSubmit.addEventListener("click", () => addComment(postId));
    
    if (post.comments) {
        const commentsList = div.querySelector(`#comments-list-${postId}`);
        if (commentsList) {
            commentsList.innerHTML = "";
            post.comments.forEach(comment => {
                const commentDiv = document.createElement("div");
                commentDiv.className = "comment";
                commentDiv.innerHTML = `<strong>${escapeHtml(comment.userName)}</strong>: ${escapeHtml(comment.text)}`;
                commentsList.appendChild(commentDiv);
            });
        }
    }
    
    return div;
}

async function toggleLike(postId) {
    if (!currentUser) return;
    
    const postRef = doc(db, "posts", postId);
    const postDoc = await getDoc(postRef);
    const postData = postDoc.data();
    
    if (postData.likes?.includes(currentUser.uid)) {
        await updateDoc(postRef, { likes: arrayRemove(currentUser.uid) });
    } else {
        await updateDoc(postRef, { likes: arrayUnion(currentUser.uid) });
        
        if (postData.userId !== currentUser.uid) {
            await addDoc(collection(db, "notifications"), {
                userId: postData.userId,
                fromUserId: currentUser.uid,
                type: "like",
                postId: postId,
                read: false,
                timestamp: serverTimestamp()
            });
        }
    }
}

function toggleComments(postId) {
    const commentsSection = document.getElementById(`comments-${postId}`);
    if (commentsSection) {
        commentsSection.style.display = commentsSection.style.display === "none" ? "block" : "none";
    }
}

async function addComment(postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    const text = input?.value.trim();
    if (!text || !currentUser) return;
    
    const postRef = doc(db, "posts", postId);
    const postDoc = await getDoc(postRef);
    const postData = postDoc.data();
    
    const comment = {
        userId: currentUser.uid,
        userName: currentUser.displayName,
        text: text,
        timestamp: new Date()
    };
    
    await updateDoc(postRef, {
        comments: arrayUnion(comment)
    });
    
    input.value = "";
    
    if (postData.userId !== currentUser.uid) {
        await addDoc(collection(db, "notifications"), {
            userId: postData.userId,
            fromUserId: currentUser.uid,
            type: "comment",
            postId: postId,
            read: false,
            timestamp: serverTimestamp()
        });
    }
}

// Create Post
document.getElementById("submit-post")?.addEventListener("click", async () => {
    const text = document.getElementById("post-text").value.trim();
    if (!text) {
        showMessage("الرجاء كتابة محتوى المنشور");
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
        showMessage("✅ تم نشر المنشور!", "success");
        
    } catch (error) {
        showMessage("❌ " + error.message);
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
                    <img src="${user.avatar}" class="online-avatar" alt="">
                    <div class="online-info">
                        <h5>${escapeHtml(user.fullName)}</h5>
                        <p>${escapeHtml(user.specialty)}</p>
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
                    <h5>${escapeHtml(user.fullName)}</h5>
                    <p>${escapeHtml(user.specialty)}</p>
                </div>
                <button class="add-friend-btn" data-id="${user.uid}">➕ إضافة</button>
            `;
            suggestionsList.appendChild(item);
        }
    });
    
    document.querySelectorAll(".add-friend-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            const friendId = btn.dataset.id;
            await updateDoc(doc(db, "users", currentUser.uid), {
                friends: arrayUnion(friendId)
            });
            showMessage("✅ تم إضافة الصديق!", "success");
        });
    });
}

// Load Notifications
async function loadNotifications() {
    if (!currentUser) return;
    
    const q = query(
        collection(db, "notifications"),
        where("userId", "==", currentUser.uid),
        orderBy("timestamp", "desc")
    );
    
    notificationsUnsubscribe = onSnapshot(q, async (snapshot) => {
        const notifList = document.getElementById("notifications-list");
        const unreadCount = snapshot.docs.filter(doc => !doc.data().read).length;
        document.getElementById("notif-badge").textContent = unreadCount;
        
        notifList.innerHTML = "";
        
        for (const docSnap of snapshot.docs) {
            const notif = docSnap.data();
            const fromUser = await getDoc(doc(db, "users", notif.fromUserId));
            const fromData = fromUser.exists() ? fromUser.data() : null;
            
            const item = document.createElement("div");
            item.className = `notification-item ${!notif.read ? 'unread' : ''}`;
            item.onclick = async () => {
                await updateDoc(doc(db, "notifications", docSnap.id), { read: true });
            };
            
            let message = "";
            if (notif.type === "like") message = "أعجب بمنشورك";
            if (notif.type === "comment") message = "علق على منشورك";
            
            item.innerHTML = `
                <div class="notif-icon">
                    <i class="fas fa-${notif.type === 'like' ? 'heart' : 'comment'}"></i>
                </div>
                <div class="notif-content">
                    <p><strong>${escapeHtml(fromData?.fullName || 'مستخدم')}</strong> ${message}</p>
                    <span class="notif-time">${notif.timestamp ? formatTimeAgo(notif.timestamp.toDate()) : 'الآن'}</span>
                </div>
            `;
            notifList.appendChild(item);
        }
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
                <div class="chat-info">
                    <h4>${escapeHtml(friend.fullName)}</h4>
                    <p>${escapeHtml(friend.specialty)}</p>
                </div>
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
    document.getElementById("conv-status").textContent = user.online ? "🟢 متصل الآن" : "⚫ غير متصل";
    document.getElementById("conv-status").style.color = user.online ? "#10b981" : "#a3a3a3";
    
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
        timestamp: serverTimestamp(),
        read: false
    });
    
    input.value = "";
});

document.getElementById("message-input")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        document.getElementById("send-message").click();
    }
});

document.getElementById("back-to-chats")?.addEventListener("click", () => {
    document.getElementById("chats-list").classList.remove("hidden");
    document.getElementById("chat-conversation").classList.add("hidden");
    if (messagesUnsubscribe) messagesUnsubscribe();
    currentChatUser = null;
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

document.getElementById("profile-link")?.addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("profile-dropdown").classList.remove("show");
    window.scrollTo({ top: 0, behavior: "smooth" });
});

document.getElementById("edit-profile-link")?.addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("profile-dropdown").classList.remove("show");
    document.getElementById("edit-profile-modal").classList.add("open");
});

document.querySelectorAll(".close-modal, .modal .close-modal")?.forEach(btn => {
    btn.addEventListener("click", () => {
        document.getElementById("edit-profile-modal")?.classList.remove("open");
    });
});

// Search Users
document.getElementById("search-users")?.addEventListener("input", async (e) => {
    const searchTerm = e.target.value.toLowerCase();
    if (!searchTerm) return;
    
    const q = query(collection(db, "users"));
    const snapshot = await getDocs(q);
    
    snapshot.forEach((doc) => {
        const user = doc.data();
        if (user.fullName.toLowerCase().includes(searchTerm) && user.uid !== currentUser?.uid) {
            console.log("Found:", user.fullName);
        }
    });
});

console.log("✅ DZ Teach App initialized successfully!");
