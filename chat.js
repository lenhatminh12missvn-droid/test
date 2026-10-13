```javascript
import {
  initializeApp, getApps, getApp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

import {
  getAuth, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
  getFirestore, collection, doc, getDoc, getDocs,
  query, where, orderBy, limit, onSnapshot,
  addDoc, setDoc, updateDoc, serverTimestamp,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// Dùng đúng cấu hình Firebase đang có trong firebase-auth.js.
const firebaseConfig = {
  apiKey: "AIzaSyAZsQ8tpN8etdQCM4El43tVS0bXIW5C_NU",
  authDomain: "study-work-46ef5.firebaseapp.com",
  projectId: "study-work-46ef5",
  storageBucket: "study-work-46ef5.firebasestorage.app",
  messagingSenderId: "514974082929",
  appId: "1:514974082929:web:898aa29b441e607f9a78d0"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const $ = id => document.getElementById(id);

let me = null;
let activeId = null;
let conversations = [];
let stopList = null;
let stopMessages = null;
let busy = false;

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
}[c]));

function status(message) {
  $("chatStatus").textContent = message;
}

function stopListeners() {
  stopList?.();
  stopMessages?.();
  stopList = stopMessages = null;
}

function conversationName(c) {
  if (c.type === "group") return c.name || "Nhóm học tập";
  return c.memberNames?.[c.members.find(uid => uid !== me.uid)] || "Chat riêng";
}

function renderConversationList() {
  $("chatConversationList").innerHTML = conversations.map(c => `
    <button type="button"
      class="chat-conversation ${c.id === activeId ? "selected" : ""}"
      data-chat-id="${esc(c.id)}">
      <strong>${esc(conversationName(c))}</strong>
      <small>${esc(c.lastMessage || "Chưa có tin nhắn")}</small>
    </button>
  `).join("") || '<div class="empty-state">Chưa có cuộc trò chuyện.</div>';

  $("chatConversationList").querySelectorAll("[data-chat-id]").forEach(btn => {
    btn.addEventListener("click", () => openConversation(btn.dataset.chatId));
  });
}

function loadConversations() {
  stopList?.();
  const q = query(
    collection(db, "conversations"),
    where("members", "array-contains", me.uid)
  );

  stopList = onSnapshot(q, snapshot => {
    conversations = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    conversations.sort((a, b) =>
      (b.lastMessageAt?.toMillis?.() || 0) -
      (a.lastMessageAt?.toMillis?.() || 0)
    );
    renderConversationList();
    status(`Đã tải ${conversations.length} cuộc trò chuyện.`);
  }, err => {
    console.error(err);
    status("Không tải được chat. Kiểm tra Firestore Rules.");
  });
}

async function openConversation(id) {
  const c = conversations.find(x => x.id === id);
  if (!c || !c.members?.includes(me.uid)) return;

  activeId = id;
  renderConversationList();
  stopMessages?.();

  $("chatTitle").textContent = conversationName(c);
  $("chatSubtitle").textContent =
    c.type === "group" ? `Nhóm · ${c.members.length} thành viên` : "Chat riêng";
  $("chatMessages").innerHTML = '<div class="muted">Đang tải tin nhắn...</div>';

  const q = query(
    collection(db, "conversations", id, "messages"),
    orderBy("createdAt", "asc"),
    limit(100)
  );

  stopMessages = onSnapshot(q, snapshot => {
    $("chatMessages").innerHTML = snapshot.docs.map(d => {
      const m = d.data();
      return `<article class="chat-message ${m.senderId === me.uid ? "mine" : ""}">
        <strong>${esc(m.senderName || "Người học")}</strong>
        <p>${esc(m.text)}</p>
        <small>${m.createdAt?.toDate
          ? m.createdAt.toDate().toLocaleString("vi-VN")
          : "Vừa gửi"}</small>
      </article>`;
    }).join("") || '<div class="empty-state">Hãy gửi tin nhắn đầu tiên!</div>';

    $("chatMessages").scrollTop = $("chatMessages").scrollHeight;
  }, err => {
    console.error(err);
    status("Không đọc được tin nhắn.");
  });
}

async function createDirectChat(targetUid) {
  targetUid = targetUid.trim();
  if (!targetUid || targetUid === me.uid) {
    throw new Error("Hãy nhập UID của một người dùng khác.");
  }

  const userDoc = await getDoc(doc(db, "chatUsers", targetUid));
  if (!userDoc.exists()) {
    throw new Error("Không tìm thấy hồ sơ chat của UID này.");
  }

  const members = [me.uid, targetUid].sort();
  const directKey = members.join("_");
  const ref = doc(db, "conversations", "dm_" + directKey);
  const existing = await getDoc(ref);

  if (!existing.exists()) {
    const myName = me.displayName || "Người học";
    const otherName = userDoc.data().displayName || "Người học";

    await setDoc(ref, {
      type: "direct",
      directKey,
      members,
      memberNames: {
        [me.uid]: myName,
        [targetUid]: otherName
      },
      createdBy: me.uid,
      createdAt: serverTimestamp(),
      lastMessage: "",
      lastMessageAt: serverTimestamp()
    });
  }

  await openWhenReady(ref.id);
}

async function openWhenReady(id) {
  const ref = doc(db, "conversations", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Không tìm thấy cuộc trò chuyện.");
  if (!snap.data().members.includes(me.uid)) throw new Error("Bạn không thuộc cuộc trò chuyện này.");

  if (!conversations.some(c => c.id === id)) {
    conversations.unshift({ id, ...snap.data() });
    renderConversationList();
  }
  await openConversation(id);
}

$("chatDirectForm").addEventListener("submit", async e => {
  e.preventDefault();
  if (!me) return status("Hãy đăng nhập Google trước.");
  try {
    await createDirectChat($("chatTargetUid").value);
  } catch (err) {
    console.error(err);
    status(err.message || "Không thể tạo chat riêng.");
  }
});

$("chatNewGroup").addEventListener("click", async () => {
  if (!me) return status("Hãy đăng nhập Google trước.");

  const name = prompt("Tên nhóm học tập:");
  if (!name?.trim()) return;

  const raw = prompt("Nhập UID thành viên, cách nhau bằng dấu phẩy:");
  if (!raw) return;

  const members = [...new Set([
    me.uid,
    ...raw.split(",").map(s => s.trim()).filter(Boolean)
  ])];

  if (members.length < 2 || members.length > 20) {
    return status("Nhóm cần từ 2 đến 20 thành viên.");
  }

  try {
    const names = {};
    for (const uid of members) {
      const snap = await getDoc(doc(db, "chatUsers", uid));
      if (!snap.exists()) throw new Error("Không tìm thấy UID: " + uid);
      names[uid] = snap.data().displayName || "Người học";
    }

    const ref = await addDoc(collection(db, "conversations"), {
      type: "group",
      name: name.trim().slice(0, 60),
      members,
      memberNames: names,
      createdBy: me.uid,
      createdAt: serverTimestamp(),
      lastMessage: "",
      lastMessageAt: serverTimestamp()
    });

    await openWhenReady(ref.id);
  } catch (err) {
    console.error(err);
    status(err.message || "Không thể tạo nhóm.");
  }
});

$("chatSendForm").addEventListener("submit", async e => {
  e.preventDefault();
  const text = $("chatMessageInput").value.trim();
  if (!me || !activeId || !text || busy) return;

  busy = true;
  const input = $("chatMessageInput");
  input.disabled = true;

  try {
    const ref = doc(db, "conversations", activeId);
    const snap = await getDoc(ref);
    if (!snap.exists() || !snap.data().members.includes(me.uid)) {
      throw new Error("Bạn không có quyền gửi vào cuộc trò chuyện này.");
    }

    const batch = writeBatch(db);
    const messageRef = doc(collection(db, "conversations", activeId, "messages"));

    batch.set(messageRef, {
      senderId: me.uid,
      senderName: me.displayName || "Người học",
      text: text.slice(0, 2000),
      createdAt: serverTimestamp()
    });

    batch.update(ref, {
      lastMessage: text.slice(0, 120),
      lastMessageAt: serverTimestamp()
    });

    await batch.commit();
    input.value = "";
  } catch (err) {
    console.error(err);
    status(err.message || "Không gửi được tin nhắn.");
  } finally {
    busy = false;
    input.disabled = false;
    input.focus();
  }
});

onAuthStateChanged(auth, async user => {
  stopListeners();
  me = user;
  activeId = null;
  conversations = [];
  $("chatMessages").innerHTML = '<div class="empty-state">Chọn cuộc trò chuyện để bắt đầu.</div>';

  if (!user || user.isAnonymous) {
    status("Hãy đăng nhập bằng Google để sử dụng chat.");
    $("chatConversationList").innerHTML = "";
    return;
  }

  try {
    await setDoc(doc(db, "chatUsers", user.uid), {
      uid: user.uid,
      displayName: (user.displayName || "Người học").slice(0, 40),
      photoURL: user.photoURL || "",
      updatedAt: serverTimestamp()
    }, { merge: true });

    loadConversations();
  } catch (err) {
    console.error(err);
    status("Không khởi tạo được hồ sơ chat. Kiểm tra Firestore Rules.");
  }
});
```