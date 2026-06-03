// ================== 全域設定 ==================
const CONFIG = {
  // ⚠️ 改成你的 TBM-KY Worker 網址
  API_ENDPOINT: 'https://tbmky-api.firework202511.workers.dev',
};

// 固定必傳照片
const UPLOAD_ITEMS_FIXED = [
  { k: 'tbm_form',    label: '今日 TBM-KY 表單照片',  required: true },
  { k: 'tbm_process', label: 'TBM-KY 實施過程照片',   required: true },
];

// 條件性照片（特種車輛）
const UPLOAD_ITEMS_VEHICLE = [
  { k: 'vehicle_photo',   label: '特種車輛照片',                   required: true },
  { k: 'vehicle_daily',   label: '特種車輛今日作業檢點表（照片）', required: true },
  { k: 'vehicle_monthly', label: '特種車輛本月檢點表（照片）',     required: true },
];

// 條件性照片（局限空間）
const UPLOAD_ITEMS_CONFINED = [
  { k: 'confined_permit', label: '局限空間作業場所進入許可證（照片）', required: true },
];

// 條件性照片（動火）
const UPLOAD_ITEMS_HOTWORK = [
  { k: 'hotwork_permit', label: '動用火種工作許可證（照片）', required: true },
];

// 全域狀態
const S = {
  files:      {},     // 所有上傳圖片 { k: [File,...] }
  fields:     null,   // 填寫的欄位
  G_PDF_B64:  '',     // 最後生成的 PDF base64
  vehicleOn:  false,
  confinedOn: false,
  hotworkOn:  false,
};

// ================== 初始化 ==================
function initApp() {
  buildConditionalUploadAreas();
  const todayEl = document.getElementById('queryDate');
  if (todayEl) todayEl.value = getTodayDateString();
}

function getTodayDateString() {
  return new Date().toLocaleDateString('zh-TW', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit'
  }).replace(/\//g, '-');
}

function val(id) { return document.getElementById(id)?.value || ''; }

function setVal(id, v) {
  const el = document.getElementById(id);
  if (el && v != null) el.value = v;
}

// ================== 必填驗證 → 下一步按鈕 ==================
function updateNextBtn() {
  const company     = val('formCompany').trim();
  const dept        = val('formDept');
  const contact     = val('formContact').trim();
  const meetingTime = val('formMeetingTime');
  const location    = val('formLocation').trim();
  document.getElementById('btnNext').disabled = !(company && dept && contact && meetingTime && location);
}

// ================== 條件開關（是/否）==================
function toggle(type, choice) {
  S[type + 'On'] = (choice === 'yes');

  document.getElementById(type + 'Yes').className =
    'toggle-btn' + (choice === 'yes' ? ' selected-yes' : '');
  document.getElementById(type + 'No').className =
    'toggle-btn' + (choice === 'no'  ? ' selected-no'  : '');

  const sub   = document.getElementById(type + 'Sub');
  const block = document.getElementById(type + 'Block');

  if (choice === 'yes') {
    sub.classList.add('show');
    block.classList.add('active-block');
  } else {
    sub.classList.remove('show');
    block.classList.remove('active-block');
    // 清除已上傳的該類型檔案
    getItemsForType(type).forEach(it => { S.files[it.k] = []; });
  }
}

function getItemsForType(type) {
  if (type === 'vehicle')  return UPLOAD_ITEMS_VEHICLE;
  if (type === 'confined') return UPLOAD_ITEMS_CONFINED;
  if (type === 'hotwork')  return UPLOAD_ITEMS_HOTWORK;
  return [];
}

// ================== 建立條件上傳子區塊 ==================
function buildConditionalUploadAreas() {
  buildUploadBoxes('vehicleSub',  UPLOAD_ITEMS_VEHICLE);
  buildUploadBoxes('confinedSub', UPLOAD_ITEMS_CONFINED);
  buildUploadBoxes('hotworkSub',  UPLOAD_ITEMS_HOTWORK);
}

function buildUploadBoxes(containerId, items) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const old = container.querySelector('.photo-upload-grid');
  if (old) old.remove();

  const grid = document.createElement('div');
  grid.className = 'photo-upload-grid';
  grid.innerHTML = items.map((item, i) => `
    <div id="box_${item.k}" class="upload-box"
         ondragover="event.preventDefault()" ondrop="onDrop(event,'${item.k}')">
      <div class="upload-box-label">
        <span class="upload-num">${i + 1}</span>
        ${item.label}
        <span class="${item.required ? 'badge-req' : 'badge-opt'}">${item.required ? '必填' : '選填'}</span>
      </div>
      <div class="drop-area" onclick="document.getElementById('fi_${item.k}').click()">
        <input type="file" id="fi_${item.k}" multiple accept="image/*"
               style="display:none" onchange="onFile('${item.k}',this.files)">
        <div>📎</div>
        <div style="font-size:.7rem;color:#888">拖放或點選上傳</div>
        <div style="font-size:.74rem;color:#1a5c38;font-weight:600">僅限圖片檔</div>
      </div>
      <div id="pv_${item.k}" class="preview-row"></div>
    </div>`).join('');
  container.appendChild(grid);
}

// ================== 子頁面切換 ==================
function goToUpload() {
  const company     = val('formCompany').trim();
  const dept        = val('formDept');
  const contact     = val('formContact').trim();
  const meetingTime = val('formMeetingTime');
  const location    = val('formLocation').trim();

  if (!company)     { alert('請填寫公司名稱'); return; }
  if (!dept)        { alert('請選擇工作主辦部門'); return; }
  if (!contact)     { alert('請填寫主辦部門承辦人'); return; }
  if (!meetingTime) { alert('請填寫 TBM-KY 開會時間'); return; }
  if (!location)    { alert('請填寫開會地點'); return; }

  S.fields = { company, dept, contact, meetingTime, location,
    vehicleOn: S.vehicleOn, confinedOn: S.confinedOn, hotworkOn: S.hotworkOn };

  // 更新摘要欄
  document.getElementById('s_company').textContent  = company;
  document.getElementById('s_dept').textContent     = dept;
  document.getElementById('s_contact').textContent  = contact;
  document.getElementById('s_time').textContent     = meetingTime.replace('T', ' ');
  document.getElementById('s_location').textContent = location;
  document.getElementById('s_vehicle').textContent  = S.vehicleOn  ? '✅ 是' : '❌ 否';

  const flags = [];
  if (S.confinedOn) flags.push('局限空間✅');
  if (S.hotworkOn)  flags.push('動火✅');
  if (!flags.length) flags.push('均無');
  document.getElementById('s_flags').textContent = flags.join(' ');

  // 建立主上傳格子
  buildMainUploadGrid();

  document.getElementById('pageA').style.display = 'none';
  document.getElementById('pageB').style.display = 'block';
  stepDone('step1'); stepActive('step2');
  document.getElementById('line1').classList.add('ok');
}

function backToForm() {
  document.getElementById('pageA').style.display = 'block';
  document.getElementById('pageB').style.display = 'none';
  stepActive('step1'); stepReset('step2'); stepReset('step3');
  document.getElementById('line1').classList.remove('ok');
  document.getElementById('line2').classList.remove('ok');
  // 重設送出按鈕狀態
  const btn = document.getElementById('btnSubmit');
  btn.disabled = false;
  btn.textContent = '🚀 生成 PDF 並上傳送出';
  document.getElementById('mainMsg').textContent = '';
  document.getElementById('pdfArea').classList.remove('show');
}

function buildMainUploadGrid() {
  const grid = document.getElementById('uploadGrid');
  if (!grid) return;

  const items = [...UPLOAD_ITEMS_FIXED];
  if (S.vehicleOn)  items.push(...UPLOAD_ITEMS_VEHICLE);
  if (S.confinedOn) items.push(...UPLOAD_ITEMS_CONFINED);
  if (S.hotworkOn)  items.push(...UPLOAD_ITEMS_HOTWORK);

  grid.innerHTML = `<div class="photo-upload-grid">` +
    items.map((item, i) => `
    <div id="mbox_${item.k}" class="upload-box"
         ondragover="event.preventDefault()" ondrop="onDrop(event,'${item.k}','m')">
      <div class="upload-box-label">
        <span class="upload-num">${i + 1}</span>
        ${item.label}
        <span class="${item.required ? 'badge-req' : 'badge-opt'}">${item.required ? '必填' : '選填'}</span>
      </div>
      <div class="drop-area" onclick="document.getElementById('mfi_${item.k}').click()">
        <input type="file" id="mfi_${item.k}" multiple accept="image/*"
               style="display:none" onchange="onFile('${item.k}',this.files,'m')">
        <div>📎</div>
        <div style="font-size:.7rem;color:#888">拖放或點選上傳</div>
        <div style="font-size:.74rem;color:#1a5c38;font-weight:600">僅限圖片檔</div>
      </div>
      <div id="mpv_${item.k}" class="preview-row"></div>
    </div>`).join('') + `</div>`;
}

// ================== 步驟工具 ==================
function stepActive(id) {
  const el = document.getElementById(id); if (!el) return;
  el.classList.remove('ok'); el.classList.add('on');
}
function stepDone(id) {
  const el = document.getElementById(id); if (!el) return;
  el.classList.remove('on'); el.classList.add('ok');
  el.querySelector('.step-dot').textContent = '✓';
}
function stepReset(id) {
  const el = document.getElementById(id); if (!el) return;
  el.classList.remove('on', 'ok');
  const dot = el.querySelector('.step-dot');
  if (dot) dot.textContent = dot.dataset.num || '?';
}

// ================== 檔案處理 ==================
function onDrop(e, k, prefix) {
  e.preventDefault();
  if (e.dataTransfer.files.length) onFile(k, e.dataTransfer.files, prefix);
}

function onFile(k, fl, prefix) {
  if (!S.files[k]) S.files[k] = [];
  Array.from(fl).forEach(f => S.files[k].push(f));
  renderPreviews(k, prefix);
  const boxId = prefix === 'm' ? `mbox_${k}` : `box_${k}`;
  const box = document.getElementById(boxId);
  if (box) box.classList.toggle('has-file', S.files[k].length > 0);
  S.G_PDF_B64 = '';
}

function renderPreviews(k, prefix) {
  const pvId = prefix === 'm' ? `mpv_${k}` : `pv_${k}`;
  const el = document.getElementById(pvId);
  if (!el) return;
  el.innerHTML = (S.files[k] || []).map((f, i) => `
    <div class="thumb-wrap">
      ${f.type.startsWith('image/')
        ? `<img src="${URL.createObjectURL(f)}">`
        : `<div style="width:54px;height:54px;display:flex;align-items:center;justify-content:center;background:#eef2fc;font-size:1.1rem">📄</div>`}
      <button class="rm-btn" onclick="rmFile('${k}',${i},'${prefix}')">✕</button>
    </div>`).join('');
}

function rmFile(k, i, prefix) {
  S.files[k].splice(i, 1);
  renderPreviews(k, prefix);
  const boxId = prefix === 'm' ? `mbox_${k}` : `box_${k}`;
  const box = document.getElementById(boxId);
  if (box) box.classList.toggle('has-file', (S.files[k]?.length || 0) > 0);
}

// ================== 送出 ==================
async function generateAndSubmit() {
  const f = S.fields;
  if (!f) { alert('請先完成填寫'); return; }

  const items = [...UPLOAD_ITEMS_FIXED];
  if (f.vehicleOn)  items.push(...UPLOAD_ITEMS_VEHICLE);
  if (f.confinedOn) items.push(...UPLOAD_ITEMS_CONFINED);
  if (f.hotworkOn)  items.push(...UPLOAD_ITEMS_HOTWORK);

  const missing = items.filter(it => it.required && !(S.files[it.k] && S.files[it.k].length > 0));
  if (missing.length > 0) {
    alert(`以下項目尚未上傳照片：\n${missing.map(m => '• ' + m.label).join('\n')}`);
    return;
  }

  const loadingEl = document.getElementById('mainLoading');
  const msgEl     = document.getElementById('mainMsg');
  const submitBtn = document.getElementById('btnSubmit');

  loadingEl.style.display = 'block';
  submitBtn.disabled      = true;
  submitBtn.textContent   = '⏳ 處理中...';
  msgEl.textContent       = '';

  try {
    msgEl.textContent = '📄 正在生成 PDF...';
    const pdfB64 = await generatePDF(f, items);
    S.G_PDF_B64  = pdfB64;
    document.getElementById('pdfArea').classList.add('show');

    msgEl.textContent = '☁️ 正在上傳 PDF...';
    // 檔名格式：YYYYMMDD-公司名-部門名.pdf
    const dateStr   = getTodayDateString().replace(/-/g, '');
    const safeName  = (s) => s.replace(/[\s\/\\:*?"<>|]/g, '_');
    const filename  = `${dateStr}-${safeName(f.company)}-${safeName(f.dept)}.pdf`;
    const uploadRes = await fetch(`${CONFIG.API_ENDPOINT}/api/upload-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdfBase64: pdfB64, filename }),
    });
    if (!uploadRes.ok) throw new Error('PDF 上傳失敗');
    const { pdfUrl } = await uploadRes.json();

    msgEl.textContent = '📊 正在寫入 Google Sheets...';
    const submitRes = await fetch(`${CONFIG.API_ENDPOINT}/api/submit-record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: f, pdfUrl }),
    });
    if (!submitRes.ok) throw new Error('寫入 Sheets 失敗');

    loadingEl.style.display = 'none';
    msgEl.style.color       = '#0f7b5a';
    msgEl.textContent       = '✅ 通報成功！PDF 已儲存至雲端。';
    submitBtn.textContent   = '✅ 已送出';
    stepDone('step2'); stepActive('step3');
    document.getElementById('line2').classList.add('ok');

  } catch (err) {
    console.error('送出失敗:', err);
    loadingEl.style.display = 'none';
    msgEl.style.color       = '#c0392b';
    msgEl.textContent       = '❌ 送出失敗：' + err.message;
    submitBtn.disabled      = false;
    submitBtn.textContent   = '🚀 生成 PDF 並上傳送出';
  }
}

// ================== PDF 生成 ==================
async function generatePDF(f, items) {
  const phColor = '#1a5c38';
  const phBg    = '#eef7f2';
  const TH = 'border:1px solid #cbd5e1;padding:7px 9px;background:#f8fafc;color:#334155;width:22%;vertical-align:top;font-size:11px';
  const TD = 'border:1px solid #cbd5e1;padding:7px 9px;vertical-align:top;font-size:11px';
  const W  = 750;

  // 收集圖片 data URL
  const imgMap = {};
  for (const item of items) {
    const files = (S.files[item.k] || []).filter(fi => fi.type?.startsWith('image/'));
    imgMap[item.k] = files.length > 0 ? await Promise.all(files.map(fileToDataUrl)) : [];
  }

  async function elToCanvas(el) {
    el.style.cssText = `position:fixed;left:0;top:0;width:${W}px;z-index:-9999;background:#fff;box-sizing:border-box;`;
    document.body.appendChild(el);
    await Promise.all(Array.from(el.querySelectorAll('img')).map(img =>
      img.complete ? Promise.resolve() : new Promise(r => { img.onload = img.onerror = r; })
    ));
    const c = await html2canvas(el, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff', logging: false });
    document.body.removeChild(el);
    return c;
  }

  // ── 表頭 ──
  const flagVehicle  = f.vehicleOn  ? '✅ 是' : '❌ 否';
  const flagConfined = f.confinedOn ? '✅ 是' : '❌ 否';
  const flagHotwork  = f.hotworkOn  ? '✅ 是' : '❌ 否';

  const headerEl = document.createElement('div');
  headerEl.style.fontFamily = 'Arial,sans-serif';
  headerEl.style.padding    = '24px 30px 10px';
  headerEl.innerHTML = `
    <div style="text-align:center;margin-bottom:16px;border-bottom:3px solid ${phColor};padding-bottom:10px">
      <div style="font-size:20px;font-weight:700;color:${phColor}">TBM-KY 通報書</div>
      <div style="font-size:11px;color:#555;margin-top:2px">Toolbox Meeting / KY (Kiken Yochi) Report</div>
      <span style="display:inline-block;margin-top:5px;padding:2px 12px;border-radius:20px;font-size:11px;font-weight:700;background:${phBg};color:${phColor};border:1px solid ${phColor}">📋 每日 TBM-KY 通報</span>
    </div>
    <div style="text-align:right;font-size:10px;color:#888;margin-bottom:8px">產出時間：${new Date().toLocaleString('zh-TW',{timeZone:'Asia/Taipei'})}</div>
    <div style="background:${phBg};font-weight:700;color:${phColor};padding:5px 10px;margin-bottom:5px;border-left:4px solid ${phColor};font-size:12px">基本資料</div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:10px">
      <tr>
        <th style="${TH}">公司名稱</th>
        <td style="${TD}" colspan="3">${f.company || '—'}</td>
      </tr>
      <tr>
        <th style="${TH}">工作主辦部門</th>
        <td style="${TD}">${f.dept || '—'}</td>
        <th style="${TH}">主辦部門承辦人</th>
        <td style="${TD}">${f.contact || '—'}</td>
      </tr>
      <tr>
        <th style="${TH}">TBM-KY 開會時間</th>
        <td style="${TD};font-weight:700;color:#c0392b">${(f.meetingTime || '').replace('T', ' ')}</td>
        <th style="${TH}">開會地點</th>
        <td style="${TD}">${f.location || '—'}</td>
      </tr>
    </table>
    <div style="background:${phBg};font-weight:700;color:${phColor};padding:5px 10px;margin-bottom:5px;border-left:4px solid ${phColor};font-size:12px">作業類型確認</div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:10px">
      <tr>
        <th style="${TH}">今日使用特種車輛</th><td style="${TD}">${flagVehicle}</td>
        <th style="${TH}">今日局限空間作業</th><td style="${TD}">${flagConfined}</td>
      </tr>
      <tr>
        <th style="${TH}">今日動火作業</th><td style="${TD}" colspan="3">${flagHotwork}</td>
      </tr>
    </table>
    <div style="background:${phBg};font-weight:700;color:${phColor};padding:5px 10px;border-left:4px solid ${phColor};font-size:12px">查核照片與附件</div>`;

  const headerCanvas = await elToCanvas(headerEl);

  // ── 各照片項目 ──
  const itemCanvases = [];
  for (const item of items) {
    const srcs = imgMap[item.k] || [];
    if (srcs.length === 0) {
      const el = document.createElement('div');
      el.style.fontFamily = 'Arial,sans-serif';
      el.style.padding    = '0 30px';
      el.innerHTML = `
        <div style="border:1px solid #ddd;padding:12px;margin:6px 0;background:#f9f9f9;text-align:center">
          <div style="color:#bbb;font-size:11px">（未上傳）</div>
          <div style="font-weight:700;color:#888;font-size:11px;margin-top:4px">${item.label}</div>
        </div>`;
      itemCanvases.push(await elToCanvas(el));
    } else {
      for (const src of srcs) {
        const el = document.createElement('div');
        el.style.fontFamily = 'Arial,sans-serif';
        el.style.padding    = '0 30px';
        el.innerHTML = `
          <div style="border:1px solid #ddd;padding:10px;margin:6px 0;background:#fff;text-align:center">
            <img src="${src}" style="max-width:100%;height:auto;display:block;margin:0 auto">
            <div style="font-weight:700;color:#334155;font-size:11px;margin-top:6px">${item.label}</div>
          </div>`;
        itemCanvases.push(await elToCanvas(el));
      }
    }
  }

  // ── 組合 PDF ──
  const { jsPDF } = window.jspdf;
  const pdf   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const MARGIN = 8, A4_W = 210, A4_H = 297;
  const PW_MM  = A4_W - MARGIN * 2;
  let curY     = MARGIN;

  function place(c) {
    const mmH = (c.height / 2) / (c.width / 2) * PW_MM;
    if (curY + mmH > A4_H - MARGIN) { pdf.addPage(); curY = MARGIN; }
    pdf.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', MARGIN, curY, PW_MM, mmH);
    curY += mmH + 3;
  }

  place(headerCanvas);
  itemCanvases.forEach(c => place(c));

  return pdf.output('datauristring').split(',')[1];
}

function fileToDataUrl(file) {
  return new Promise(res => {
    const r = new FileReader();
    r.onload = e => res(e.target.result);
    r.readAsDataURL(file);
  });
}

function previewPDF() {
  if (!S.G_PDF_B64) { alert('請先生成 PDF'); return; }
  const bytes = atob(S.G_PDF_B64);
  const buf   = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
  window.open(URL.createObjectURL(new Blob([buf], { type: 'application/pdf' })), '_blank');
}

// ================== 查詢 ==================
async function searchRecords() {
  const date    = val('queryDate');
  const dept    = val('queryDept');
  const company = val('queryCompany');
  const contact = val('queryContact');
  const div     = document.getElementById('queryResults');

  if (!date && !dept) {
    alert('請至少輸入「查詢日期」或選擇「工作主辦部門」');
    return;
  }

  document.getElementById('queryLoading').style.display = 'block';
  div.innerHTML = '';

  try {
    const url = new URL(`${CONFIG.API_ENDPOINT}/api/search-records`);
    if (date)    url.searchParams.set('date', date);
    if (dept)    url.searchParams.set('dept', dept);
    if (company) url.searchParams.set('company', company);
    if (contact) url.searchParams.set('contact', contact);

    const res  = await fetch(url);
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    if (!json.data || json.data.length === 0) {
      div.innerHTML = '<div class="no-results">查無資料</div>';
      return;
    }

    const flag = v => v ? '✅' : '❌';
    let html = `<table class="result-table">
      <thead><tr>
        <th>公司名稱</th><th>主辦部門</th><th>承辦人</th><th>開會時間</th>
        <th>地點</th><th>特種車輛</th><th>局限空間</th><th>動火</th><th>PDF</th>
      </tr></thead><tbody>`;

    json.data.forEach(row => {
      const pdfLink = row.pdfUrl
        ? `<a href="${row.pdfUrl}" target="_blank" style="color:#1a5c38;font-weight:600;">📄 查看</a>`
        : '—';
      html += `<tr>
        <td>${row.company  || '—'}</td>
        <td>${row.dept     || '—'}</td>
        <td>${row.contact  || '—'}</td>
        <td>${(row.meetingTime || '').replace('T', ' ')}</td>
        <td>${row.location || '—'}</td>
        <td style="text-align:center">${flag(row.vehicleOn)}</td>
        <td style="text-align:center">${flag(row.confinedOn)}</td>
        <td style="text-align:center">${flag(row.hotworkOn)}</td>
        <td>${pdfLink}</td>
      </tr>`;
    });

    div.innerHTML = html + '</tbody></table>';
  } catch (err) {
    console.error(err);
    div.innerHTML = `<div style="text-align:center;color:red;padding:20px">查詢錯誤：${err.message}</div>`;
  } finally {
    document.getElementById('queryLoading').style.display = 'none';
  }
}

// ================== 啟動 ==================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
