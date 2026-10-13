import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAZsQ8tpN8etdQCM4El43tVS0bXIW5C_NU",
  authDomain: "study-work-46ef5.firebaseapp.com",
  projectId: "study-work-46ef5",
  storageBucket: "study-work-46ef5.firebasestorage.app",
  messagingSenderId: "514974082929",
  appId: "1:514974082929:web:898aa29b441e607f9a78d0",
  measurementId: "G-TVCXKHPPCL"
};

const gate = document.getElementById('authGate');
const openBtn = document.getElementById('authOpenBtn');
const signInBtn = document.getElementById('googleSignInBtn');
const signOutBtn = document.getElementById('googleSignOutBtn');
const guestBtn = document.getElementById('continueGuestBtn');
const status = document.getElementById('authStatus');
const emailEl = document.getElementById('authUserEmail');
const nameEl = document.getElementById('miniName');
const avatarEl = document.getElementById('miniAvatar');

const KEYS = {
  app: 'studyRPGUltra',
  websites: 'studyRPGWebsiteLinks',
  calendar: 'studyRPGCalendarEvents',
  quiz: 'studyRPGAIQuizQuestionHistoryV1'
};
const emptySnapshot = () => ({
  appData: null,
  websiteLinks: [],
  calendarEvents: [],
  quizHistory: []
});
let syncUser = null;
let syncReady = false;
let saveTimer = null;
let saveInFlight = false;
let saveAgain = false;
let lastCloudFingerprint = '';
let activeUser = null;


function weeklyStudyXP(snapshot){
  const history=Array.isArray(snapshot?.appData?.history)?snapshot.appData.history:[];
  const cutoff=new Date(); cutoff.setHours(0,0,0,0); cutoff.setDate(cutoff.getDate()-6);
  return history.reduce((sum,item)=>{
    if(item?.type!=="Phiên học"||!item.date)return sum;
    const date=new Date(item.date);
    if(Number.isNaN(date.getTime())||date<cutoff)return sum;
    return sum+Math.max(0,Number(item.minutes)||0)*2;
  },0);
}
function safePublicName(user, appData){
  const name=String(appData?.profile?.name||user.displayName||'Nhà thám hiểm').trim().slice(0,30);
  return name||'Nhà thám hiểm';
}
async function publishLeaderboardProfile(user, snapshot){
  if(!user||user.isAnonymous)return;
  const appData=snapshot?.appData||{};
  const equipped=Array.isArray(appData.avatars)?appData.avatars.find(a=>a.id===appData.equipped):null;
  const publicProfile={
    uid:user.uid,
    displayName:safePublicName(user,appData),
    avatar:equipped?.emoji||'🧑‍🚀',
    level:Math.max(1,Number(appData.level)||1),
    weeklyXP:weeklyStudyXP(snapshot),
    streak:Math.max(0,Number(appData.streak)||0),
    totalMinutes:Math.max(0,Number(appData.totalMinutes)||0),
    updatedAt:serverTimestamp()
  };
  await setDoc(doc(db,'leaderboard',user.uid),publicProfile,{merge:true});
}
function leagueFor(xp){return xp>=1200?'💎 Diamond':xp>=700?'🥇 Gold':xp>=300?'🥈 Silver':'🥉 Bronze';}
function escapeHTML(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function renderLeaderboard(){
  const statusEl=document.getElementById('leaderboardStatus');
  const listEl=document.getElementById('leaderboardList');
  const leagueEl=document.getElementById('myLeague');
  if(!statusEl||!listEl)return;
  if(!activeUser){statusEl.textContent='Hãy đăng nhập Google để tham gia bảng xếp hạng.';listEl.innerHTML='<div class="empty-state">Đăng nhập Google để xem thứ hạng của bạn.</div>';if(leagueEl)leagueEl.textContent='Chưa xếp hạng';return;}
  statusEl.textContent='Đang tải bảng xếp hạng…';
  try{
    const result=await getDocs(collection(db,'leaderboard'));
    const rows=result.docs.map(s=>s.data()).filter(x=>x&&typeof x.uid==='string');
    rows.sort((a,b)=>(Number(b.weeklyXP)||0)-(Number(a.weeklyXP)||0)||String(a.displayName||'').localeCompare(String(b.displayName||''),'vi'));
    const mine=rows.find(x=>x.uid===activeUser.uid);
    if(leagueEl)leagueEl.textContent=mine?leagueFor(Number(mine.weeklyXP)||0):'🥉 Bronze';
    if(!rows.length){listEl.innerHTML='<div class="empty-state">Chưa có người tham gia. Hãy hoàn thành phiên học đầu tiên!</div>';statusEl.textContent='Chưa có dữ liệu xếp hạng.';return;}
    listEl.innerHTML=rows.slice(0,50).map((row,index)=>{
      const isMe=row.uid===activeUser.uid;
      const medal=index===0?'🥇':index===1?'🥈':index===2?'🥉':String(index+1);
      return `<div class="leaderboard-row${isMe?' me':''}"><div class="leaderboard-place">${medal}</div><div class="leaderboard-person"><div class="leaderboard-avatar">${escapeHTML(row.avatar||'🧑‍🚀')}</div><div style="min-width:0"><div class="leaderboard-name">${escapeHTML(row.displayName||'Nhà thám hiểm')}${isMe?' (Bạn)':''}</div><div class="leaderboard-meta">${leagueFor(Number(row.weeklyXP)||0)} · 🔥 ${Math.max(0,Number(row.streak)||0)} ngày streak</div></div></div><div class="leaderboard-score">${Math.max(0,Number(row.weeklyXP)||0)} XP<small>7 ngày gần nhất</small></div></div>`;
    }).join('');
    const myRank=rows.findIndex(x=>x.uid===activeUser.uid)+1;
    statusEl.textContent=myRank?`Có ${rows.length} người tham gia · Bạn đang ở vị trí #${myRank}.`:`Có ${rows.length} người tham gia · Chưa có hồ sơ xếp hạng của bạn.`;
  }catch(err){console.error('Leaderboard load error:',err);statusEl.textContent='Không tải được bảng xếp hạng. Kiểm tra Firestore Rules.';listEl.innerHTML='<div class="empty-state">Hãy kiểm tra quy tắc bảo mật Firestore và tải lại.</div>';}
}

function showGate(show=true){ gate?.classList.toggle('open', show); }
openBtn?.addEventListener('click',()=>showGate(true));
guestBtn?.addEventListener('click',()=>showGate(false));

function readLocalSnapshot(){
  const parse = (key, fallback) => { try { const v=JSON.parse(localStorage.getItem(key) || 'null'); return v ?? fallback; } catch { return fallback; } };
  return {
    appData: parse(KEYS.app, {}),
    websiteLinks: parse(KEYS.websites, []),
    calendarEvents: parse(KEYS.calendar, []),
    quizHistory: parse(KEYS.quiz, [])
  };
}
function stableStringify(value){
  if(Array.isArray(value)) return '['+value.map(stableStringify).join(',')+']';
  if(value && typeof value==='object') return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stableStringify(value[k])).join(',')+'}';
  return JSON.stringify(value);
}
function fingerprint(snapshot){
  return stableStringify({appData:snapshot.appData ?? {},websiteLinks:snapshot.websiteLinks ?? [],calendarEvents:snapshot.calendarEvents ?? [],quizHistory:snapshot.quizHistory ?? []});
}
function applySnapshot(snapshot){
  if (snapshot.appData && typeof snapshot.appData === 'object') localStorage.setItem(KEYS.app, JSON.stringify(snapshot.appData));
  if (Array.isArray(snapshot.websiteLinks)) localStorage.setItem(KEYS.websites, JSON.stringify(snapshot.websiteLinks));
  if (Array.isArray(snapshot.calendarEvents)) localStorage.setItem(KEYS.calendar, JSON.stringify(snapshot.calendarEvents));
  if (Array.isArray(snapshot.quizHistory)) localStorage.setItem(KEYS.quiz, JSON.stringify(snapshot.quizHistory));
}
function announceSync(message){ if(status) status.textContent=message; }
function localSnapshotHasData(s){
  const d=s.appData || {};
  return Number(d.xp||0)>0 || Number(d.coins||0)>0 || Number(d.totalMinutes||0)>0 || Number(d.sessions||0)>0 ||
    (Array.isArray(d.history)&&d.history.length>0) || (Array.isArray(s.calendarEvents)&&s.calendarEvents.length>0) ||
    (Array.isArray(s.websiteLinks)&&s.websiteLinks.length>0) || (Array.isArray(s.quizHistory)&&s.quizHistory.length>0);
}
async function loadOrInitializeCloud(user, db){
  const ref=doc(db,'users',user.uid);
  const snap=await getDoc(ref);
  const local=readLocalSnapshot();
  if(snap.exists()){
    const cloud={...emptySnapshot(),...snap.data()};
    const cloudFp=fingerprint(cloud);
    const localFp=fingerprint(local);
    if(cloudFp!==localFp){
      applySnapshot(cloud);
      // Reload once so all existing non-module app code rehydrates from the cloud copy.
      sessionStorage.setItem('studyRPGCloudReloadUid',user.uid);
      location.reload();
      return false;
    }
    lastCloudFingerprint=cloudFp;
    announceSync('☁ Đã đồng bộ dữ liệu học tập.');
    return true;
  }
  // First sign-in for this account: migrate existing local progress to the cloud.
  const initial={...emptySnapshot(),...local};
  await setDoc(ref,{...initial,ownerUid:user.uid,ownerEmail:user.email||null,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
  lastCloudFingerprint=fingerprint(initial);
  await publishLeaderboardProfile(user, initial);
  announceSync(localSnapshotHasData(local)?'☁ Đã sao lưu dữ liệu trên máy lên tài khoản Google.':'☁ Đã bật đồng bộ cho tài khoản này.');
  return true;
}
async function pushLocalSnapshot(){
  if(!syncUser||!syncReady)return;
  if(saveInFlight){saveAgain=true;return;}
  saveInFlight=true;
  try{
    do {
      saveAgain=false;
      const snapshot=readLocalSnapshot();
      const fp=fingerprint(snapshot);
      if(fp===lastCloudFingerprint) continue;
      await setDoc(doc(db,'users',syncUser.uid),{
        ...snapshot,
        ownerUid:syncUser.uid,
        ownerEmail:syncUser.email||null,
        updatedAt:serverTimestamp()
      },{merge:true});
      lastCloudFingerprint=fp;
      await publishLeaderboardProfile(syncUser, snapshot);
      announceSync('☁ Đã lưu dữ liệu lên đám mây.');
    } while(saveAgain);
  }catch(err){
    console.error('Firestore sync error:',err);
    announceSync('⚠ Chưa thể đồng bộ. Kiểm tra Firestore Rules và kết nối mạng.');
  }finally{saveInFlight=false;}
}
function scheduleCloudSave(){
  if(!syncReady||!syncUser)return;
  clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>{pushLocalSnapshot();},700);
}

let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  document.querySelectorAll('[data-page="leaderboard"]').forEach(btn=>btn.addEventListener('click',renderLeaderboard));
  document.getElementById('refreshLeaderboard')?.addEventListener('click',renderLeaderboard);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  signInBtn?.addEventListener('click', async () => {
    signInBtn.disabled = true;
    announceSync('Đang kết nối Google…');
    try {
      await signInWithPopup(auth, provider);
      showGate(false);
    } catch (err) {
      console.error('Google sign-in error:', err);
      const messages = {
        'auth/unauthorized-domain': 'Domain hiện tại chưa được cho phép. Thêm domain trong Firebase Authentication → Settings → Authorized domains.',
        'auth/popup-blocked': 'Trình duyệt đã chặn cửa sổ đăng nhập. Hãy cho phép popup rồi thử lại.',
        'auth/operation-not-allowed': 'Bạn chưa bật nhà cung cấp Google trong Firebase Authentication.',
        'auth/popup-closed-by-user': 'Bạn đã đóng cửa sổ đăng nhập.'
      };
      announceSync(messages[err.code] || `Không thể đăng nhập (${err.code || 'lỗi không xác định'}).`);
    } finally { signInBtn.disabled = false; }
  });

  signOutBtn?.addEventListener('click', async () => {
    syncReady=false; syncUser=null; clearTimeout(saveTimer);
    try { await signOut(auth); announceSync('Đã đăng xuất. Dữ liệu trên máy vẫn được giữ lại.'); }
    catch (err) { announceSync('Đăng xuất chưa thành công. Hãy thử lại.'); }
  });

  window.addEventListener('study-rpg-local-change',scheduleCloudSave);
  window.addEventListener('storage',e=>{if(Object.values(KEYS).includes(e.key))scheduleCloudSave();});

  onAuthStateChanged(auth, async user => {
    syncReady=false; syncUser=user; activeUser=user; clearTimeout(saveTimer);
    if (user) {
      openBtn.textContent = 'Tài khoản Google';
      emailEl.textContent = user.email || 'Đã đăng nhập';
      if (nameEl && user.displayName) nameEl.textContent = user.displayName;
      if (avatarEl && user.photoURL) { avatarEl.textContent = ''; avatarEl.style.backgroundImage = `url("${user.photoURL}")`; avatarEl.style.backgroundSize = 'cover'; avatarEl.style.backgroundPosition = 'center'; }
      signOutBtn.hidden = false;
      guestBtn.textContent = 'Đóng';
      announceSync('Đang tải dữ liệu học tập từ đám mây…');
      try {
        const ready=await loadOrInitializeCloud(user,db);
        if(!ready)return;
        // On the one-time reload, this marker prevents needless reloading loops.
        if(sessionStorage.getItem('studyRPGCloudReloadUid')===user.uid)sessionStorage.removeItem('studyRPGCloudReloadUid');
        syncReady=true;
        await publishLeaderboardProfile(user, readLocalSnapshot());
      } catch(err) {
        console.error('Firestore initial sync error:',err);
        announceSync('Đăng nhập được nhưng chưa đồng bộ. Hãy kiểm tra Firestore đã bật và Rules đã lưu chưa.');
      }
    } else {
      syncReady=false;
      activeUser=null;
      openBtn.textContent = 'Đăng nhập Google';
      emailEl.textContent = 'Chưa đăng nhập';
      signOutBtn.hidden = true;
      guestBtn.textContent = 'Tiếp tục với tư cách khách';
      announceSync('Bạn có thể tiếp tục sử dụng ứng dụng ở chế độ khách.');
    }
  });
} catch (err) {
  console.error('Firebase initialization error:', err);
  announceSync('Không tải được Firebase SDK. Hãy kiểm tra Internet và mở ứng dụng qua website HTTPS.');
}
