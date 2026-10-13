(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const toast = msg => { const el=$('toast'); if(!el)return; el.textContent=msg; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2800); };

  // Calendar / planner: kept in its own storage key so existing RPG progress remains intact.
  const CAL_KEY='studyRPGCalendarEvents';
  let events=[];
  try { const saved=JSON.parse(localStorage.getItem(CAL_KEY)||'[]'); if(Array.isArray(saved)) events=saved.filter(e=>e&&typeof e.title==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(e.date)); } catch {}
  let viewed=new Date(); viewed.setDate(1);
  let selectedDate=today();
  const saveEvents=()=>{localStorage.setItem(CAL_KEY,JSON.stringify(events));window.dispatchEvent(new CustomEvent('study-rpg-local-change'));};
  const monthKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  const dateLabel=value=>new Date(value+'T12:00:00').toLocaleDateString('vi-VN',{weekday:'long',day:'numeric',month:'long'});
  function renderCalendar(){
    if(!$('calendarGrid')) return;
    $('calendarMonthLabel').textContent=viewed.toLocaleDateString('vi-VN',{month:'long',year:'numeric'});
    const first=new Date(viewed.getFullYear(),viewed.getMonth(),1);
    const offset=(first.getDay()+6)%7;
    const count=new Date(viewed.getFullYear(),viewed.getMonth()+1,0).getDate();
    const cells=[];
    for(let i=0;i<offset;i++) cells.push('<span class="calendar-day empty"></span>');
    for(let n=1;n<=count;n++){
      const date=`${viewed.getFullYear()}-${String(viewed.getMonth()+1).padStart(2,'0')}-${String(n).padStart(2,'0')}`;
      const num=events.filter(e=>e.date===date).length;
      cells.push(`<button type="button" class="calendar-day ${date===today()?'today':''} ${date===selectedDate?'selected':''} ${num?'has-events':''}" data-calendar-date="${date}"><span>${n}</span>${num?`<i>${num}</i>`:''}</button>`);
    }
    $('calendarGrid').innerHTML=cells.join('');
    $('calendarGrid').querySelectorAll('[data-calendar-date]').forEach(b=>b.addEventListener('click',()=>{selectedDate=b.dataset.calendarDate;$('calendarDate').value=selectedDate;renderCalendar();renderEvents();}));
    renderEvents();
  }
  function renderEvents(){
    if(!$('calendarEventList'))return;
    const chosen=events.filter(e=>e.date===selectedDate).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
    $('calendarSelectedLabel').textContent=selectedDate===today()?'Kế hoạch hôm nay':dateLabel(selectedDate);
    $('calendarEventCount').textContent=`${chosen.length} mục`;
    $('calendarEventList').innerHTML=chosen.length?chosen.map(e=>`<article class="calendar-event"><div class="calendar-event-date">${e.time?escapeHTML(e.time):'Cả ngày'}</div><div class="calendar-event-copy"><strong>${escapeHTML(e.title)}</strong><small>${escapeHTML(e.subject||'Khác')}</small></div><button type="button" class="calendar-delete" data-event-delete="${escapeHTML(e.id)}" aria-label="Xóa kế hoạch">×</button></article>`).join(''):'<div class="website-list-empty">Chưa có kế hoạch cho ngày này. Thêm một mục ở biểu mẫu phía trên nhé.</div>';
    $('calendarEventList').querySelectorAll('[data-event-delete]').forEach(b=>b.addEventListener('click',()=>{events=events.filter(e=>e.id!==b.dataset.eventDelete);saveEvents();renderCalendar();toast('Đã xóa kế hoạch.');}));
  }
  if($('calendarForm')){
    $('calendarDate').value=today();
    $('calendarForm').addEventListener('submit',e=>{e.preventDefault();const title=$('calendarTitle').value.trim(),date=$('calendarDate').value;if(!title||!date)return;events.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),title,date,subject:$('calendarSubject').value,time:$('calendarTime').value||''});selectedDate=date;viewed=new Date(date+'T12:00:00');viewed.setDate(1);saveEvents();$('calendarTitle').value='';$('calendarTime').value='';renderCalendar();toast('Đã lưu kế hoạch học tập.');});
    $('calendarPrev').addEventListener('click',()=>{viewed.setMonth(viewed.getMonth()-1);renderCalendar();});
    $('calendarNext').addEventListener('click',()=>{viewed.setMonth(viewed.getMonth()+1);renderCalendar();});
    renderCalendar();
  }

  // Dock Focus shortcut enters a focused view; Escape exits it.
  const focusBtn=$('focusModeBtn');
  function setFocusMode(enabled){document.body.classList.toggle('focus-mode',enabled);if(focusBtn)focusBtn.textContent=enabled?'✕ Thoát Focus':'⛶ Focus Mode';}
  if(focusBtn) focusBtn.addEventListener('click',()=>setFocusMode(!document.body.classList.contains('focus-mode')));
  document.querySelectorAll('[data-dock-page="home"]').forEach(btn=>{if(btn.title==='Pomodoro / Tập trung')btn.addEventListener('click',()=>{setFocusMode(true);document.getElementById('page-home')?.scrollIntoView({behavior:'smooth'});});});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')setFocusMode(false);});

  // Search saved website links without changing their persistent storage.
  const search=$('websiteSearch');
  if(search) search.addEventListener('input',()=>{const q=search.value.trim().toLowerCase();document.querySelectorAll('#websiteList .website-link-card').forEach(card=>{card.hidden=!card.textContent.toLowerCase().includes(q);});});

  // Import full backups, including RPG state, website links, and planner events.
  const importInput=$('importBackupFile');
  if(importInput) importInput.addEventListener('change',async()=>{
    const file=importInput.files&&importInput.files[0];if(!file)return;
    try{
      const parsed=JSON.parse(await file.text());
      if(parsed&&parsed.app==='Study RPG macOS'&&parsed.data&&typeof parsed.data==='object'){
        if(!confirm('Khôi phục bản sao lưu sẽ thay thế tiến độ, website và lịch học hiện tại. Tiếp tục?')){importInput.value='';return;}
        localStorage.setItem('studyRPGUltra',JSON.stringify(parsed.data));
        localStorage.setItem('studyRPGWebsiteLinks',JSON.stringify(Array.isArray(parsed.websiteLinks)?parsed.websiteLinks:[]));
        localStorage.setItem(CAL_KEY,JSON.stringify(Array.isArray(parsed.calendarEvents)?parsed.calendarEvents:[]));
      } else if(parsed&&typeof parsed==='object'&&('xp' in parsed||'history' in parsed||'coins' in parsed)) {
        if(!confirm('Đây là bản sao lưu Study RPG cũ. Khôi phục sẽ thay thế tiến độ hiện tại. Tiếp tục?')){importInput.value='';return;}
        localStorage.setItem('studyRPGUltra',JSON.stringify(parsed));
      } else { throw new Error('unsupported'); }
      alert('Đã khôi phục dữ liệu. Study RPG sẽ tải lại.');location.reload();
    }catch(err){alert('Không đọc được bản sao lưu. Hãy chọn file JSON được xuất từ Study RPG.');importInput.value='';}
  });


  // Persist Gemini API key locally on this browser only (never in RPG backups or Firestore).
  const API_KEY_STORAGE = 'studyRPGGeminiApiKeyV1';
  const apiKeyInput = $('aiQuizKey');
  const apiKeyStatus = $('aiQuizKeyStatus');
  const keySaveBtn = $('aiQuizKeySave');
  const keyClearBtn = $('aiQuizKeyClear');
  const keyToggleBtn = $('aiQuizKeyToggle');
  function updateApiKeyStatus(message) {
    if (apiKeyStatus) apiKeyStatus.textContent = message;
  }
  try {
    const savedKey = localStorage.getItem(API_KEY_STORAGE) || sessionStorage.getItem(API_KEY_STORAGE) || '';
    if (apiKeyInput && savedKey) apiKeyInput.value = savedKey;
    updateApiKeyStatus(savedKey ? '✓ API key đã được lưu trên trình duyệt này.' : 'Chưa có API key được lưu.');
  } catch { updateApiKeyStatus('Trình duyệt đang chặn bộ nhớ API key.'); }
  function saveApiKey() {
    const key = apiKeyInput?.value.trim() || '';
    if (!key) { updateApiKeyStatus('Hãy dán API key trước khi lưu.'); return; }
    try {
      localStorage.setItem(API_KEY_STORAGE, key);
      if (localStorage.getItem(API_KEY_STORAGE) !== key) throw new Error('verify');
      try { sessionStorage.removeItem(API_KEY_STORAGE); } catch {}
      updateApiKeyStatus('✓ Đã lưu API key trên thiết bị này.');
    } catch {
      try {
        sessionStorage.setItem(API_KEY_STORAGE, key);
        updateApiKeyStatus('Đã lưu tạm đến khi đóng trình duyệt.');
      } catch { updateApiKeyStatus('Không lưu được key. Hãy kiểm tra cài đặt quyền riêng tư của trình duyệt.'); }
    }
  }
  keySaveBtn?.addEventListener('click', saveApiKey);
  apiKeyInput?.addEventListener('change', saveApiKey);
  apiKeyInput?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); saveApiKey(); } });
  keyClearBtn?.addEventListener('click', () => {
    try { localStorage.removeItem(API_KEY_STORAGE); sessionStorage.removeItem(API_KEY_STORAGE); } catch {}
    if (apiKeyInput) apiKeyInput.value = '';
    updateApiKeyStatus('Đã xóa API key đã lưu.');
  });
  keyToggleBtn?.addEventListener('click', () => {
    if (!apiKeyInput) return;
    apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
    keyToggleBtn.textContent = apiKeyInput.type === 'password' ? 'Hiện key' : 'Ẩn key';
  });

  // AI quiz generator with persistent duplicate prevention.
  const QUIZ_HISTORY_KEY='studyRPGAIQuizQuestionHistoryV1';
  let quizHistory=[];
  try{const raw=JSON.parse(localStorage.getItem(QUIZ_HISTORY_KEY)||'[]');if(Array.isArray(raw))quizHistory=raw.filter(x=>typeof x==='string').slice(-1000);}catch{}
  let activeAIQuiz=[]; let quizSubmitted=false;
  const normalizeQuestion=s=>String(s||'').toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,' ').trim();
  const saveQuizHistory=()=>{quizHistory=Array.from(new Set(quizHistory)).slice(-1000);localStorage.setItem(QUIZ_HISTORY_KEY,JSON.stringify(quizHistory));window.dispatchEvent(new CustomEvent('study-rpg-local-change'));if($('aiQuizHistoryCount'))$('aiQuizHistoryCount').textContent=`${quizHistory.length} câu đã ghi nhận`;};
  const setQuizStatus=t=>{if($('aiQuizStatus'))$('aiQuizStatus').textContent=t;};
  function renderAIQuiz(){
    const out=$('aiQuizOutput');if(!out)return;
    if(!activeAIQuiz.length){out.innerHTML='<div class="empty-state"><strong>Chưa có quiz</strong><p>Hãy chọn thiết lập và tạo quiz mới.</p></div>';return;}
    const answered=activeAIQuiz.filter(q=>q.selected!==undefined).length;
    out.innerHTML=`<div class="muted">${escapeHTML($('aiQuizGrade').value)} · ${escapeHTML($('aiQuizSubject').value)} · ${activeAIQuiz.length} câu${$('aiQuizTopic').value.trim()?' · '+escapeHTML($('aiQuizTopic').value.trim()):''}</div>`+
      activeAIQuiz.map((q,i)=>`<div class="aiquiz-question"><h3>${i+1}. ${escapeHTML(q.question)}</h3><div class="aiquiz-options">${q.options.map((opt,j)=>`<label class="aiquiz-option ${quizSubmitted&&j===q.answer?'correct':''} ${quizSubmitted&&q.selected===j&&j!==q.answer?'wrong':''}"><input type="radio" name="aiq${i}" value="${j}" ${q.selected===j?'checked':''} ${quizSubmitted?'disabled':''}><span><b>${'ABCD'[j]}.</b> ${escapeHTML(opt)}</span></label>`).join('')}</div>${quizSubmitted?`<p class="aiquiz-explanation"><b>${q.selected===q.answer?'Chính xác!':'Đáp án: '+('ABCD'[q.answer])+'.'}</b> ${escapeHTML(q.explanation||'')}</p>`:''}</div>`).join('')+
      (quizSubmitted?`<div class="aiquiz-score"><strong>Kết quả: ${activeAIQuiz.filter(q=>q.selected===q.answer).length}/${activeAIQuiz.length} câu đúng</strong><p class="muted">${Math.round(activeAIQuiz.filter(q=>q.selected===q.answer).length/activeAIQuiz.length*100)}% · Câu hỏi đã được ghi vào lịch sử chống trùng.</p></div><div class="aiquiz-actions"><button class="primary-btn" type="button" id="aiQuizAgain">Tạo quiz khác</button></div>`:`<div class="aiquiz-actions"><button class="primary-btn" type="button" id="aiQuizSubmit">Chấm điểm (${answered}/${activeAIQuiz.length} đã chọn)</button></div>`);
    if(!quizSubmitted){out.querySelectorAll('input[type=radio]').forEach(el=>el.addEventListener('change',()=>{activeAIQuiz[Number(el.name.slice(3))].selected=Number(el.value);renderAIQuiz();}));$('aiQuizSubmit').addEventListener('click',()=>{if(activeAIQuiz.some(q=>q.selected===undefined)){toast('Hãy trả lời tất cả câu hỏi trước khi chấm.');return;}quizSubmitted=true;setQuizStatus('Đã chấm điểm');renderAIQuiz();});}
    else $('aiQuizAgain').addEventListener('click',()=>$('aiQuizForm').requestSubmit());
  }
  async function generateAIQuiz(e){
    e.preventDefault();const apiKey=$('aiQuizKey').value.trim() || (()=>{try{return localStorage.getItem('studyRPGGeminiApiKeyV1')||sessionStorage.getItem('studyRPGGeminiApiKeyV1')||''}catch{return ''}})();if(!apiKey){alert('Hãy nhập và lưu Gemini API key để tạo câu hỏi bằng AI.');$('aiQuizKey').focus();return;}
    const grade=$('aiQuizGrade').value,subject=$('aiQuizSubject').value,topic=$('aiQuizTopic').value.trim()||'các kiến thức trọng tâm phù hợp chương trình',count=Number($('aiQuizCount').value),difficulty=$('aiQuizDifficulty').value;
    const button=$('aiQuizGenerate');button.disabled=true;button.textContent='Đang tạo câu hỏi…';setQuizStatus('Đang gọi AI');$('aiQuizOutput').innerHTML='<div class="aiquiz-loading"><span class="spinner"></span>AI đang soạn câu hỏi mới và kiểm tra lịch sử…</div>';
    try{
      const recent=quizHistory.slice(-160).map((q,i)=>`${i+1}. ${q}`).join('\n');
      const prompt=`Bạn là giáo viên ra đề chính xác bằng tiếng Việt. Tạo đúng ${count} câu hỏi trắc nghiệm cho ${grade}, môn ${subject}, chủ đề: ${topic}. Độ khó: ${difficulty}. Phù hợp chương trình phổ thông Việt Nam. Mỗi câu có đúng 4 lựa chọn, chỉ 1 đáp án đúng, không mơ hồ. Tuyệt đối tránh trùng lặp hoặc diễn đạt lại câu hỏi cũ bên dưới.\nCÂU ĐÃ DÙNG:\n${recent||'(chưa có)'}\nChỉ trả về JSON hợp lệ, không markdown, theo schema: {"questions":[{"question":"...","options":["...","...","...","..."],"answer":0,"explanation":"..."}]}. answer là chỉ số từ 0 đến 3.`;
      const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key='+encodeURIComponent(apiKey),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseMimeType:'application/json',temperature:0.9}})});
      const payload=await response.json();if(!response.ok)throw new Error(payload?.error?.message||`Gemini API lỗi (${response.status})`);
      const text=payload?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('')||'';
      const data=JSON.parse(text.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));
      if(!Array.isArray(data.questions))throw new Error('AI không trả về danh sách câu hỏi hợp lệ.');
      const seen=new Set(quizHistory.map(normalizeQuestion));
      const fresh=data.questions.filter(q=>q&&typeof q.question==='string'&&Array.isArray(q.options)&&q.options.length===4&&Number.isInteger(q.answer)&&q.answer>=0&&q.answer<4&&!seen.has(normalizeQuestion(q.question)));
      if(fresh.length<count){throw new Error(`AI chỉ tạo được ${fresh.length}/${count} câu mới không trùng lịch sử. Hãy đổi chủ đề hoặc xóa lịch sử nếu bạn muốn làm lại.`);}
      activeAIQuiz=fresh.slice(0,count).map(q=>({question:q.question,options:q.options.map(String),answer:q.answer,explanation:String(q.explanation||''),selected:undefined}));
      activeAIQuiz.forEach(q=>quizHistory.push(normalizeQuestion(q.question)));saveQuizHistory();quizSubmitted=false;setQuizStatus('Đã tạo '+activeAIQuiz.length+' câu mới');renderAIQuiz();toast('Đã tạo quiz mới, không trùng các câu đã lưu.');
    }catch(err){$('aiQuizOutput').innerHTML=`<div class="empty-state"><strong>Không thể tạo quiz</strong><p>${escapeHTML(err.message||'Đã xảy ra lỗi. Hãy kiểm tra mạng và API key.')}</p><p class="muted">Nếu trình duyệt chặn yêu cầu khi mở file trực tiếp, hãy chạy ứng dụng qua localhost. Không chia sẻ API key cho người khác.</p></div>`;setQuizStatus('Có lỗi');}
    finally{button.disabled=false;button.textContent='✦ Tạo quiz mới';}
  }
  if($('aiQuizForm'))$('aiQuizForm').addEventListener('submit',generateAIQuiz);
  if($('aiQuizHistoryCount'))$('aiQuizHistoryCount').textContent=`${quizHistory.length} câu đã ghi nhận`;
  if($('aiQuizClearHistory'))$('aiQuizClearHistory').addEventListener('click',()=>{if(confirm('Xóa lịch sử câu hỏi đã dùng? Các quiz sau có thể tạo lại câu cũ.')){quizHistory=[];saveQuizHistory();toast('Đã xóa lịch sử câu hỏi.');}});

})();
/* STUDY RPG QUIZ FIX PACK */
(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const APP_KEY = "studyRPGUltra";
  const API_KEY = "studyRPGGeminiApiKey";
  const SESSION_KEY = "studyRPGGeminiApiKeySession";

  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  }[c]));

  const readApp = () => {
    try {
      const value = JSON.parse(localStorage.getItem(APP_KEY) || "{}");
      return value && typeof value === "object" ? value : {};
    } catch {
      return {};
    }
  };

  const writeApp = value => {
    localStorage.setItem(APP_KEY, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("study-rpg-local-change"));
  };

  const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  // Bổ sung lựa chọn lớp 1–5, không xóa lựa chọn cũ.
  function addPrimaryGrades() {
    const grade = $("aiQuizGrade");
    if (!grade) return;

    const existing = new Set([...grade.options].map(o => o.value));

    for (const value of ["Lớp 5", "Lớp 4", "Lớp 3", "Lớp 2", "Lớp 1"]) {
      if (!existing.has(value)) {
        grade.insertAdjacentHTML(
          "afterbegin",
          `<option value="${value}">${value}</option>`
        );
      }
    }
  }

  // Thêm nút lưu API key.
  function setupApiKeySave() {
    const input = $("aiQuizKey");
    if (!input || $("studyRPGSaveKeyBtn")) return;

    const label = input.closest("label");
    const button = document.createElement("button");

    button.type = "button";
    button.id = "studyRPGSaveKeyBtn";
    button.className = "secondary-btn";
    button.textContent = "💾 Lưu API key trên máy này";
    button.style.marginTop = "8px";

    const status = document.createElement("p");
    status.id = "studyRPGKeyStatus";
    status.className = "muted aiquiz-note";
    status.setAttribute("aria-live", "polite");

    if (label) {
      label.insertAdjacentElement("afterend", button);
      button.insertAdjacentElement("afterend", status);
    }

    const show = message => {
      status.textContent = message;
    };

    try {
      const saved = localStorage.getItem(API_KEY);
      const temporary = sessionStorage.getItem(SESSION_KEY);

      input.value = saved || temporary || input.value || "";

      show(
        saved ? "✓ API key đã lưu trên trình duyệt này."
        : temporary ? "⚠ API key chỉ được giữ trong phiên hiện tại."
        : "Nhập API key rồi nhấn nút Lưu."
      );
    } catch {
      show("Trình duyệt đang hạn chế lưu dữ liệu.");
    }

    const save = () => {
      const key = input.value.trim();

      try {
        if (!key) {
          localStorage.removeItem(API_KEY);
          sessionStorage.removeItem(SESSION_KEY);
          show("Đã xóa API key đã lưu.");
          return;
        }

        localStorage.setItem(API_KEY, key);

        if (localStorage.getItem(API_KEY) !== key) {
          throw new Error("Không xác minh được");
        }

        try {
          sessionStorage.removeItem(SESSION_KEY);
        } catch {}

        show("✓ Đã lưu API key trên trình duyệt này. Không chia sẻ key.");
      } catch {
        try {
          sessionStorage.setItem(SESSION_KEY, key);
          show("⚠ Chỉ lưu được API key trong phiên hiện tại.");
        } catch {
          show("⚠ Trình duyệt chặn việc lưu API key.");
        }
      }
    };

    button.addEventListener("click", save);
    input.addEventListener("change", save);
    input.addEventListener("blur", save);
  }

  // Phân loại kỹ năng để thống kê kết quả học tập.
  function inferSkill(subject, topic, question) {
    const text = `${topic || ""} ${question || ""}`.toLocaleLowerCase("vi");
    const has = (...words) => words.some(word => text.includes(word));

    if (subject === "Toán") {
      if (has("phân thức", "rút gọn biểu thức", "mẫu thức"))
        return "Phân thức đại số";
      if (has("thales", "ta-lét", "tam giác đồng dạng", "đồng dạng"))
        return "Định lý Thales & tam giác đồng dạng";
      if (has("pythagore", "py-ta-go", "cạnh huyền"))
        return "Định lý Pythagore";
      if (has("phương trình", "ẩn số", "nghiệm của"))
        return "Giải phương trình";
      if (has("xác suất", "ngẫu nhiên", "khả năng xảy ra"))
        return "Xác suất";
      if (has("thể tích", "diện tích xung quanh"))
        return "Hình học không gian";
      if (has("góc", "đường phân giác"))
        return "Góc & đường phân giác";
      if (has("hàm số", "đồ thị"))
        return "Hàm số và đồ thị";
      if (has("tỉ lệ", "phần trăm", "quãng đường", "vận tốc"))
        return "Toán thực tế";

      return topic || "Tư duy và tính toán";
    }

    if (subject === "Tiếng Anh") {
      if (has("tense", "thì hiện tại", "thì quá khứ", "thì tương lai"))
        return "Ngữ pháp – thì";
      if (has("vocabulary", "meaning of", "synonym", "antonym", "từ đồng nghĩa"))
        return "Từ vựng";
      if (has("reading", "đoạn văn", "according to the passage"))
        return "Đọc hiểu";
      if (has("passive", "bị động"))
        return "Câu bị động";
      if (has("conditional", "câu điều kiện"))
        return "Câu điều kiện";

      return topic || "Ngữ pháp & từ vựng";
    }

    if (subject === "Ngữ văn") {
      if (has("biện pháp tu từ", "ẩn dụ", "hoán dụ", "nhân hóa", "so sánh"))
        return "Biện pháp tu từ";
      if (has("chủ đề", "nội dung chính", "thông điệp"))
        return "Đọc hiểu văn bản";
      if (has("tác giả", "xuất xứ", "hoàn cảnh sáng tác"))
        return "Tác giả & tác phẩm";

      return topic || "Đọc hiểu và cảm thụ";
    }

    return topic || `Kiến thức môn ${subject || "tổng hợp"}`;
  }

  // Lưu kết quả quiz vào dữ liệu chính của Study RPG.
 
  // Lưu kết quả quiz, cộng thưởng và đồng bộ nhiệm vụ Study RPG.
  function saveCompletedQuiz() {
    const output = $("aiQuizOutput");
    if (!output || !$("aiQuizAgain")) return;

    // Ngăn một lượt nộp bài bị cộng thưởng nhiều lần.
    if (output.dataset.rewarded === "true") return;

    const questions = [...output.querySelectorAll(".aiquiz-question")];
    if (!questions.length) return;

    const subject = $("aiQuizSubject")?.value || "Kiến thức tổng hợp";
    const grade = $("aiQuizGrade")?.value || "";
    const topic = $("aiQuizTopic")?.value.trim() || subject;

    const skillsMap = new Map();
    let correct = 0;
    const total = questions.length;

    for (const node of questions) {
      const questionText =
        node.querySelector("h3")?.innerText.replace(/^\s*\d+\.\s*/, "") || "";

      const correctOption = node.querySelector(".aiquiz-option.correct");
      const selectedCorrect = !!(
        correctOption && correctOption.querySelector("input")?.checked
      );

      if (selectedCorrect) correct++;

      const skill = inferSkill(subject, topic, questionText);
      const current = skillsMap.get(skill) || {
        name: skill,
        correct: 0,
        total: 0
      };

      current.total++;
      if (selectedCorrect) current.correct++;
      skillsMap.set(skill, current);
    }

    const result = {
      id: `aiquiz-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: new Date().toISOString(),
      grade,
      subject,
      topic,
      difficulty: $("aiQuizDifficulty")?.value || "",
      score: Math.round(correct / total * 100),
      correct,
      total,
      skills: [...skillsMap.values()]
    };

    try {
      const data = readApp();

      data.quizHistory = Array.isArray(data.quizHistory)
        ? data.quizHistory : [];
      data.history = Array.isArray(data.history) ? data.history : [];

      // Kiểm tra dữ liệu trước khi lưu để tránh ghi trùng kết quả.
      if (data.quizHistory.some(q => q && q.id === result.id)) return;

      // 1. Lưu lịch sử quiz.
      data.quizHistory.unshift(result);
      data.quizHistory = data.quizHistory.slice(0, 300);

      // 2. Cộng 10 XP và 10 S-Coins cho mỗi quiz hoàn thành.
      data.xp = Math.max(0, Number(data.xp) || 0) + 10;
      data.coins = Math.max(0, Number(data.coins) || 0) + 10;
      data.level = Math.max(1, Number(data.level) || 1);

      // Tự động lên cấp nếu đủ XP.
      while (data.xp >= data.level * 100) {
        data.xp -= data.level * 100;
        data.level++;
      }

      // 3. Ghi vào hoạt động gần đây và lịch sử thống kê.
      data.history.unshift({
        date: result.date,
        type: "Quiz",
        minutes: 0,
        reward: 10,
        score: result.score,
        subject: result.subject,
        topic: result.topic
      });
      data.history = data.history.slice(0, 150);

      // 4. Đồng bộ nhiệm vụ quiz trong ngày.
      data.daily = data.daily && typeof data.daily === "object"
        ? data.daily
        : { date: todayKey(), done: [] };

      if (data.daily.date !== todayKey()) {
        data.daily = { date: todayKey(), done: [] };
      }

      data.daily.done = Array.isArray(data.daily.done)
        ? data.daily.done : [];

      if (!data.daily.done.includes("quiz")) {
        data.daily.done.push("quiz");
      }

      // Ghi lại trạng thái đã thưởng trước khi lưu.
      output.dataset.rewarded = "true";

      writeApp(data);

      const toast = $("toast");
      if (toast) {
        toast.textContent =
          `🎉 Quiz hoàn thành! +10 XP, +10 S-Coins · Điểm ${result.score}/100`;
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 3500);
      }

      // Làm mới giao diện để cập nhật Level, XP, xu và nhiệm vụ.
      setTimeout(() => location.reload(), 500);
    } catch (error) {
      console.error("Không thể lưu kết quả quiz:", error);
      alert("Không lưu được kết quả quiz. Hãy kiểm tra bộ nhớ trình duyệt.");
    }
  }


        setTimeout(() => toast.classList.remove("show"), 3500);
      }

      // Tải lại để giao diện đọc dữ liệu vừa lưu.
      setTimeout(() => location.reload(), 500);
    } catch (error) {
      console.error("Không thể lưu kết quả quiz:", error);
      alert("Không lưu được kết quả quiz. Hãy kiểm tra bộ nhớ trình duyệt.");
    }
  }

  // Theo dõi nút chấm bài của quiz AI.

  // Theo dõi nộp bài và bắt đầu quiz mới.
  function setupQuizTracking() {
    document.addEventListener("click", event => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      // Cho phép quiz tiếp theo nhận thưởng bình thường.
      if (target.closest("#aiQuizAgain")) {
        const output = $("aiQuizOutput");
        if (output) output.dataset.rewarded = "false";
        return;
      }

      const button = target.closest("#aiQuizSubmit");
      if (!button) return;

      // Chờ giao diện kết quả được render sau khi chấm bài.
      setTimeout(() => {
        if ($("aiQuizAgain")) saveCompletedQuiz();
      }, 0);
    }, true);
  }

  // Bảng phân tích điểm mạnh và kỹ năng cần ôn tập.
  function renderSkillAnalysis() {
    const dashboard = $("page-dashboard");
    if (!dashboard) return;

    let panel = $("studyRPGSkillPanel");

    if (!panel) {
      panel = document.createElement("article");
      panel.id = "studyRPGSkillPanel";
      panel.className = "panel glass";

      panel.innerHTML = `
        <div class="panel-heading">
          <div>
            <h2>🧠 Phân tích kỹ năng</h2>
            <p class="muted">Thống kê từ các quiz AI đã hoàn thành</p>
          </div>
          <span class="muted" id="studyRPGSkillCount">0 quiz</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Môn</th>
                <th>Kỹ năng / chủ đề</th>
                <th>Đúng</th>
                <th>Tổng</th>
                <th>Tỉ lệ đúng</th>
                <th>Nhận xét</th>
              </tr>
            </thead>
            <tbody id="studyRPGSkillRows"></tbody>
          </table>
        </div>
        <p class="muted" id="studyRPGSkillNote"></p>
      `;

      const anchor = dashboard.querySelector(".dashboard-grid");

      if (anchor) {
        anchor.insertAdjacentElement("afterend", panel);
      } else {
        dashboard.appendChild(panel);
      }
    }

    const data = readApp();
    const quizzes = Array.isArray(data.quizHistory) ? data.quizHistory : [];
    const grouped = new Map();

    for (const quiz of quizzes) {
      if (!quiz || typeof quiz.score !== "number") continue;

      const skills = Array.isArray(quiz.skills) && quiz.skills.length
        ? quiz.skills
        : [{
            name: quiz.topic || "Chưa phân loại",
            correct: Number(quiz.correct) || 0,
            total: Number(quiz.total) || 0
          }];

      for (const skill of skills) {
        const key =
          `${quiz.subject || "Chưa rõ"}||${skill.name || quiz.topic || "Chưa phân loại"}`;

        const row = grouped.get(key) || {
          subject: quiz.subject || "Chưa rõ",
          name: skill.name || quiz.topic || "Chưa phân loại",
          correct: 0,
          total: 0
        };

        row.correct += Number(skill.correct) || 0;
        row.total += Number(skill.total) || 0;

        grouped.set(key, row);
      }
    }

    const body = $("studyRPGSkillRows");
    if (!body) return;

    const rows = [...grouped.values()].sort((a, b) =>
      (a.total ? a.correct / a.total : 0) -
      (b.total ? b.correct / b.total : 0)
    );

    body.innerHTML = rows.length
      ? rows.map(row => {
          const pct = row.total
            ? Math.round(row.correct / row.total * 100)
            : 0;

          const note = pct >= 85
            ? "Vững"
            : pct >= 65
              ? "Đang tiến bộ"
              : "Cần ôn tập";

          return `
            <tr>
              <td>${escapeHTML(row.subject)}</td>
              <td>${escapeHTML(row.name)}</td>
              <td>${row.correct}</td>
              <td>${row.total}</td>
              <td>${pct}%</td>
              <td>${note}</td>
            </tr>
          `;
        }).join("")
      : `<tr><td colspan="6">Chưa có kết quả quiz được lưu. Hãy làm và chấm một quiz AI.</td></tr>`;

    if ($("studyRPGSkillCount")) {
      $("studyRPGSkillCount").textContent = `${quizzes.length} quiz`;
    }

    if ($("studyRPGSkillNote")) {
      $("studyRPGSkillNote").textContent = quizzes.length
        ? "Kỹ năng có tỉ lệ đúng thấp được đưa lên đầu để dễ chọn nội dung ôn tập."
        : "Bảng sẽ tự cập nhật sau khi bạn hoàn thành quiz AI.";
    }
  }

  addPrimaryGrades();
  setupApiKeySave();
  setupQuizTracking();
  renderSkillAnalysis();

  document.addEventListener("click", event => {
    if (event.target.closest('[data-page="dashboard"],[data-goto="dashboard"]')) {
      setTimeout(renderSkillAnalysis, 80);
    }
  });

  window.addEventListener("study-rpg-local-change", () => {
    setTimeout(renderSkillAnalysis, 80);
  });

  const observer = new MutationObserver(() => {
    if ($("page-dashboard")?.classList.contains("active")) {
      renderSkillAnalysis();
    }
  });

  if (document.body) {
    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ["class"]
    });
  }
})();
