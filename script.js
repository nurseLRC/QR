/*******************************************************
 * LRC QR Scanner - GitHub Pages Frontend
 *******************************************************/

const APPS_SCRIPT_API_URL = 'https://script.google.com/macros/s/AKfycbyGhMmpe4PsB3J5XlNWGU128mQoVRqc5uR5dcLXXOWJAyA28szSbiWC5aJiNvgKXdX0/exec';

let html5QrCode = null;
let isScanning = false;
let lastScannedText = '';
let isHandlingScan = false;

const FIELD_LABELS_TH = {
  ASSET_ID: 'รหัสครุภัณฑ์/อุปกรณ์',
  ASSET_NO: 'เลขครุภัณฑ์',
  ASSET_GR_ID: 'รหัสกลุ่มอุปกรณ์',
  ASSET_NAME: 'ชื่อรายการ',
  CATEGORY: 'หมวดหมู่',
  BRAND: 'ยี่ห้อ',
  MODEL: 'รุ่น',
  SERIAL_NO: 'เลข Serial',
  SN: 'เลข Serial',
  LOCATION: 'สถานที่จัดเก็บ',
  CONDITION_STATUS: 'สภาพอุปกรณ์',
  CURRENT_STATUS: 'สถานะการใช้งาน',
  IS_BORROWABLE: 'อนุญาตให้ยืม',
  ACTIVE: 'เปิดใช้งาน',
  IMAGE_URL: 'รูปภาพ',
  PIC_URL: 'รูปภาพ',

  SUPPLY_ID: 'รหัสวัสดุ',
  SUPPLY_NO: 'เลขวัสดุ',
  SUPPLY_GR_ID: 'รหัสกลุ่มวัสดุ',
  SUPPLY_NAME: 'ชื่อวัสดุ',
  UNIT: 'หน่วยนับ',
  BALANCE_QTY: 'จำนวนคงเหลือ',
  CURRENT_QTY: 'จำนวนปัจจุบัน',
  QTY_TOTAL: 'จำนวนรวม',
  STATUS: 'สถานะ',
  UPDATED_AT: 'อัปเดตล่าสุด',
  CREATED_AT: 'วันที่สร้าง'
};

window.addEventListener('load', function () {
  bindPageActions();

  const params = new URLSearchParams(window.location.search);
  const codeFromUrl = params.get('code') || params.get('id');
  const codeFromStorage = localStorage.getItem('LRC_LAST_QR_CODE');
  const code = codeFromUrl || codeFromStorage || '';

  if (code) {
    const manualCode = document.getElementById('manualCode');
    if (manualCode) manualCode.value = code;
    lookupCode(code, false);
  }
});

function bindPageActions() {
  document.addEventListener('click', function (event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;

    const action = button.dataset.action;

    if (action === 'startScanner') startScanner();
    if (action === 'stopScanner') stopScanner();
    if (action === 'lookupManual') lookupManual();
    if (action === 'toggleDetails') toggleDetails(button);
    if (action === 'refreshCurrent') refreshCurrent();
    if (action === 'scanAgain') scanAgain();
  });
}

function getScannerPanel() {
  return document.getElementById('scannerCard') || document.querySelector('.scanner-card');
}

function showScannerPanel() {
  const scannerCard = getScannerPanel();
  if (scannerCard) {
    scannerCard.classList.remove('is-collapsed', 'scanner-collapsed', 'hidden');
    scannerCard.style.display = '';
  }

  const reader = document.getElementById('reader');
  if (reader) {
    reader.style.display = 'block';
  }
}

function hideScannerPanel() {
  const scannerCard = getScannerPanel();
  if (scannerCard) {
    scannerCard.classList.add('is-collapsed');
  }
}

function showLoadingPopup(message) {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    const text = overlay.querySelector('.loading-box div:last-child');
    if (text && message) text.textContent = message;
    overlay.classList.remove('hidden');
  }
}

function hideLoadingPopup() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.classList.add('hidden');
}

function setLoadingDisplay(message) {
  const result = document.getElementById('result');
  if (result) {
    result.innerHTML = `
      <div class="card loading-card">
        <div class="loading-spinner" aria-hidden="true"></div>
        <div>
          <div class="loading-title">${escapeHtml(message || 'กำลังโหลดข้อมูล...')}</div>
          <div class="loading-subtitle">กรุณารอสักครู่ ระบบกำลังดึงข้อมูลจากฐานข้อมูล</div>
        </div>
      </div>
    `;
  }
}

function labelTH(key) {
  return FIELD_LABELS_TH[key] || key;
}

function valueTH(value) {
  const v = String(value ?? '').trim();
  const map = {
    TRUE: 'ใช่',
    FALSE: 'ไม่ใช่',
    AVAILABLE: 'พร้อมใช้งาน',
    BORROWED: 'ถูกยืมอยู่',
    REPAIR: 'ส่งซ่อม',
    DAMAGED: 'ชำรุด',
    LOST: 'สูญหาย',
    GOOD: 'สภาพดี',
    ACTIVE: 'ใช้งาน',
    INACTIVE: 'ไม่ใช้งาน'
  };
  return map[v.toUpperCase()] || v || '-';
}

async function startScanner() {
  const status = document.getElementById('scanStatus');

  showScannerPanel();

  if (isScanning) {
    if (status) status.textContent = 'กำลังเปิดกล้องอยู่แล้ว';
    return;
  }

  const reader = document.getElementById('reader');
  if (reader) {
    reader.innerHTML = '';
    reader.style.display = 'block';
  }

  // สร้าง object ใหม่ทุกครั้ง เพื่อแก้ปัญหา iPhone/Safari จำสถานะกล้องเก่า
  if (html5QrCode) {
    try { await html5QrCode.clear(); } catch (err) {}
    html5QrCode = null;
  }

  try {
    html5QrCode = new Html5Qrcode('reader');

    await html5QrCode.start(
      { facingMode: { exact: 'environment' } },
      { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
      onScanSuccess,
      function () {}
    );

    isScanning = true;
    if (status) status.innerHTML = '<span class="success">เปิดกล้องหลังแล้ว พร้อมสแกน</span>';
  } catch (err) {
    try {
      if (!html5QrCode) html5QrCode = new Html5Qrcode('reader');

      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        onScanSuccess,
        function () {}
      );

      isScanning = true;
      if (status) status.innerHTML = '<span class="success">เปิดกล้องแล้ว พร้อมสแกน</span>';
    } catch (err2) {
      isScanning = false;
      html5QrCode = null;
      if (status) {
        status.innerHTML = '<span class="error">เปิดกล้องไม่ได้: ' + escapeHtml(err2.message || err2) + '</span>';
      }
    }
  }
}

async function stopScanner() {
  const status = document.getElementById('scanStatus');

  if (!html5QrCode) {
    isScanning = false;
    if (status) status.textContent = 'ยังไม่ได้เปิดกล้อง';
    return;
  }

  try {
    if (isScanning) {
      await html5QrCode.stop();
    }
    await html5QrCode.clear();
  } catch (err) {
    // บาง browser แจ้ง error แม้กล้องหยุดแล้ว จึงไม่ต้องแสดงเป็น error
  }

  isScanning = false;
  html5QrCode = null;

  const reader = document.getElementById('reader');
  if (reader) reader.innerHTML = '';

  if (status) status.textContent = 'หยุดกล้องแล้ว';
}

async function onScanSuccess(decodedText) {
  const code = extractCode(decodedText);

  if (!code || isHandlingScan) return;
  if (code === lastScannedText) return;

  isHandlingScan = true;
  lastScannedText = code;

  if (navigator.vibrate) {
    navigator.vibrate(120);
  }

  const status = document.getElementById('scanStatus');
  if (status) {
    status.innerHTML = '<span class="success">สแกนสำเร็จ กำลังโหลดข้อมูล...</span>';
  }

  showLoadingPopup('กำลังโหลดข้อมูล...');
  setLoadingDisplay('กำลังโหลดข้อมูล...');

  await stopScanner();
  lookupCode(code);
}

function lookupManual() {
  const code = document.getElementById('manualCode')?.value?.trim() || '';

  if (!code) {
    const status = document.getElementById('scanStatus');
    if (status) status.innerHTML = '<span class="error">กรุณากรอกรหัสก่อนค้นหา</span>';
    return;
  }

  lookupCode(code);
}

function lookupCode(rawCode, updateUrl = true) {
  const code = extractCode(rawCode);

  if (!code) {
    const status = document.getElementById('scanStatus');
    if (status) status.innerHTML = '<span class="error">กรุณากรอกรหัสก่อนค้นหา</span>';
    isHandlingScan = false;
    return;
  }

  localStorage.setItem('LRC_LAST_QR_CODE', code);

  const manualCode = document.getElementById('manualCode');
  if (manualCode) manualCode.value = code;

  if (updateUrl) {
    const newUrl = `${window.location.pathname}?code=${encodeURIComponent(code)}`;
    window.history.replaceState({}, '', newUrl);
  }

  showLoadingPopup('กำลังโหลดข้อมูล...');
  setLoadingDisplay('กำลังโหลดข้อมูล...');

  const url = `${APPS_SCRIPT_API_URL}?page=api&code=${encodeURIComponent(code)}`;

  fetch(url)
    .then(function (res) {
      if (!res.ok) throw new Error('API response error: ' + res.status);
      return res.json();
    })
    .then(function (data) {
      hideLoadingPopup();
      isHandlingScan = false;

      if (data && data.ok) {
        hideScannerPanel();
      } else {
        showScannerPanel();
      }

      renderResult(data);
    })
    .catch(function (err) {
      hideLoadingPopup();
      isHandlingScan = false;
      showScannerPanel();

      const result = document.getElementById('result');
      if (result) {
        result.innerHTML = `
          <div class="card">
            <div class="error">โหลดข้อมูลไม่ได้: ${escapeHtml(err.message || err)}</div>
            <div class="button-row">
              <button type="button" class="btn-secondary" data-action="scanAgain">สแกนใหม่</button>
            </div>
          </div>
        `;
      }
    });
}

function renderResult(res) {
  const result = document.getElementById('result');
  if (!result) return;

  if (!res || !res.ok) {
    result.innerHTML = `
      <div class="card">
        <div class="error">${escapeHtml(res && res.message ? res.message : 'ไม่พบข้อมูล')}</div>
        ${res && res.code ? `<div class="status">รหัสที่ค้นหา: ${escapeHtml(res.code)}</div>` : ''}
        <div class="button-row">
          <button type="button" class="btn-secondary" data-action="scanAgain">สแกนใหม่</button>
        </div>
      </div>
    `;
    return;
  }

  hideScannerPanel();

  const data = res.data || {};
  const title = res.title || res.code || 'ไม่ระบุชื่อรายการ';

  const image = res.imageUrl
    ? `<img class="item-image" src="${escapeAttr(res.imageUrl)}" alt="รูปภาพรายการ" onerror="this.outerHTML='<div class=&quot;image-empty&quot;>ไม่มีรูปภาพ</div>';">`
    : `<div class="image-empty">ไม่มีรูปภาพ</div>`;

  const fullTableRows = Object.keys(data)
    .filter(function (key) { return String(data[key] || '').trim() !== ''; })
    .map(function (key) {
      return `
        <tr>
          <td>${escapeHtml(labelTH(key))}</td>
          <td>${escapeHtml(valueTH(data[key]))}</td>
        </tr>
      `;
    })
    .join('');

  result.innerHTML = `
    <div class="card result-card">
      <div class="image-box">${image}</div>

      <div class="badge">${escapeHtml(res.type || '')}</div>
      <h2 class="title">${escapeHtml(title)}</h2>

      <div class="subtitle">
        รหัส: ${escapeHtml(res.code || '-')}<br>
        แหล่งข้อมูล: ${escapeHtml(res.sheetName || '-')} แถวที่ ${escapeHtml(res.rowNumber || '-')}
      </div>

      <div class="info-grid">
        <div class="info"><label>สถานะ</label><div>${escapeHtml(valueTH(res.status || '-'))}</div></div>
        <div class="info"><label>สถานที่จัดเก็บ</label><div>${escapeHtml(valueTH(res.location || '-'))}</div></div>
        <div class="info"><label>จำนวนคงเหลือ / จำนวนรวม</label><div>${escapeHtml(valueTH(res.qty || '-'))}</div></div>
        <div class="info"><label>ประเภทข้อมูล</label><div>${escapeHtml(res.type || '-')}</div></div>
      </div>

      <div class="button-row">
        <button type="button" id="detailToggleBtn" class="btn-primary" data-action="toggleDetails" aria-expanded="false">ดูรายละเอียดทั้งหมด</button>
        <button type="button" class="btn-secondary" data-action="refreshCurrent">รีเฟรชข้อมูล</button>
        <button type="button" class="btn-secondary" data-action="scanAgain">สแกนใหม่</button>
      </div>

      <div id="detailPanel" class="detail-panel hidden" aria-hidden="true">
        <h3>รายละเอียดจากฐานข้อมูล</h3>
        <div class="table-wrap">
          <table>${fullTableRows}</table>
        </div>
      </div>
    </div>
  `;
}

function toggleDetails(button) {
  const panel = document.getElementById('detailPanel');
  const toggleBtn = button || document.getElementById('detailToggleBtn');
  if (!panel) return;

  const isHidden = panel.classList.contains('hidden');

  panel.classList.toggle('hidden', !isHidden);
  panel.setAttribute('aria-hidden', String(!isHidden));

  if (toggleBtn) {
    toggleBtn.setAttribute('aria-expanded', String(isHidden));
    toggleBtn.textContent = isHidden ? 'ซ่อนรายละเอียด' : 'ดูรายละเอียดทั้งหมด';
  }

  if (isHidden) {
    setTimeout(function () {
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }
}

function refreshCurrent() {
  const code = document.getElementById('manualCode')?.value?.trim() || localStorage.getItem('LRC_LAST_QR_CODE') || '';
  if (code) lookupCode(code, false);
}

async function scanAgain() {
  // ล้างรหัสล่าสุด ไม่อย่างนั้นถ้าสแกน QR ใบเดิม ระบบจะคิดว่าเป็นรหัสซ้ำ
  lastScannedText = '';
  isHandlingScan = false;
  localStorage.removeItem('LRC_LAST_QR_CODE');
  window.history.replaceState({}, '', window.location.pathname);

  hideLoadingPopup();
  showScannerPanel();

  const manualCode = document.getElementById('manualCode');
  if (manualCode) manualCode.value = '';

  const result = document.getElementById('result');
  if (result) result.innerHTML = '';

  const status = document.getElementById('scanStatus');
  if (status) status.textContent = 'กำลังเปิดกล้องเพื่อสแกนใหม่...';

  // หยุดและล้างกล้องเก่าให้หมดก่อน เพื่อให้ iPhone/Safari คืนสถานะกล้อง
  if (html5QrCode) {
    try {
      if (isScanning) await html5QrCode.stop();
      await html5QrCode.clear();
    } catch (err) {}
  }

  isScanning = false;
  html5QrCode = null;

  const reader = document.getElementById('reader');
  if (reader) {
    reader.innerHTML = '';
    reader.style.display = 'block';
  }

  // หน่วงเล็กน้อยให้ browser คืนกล้องก่อน แล้วค่อยเปิดใหม่
  setTimeout(function () {
    startScanner();
  }, 450);
}

function extractCode(raw) {
  let text = String(raw || '').trim();

  try {
    if (/^https?:\/\//i.test(text)) {
      const url = new URL(text);
      text = url.searchParams.get('code') || url.searchParams.get('id') || text;
    }
  } catch (err) {}

  return text
    .replace(/^LRC:/i, '')
    .replace(/^ASSET:/i, '')
    .replace(/^SUPPLY:/i, '')
    .replace(/^ITEM:/i, '')
    .trim();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#096;');
}
