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
document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const tab = btn.dataset.tab;
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        document.querySelectorAll(".form-container").forEach(form => form.classList.remove("active"));
        document.getElementById(`${tab}-form`).classList.add("active");
    });
});

// Register User
registerSubmit.addEventListener("click", async () => {
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
        
        await updateProfile(user, {
            displayName: `${firstName} ${lastName}`
        });
        
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            firstName: firstName,
            lastName: lastName,
            fullName: `${firstName} ${lastName}`,
            specialty: specialty,
            level: level,
            wilaya: wilaya,
            email: email,
            avatar: "https://via.placeholder.com/100",
            createdAt: serverTimestamp(),
            friends: [],
            online: true,
            lastSeen: serverTimestamp()
        });
        
        alert("تم إنشاء الحساب بنجاح!");
    } catch (error) {
        alert(error.message);
    }
});

// Login
loginSubmit.addEventListener("click", async () => {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        alert(error.message);
    }
});

// Google Login
googleLogin.addEventListener("click", async () => {
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
                avatar: user.photoURL || "https://via.placeholder.com/100",
                createdAt: serverTimestamp(),
                friends: [],
                online: true,
                lastSeen: serverTimestamp()
            });
        } else {
            await updateDoc(doc(db, "users", user.uid), {
                online: true,
                lastSeen: serverTimestamp()
            });
        }
    } catch (error) {
        alert(error.message);
    }
});

// Logout
logoutBtn.addEventListener("click", async () => {
    if (currentUser) {
        await updateDoc(doc(db, "users", currentUser.uid), {
            online: false,
            lastSeen: serverTimestamp()
        });
    }
    await signOut(auth);
});

// Auth State Listener
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        loginPage.classList.remove("active");
        appPage.classList.add("active");
        
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            updateUIWithUserData(userData);
        }
        
        updateUserOnlineStatus(true);
        loadPosts();
        loadOnlineUsers();
        loadSuggestions();
        loadNotifications();
        setupRealtimeListeners();
    } else {
        currentUser = null;
        loginPage.classList.add("active");
        appPage.classList.remove("active");
        
        if (messagesListener) messagesListener();
        if (postsListener) postsListener();
        if (notificationsListener) notificationsListener();
    }
});

// Update UI with User Data
function updateUIWithUserData(userData) {
    document.getElementById("sidebar-name").textContent = userData.fullName;
    document.getElementById("sidebar-specialty").textContent = userData.specialty;
    document.getElementById("sidebar-level").textContent = userData.level;
    document.getElementById("sidebar-wilaya").textContent = userData.wilaya;
    
    const avatarUrl = userData.avatar;
    document.getElementById("profile-avatar").src = avatarUrl;
    document.getElementById("sidebar-avatar").src = avatarUrl;
    document.getElementById("post-avatar").src = avatarUrl;
}

// Update User Online Status
async function updateUserOnlineStatus(isOnline) {
    if (currentUser) {
        await updateDoc(doc(db, "users", currentUser.uid), {
            online: isOnline,
            lastSeen: serverTimestamp()
        });
    }
}

// Load Posts
async function loadPosts() {
    const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
    
    postsListener = onSnapshot(q, (snapshot) => {
        postsContainer.innerHTML = "";
        snapshot.forEach(async (doc) => {
            const post = doc.data();
            const postId = doc.id;
            const userDoc = await getDoc(doc(db, "users", post.userId));
            const userData = userDoc.exists() ? userDoc.data() : null;
            
            const postElement = createPostElement(postId, post, userData);
            postsContainer.appendChild(postElement);
        });
    });
}

// Create Post Element
function createPostElement(postId, post, userData) {
    const div = document.createElement("div");
    div.className = "post-card";
    
    const isLiked = post.likes && post.likes.includes(currentUser?.uid);
    
    div.innerHTML = `
        <div class="post-header">
            <div class="post-user">
                <img src="${userData?.avatar || 'https://via.placeholder.com/50'}" alt="Avatar">
                <div class="post-user-info">
                    <h4>${userData?.fullName || 'مستخدم'}</h4>
                    <p>${userData?.specialty || ''} • ${new Date(post.timestamp?.toDate()).toLocaleString('ar-DZ')}</p>
                </div>
            </div>
        </div>
        <div class="post-content">
            <p>${post.text}</p>
            ${post.imageUrl ? `<img src="${post.imageUrl}" class="post-image" alt="Post image">` : ''}
        </div>
        <div class="post-stats">
            <button class="like-btn ${isLiked ? 'liked' : ''}" data-postid="${postId}">
                <i class="fas fa-heart"></i> ${post.likes?.length || 0}
            </button>
            <button class="comment-toggle-btn" data-postid="${postId}">
                <i class="fas fa-comment"></i> ${post.comments?.length || 0}
            </button>
        </div>
        <div class="comments-section" id="comments-${postId}" style="display: none;">
            <div class="comment-input">
                <input type="text" id="comment-input-${postId}" placeholder="اكتب تعليقاً...">
                <button class="comment-submit" data-postid="${postId}">نشر</button>
            </div>
            <div id="comments-list-${postId}"></div>
        </div>
    `;
    
    const likeBtn = div.querySelector(".like-btn");
    likeBtn.addEventListener("click", () => toggleLike(postId));
    
    const commentToggle = div.querySelector(".comment-toggle-btn");
    commentToggle.addEventListener("click", () => {
        const commentsSection = div.querySelector(`.comments-section`);
        commentsSection.style.display = commentsSection.style.display === "none" ? "block" : "none";
        if (commentsSection.style.display === "block") {
            loadComments(postId);
        }
    });
    
    const commentSubmit = div.querySelector(".comment-submit");
    commentSubmit.addEventListener("click", () => addComment(postId));
    
    return div;
}

// Toggle Like
async function toggleLike(postId) {
    if (!currentUser) return;
    
    const postRef = doc(db, "posts", postId);
    const postDoc = await getDoc(postRef);
    const postData = postDoc.data();
    
    if (postData.likes && postData.likes.includes(currentUser.uid)) {
        await updateDoc(postRef, {
            likes: arrayRemove(currentUser.uid)
        });
    } else {
        await updateDoc(postRef, {
            likes: arrayUnion(currentUser.uid)
        });
        
        // Create notification
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

// Add Comment
async function addComment(postId) {
    const commentInput = document.getElementById(`comment-input-${postId}`);
    const commentText = commentInput.value.trim();
    
    if (!commentText || !currentUser) return;
    
    const postRef = doc(db, "posts", postId);
    const postDoc = await getDoc(postRef);
    const postData = postDoc.data();
    
    const comment = {
        userId: currentUser.uid,
        userName: currentUser.displayName,
        text: commentText,
        timestamp: new Date()
    };
    
    await updateDoc(postRef, {
        comments: arrayUnion(comment)
    });
    
    commentInput.value = "";
    
    // Create notification
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
    
    loadComments(postId);
}

// Load Comments
async function loadComments(postId) {
    const postRef = doc(db, "posts", postId);
    const postDoc = await getDoc(postRef);
    const postData = postDoc.data();
    const commentsList = document.getElementById(`comments-list-${postId}`);
    
    if (commentsList && postData.comments) {
        commentsList.innerHTML = "";
        postData.comments.forEach(comment => {
            const commentDiv = document.createElement("div");
            commentDiv.className = "comment";
            commentDiv.innerHTML = `<strong>${comment.userName}</strong>: ${comment.text}`;
            commentsList.appendChild(commentDiv);
        });
    }
}

// Create Post
submitPostBtn.addEventListener("click", async () => {
    const text = postInput.value.trim();
    if (!text && !currentImageUrl) return;
    
    try {
        const postData = {
            userId: currentUser.uid,
            text: text,
            timestamp: serverTimestamp(),
            likes: [],
            comments: []
        };
        
        if (currentImageUrl) {
            postData.imageUrl = currentImageUrl;
        }
        
        await addDoc(collection(db, "posts"), postData);
        postInput.value = "";
        currentImageUrl = null;
        
        alert("تم نشر المنشور بنجاح!");
    } catch (error) {
        console.error("Error creating post:", error);
        alert("حدث خطأ أثناء نشر المنشور");
    }
});

let currentImageUrl = null;

imageUploadBtn.addEventListener("click", () => {
    imageFile.click();
});

imageFile.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (file) {
        const storageRef = ref(storage, `posts/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        currentImageUrl = await getDownloadURL(storageRef);
        alert("تم رفع الصورة بنجاح!");
    }
});

// Load Online Users
async function loadOnlineUsers() {
    const q = query(collection(db, "users"), where("online", "==", true));
    
    onSnapshot(q, (snapshot) => {
        onlineUsersList.innerHTML = "";
        snapshot.forEach((doc) => {
            const user = doc.data();
            if (user.uid !== currentUser?.uid) {
                const userDiv = document.createElement("div");
                userDiv.className = "online-user";
                userDiv.onclick = () => startChat(user.uid, user.fullName, user.avatar);
                userDiv.innerHTML = `
                    <img src="${user.avatar}" alt="Avatar">
                    <div class="online-user-info">
                        <h5>${user.fullName}</h5>
                        <p>${user.specialty}</p>
                    </div>
                `;
                onlineUsersList.appendChild(userDiv);
            }
        });
    });
}

// Load Suggestions
async function loadSuggestions() {
    const q = query(collection(db, "users"));
    const snapshot = await getDocs(q);
    
    suggestionsList.innerHTML = "";
    snapshot.forEach((doc) => {
        const user = doc.data();
        if (user.uid !== currentUser?.uid) {
            const suggestionDiv = document.createElement("div");
            suggestionDiv.className = "suggestion-item";
            suggestionDiv.innerHTML = `
                <div>
                    <strong>${user.fullName}</strong>
                    <p style="font-size: 12px; color: #666;">${user.specialty}</p>
                </div>
                <button class="add-friend-btn" data-uid="${user.uid}">إضافة</button>
            `;
            suggestionsList.appendChild(suggestionDiv);
        }
    });
    
    document.querySelectorAll(".add-friend-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const friendId = btn.dataset.uid;
            await addFriend(friendId);
        });
    });
}

// Add Friend
async function addFriend(friendId) {
    if (!currentUser) return;
    
    await updateDoc(doc(db, "users", currentUser.uid), {
        friends: arrayUnion(friendId)
    });
    
    alert("تم إضافة الصديق بنجاح!");
}

// Start Chat
async function startChat(userId, userName, userAvatar) {
    chatWindow.classList.remove("hidden");
    const activeChat = document.getElementById("active-chat");
    const chatsList = document.getElementById("chats-list");
    
    activeChat.classList.remove("hidden");
    chatsList.classList.add("hidden");
    
    document.getElementById("chat-user-name").textContent = userName;
    document.getElementById("chat-user-avatar").src = userAvatar;
    
    const chatId = [currentUser.uid, userId].sort().join("_");
    
    if (messagesListener) messagesListener();
    
    const q = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "asc"));
    messagesListener = onSnapshot(q, (snapshot) => {
        const messagesDiv = document.getElementById("chat-messages");
        messagesDiv.innerHTML = "";
        snapshot.forEach((doc) => {
            const msg = doc.data();
            const messageDiv = document.createElement("div");
            messageDiv.className = `message ${msg.senderId === currentUser.uid ? 'sent' : 'received'}`;
            messageDiv.textContent = msg.text;
            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        });
    });
    
    const sendBtn = document.getElementById("send-message-btn");
    const messageInput = document.getElementById("chat-message-input");
    
    const newSendHandler = async () => {
        const text = messageInput.value.trim();
        if (!text) return;
        
        await addDoc(collection(db, "chats", chatId, "messages"), {
            senderId: currentUser.uid,
            text: text,
            timestamp: serverTimestamp(),
            read: false
        });
        
        messageInput.value = "";
    };
    
    sendBtn.onclick = newSendHandler;
    messageInput.onkeypress = (e) => {
        if (e.key === "Enter") newSendHandler();
    };
}

// Load Notifications
async function loadNotifications() {
    if (!currentUser) return;
    
    const q = query(collection(db, "notifications"), where("userId", "==", currentUser.uid), orderBy("timestamp", "desc"));
    
    notificationsListener = onSnapshot(q, (snapshot) => {
        const notifList = document.getElementById("notifications-list");
        const unreadCount = snapshot.docs.filter(doc => !doc.data().read).length;
        document.getElementById("notif-badge").textContent = unreadCount;
        
        notifList.innerHTML = "";
        snapshot.forEach(async (doc) => {
            const notif = doc.data();
            const fromUser = await getDoc(doc(db, "users", notif.fromUserId));
            const fromUserData = fromUser.exists() ? fromUser.data() : null;
            
            const notifDiv = document.createElement("div");
            notifDiv.className = "notification-item";
            notifDiv.onclick = async () => {
                await updateDoc(doc(db, "notifications", doc.id), { read: true });
                if (notif.type === "like" || notif.type === "comment") {
                    // Scroll to post
                }
            };
            
            let message = "";
            if (notif.type === "like") message = `أعجب بمنشورك`;
            if (notif.type === "comment") message = `علق على منشورك`;
            if (notif.type === "friend") message = `أضافك كصديق`;
            
            notifDiv.innerHTML = `
                <strong>${fromUserData?.fullName || 'مستخدم'}</strong>
                <p>${message}</p>
                <small>${new Date(notif.timestamp?.toDate()).toLocaleString('ar-DZ')}</small>
            `;
            notifList.appendChild(notifDiv);
        });
    });
}

// Search Users
searchUsers.addEventListener("input", async (e) => {
    const searchTerm = e.target.value.toLowerCase();
    if (!searchTerm) return;
    
    const q = query(collection(db, "users"));
    const snapshot = await getDocs(q);
    const results = [];
    
    snapshot.forEach((doc) => {
        const user = doc.data();
        if (user.fullName.toLowerCase().includes(searchTerm) && user.uid !== currentUser?.uid) {
            results.push(user);
        }
    });
    
    // Show search results (you can implement a modal or dropdown)
    console.log("Search results:", results);
});

// UI Event Listeners
profileDropdown.addEventListener("click", () => {
    dropdownMenu.classList.toggle("show");
});

messagesBtn.addEventListener("click", () => {
    chatWindow.classList.remove("hidden");
    notificationsWindow.classList.add("hidden");
    document.getElementById("chats-list").classList.remove("hidden");
    document.getElementById("active-chat").classList.add("hidden");
});

notificationsBtn.addEventListener("click", () => {
    notificationsWindow.classList.toggle("hidden");
    chatWindow.classList.add("hidden");
});

closeChat.addEventListener("click", () => {
    chatWindow.classList.add("hidden");
});

closeNotifications.addEventListener("click", () => {
    notificationsWindow.classList.add("hidden");
});

document.getElementById("close-active-chat").addEventListener("click", () => {
    document.getElementById("active-chat").classList.add("hidden");
    document.getElementById("chats-list").classList.remove("hidden");
});

// Setup Realtime Listeners
function setupRealtimeListeners() {
    // Listen for user status changes
    onSnapshot(collection(db, "users"), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "modified") {
                const user = change.doc.data();
                updateOnlineUsersList();
            }
        });
    });
}

function updateOnlineUsersList() {
    // Refresh online users list
    loadOnlineUsers();
}

// Close dropdown when clicking outside
document.addEventListener("click", (e) => {
    if (!profileDropdown.contains(e.target)) {
        dropdownMenu.classList.remove("show");
    }
});

console.log("DZ Teach App initialized successfully!");
