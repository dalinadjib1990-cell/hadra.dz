// 🔥 Firebase Config (مفتاحك)
var firebaseConfig = {
  apiKey: "AIzaSyDg_T6I4mksgG1mgxTnhQI0DA4MhBYGDqU",
  authDomain: "hadra-dz.firebaseapp.com",
  databaseURL: "https://hadra-dz-default-rtdb.firebaseio.com",
  projectId: "hadra-dz",
  storageBucket: "hadra-dz.firebasestorage.app",
  messagingSenderId: "765723444730",
  appId: "1:765723444730:web:4d816875f8e8a45f939043"
};

firebase.initializeApp(firebaseConfig);

var auth = firebase.auth();
var db = firebase.firestore();
var storage = firebase.storage();
var rtdb = firebase.database();

var currentChatUser=null;

// ================= AUTH =================
function register(){
  auth.createUserWithEmailAndPassword(email.value,password.value)
  .then(()=>saveUser());
}

function login(){
  auth.signInWithEmailAndPassword(email.value,password.value)
  .then(()=>loadUsers());
}

function saveUser(){
  var u=auth.currentUser;
  db.collection("users").doc(u.uid).set({
    email:u.email,
    name:"أستاذ"
  });
}

// ================= USERS =================
function loadUsers(){
  db.collection("users").onSnapshot(snap=>{
    users.innerHTML="";
    snap.forEach(doc=>{
      if(doc.id!==auth.currentUser.uid){
        users.innerHTML+=`
        <div class="card">
          ${doc.data().email}
          <button onclick="follow('${doc.id}')">متابعة</button>
          <button onclick="openChat('${doc.id}')">💬</button>
        </div>`;
      }
    });
  });
}

// FOLLOW
function follow(id){
  db.collection("followers").add({
    from:auth.currentUser.uid,
    to:id
  });

  addNotif(id,"🔔 لديك متابع جديد");
}

// ================= POSTS =================
async function addPost(){
  var file=postImage.files[0];
  var url="";

  if(file){
    var ref=storage.ref("posts/"+Date.now());
    await ref.put(file);
    url=await ref.getDownloadURL();
  }

  db.collection("posts").add({
    uid:auth.currentUser.uid,
    text:postText.value,
    image:url,
    likes:0,
    time:Date.now()
  });

  notify("📢 منشور جديد");
}

// LOAD POSTS
db.collection("posts").orderBy("time","desc")
.onSnapshot(async snap=>{
  posts.innerHTML="";

  for(const doc of snap.docs){
    var p=doc.data();
    var user=await db.collection("users").doc(p.uid).get();
    var u=user.data();

    posts.innerHTML+=`
    <div class="card post">
      <b>${u.name}</b>
      <p>${p.text}</p>
      ${p.image?`<img src="${p.image}">`:""}
      <button onclick="like('${doc.id}',${p.likes})">
      ❤️ ${p.likes}
      </button>

      <div id="c-${doc.id}"></div>
      <input placeholder="تعليق"
      onkeypress="comment(event,'${doc.id}')">
    </div>
    `;

    loadComments(doc.id);
  }
});

// LIKE
function like(id,l){
  db.collection("posts").doc(id).update({likes:l+1});
}

// COMMENTS
function comment(e,id){
  if(e.key==="Enter"){
    db.collection("posts").doc(id)
    .collection("comments").add({
      text:e.target.value
    });
    e.target.value="";
  }
}

function loadComments(id){
  db.collection("posts").doc(id)
  .collection("comments")
  .onSnapshot(snap=>{
    var div=document.getElementById("c-"+id);
    div.innerHTML="";
    snap.forEach(c=>{
      div.innerHTML+=`<p>💬 ${c.data().text}</p>`;
    });
  });
}

// ================= CHAT =================
function openChat(uid){
  currentChatUser=uid;
  chatTitle.innerText="💬 دردشة خاصة";
}

function sendPrivate(){
  if(!currentChatUser)return;

  rtdb.ref("privateChats").push({
    from:auth.currentUser.uid,
    to:currentChatUser,
    text:chatInput.value
  });

  chatInput.value="";
}

rtdb.ref("privateChats").on("child_added",snap=>{
  var m=snap.val();

  if(
    (m.from===auth.currentUser.uid && m.to===currentChatUser) ||
    (m.from===currentChatUser && m.to===auth.currentUser.uid)
  ){
    var div=document.createElement("div");
    div.innerText=m.text;
    chatBox.appendChild(div);
  }
});

// ================= NOTIFICATIONS =================
function addNotif(uid,text){
  db.collection("notifications").add({
    user:uid,
    text:text,
    time:Date.now()
  });
}

db.collection("notifications").onSnapshot(snap=>{
  notif.innerHTML="";
  snap.forEach(doc=>{
    var n=doc.data();
    if(n.user===auth.currentUser?.uid){
      notif.innerHTML+=`<p>${n.text}</p>`;
    }
  });
});

// ================= BROWSER NOTIF =================
function notify(text){
  if(Notification.permission==="granted"){
    new Notification(text);
  }else{
    Notification.requestPermission();
  }
}
