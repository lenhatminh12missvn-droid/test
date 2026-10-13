(() => {
"use strict";
const $ = id => document.getElementById(id);
const todayKey = () => new Date().toLocaleDateString("en-CA");
const weekKey = () => {
  const d = new Date();
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const date = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${date}`;
};
const defaultData = () => ({
  coins:0,xp:0,level:1,streak:0,lastStudyDay:"",totalMinutes:0,sessions:0,quizHistory:[],history:[],
  daily:{date:todayKey(),done:[]},profile:{name:"Nhà thám hiểm",level:"THCS",schoolClass:"",examName:"",examDate:""},
  avatars:[{id:"astronaut",emoji:"🧑‍🚀",name:"Nhà du hành",rarity:"Common"}],equipped:"astronaut",
  items:[],claimedBossWeek:"",settings:{accent:"green",glow:true,motion:false,sound:false}
});
let data;
try { data={...defaultData(),...JSON.parse(localStorage.getItem("studyRPGUltra")||"{}")}; } catch { data=defaultData(); }
function normalize(){
  const d=defaultData();
  data={...d,...data,profile:{...d.profile,...data.profile},settings:{...d.settings,...data.settings},daily:data.daily||d.daily,history:Array.isArray(data.history)?data.history:[],quizHistory:Array.isArray(data.quizHistory)?data.quizHistory:[],avatars:Array.isArray(data.avatars)?data.avatars:d.avatars,items:Array.isArray(data.items)?data.items:[]};
  if(data.daily.date!==todayKey()) data.daily={date:todayKey(),done:[]};
  data.coins=Math.max(0,Number(data.coins)||0); data.xp=Math.max(0,Number(data.xp)||0); data.level=Math.max(1,Number(data.level)||1);
}
normalize();
function notifyCloudSync(){try{window.dispatchEvent(new CustomEvent("study-rpg-local-change"));}catch{}}
function save(){try{localStorage.setItem("studyRPGUltra",JSON.stringify(data));notifyCloudSync();}catch(e){toast("Không thể lưu dữ liệu: bộ nhớ trình duyệt có thể đã đầy.");}}
let toastTimeout;
function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.classList.remove("show"),3000);}
function safeText(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
const rankFor = n => n>=100?"SSS":n>=90?"S+":n>=80?"S":n>=70?"A":n>=50?"B":"C";
function currentAvatar(){return data.avatars.find(a=>a.id===data.equipped)||data.avatars[0]||{emoji:"🧑‍🚀",name:"Nhà du hành"};}
function clockTick(){const d=new Date();$("clock").textContent=d.toLocaleTimeString("vi-VN",{hour12:false});$("date").textContent=d.toLocaleDateString("vi-VN",{weekday:"short",day:"2-digit",month:"2-digit",year:"numeric"});$("dateLong").textContent=d.toLocaleDateString("vi-VN",{weekday:"long",day:"numeric",month:"long",year:"numeric"});updateExamCountdown();}
function go(page){document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id==="page-"+page));document.querySelectorAll(".nav-link").forEach(b=>b.classList.toggle("active",b.dataset.page===page));const labels={home:"Trang chủ",missions:"Nhiệm vụ",leaderboard:"Bảng xếp hạng",dashboard:"Thống kê",boss:"Boss tuần",avatar:"Avatar & hòm",shop:"Cửa hàng",achievements:"Thành tựu",profile:"Hồ sơ học tập",settings:"Cài đặt",studytools:"Liên kết trang web",calendar:"Lịch học"};$("pageCrumb").textContent=labels[page]||"Study RPG";window.scrollTo({top:0,behavior:"smooth"});renderPage(page);}
document.querySelectorAll("[data-page]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.page)));

// Personal website links are stored separately from the RPG progress data.
const WEBSITE_STORAGE_KEY="studyRPGWebsiteLinks";
let websiteLinks=[];
try { const saved=JSON.parse(localStorage.getItem(WEBSITE_STORAGE_KEY)||"[]"); if(Array.isArray(saved)) websiteLinks=saved.filter(x=>x&&typeof x.name==="string"&&typeof x.url==="string"); } catch { websiteLinks=[]; }
let activeWebsiteId=null;
function saveWebsiteLinks(){try{localStorage.setItem(WEBSITE_STORAGE_KEY,JSON.stringify(websiteLinks));notifyCloudSync();}catch{toast("Không thể lưu liên kết trong trình duyệt này.");}}
function normalizeWebsiteUrl(value){
 const raw=String(value||"").trim();
 if(!raw)return "";
 try{const u=new URL(raw);if(!["http:","https:"].includes(u.protocol))return "";return u.href;}catch{return "";}
}
function renderWebsiteLinks(){
 const list=$("websiteList");if(!list)return;
 $("websiteCount").textContent=`${websiteLinks.length} trang`;
 if(!websiteLinks.length){list.innerHTML='<div class="website-list-empty">Chưa có liên kết nào. Dùng biểu mẫu phía trên để thêm website đầu tiên.</div>';return;}
 list.innerHTML=websiteLinks.map(link=>`<article class="website-link-card ${link.id===activeWebsiteId?"selected":""}"><div class="website-favicon">🌐</div><div class="website-link-info"><strong>${safeText(link.name)}</strong><small>${safeText(link.url)}</small></div><div class="website-link-actions"><button class="primary-btn" data-website-open="${safeText(link.id)}" type="button">Mở trong Study RPG</button><a class="secondary-btn" href="${safeText(link.url)}" target="_blank" rel="noopener noreferrer">Tab mới ↗</a><button class="quiet-btn website-delete" data-website-delete="${safeText(link.id)}" type="button" title="Xóa liên kết" aria-label="Xóa ${safeText(link.name)}">×</button></div></article>`).join("");
 list.querySelectorAll("[data-website-open]").forEach(btn=>btn.addEventListener("click",()=>openWebsite(btn.dataset.websiteOpen)));
 list.querySelectorAll("[data-website-delete]").forEach(btn=>btn.addEventListener("click",()=>deleteWebsite(btn.dataset.websiteDelete)));
}
function openWebsite(id){
 const link=websiteLinks.find(x=>x.id===id);if(!link)return;
 activeWebsiteId=id;const frame=$("websiteFrame"),tab=$("websiteOpenTab");
 $("websitePreviewTitle").textContent=link.name;$("websitePreviewHint").textContent="Nếu trang không tải trong khung, hãy chọn “Mở tab mới”.";
 $("websiteEmpty").hidden=true;frame.src=link.url;tab.href=link.url;tab.hidden=false;renderWebsiteLinks();
}
function deleteWebsite(id){
 const link=websiteLinks.find(x=>x.id===id);if(!link)return;
 websiteLinks=websiteLinks.filter(x=>x.id!==id);if(activeWebsiteId===id){activeWebsiteId=null;$("websiteFrame").src="about:blank";$("websiteOpenTab").hidden=true;$("websiteEmpty").hidden=false;$("websitePreviewTitle").textContent="Khu vực mở website";$("websitePreviewHint").textContent="Chọn một liên kết để mở website.";}
 saveWebsiteLinks();renderWebsiteLinks();toast("Đã xóa liên kết: "+link.name);
}
$("websiteForm").addEventListener("submit",e=>{
 e.preventDefault();const name=$("websiteName").value.trim(),url=normalizeWebsiteUrl($("websiteUrl").value);
 if(!name){toast("Hãy nhập tên website.");return;}if(!url){toast("Địa chỉ cần là URL hợp lệ bắt đầu bằng https:// hoặc http://");return;}
 if(websiteLinks.some(x=>x.url===url)){toast("Website này đã có trong danh sách.");return;}
 const id=(window.crypto&&crypto.randomUUID)?crypto.randomUUID():String(Date.now())+Math.random().toString(36).slice(2,8);
 websiteLinks.unshift({id,name,url});saveWebsiteLinks();$("websiteName").value="";$("websiteUrl").value="";renderWebsiteLinks();openWebsite(id);toast("Đã thêm liên kết website!");
});
renderWebsiteLinks();

document.querySelectorAll("[data-goto]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.goto)));
$("quickSettings").addEventListener("click",()=>go("settings"));$("topAvatar").addEventListener("click",()=>go("profile"));
function renderUI(){
 const a=currentAvatar(),name=data.profile.name||"Nhà thám hiểm",xpNeed=data.level*100,rank=rankFor(data.quizHistory.length?Math.round(data.quizHistory.reduce((s,q)=>s+q.score,0)/data.quizHistory.length):0);
 $("miniAvatar").textContent=a.emoji;$("topAvatar").textContent=a.emoji;$("largeAvatar").textContent=a.emoji;$("avatarName").textContent=a.name;$("miniName").textContent=name;$("welcomeName").textContent=name;
 $("miniRank").textContent=`Rank ${rank} · Lv. ${data.level}`;$("topCoins").textContent=data.coins;$("coinStat").textContent=data.coins;$("shopCoins").textContent=data.coins;
 $("levelStat").textContent=data.level;$("levelOrb").textContent=data.level;$("levelLabel").textContent=`Level ${data.level}`;$("xpStat").textContent=data.xp;$("xpNeeded").textContent=xpNeed;$("xpLabel").textContent=`${data.xp} / ${xpNeed} XP`;
 const pct=Math.min(100,data.xp/xpNeed*100);$("levelMiniBar").style.width=pct+"%";$("xpBar").style.width=pct+"%";$("rankBadge").textContent="RANK "+rank;
 $("streakStat").textContent=data.streak;$("sideStreak").textContent=data.streak;$("streakHint").textContent=data.lastStudyDay===todayKey()?"Đã học hôm nay — giữ nhịp nhé!":"Hoàn thành một phiên để duy trì streak";
 $("totalMinutes").textContent=data.totalMinutes;renderHomeQuests();renderActivity();renderAchievements();renderAvatar();renderShop();renderBoss();renderDashboard();renderMissions();applySettings();
}
function recordActivity(type,minutes,reward){data.history.unshift({date:new Date().toISOString(),type,minutes,reward});data.history=data.history.slice(0,150);}
const quests=[{id:"session",emoji:"⏱️",title:"Hoàn thành 1 phiên học",desc:"Tập trung trong một phiên bất kỳ",reward:"+30 🪙"},{id:"minutes",emoji:"📚",title:"Học đủ 45 phút",desc:"Tích lũy thời gian học hôm nay",reward:"+40 🪙"},{id:"quiz",emoji:"🧠",title:"Hoàn thành một quiz",desc:"Kiểm tra kiến thức của bạn",reward:"+25 🪙"}];
function questDone(id){return data.daily.done.includes(id);}
function renderHomeQuests(){const mins=data.history.filter(h=>h.type==="Phiên học"&&h.date.slice(0,10)===todayKey()).reduce((s,h)=>s+h.minutes,0);if(mins>=45&&!questDone("minutes")){data.daily.done.push("minutes");save();}
$("questCount").textContent=`${data.daily.done.length}/3`;$("homeQuestList").innerHTML=quests.map(q=>`<div class="quest-item ${questDone(q.id)?"done":""}"><div class="quest-check">${questDone(q.id)?"✓":q.emoji}</div><div class="quest-copy"><strong>${q.title}</strong><small>${q.desc}</small></div><span class="quest-reward">${questDone(q.id)?"Hoàn tất":q.reward}</span></div>`).join("");}
function renderActivity(){const list=data.history.slice(0,4);$("recentActivity").innerHTML=list.length?list.map(h=>`<div class="activity-row"><div class="activity-icon">${h.type==="Quiz"?"🧠":"⏱️"}</div><div><strong>${safeText(h.type)}</strong><small>${new Date(h.date).toLocaleString("vi-VN")} · ${h.minutes} phút</small></div><div class="activity-reward">+${h.reward} 🪙</div></div>`).join(""):'<div class="empty-state">Chưa có hoạt động. Bắt đầu phiên học đầu tiên nhé!</div>';}
let timer={interval:null,total:1500,left:1500,mode:"study",running:false};
function updateTimerDisplay(){const m=Math.floor(timer.left/60),s=timer.left%60;$("studyTimer").textContent=String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");const pct=timer.total?100*(timer.total-timer.left)/timer.total:0;$("timerProgress").style.width=pct+"%";$("timerRing").style.background=`conic-gradient(var(--accent) ${pct*3.6}deg,rgba(255,255,255,.07) 0deg)`;$("timerMode").textContent=timer.mode==="study"?(timer.running?"ĐANG TẬP TRUNG":"SẴN SÀNG"):(timer.running?"THỜI GIAN NGHỈ":"NGHỈ NGƠI");$("startBtn").textContent=timer.running?"▶ Đang chạy":"▶ Bắt đầu "+(timer.mode==="study"?"học":"nghỉ");$("pauseBtn").disabled=!timer.running;}
function setTimer(){clearInterval(timer.interval);timer.running=false;timer.mode="study";const mins=Math.min(240,Math.max(1,parseInt($("studyMinutes").value,10)||25));$("studyMinutes").value=mins;timer.total=mins*60;timer.left=timer.total;updateTimerDisplay();}
function startTimer(){if(timer.running)return;timer.running=true;updateTimerDisplay();timer.interval=setInterval(()=>{if(timer.left>0){timer.left--;updateTimerDisplay();}else{clearInterval(timer.interval);timer.running=false;if(timer.mode==="study"){finishStudy();timer.mode="break";timer.total=(parseInt($("breakMinutes").value,10)||5)*60;timer.left=timer.total;toast("🎉 Hoàn thành phiên học! Đã cộng XP và S-Coins. Giờ nghỉ ngơi nhé.");}else{timer.mode="study";timer.total=(Math.max(1,parseInt($("studyMinutes").value,10)||25))*60;timer.left=timer.total;toast("⏰ Hết giờ nghỉ. Sẵn sàng cho phiên học tiếp theo!");}updateTimerDisplay();}},1000);}
function finishStudy(){const mins=Math.max(1,Math.round(timer.total/60));data.coins+=Math.max(10,mins);data.xp+=mins*2;data.totalMinutes+=mins;data.sessions++;while(data.xp>=data.level*100){data.xp-=data.level*100;data.level++;toast("⬆️ Lên Level "+data.level+"!");}
 const today=todayKey();if(data.lastStudyDay!==today){const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);const y=yesterday.toLocaleDateString("en-CA");data.streak=data.lastStudyDay===y?data.streak+1:1;data.lastStudyDay=today;}
 if(!questDone("session"))data.daily.done.push("session");const todayMins=data.history.filter(h=>h.type==="Phiên học"&&h.date.slice(0,10)===today).reduce((s,h)=>s+h.minutes,0)+mins;if(todayMins>=45&&!questDone("minutes"))data.daily.done.push("minutes");
 recordActivity("Phiên học",mins,Math.max(10,mins));save();renderUI();if(data.settings.sound)playTone();}
function playTone(){try{const ctx=new (window.AudioContext||window.webkitAudioContext)(),o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.frequency.value=660;g.gain.value=.06;o.start();o.stop(ctx.currentTime+.18);}catch{}}
$("startBtn").addEventListener("click",startTimer);$("pauseBtn").addEventListener("click",()=>{clearInterval(timer.interval);timer.running=false;updateTimerDisplay();});$("resetBtn").addEventListener("click",setTimer);$("studyMinutes").addEventListener("change",()=>{if(!timer.running)setTimer();});$("breakMinutes").addEventListener("change",()=>{});
function renderMissions(){$("missionSummary").innerHTML=[["Hôm nay",`${data.daily.done.length}/3`,"Nhiệm vụ hoàn thành"],["Phiên học",data.sessions,"Tổng số phiên"],["Quiz",data.quizHistory.length,"Bài kiểm tra đã làm"]].map(x=>`<article class="stat-card glass"><span>${x[0]}</span><strong>${x[1]}</strong><small>${x[2]}</small></article>`).join("");$("missionList").innerHTML=quests.map(q=>`<article class="mission-card glass"><div class="mission-emoji">${q.emoji}</div><h3>${q.title}</h3><p>${q.desc}</p><div class="mission-bottom"><span class="quest-reward">${q.reward}</span><button class="${questDone(q.id)?"secondary-btn":"primary-btn"}" data-claim="${q.id}" ${questDone(q.id)?"disabled":""}>${questDone(q.id)?"Đã hoàn thành":"Nhận thưởng"}</button></div></article>`).join("");document.querySelectorAll("[data-claim]").forEach(b=>b.addEventListener("click",()=>claimQuest(b.dataset.claim)));}
function claimQuest(id){if(questDone(id)){toast("Nhiệm vụ đã hoàn thành rồi.");return;}if(id==="session"&&data.sessions===0){toast("Hãy hoàn thành một phiên học trước nhé.");return;}if(id==="minutes"){const mins=data.history.filter(h=>h.type==="Phiên học"&&h.date.slice(0,10)===todayKey()).reduce((s,h)=>s+h.minutes,0);if(mins<45){toast("Bạn cần học đủ 45 phút hôm nay.");return;}}if(id==="quiz"&&!data.daily.done.includes("quiz")){toast("Hãy hoàn thành quiz trước nhé.");return;}data.daily.done.push(id);const q=quests.find(x=>x.id===id);data.coins+=parseInt((q.reward.match(/\d+/)||[0])[0]);save();renderUI();toast("🎯 Đã nhận thưởng nhiệm vụ!");}
// Quiz luyện tập nhanh cũ đã được gỡ; sử dụng trang Quiz AI thay thế.
function renderDashboard(){const avg=data.quizHistory.length?Math.round(data.quizHistory.reduce((s,q)=>s+q.score,0)/data.quizHistory.length):0;const weekStart=new Date();weekStart.setHours(0,0,0,0);weekStart.setDate(weekStart.getDate()-6);const weekMinutes=data.history.filter(h=>h.type==="Phiên học"&&new Date(h.date)>=weekStart).reduce((s,h)=>s+h.minutes,0);const dailyAverage=Math.round(weekMinutes/7);$("dashboardStats").innerHTML=[["⏱️","Tổng phút học",data.totalMinutes],["🎯","Phiên hoàn thành",data.sessions],["🧠","Điểm quiz TB",avg+"/100"],["🏆","Rank hiện tại",rankFor(avg)],["📆","7 ngày gần nhất",weekMinutes+" phút"],["📈","Trung bình/ngày",dailyAverage+" phút"]].map(x=>`<article class="stat-card glass"><div class="stat-icon cyan">${x[0]}</div><span>${x[1]}</span><strong>${x[2]}</strong></article>`).join("");const days=[];for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const key=d.toLocaleDateString("en-CA");const mins=data.history.filter(h=>h.type==="Phiên học"&&h.date.slice(0,10)===key).reduce((s,h)=>s+h.minutes,0);days.push({label:d.toLocaleDateString("vi-VN",{weekday:"short"}),mins});}const max=Math.max(30,...days.map(d=>d.mins));$("weeklyChart").innerHTML=days.map(d=>`<div class="chart-col"><b>${d.mins}</b><div class="chart-bar-wrap"><div class="chart-bar" style="height:${Math.max(d.mins?4:0,d.mins/max*100)}%"></div></div><small>${d.label}</small></div>`).join("");const longest=Math.max(0,...data.history.filter(h=>h.type==="Phiên học").map(h=>h.minutes));$("personalRecords").innerHTML=[["Chuỗi streak hiện tại",data.streak+" ngày"],["Phiên học hoàn thành",data.sessions],["Phiên học dài nhất",longest+" phút"],["Điểm quiz cao nhất",Math.max(0,...data.quizHistory.map(q=>q.score))+"/100"]].map(x=>`<div class="record-row"><span>${x[0]}</span><b>${x[1]}</b></div>`).join("");$("historyTable").innerHTML=data.history.length?data.history.slice(0,30).map(h=>`<tr><td>${new Date(h.date).toLocaleString("vi-VN")}</td><td>${safeText(h.type)}</td><td>${h.minutes} phút</td><td>+${h.reward} 🪙</td></tr>`).join(""):'<tr><td colspan="4">Chưa có dữ liệu học tập.</td></tr>';}
$("exportBtn").addEventListener("click",downloadBackup);$("backupBtn").addEventListener("click",downloadBackup);
function downloadBackup(){const bundle={app:"Study RPG macOS",version:2,exportedAt:new Date().toISOString(),data,websiteLinks:JSON.parse(localStorage.getItem("studyRPGWebsiteLinks")||"[]"),calendarEvents:JSON.parse(localStorage.getItem("studyRPGCalendarEvents")||"[]")};const blob=new Blob([JSON.stringify(bundle,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="study-rpg-full-backup.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast("Đã xuất bản sao lưu đầy đủ.");}
function renderBoss(){const week=weekKey(),count=data.history.filter(h=>h.type==="Phiên học"&&h.date.slice(0,10)>=week).length,pct=Math.min(100,count/10*100),claimed=data.claimedBossWeek===week;$("bossProgressText").textContent=`${Math.min(count,10)} / 10 phiên`;$("bossPercent").textContent=Math.round(pct)+"%";$("bossBar").style.width=pct+"%";$("bossClaimBtn").disabled=count<10||claimed;$("bossClaimBtn").textContent=claimed?"Đã nhận thưởng":count>=10?"Nhận thưởng boss":"Cần thêm "+(10-count)+" phiên";$("bossStatus").textContent=claimed?"Bạn đã đánh bại boss tuần này!":count>=10?"Boss đã bị đánh bại. Nhận phần thưởng của bạn!":"Tiến độ tự cập nhật khi hoàn thành phiên học.";}
$("bossClaimBtn").addEventListener("click",()=>{const count=data.history.filter(h=>h.type==="Phiên học"&&h.date.slice(0,10)>=weekKey()).length;if(count<10||data.claimedBossWeek===weekKey())return;data.claimedBossWeek=weekKey();data.coins+=250;data.xp+=100;while(data.xp>=data.level*100){data.xp-=data.level*100;data.level++;}recordActivity("Thưởng Boss tuần",0,250);save();renderUI();toast("🐉 Boss tuần bị đánh bại! +250 S-Coins và +100 XP.");});
const avatarPool=[{id:"astronaut",emoji:"🧑‍🚀",name:"Nhà du hành",rarity:"Common"},{id:"cat",emoji:"🐱",name:"Mèo học giả",rarity:"Common"},{id:"fox",emoji:"🦊",name:"Cáo nhanh trí",rarity:"Common"},{id:"robot",emoji:"🤖",name:"Robot học tập",rarity:"Rare"},{id:"wizard",emoji:"🧙",name:"Pháp sư tri thức",rarity:"Rare"},{id:"dragon",emoji:"🐉",name:"Rồng cổ đại",rarity:"Epic"},{id:"phoenix",emoji:"🦅",name:"Phượng hoàng",rarity:"Epic"},{id:"cosmic",emoji:"🌌",name:"Thực thể vũ trụ",rarity:"Legendary"}];
function renderAvatar(){const owned=new Set(data.avatars.map(a=>a.id));$("avatarCollection").innerHTML=avatarPool.map(a=>`<button class="avatar-item ${owned.has(a.id)?"":"locked"} ${data.equipped===a.id?"equipped":""}" data-avatar="${a.id}" ${owned.has(a.id)?"":"disabled"}><span>${a.emoji}</span><small>${a.name}</small></button>`).join("");document.querySelectorAll("[data-avatar]").forEach(b=>b.addEventListener("click",()=>{data.equipped=b.dataset.avatar;save();renderUI();toast("Đã trang bị avatar!");}));$("inventoryStrip").innerHTML=data.avatars.map(a=>`<span title="${safeText(a.name)}">${a.emoji}</span>`).join("");}
$("openChestBtn").addEventListener("click",()=>{if(data.coins<100){toast("Bạn cần ít nhất 100 S-Coins để mở hòm.");return;}data.coins-=100;$("openChestBtn").disabled=true;$("chestArt").textContent="✨";$("chestResult").textContent="Đang mở hòm...";$("chestArt").style.transform="scale(1.2) rotate(-6deg)";setTimeout(()=>{const r=Math.random()*100;const rarity=r<60?"Common":r<85?"Rare":r<97?"Epic":"Legendary";const pool=avatarPool.filter(a=>a.rarity===rarity);const available=pool.filter(a=>!data.avatars.some(owned=>owned.id===a.id));const got=(available.length?available:pool)[Math.floor(Math.random()*(available.length?available.length:pool.length))];let message;if(data.avatars.some(a=>a.id===got.id)){const refund=rarity==="Legendary"?100:rarity==="Epic"?50:20;data.coins+=refund;message=`${got.emoji} Trùng vật phẩm! Hoàn lại ${refund} S-Coins.`;}else{data.avatars.push(got);message=`${got.emoji} Nhận được ${got.name} — ${rarity}!`;} $("chestArt").textContent="🧰";$("chestArt").style.transform="";$("chestResult").textContent=message;$("openChestBtn").disabled=false;save();renderUI();},850);});
const shopItems=[{id:"themeAurora",emoji:"🌌",name:"Theme Aurora",desc:"Một món sưu tầm phong cách vũ trụ.",price:180},{id:"focusAura",emoji:"✨",name:"Focus Aura",desc:"Hiệu ứng hào quang trong bộ sưu tập.",price:250},{id:"streakBadge",emoji:"🔥",name:"Huy hiệu Streak",desc:"Huy hiệu dành cho người học bền bỉ.",price:120},{id:"crystal",emoji:"💎",name:"Pha lê XP",desc:"Vật phẩm sưu tầm hiếm.",price:300},{id:"coffee",emoji:"☕",name:"Cốc tập trung",desc:"Phụ kiện góc học tập.",price:80},{id:"crown",emoji:"👑",name:"Vương miện",desc:"Biểu tượng thành tựu cá nhân.",price:500}];
function renderShop(){$("shopGrid").innerHTML=shopItems.map(i=>{const owned=data.items.includes(i.id);return `<article class="shop-item glass"><div class="item-art">${i.emoji}</div><h3>${i.name}</h3><p>${i.desc}</p><div class="price">🪙 ${i.price}</div><button class="${owned?"secondary-btn":"primary-btn"}" data-buy="${i.id}" ${owned?"disabled":""}>${owned?"Đã sở hữu":"Mua vật phẩm"}</button></article>`;}).join("");document.querySelectorAll("[data-buy]").forEach(b=>b.addEventListener("click",()=>buyItem(b.dataset.buy)));$("ownedItems").innerHTML=data.items.length?data.items.map(id=>{const i=shopItems.find(x=>x.id===id);return `<span class="owned-pill">${i?.emoji||"🎁"} ${safeText(i?.name||id)}</span>`;}).join(""):'<span class="muted">Túi đồ đang trống.</span>';}
function buyItem(id){const item=shopItems.find(i=>i.id===id);if(!item||data.items.includes(id))return;if(data.coins<item.price){toast("Không đủ S-Coins để mua vật phẩm.");return;}data.coins-=item.price;data.items.push(id);save();renderUI();toast("Đã mua "+item.name+"!");}
const achievements=[{id:"first",emoji:"🌱",name:"Khởi đầu hành trình",desc:"Hoàn thành phiên học đầu tiên.",test:()=>data.sessions>=1},{id:"five",emoji:"📚",name:"Vào guồng",desc:"Hoàn thành 5 phiên học.",test:()=>data.sessions>=5},{id:"hours",emoji:"⏳",name:"Người bền bỉ",desc:"Tích lũy 300 phút học.",test:()=>data.totalMinutes>=300},{id:"streak3",emoji:"🔥",name:"Giữ lửa",desc:"Đạt streak 3 ngày.",test:()=>data.streak>=3},{id:"quiz",emoji:"🧠",name:"Tò mò tri thức",desc:"Hoàn thành quiz đầu tiên.",test:()=>data.quizHistory.length>=1},{id:"quiz90",emoji:"🏆",name:"Điểm cao",desc:"Đạt ít nhất 90 điểm quiz.",test:()=>data.quizHistory.some(q=>q.score>=90)},{id:"level5",emoji:"⚡",name:"Tăng tốc",desc:"Đạt Level 5.",test:()=>data.level>=5},{id:"collector",emoji:"🎒",name:"Nhà sưu tầm",desc:"Sở hữu 5 avatar.",test:()=>data.avatars.length>=5},{id:"boss",emoji:"🐉",name:"Thợ săn boss",desc:"Nhận thưởng boss tuần.",test:()=>!!data.claimedBossWeek}];
function renderAchievements(){$("achievementGrid").innerHTML=achievements.map(a=>{const ok=a.test();return `<article class="achievement glass ${ok?"":"locked"}"><div class="achievement-icon">${a.emoji}</div><div><h3>${a.name}</h3><p>${a.desc}</p><small>${ok?"✓ Đã mở khóa":"🔒 Chưa mở khóa"}</small></div></article>`;}).join("");}
$("profileForm").addEventListener("submit",e=>{e.preventDefault();data.profile={name:$("profileName").value.trim()||"Nhà thám hiểm",level:$("schoolLevel").value,schoolClass:$("schoolClass").value.trim(),examName:$("examName").value.trim(),examDate:$("examDate").value};save();renderUI();$("profileSaved").textContent="Đã lưu hồ sơ!";toast("Hồ sơ đã được cập nhật.");});
function fillProfile(){$("profileName").value=data.profile.name;$("schoolLevel").value=data.profile.level;$("schoolClass").value=data.profile.schoolClass;$("examName").value=data.profile.examName;$("examDate").value=data.profile.examDate;}
function updateExamCountdown(){if(!$("examCountdown"))return;const value=$("examDate").value;if(!value){$("examCountdown").textContent="Chọn ngày thi để xem đếm ngược.";return;}const target=new Date(value+"T00:00:00"),now=new Date();now.setHours(0,0,0,0);const days=Math.ceil((target-now)/86400000);$("examCountdown").textContent=days>0?`⏳ Còn ${days} ngày đến ${$("examName").value||"kỳ thi"}.`:days===0?"🎯 Hôm nay là ngày thi. Chúc bạn bình tĩnh và tự tin!":"Ngày thi đã qua. Hãy cập nhật ngày mới nếu cần."; }
$("examDate").addEventListener("change",updateExamCountdown);$("examName").addEventListener("input",updateExamCountdown);
function applySettings(){
 document.documentElement.dataset.accent=data.settings.accent||"blue";
 document.body.classList.toggle("no-glow",!data.settings.glow);
 document.body.classList.toggle("reduce-motion",!!data.settings.motion);
 $("accentSelect").value=data.settings.accent||"blue";
 $("glowToggle").checked=!!data.settings.glow;
 $("motionToggle").checked=!!data.settings.motion;
 $("soundToggle").checked=!!data.settings.sound;

}
const accents={blue:["#6ea8fe","#9b8cff"],purple:["#b197fc","#7c6af2"],green:["#b8ff3b","#36e6a3"],pink:["#ff8fc7","#b197fc"]};
$("accentSelect").addEventListener("change",()=>{data.settings.accent=$("accentSelect").value;setAccent();save();applySettings();});
function setAccent(){const c=accents[data.settings.accent]||accents.blue;document.documentElement.style.setProperty("--accent",c[0]);document.documentElement.style.setProperty("--accent2",c[1]);}
$("glowToggle").addEventListener("change",()=>{data.settings.glow=$("glowToggle").checked;save();applySettings();});$("motionToggle").addEventListener("change",()=>{data.settings.motion=$("motionToggle").checked;save();applySettings();});$("soundToggle").addEventListener("change",()=>{data.settings.sound=$("soundToggle").checked;save();});
$("resetDataBtn").addEventListener("click",()=>{if(confirm("Bạn chắc chắn muốn xóa toàn bộ dữ liệu Study RPG trên trình duyệt này? Hành động không thể hoàn tác.")){localStorage.removeItem("studyRPGUltra");data=defaultData();normalize();save();fillProfile();setTimer();renderUI();toast("Đã đặt lại dữ liệu.");go("home");}});
function renderPage(page){if(page==="missions")renderMissions();if(page==="dashboard")renderDashboard();if(page==="boss")renderBoss();if(page==="avatar")renderAvatar();if(page==="shop")renderShop();if(page==="achievements")renderAchievements();}
fillProfile();setAccent();clockTick();setInterval(clockTick,1000);setTimer();renderUI();updateTimerDisplay();
})();

// macOS-like Dock shortcuts and menu-bar clock
document.querySelectorAll('[data-dock-page]').forEach(btn=>btn.addEventListener('click',()=>{const target=btn.dataset.dockPage;const nav=document.querySelector(`.nav-link[data-page="${target}"]`);if(nav)nav.click();}));
function updateMacMenuClock(){const el=document.getElementById('macMenuClock');if(!el)return;const now=new Date();el.textContent=now.toLocaleDateString('vi-VN',{weekday:'short',day:'2-digit',month:'short'})+' '+now.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});}
updateMacMenuClock();setInterval(updateMacMenuClock,30000);
