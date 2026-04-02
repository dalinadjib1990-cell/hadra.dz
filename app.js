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

// ==================== Firebase Configuration ====================
const firebaseConfig = {
    apiKey: "AIzaSyDg_T6I4mksgG1mgxTnhQI0DA4MhBYGDqU",
    authDomain: "hadra-dz.firebaseapp.com",
    projectId: "hadra-dz",
    storageBucket: "hadra-dz.appspot.com",
    messagingSenderId: "765723444730",
    appId: "1:765723444730:web:4d816875f8e8a45f939043"
};

// ==================== Initialize Firebase ====================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

// ==================== Global Variables ====================
let currentUser = null;
let currentChatUser = null;
let messagesUnsubscribe = null;
let postsUnsubscribe = null;

// ==================== DOM Elements ====================
const loader = document.getElementById('loader');
const authScreen = document.getElementById('auth-screen');
const mainScreen = document.getElementById('main-screen');

// ==================== Helper Functions ====================
function showMessage(msg, isError = true) {
    alert(msg);
}

function formatTime(date) {
    if (!date) return '';
    const d = date.toDate();
    return d.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' });
}

// ==================== Hide Loader ====================
setTimeout(() => {
    loader.style.display = 'none';
}, 1000);

// ==================== Auth Tabs ====================
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
        document.getElementById(`${tab}-panel`).classList.add('active');
    });
});

// ==================== Register ====================
document.getElementById('do-register')?.addEventListener('click', async () => {
    const firstName = document.getElementById('reg-firstname').value;
    const lastName = document.getElementById('reg-lastname').value;
    const specialty = document.getElementById('reg-specialty').value;
    const level = document.getElementById('reg-level').value;
    const wilaya = document.getElementById('reg-wilaya').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    if (!firstName || !lastName || !specialty || !level || !wilaya || !email || !password) {
        showMessage('الرجاء ملء جميع الحقول');
        return;
    }

    try {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCred.user;
        await updateProfile(user, { displayName: `${firstName} ${lastName}` });
        
        await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            firstName, lastName,
            fullName: `${firstName} ${lastName}`,
            specialty, level, wilaya,
            email,
            avatar: `https://ui-avatars.com/api/?background=8b5cf6&color=fff&size=200&name=${firstName}+${lastName}`,
            createdAt: serverTimestamp(),
            friends: [],
            online: true,
            postsCount: 0
        });
        
        showMessage('✅ تم إنشاء الحساب بنجاح!', false);
        document.querySelector('.tab-btn[data-tab="login"]').click();
        
        // Clear form
        ['reg-firstname', 'reg-lastname', 'reg-specialty', 'reg-level', 'reg-wilaya', 'reg-email', 'reg-password']
            .forEach(id => document.getElementById(id).value = '');
    } catch (error) {
        showMessage('❌ ' + error.message);
    }
});

// ==================== Login ====================
document.getElementById('do-login')?.addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        showMessage('❌ ' + error.message);
    }
});

// ==================== Google Login ====================
document.getElementById('google-login')?.addEventListener('click', async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
            await setDoc(userRef, {
                uid: user.uid,
                firstName: user.displayName?.split(' ')[0] || '',
                lastName: user.displayName?.split(' ')[1] || '',
                fullName: user.displayName || user.email,
                specialty: 'غير محدد',
                level: 'غير محدد',
                wilaya: 'غير محدد',
                email: user.email,
                avatar: user.photoURL || `https://ui-avatars.com/api/?background=8b5cf6&color=fff&size=200&name=${user.displayName || user.email}`,
                createdAt: serverTimestamp(),
                friends: [],
                online: true,
                postsCount: 0
            });
        } else {
            await updateDoc(userRef, { online: true });
        }
    } catch (error) {
        showMessage('❌ ' + error.message);
    }
});

// ==================== Logout ====================
document.getElementById('logout-link')?.addEventListener('click', async () => {
    if (currentUser) {
        await updateDoc(doc(db, 'users', currentUser.uid), { online: false });
    }
    await signOut(auth);
});

// ==================== Auth State Listener ====================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        authScreen.style.display = 'none';
        mainScreen.style.display = 'block';
        
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
            const data = userDoc.data();
            updateUI(data);
        }
        
        await updateDoc(doc(db, 'users', user.uid), { online: true });
        
        loadPosts();
        loadOnlineUsers();
        loadSuggestions();
        loadChats();
    } else {
        currentUser = null;
        authScreen.style.display = 'flex';
        mainScreen.style.display = 'none';
        
        if (postsUnsubscribe) postsUnsubscribe();
        if (messagesUnsubscribe) messagesUnsubscribe();
    }
});

// ==================== Update UI ====================
function updateUI(data) {
    document.getElementById('profile-name').textContent = data.fullName;
    document.getElementById('profile-specialty').textContent = data.specialty;
    document.getElementById('user-avatar').src = data.avatar;
    document.getElementById('profile-img').src = data.avatar;
    document.getElementById('post-avatar').src = data.avatar;
    document.getElementById('friends-count').textContent = data.friends?.length || 0;
    
    document.getElementById('edit-firstname').value = data.firstName || '';
    document.getElementById('edit-lastname').value = data.lastName || '';
    document.getElementById('edit-specialty').value = data.specialty;
}

// ==================== Avatar Upload ====================
document.getElementById('avatar-input')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file || !currentUser) return;
    
    try {
        const storageRef = ref(storage, `avatars/${currentUser.uid}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        await updateDoc(doc(db, 'users', currentUser.uid), { avatar: url });
        await updateProfile(auth.currentUser, { photoURL: url });
        showMessage('✅ تم تحديث الصورة!', false);
        location.reload();
    } catch (error) {
        showMessage('❌ ' + error.message);
    }
});

// ==================== Save Profile ====================
document.getElementById('save-profile')?.addEventListener('click', async () => {
    const firstName = document.getElementById('edit-firstname').value;
    const lastName = document.getElementById('edit-lastname').value;
    const specialty = document.getElementById('edit-specialty').value;
    
    try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
            firstName, lastName,
            fullName: `${firstName} ${lastName}`,
            specialty
        });
        await updateProfile(auth.currentUser, { displayName: `${firstName} ${lastName}` });
        showMessage('✅ تم حفظ التغييرات!', false);
        document.getElementById('edit-modal').classList.remove('open');
        location.reload();
    } catch (error) {
        showMessage('❌ ' + error.message);
    }
});

// ==================== Load Posts ====================
async function loadPosts() {
    const q = query(collection(db, 'posts'), orderBy('timestamp', 'desc'));
    
    postsUnsubscribe = onSnapshot(q, async (snapshot) => {
        const container = document.getElementById('posts-container');
        container.innerHTML = '';
        
        for (const docSnap of snapshot.docs) {
            const post = docSnap.data();
            const userDoc = await getDoc(doc(db, 'users', post.userId));
            const user = userDoc.exists() ? userDoc.data() : null;
            const isLiked = post.likes?.includes(currentUser?.uid);
            
            const div = document.createElement('div');
            div.className = 'post-card';
            div.innerHTML = `
                <div class="post-header">
                    <img src="${user?.avatar || 'https://via.placeholder.com/48'}" alt="">
                    <div>
                        <strong>${user?.fullName || 'مستخدم'}</strong>
                        <small style="color:var(--text-muted); display:block">${user?.specialty || ''}</small>
                    </div>
                </div>
                <div class="post-content">
                    <p>${post.text || ''}</p>
                    ${post.imageUrl ? `<img src="${post.imageUrl}" class="post-image">` : ''}
                </div>
                <div class="post-actions">
                    <button class="like-btn ${isLiked ? 'liked' : ''}" data-id="${docSnap.id}">
                        <i class="fas fa-heart"></i> ${post.likes?.length || 0}
                    </button>
                </div>
            `;
            container.appendChild(div);
        }
        
        document.getElementById('posts-count').textContent = snapshot.size;
        
        document.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const postId = btn.dataset.id;
                const postRef = doc(db, 'posts', postId);
                const postDoc = await getDoc(postRef);
                const data = postDoc.data();
                
                if (data.likes?.includes(currentUser.uid)) {
                    await updateDoc(postRef, { likes: arrayRemove(currentUser.uid) });
                } else {
                    await updateDoc(postRef, { likes: arrayUnion(currentUser.uid) });
                }
            });
        });
    });
}

// ==================== Create Post ====================
document.getElementById('publish-post')?.addEventListener('click', async () => {
    const text = document.getElementById('post-input').value.trim();
    if (!text) {
        showMessage('اكتب شيئاً للنشر');
        return;
    }
    
    try {
        let imageUrl = null;
        const imageFile = document.getElementById('post-image-input').files[0];
        if (imageFile) {
            const refStorage = ref(storage, `posts/${Date.now()}_${imageFile.name}`);
            await uploadBytes(refStorage, imageFile);
            imageUrl = await getDownloadURL(refStorage);
        }
        
        await addDoc(collection(db, 'posts'), {
            userId: currentUser.uid,
            text,
            imageUrl,
            timestamp: serverTimestamp(),
            likes: [],
            comments: []
        });
        
        document.getElementById('post-input').value = '';
        document.getElementById('post-image-input').value = '';
        showMessage('✅ تم النشر!', false);
    } catch (error) {
        showMessage('❌ ' + error.message);
    }
});

// ==================== Load Online Users ====================
async function loadOnlineUsers() {
    const q = query(collection(db, 'users'), where('online', '==', true));
    
    onSnapshot(q, (snapshot) => {
        const container = document.getElementById('online-users');
        container.innerHTML = '';
        
        snapshot.forEach((doc) => {
            const user = doc.data();
            if (user.uid !== currentUser?.uid) {
                const div = document.createElement('div');
                div.className = 'online-user';
                div.innerHTML = `
                    <img src="${user.avatar}" class="online-avatar">
                    <div>
                        <div>${user.fullName}</div>
                        <small style="color:var(--success)">● متصل</small>
                    </div>
                `;
                div.onclick = () => startChat(user);
                container.appendChild(div);
            }
        });
    });
}

// ==================== Load Suggestions ====================
async function loadSuggestions() {
    const snapshot = await getDocs(collection(db, 'users'));
    const container = document.getElementById('suggestions');
    container.innerHTML = '';
    
    snapshot.forEach((doc) => {
        const user = doc.data();
        if (user.uid !== currentUser?.uid) {
            const div = document.createElement('div');
            div.className = 'online-user';
            div.innerHTML = `
                <img src="${user.avatar}" class="online-avatar">
                <div style="flex:1">
                    <div>${user.fullName}</div>
                    <small>${user.specialty}</small>
                </div>
                <button class="add-friend-btn" data-id="${user.uid}" style="background:var(--primary); border:none; padding:5px 12px; border-radius:20px; color:white; cursor:pointer">➕</button>
            `;
            container.appendChild(div);
        }
    });
    
    document.querySelectorAll('.add-friend-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const friendId = btn.dataset.id;
            await updateDoc(doc(db, 'users', currentUser.uid), {
                friends: arrayUnion(friendId)
            });
            showMessage('✅ تم إضافة الصديق!', false);
        });
    });
}

// ==================== Load Chats ====================
async function loadChats() {
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    const friendsIds = userDoc.data()?.friends || [];
    const container = document.getElementById('chat-list');
    container.innerHTML = '';
    
    for (const id of friendsIds) {
        const friendDoc = await getDoc(doc(db, 'users', id));
        if (friendDoc.exists()) {
            const friend = friendDoc.data();
            const div = document.createElement('div');
            div.className = 'chat-item';
            div.innerHTML = `
                <img src="${friend.avatar}" style="width:50px;height:50px;border-radius:50%">
                <div><strong>${friend.fullName}</strong></div>
            `;
            div.onclick = () => startChat(friend);
            container.appendChild(div);
        }
    }
}

// ==================== Start Chat ====================
function startChat(user) {
    currentChatUser = user;
    const chatWindow = document.getElementById('chat-window');
    const chatList = document.getElementById('chat-list');
    const conversation = document.getElementById('chat-conversation');
    
    chatWindow.classList.add('open');
    chatList.style.display = 'none';
    conversation.style.display = 'flex';
    
    document.getElementById('conv-name').textContent = user.fullName;
    document.getElementById('conv-avatar').src = user.avatar;
    
    loadMessages(user.uid);
}

// ==================== Load Messages ====================
function loadMessages(userId) {
    const chatId = [currentUser.uid, userId].sort().join('_');
    const container = document.getElementById('conv-messages');
    
    if (messagesUnsubscribe) messagesUnsubscribe();
    
    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('timestamp', 'asc'));
    messagesUnsubscribe = onSnapshot(q, (snapshot) => {
        container.innerHTML = '';
        snapshot.forEach((doc) => {
            const msg = doc.data();
            const div = document.createElement('div');
            div.className = `message ${msg.senderId === currentUser.uid ? 'sent' : 'received'}`;
            div.textContent = msg.text;
            container.appendChild(div);
        });
        container.scrollTop = container.scrollHeight;
    });
}

// ==================== Send Message ====================
document.getElementById('send-message')?.addEventListener('click', async () => {
    if (!currentChatUser) return;
    const input = document.getElementById('message-input');
    const text = input.value.trim();
    if (!text) return;
    
    const chatId = [currentUser.uid, currentChatUser.uid].sort().join('_');
    await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: currentUser.uid,
        text,
        timestamp: serverTimestamp()
    });
    input.value = '';
});

document.getElementById('message-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('send-message').click();
});

// ==================== Chat Navigation ====================
document.getElementById('back-chat')?.addEventListener('click', () => {
    document.getElementById('chat-list').style.display = 'block';
    document.getElementById('chat-conversation').style.display = 'none';
    if (messagesUnsubscribe) messagesUnsubscribe();
    currentChatUser = null;
});

// ==================== Toggle Windows ====================
document.getElementById('chat-icon')?.addEventListener('click', () => {
    document.getElementById('chat-window').classList.toggle('open');
    document.getElementById('notif-window').classList.remove('open');
});

document.getElementById('notif-icon')?.addEventListener('click', () => {
    document.getElementById('notif-window').classList.toggle('open');
    document.getElementById('chat-window').classList.remove('open');
});

document.getElementById('close-chat')?.addEventListener('click', () => {
    document.getElementById('chat-window').classList.remove('open');
});

document.getElementById('close-notif')?.addEventListener('click', () => {
    document.getElementById('notif-window').classList.remove('open');
});

// ==================== Profile Menu ====================
document.querySelector('.user-menu')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('user-dropdown').classList.toggle('show');
});

document.addEventListener('click', () => {
    document.getElementById('user-dropdown')?.classList.remove('show');
});

document.getElementById('profile-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.getElementById('edit-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('edit-modal').classList.add('open');
});

document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
        document.getElementById('edit-modal').classList.remove('open');
    });
});

console.log('✅ DZ Teach App Started!');
