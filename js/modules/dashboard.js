/* ================================================================
   modules/dashboard.js — Dashboard page
   Features:
   - Real-time Digital TimeClock (Seconds, Live clock)
   - Lịch Âm Việt Nam (100% Offline algorithm)
   - Open-Meteo Weather API (Auto IP location, no key needed)
   - Nager.Date API — Lịch Nghỉ Lễ Tết Việt Nam & Đếm ngược
   - DiceBear Avatar Generator
   - VietQR Quick Generator (Bắn tiền nhanh)
   - "Mã QR Của Tôi" (Lưu ảnh QR & Bật nhanh 1-Click để nhận tiền)
   - Overview Stat Cards (Timesheet, Expenses, Bookmarks, Vault)
   ================================================================ */

let _dashClockInterval = null;

async function renderDashboard(container) {
  // Clear any existing clock timer
  if (_dashClockInterval) {
    clearInterval(_dashClockInterval);
    _dashClockInterval = null;
  }

  const user = Auth.getUser();
  const userSeed = encodeURIComponent(user?.email || 'DuongNguyen');
  const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${userSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

  // Fetch basic stats in parallel
  const [expenses, bookmarks, snippets] = await Promise.all([
    DB.getAll('expenses').catch(() => []),
    DB.getAll('bookmarks').catch(() => []),
    DB.getAll('snippets').catch(() => []),
  ]);

  // Timesheet stats from localStorage
  let totalHours = 0;
  try {
    const rawTs = localStorage.getItem('pos_timesheet_v2');
    if (rawTs) {
      const tsData = JSON.parse(rawTs);
      const s = tsData.sheets?.[0];
      if (s) {
        totalHours = s.rows.reduce((acc, r) => {
          const h = parseFloat(r[5] || '');
          return acc + (isNaN(h) ? 0 : h);
        }, 0);
      }
    }
  } catch {}

  const mon = thisMonthRange();
  const monthExpenses = expenses.filter(e => e.spent_on >= mon.start.slice(0, 10));
  const totalExp = monthExpenses.reduce((a, b) => a + (b.amount || 0), 0);
  const unreadBookmarks = bookmarks.filter(b => b.status === 'unread').length;

  // Lịch Âm Việt Nam (100% Offline)
  const lunar = typeof LunarCalendar !== 'undefined' ? LunarCalendar.getTodayLunar() : null;

  container.innerHTML = `
    <!-- Top Welcome & Avatar Bar -->
    <div class="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
      <div class="d-flex align-items-center gap-3">
        <img src="${avatarUrl}" alt="Avatar" class="rounded-circle shadow-sm" style="width:54px;height:54px;background:var(--clr-surface-2);border:2px solid var(--clr-primary)" />
        <div>
          <h2 class="fs-4 fw-bold mb-0">Xin chào, ${sanitize(user?.email ? user.email.split('@')[0] : 'Bạn')}! 👋</h2>
          <span class="text-muted small">Chào mừng bạn quay trở lại với Personal OS</span>
        </div>
      </div>
      <div class="d-flex gap-2">
        <button class="btn-primary btn-sm" id="dash-my-qr-btn">
          <i class="bi bi-qr-code me-1"></i> Mã QR của tôi
        </button>
        <button class="btn-secondary btn-sm" onclick="Router.navigate('/tools')">
          <i class="bi bi-tools me-1"></i> Hộp công cụ
        </button>
      </div>
    </div>

    <!-- Row 1: TimeClock + Lunar Calendar & Open-Meteo Weather -->
    <div class="row g-3 mb-4">
      <!-- Big TimeClock & Lunar Calendar -->
      <div class="col-12 col-lg-7">
        <div class="clock-card h-100 d-flex flex-column justify-content-between">
          <div>
            <div class="d-flex justify-content-between align-items-center mb-1">
              <span class="text-muted small text-uppercase fw-semibold"><i class="bi bi-clock me-1"></i> Thời gian hệ thống</span>
              ${lunar ? `<span class="lunar-badge"><i class="bi bi-moon-stars-fill"></i> ${lunar.canChiDay} ${lunar.isHoangDao ? '(Hoàng đạo)' : ''}</span>` : ''}
            </div>
            <div class="clock-time my-1" id="dash-clock-time">--:--:--</div>
            <div class="clock-date" id="dash-clock-date">Đang tải ngày...</div>
          </div>

          <div class="mt-3 pt-3 border-top" style="border-color:rgba(255,255,255,0.08) !important">
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div>
                <span class="small fw-semibold text-warning"><i class="bi bi-calendar3 me-1"></i> Lịch Âm:</span>
                <span class="small text-muted" id="dash-lunar-text">
                  ${lunar ? `${lunar.fullText}` : 'Đang tính...'}
                </span>
              </div>
              <div id="dash-holiday-badge" class="holiday-alert small py-1 px-2 d-none">
                <i class="bi bi-stars me-1"></i> <span id="dash-holiday-text">Đang lấy lịch lễ...</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Open-Meteo Weather Widget -->
      <div class="col-12 col-lg-5">
        <div class="weather-card d-flex flex-column justify-content-between" id="dash-weather-box">
          <div>
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span class="text-muted small fw-semibold">
                <i class="bi bi-geo-alt-fill text-danger me-1"></i>
                <span id="weather-city">Đang định vị...</span>
              </span>
              <span class="badge-pill badge-primary" style="font-size:10px">Open-Meteo</span>
            </div>

            <div class="d-flex align-items-center gap-3 my-2">
              <div id="weather-icon" style="font-size:42px">🌤️</div>
              <div>
                <div class="weather-temp" id="weather-temp">--°C</div>
                <div class="text-muted small" id="weather-desc">Đang tải thời tiết...</div>
              </div>
            </div>
          </div>

          <!-- Weather Metrics Grid -->
          <div class="weather-metrics-grid mt-2">
            <div class="weather-stat-box">
              <i class="bi bi-thermometer-half"></i>
              <div>
                <div class="text-muted" style="font-size:10px">Cảm giác như</div>
                <div class="fw-bold" id="weather-feels">--°C</div>
              </div>
            </div>
            <div class="weather-stat-box">
              <i class="bi bi-droplet-fill"></i>
              <div>
                <div class="text-muted" style="font-size:10px">Độ ẩm</div>
                <div class="fw-bold" id="weather-humidity">--%</div>
              </div>
            </div>
            <div class="weather-stat-box">
              <i class="bi bi-wind"></i>
              <div>
                <div class="text-muted" style="font-size:10px">Gió</div>
                <div class="fw-bold" id="weather-wind">-- km/h</div>
              </div>
            </div>
            <div class="weather-stat-box">
              <i class="bi bi-brightness-high-fill"></i>
              <div>
                <div class="text-muted" style="font-size:10px">Chỉ số UV</div>
                <div class="fw-bold" id="weather-uv">--</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Row 2: Overview Stat Cards -->
    <div class="row g-3 mb-4">
      <div class="col-6 col-md-3">
        <div class="stat-card" onclick="Router.navigate('/timesheet')" style="cursor:pointer">
          <div class="stat-label"><i class="bi bi-table text-primary"></i> Tổng giờ Timesheet</div>
          <div class="stat-value text-primary">${totalHours.toFixed(1)}h</div>
          <div class="stat-meta">Bảng tính Excel</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="stat-card" onclick="Router.navigate('/expenses')" style="cursor:pointer">
          <div class="stat-label"><i class="bi bi-wallet2 text-warning"></i> Chi tiêu tháng này</div>
          <div class="stat-value text-warning">${fmtVND(totalExp)}</div>
          <div class="stat-meta">${monthExpenses.length} khoản chi</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="stat-card" onclick="Router.navigate('/bookmarks')" style="cursor:pointer">
          <div class="stat-label"><i class="bi bi-bookmark-star text-purple"></i> Bookmarks chưa đọc</div>
          <div class="stat-value" style="color:var(--clr-purple)">${unreadBookmarks}</div>
          <div class="stat-meta">${bookmarks.length} tổng số link</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="stat-card" onclick="Router.navigate('/scrapbook')" style="cursor:pointer">
          <div class="stat-label"><i class="bi bi-journal-bookmark text-success"></i> Second Brain</div>
          <div class="stat-value text-success">Kho lưu trữ</div>
          <div class="stat-meta">Ảnh, PDF, Ghi chú</div>
        </div>
      </div>
    </div>

    <!-- Row 3: VietQR Generator Widget -->
    <div class="row g-4 mb-4">
      <div class="col-12 col-lg-7">
        <div class="panel h-100">
          <div class="panel-header">
            <span class="panel-title"><i class="bi bi-qr-code text-primary me-2"></i>Tạo Mã VietQR Bắn Tiền Nhanh</span>
            <span class="badge-pill badge-success">Chuẩn Napas</span>
          </div>
          <div class="panel-body">
            <p class="text-muted small">Tạo mã QR thanh toán nhanh để chia tiền ăn trưa, cafe hoặc gửi cho khách hàng quét bắn tiền.</p>

            <div class="row g-2">
              <div class="col-12 col-md-6">
                <label class="form-label small">Ngân hàng:</label>
                <select id="vqr-bank" class="form-ctrl btn-sm">
                  <option value="VCB">Vietcombank (VCB)</option>
                  <option value="MB" selected>MB Bank (Quân Đội)</option>
                  <option value="TCB">Techcombank</option>
                  <option value="VPB">VPBank</option>
                  <option value="ACB">ACB</option>
                  <option value="BIDV">BIDV</option>
                  <option value="CTG">VietinBank</option>
                  <option value="TPB">TPBank</option>
                  <option value="STB">Sacombank</option>
                  <option value="HDB">HDBank</option>
                  <option value="VIB">VIB</option>
                </select>
              </div>
              <div class="col-12 col-md-6">
                <label class="form-label small">Số tài khoản:</label>
                <input id="vqr-acc" class="form-ctrl btn-sm" placeholder="VD: 0987654321..." />
              </div>
              <div class="col-12 col-md-6">
                <label class="form-label small">Tên chủ tài khoản (không dấu):</label>
                <input id="vqr-name" class="form-ctrl btn-sm" placeholder="VD: NGUYEN VAN A" />
              </div>
              <div class="col-12 col-md-6">
                <label class="form-label small">Số tiền (VNĐ, tùy chọn):</label>
                <input id="vqr-amount" type="number" class="form-ctrl btn-sm" placeholder="VD: 50000" />
              </div>
              <div class="col-12">
                <label class="form-label small">Nội dung chuyển khoản:</label>
                <input id="vqr-note" class="form-ctrl btn-sm" placeholder="VD: Tien an trua..." />
              </div>
            </div>

            <div class="mt-3 d-flex gap-2">
              <button class="btn-primary btn-sm" id="vqr-generate-btn">
                <i class="bi bi-qr-code me-1"></i> Tạo mã QR
              </button>
              <button class="btn-secondary btn-sm" id="vqr-save-profile-btn" title="Lưu số tài khoản này làm mặc định">
                <i class="bi bi-floppy me-1"></i> Lưu thông tin này
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- VietQR Result Preview -->
      <div class="col-12 col-lg-5">
        <div class="panel h-100 text-center d-flex flex-column justify-content-center align-items-center p-3">
          <div id="vqr-result-wrap" class="d-none">
            <div class="vietqr-preview-box mb-2">
              <img id="vqr-img" alt="VietQR" />
            </div>
            <div class="small fw-semibold mb-2" id="vqr-info-text">--</div>
            <div class="d-flex justify-content-center gap-2">
              <button class="btn-secondary btn-sm" id="vqr-download-btn"><i class="bi bi-download me-1"></i> Tải ảnh QR</button>
              <button class="btn-secondary btn-sm" id="vqr-copy-link-btn"><i class="bi bi-link-45deg me-1"></i> Copy Link</button>
            </div>
          </div>

          <div id="vqr-placeholder" class="text-muted p-4">
            <i class="bi bi-qr-code-scan" style="font-size:48px;opacity:0.4"></i>
            <p class="small mt-2 mb-0">Điền thông tin và bấm <strong>"Tạo mã QR"</strong> để sinh mã VietQR thanh toán chuẩn.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Mã QR Cá Nhân Nhận Tiền Nhanh -->
    <div class="modal-overlay d-none" id="my-qr-modal">
      <div class="modal-box text-center" style="max-width:380px">
        <div class="modal-header justify-content-between">
          <span class="modal-title"><i class="bi bi-qr-code me-2"></i>Mã QR Nhận Tiền Của Tôi</span>
          <button class="btn-icon" id="my-qr-close"><i class="bi bi-x-lg"></i></button>
        </div>
        <div class="modal-body p-4">
          <div id="my-qr-display-wrap">
            <img id="my-qr-display-img" class="img-fluid rounded mb-3 shadow-sm d-none" style="max-height:280px" />
            <div id="my-qr-empty" class="p-4 border rounded mb-3 text-muted" style="border-style:dashed !important">
              <i class="bi bi-image" style="font-size:36px"></i>
              <p class="small mt-2 mb-0">Chưa có ảnh mã QR nhận tiền. Tải ảnh mã QR ngân hàng của bạn lên để mở nhanh bất kỳ lúc nào!</p>
            </div>
          </div>
          <input type="file" id="my-qr-upload-input" accept="image/*" class="d-none" />
          <button class="btn-primary w-100 justify-content-center" onclick="document.getElementById('my-qr-upload-input').click()">
            <i class="bi bi-upload me-1"></i> Tải ảnh mã QR lên
          </button>
        </div>
      </div>
    </div>
  `;

  // ── 1. Digital TimeClock Real-time ──
  function updateTimeClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const timeEl = el('dash-clock-time');
    if (timeEl) timeEl.textContent = timeStr;

    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = now.toLocaleDateString('vi-VN', dateOptions);
    const dateEl = el('dash-clock-date');
    if (dateEl) dateEl.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  }

  updateTimeClock();
  _dashClockInterval = setInterval(updateTimeClock, 1000);

  // ── 2. Nager.Date Holiday Countdown API ──
  loadHolidayCountdown();

  // ── 3. Open-Meteo Weather API ──
  loadOpenMeteoWeather();

  // ── 4. VietQR Generator & Profile Save ──
  initVietQR();

  // ── 5. "Mã QR Của Tôi" Modal & Upload ──
  initMyQRModal();
}

// ── Nager.Date API: Lịch nghỉ lễ & Đếm ngược ─────────────────────────
async function loadHolidayCountdown() {
  const currentYear = new Date().getFullYear();
  try {
    const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${currentYear}/VN`);
    if (!res.ok) return;
    const holidays = await res.json();
    const todayStr = new Date().toISOString().slice(0, 10);

    // Find next upcoming holiday
    const upcoming = holidays
      .filter(h => h.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date))[0];

    if (upcoming) {
      const holidayDate = new Date(upcoming.date);
      const today = new Date();
      today.setHours(0,0,0,0);
      const diffTime = holidayDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const holidayBadge = el('dash-holiday-badge');
      const holidayText  = el('dash-holiday-text');
      if (holidayBadge && holidayText) {
        holidayBadge.classList.remove('d-none');
        holidayText.innerHTML = `Còn <strong>${diffDays} ngày</strong> đến <strong>${upcoming.localName}</strong> (${fmtDate(upcoming.date, 'short')})`;
      }
    }
  } catch (e) {
    console.warn('Holiday API error', e);
  }
}

// ── Open-Meteo Weather API (Auto IP Geo, No Key) ─────────────────────
async function loadOpenMeteoWeather() {
  let lat = 21.0285, lon = 105.8542, cityName = 'Hà Nội'; // Default Hà Nội

  // Try auto IP geolocation without asking GPS permission
  try {
    const geoRes = await fetch('https://get.geojs.io/v1/ip/geo.json');
    if (geoRes.ok) {
      const geo = await geoRes.json();
      if (geo.latitude && geo.longitude) {
        lat = parseFloat(geo.latitude);
        lon = parseFloat(geo.longitude);
        cityName = geo.city || geo.region || 'Việt Nam';
      }
    }
  } catch {}

  const cityEl = el('weather-city');
  if (cityEl) cityEl.textContent = cityName;

  // Call Open-Meteo
  try {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,uv_index&timezone=auto`;
    const wRes = await fetch(weatherUrl);
    if (!wRes.ok) return;
    const wData = await wRes.json();
    const cur = wData.current;

    if (!cur) return;

    el('weather-temp').textContent = `${Math.round(cur.temperature_2m)}°C`;
    el('weather-feels').textContent = `${Math.round(cur.apparent_temperature)}°C`;
    el('weather-humidity').textContent = `${cur.relative_humidity_2m}%`;
    el('weather-wind').textContent = `${Math.round(cur.wind_speed_10m)} km/h`;
    el('weather-uv').textContent = cur.uv_index != null ? cur.uv_index.toFixed(1) : '--';

    // Weather condition decode
    const { desc, icon } = decodeWeatherCode(cur.weather_code, cur.is_day);
    el('weather-desc').textContent = desc;
    el('weather-icon').textContent = icon;
  } catch (e) {
    console.warn('Open-Meteo error', e);
  }
}

function decodeWeatherCode(code, isDay) {
  // WMO Weather interpretation codes (WW)
  if (code === 0) return { desc: 'Trời quang đãng', icon: isDay ? '☀️' : '🌙' };
  if (code === 1 || code === 2) return { desc: 'Nắng nhẹ / Ít mây', icon: isDay ? '🌤️' : '☁️' };
  if (code === 3) return { desc: 'Nhiều mây', icon: '☁️' };
  if (code === 45 || code === 48) return { desc: 'Có sương mù', icon: '🌫️' };
  if (code >= 51 && code <= 55) return { desc: 'Mưa phùn nhẹ', icon: '🌦️' };
  if (code >= 61 && code <= 65) return { desc: 'Có mưa rào', icon: '🌧️' };
  if (code >= 80 && code <= 82) return { desc: 'Mưa to xối xả', icon: '⛈️' };
  if (code >= 95) return { desc: 'Dông bão có sấm sét', icon: '⚡' };
  return { desc: 'Trời mát mẻ', icon: '⛅' };
}

// ── VietQR Generator Widget ──────────────────────────────────────────
function initVietQR() {
  const bankSel   = el('vqr-bank');
  const accInput  = el('vqr-acc');
  const nameInput = el('vqr-name');
  const amtInput  = el('vqr-amount');
  const noteInput = el('vqr-note');

  // Load saved profile
  try {
    const saved = JSON.parse(localStorage.getItem('pos_vietqr_profile') || '{}');
    if (saved.bank && bankSel)   bankSel.value   = saved.bank;
    if (saved.acc  && accInput)  accInput.value  = saved.acc;
    if (saved.name && nameInput) nameInput.value = saved.name;
  } catch {}

  el('vqr-save-profile-btn')?.addEventListener('click', () => {
    const profile = {
      bank: bankSel?.value,
      acc:  accInput?.value.trim(),
      name: nameInput?.value.trim(),
    };
    localStorage.setItem('pos_vietqr_profile', JSON.stringify(profile));
    toast('Đã lưu thông tin tài khoản ngân hàng mặc định!', 'success');
  });

  let currentQrUrl = '';

  el('vqr-generate-btn')?.addEventListener('click', () => {
    const bank = bankSel?.value;
    const acc  = accInput?.value.trim();
    const name = nameInput?.value.trim();
    const amt  = amtInput?.value.trim();
    const note = noteInput?.value.trim();

    if (!acc) { toast('Vui lòng nhập số tài khoản!', 'warning'); return; }

    // VietQR Quick URL
    let qrUrl = `https://img.vietqr.io/image/${bank}-${acc}-compact2.jpg`;
    const params = [];
    if (amt)  params.push(`amount=${amt}`);
    if (note) params.push(`addInfo=${encodeURIComponent(note)}`);
    if (name) params.push(`accountName=${encodeURIComponent(name)}`);

    if (params.length) qrUrl += '?' + params.join('&');

    currentQrUrl = qrUrl;

    const imgEl   = el('vqr-img');
    const wrapEl  = el('vqr-result-wrap');
    const holdEl  = el('vqr-placeholder');
    const infoEl  = el('vqr-info-text');

    if (imgEl && wrapEl && holdEl) {
      imgEl.src = qrUrl;
      wrapEl.classList.remove('d-none');
      holdEl.classList.add('d-none');
      if (infoEl) infoEl.textContent = `${bank} • ${acc} ${amt ? `• ${fmtVND(parseFloat(amt))}` : ''}`;
      toast('Đã tạo mã VietQR thành công!', 'success');
    }
  });

  el('vqr-download-btn')?.addEventListener('click', () => {
    if (!currentQrUrl) return;
    const a = document.createElement('a');
    a.href = currentQrUrl;
    a.download = `VietQR_${bankSel?.value}_${accInput?.value}.jpg`;
    a.target = '_blank';
    a.click();
  });

  el('vqr-copy-link-btn')?.addEventListener('click', () => {
    if (!currentQrUrl) return;
    navigator.clipboard.writeText(currentQrUrl);
    toast('Đã copy đường dẫn mã VietQR!', 'success');
  });
}

// ── "Mã QR Của Tôi" (Lưu & Mở nhanh) ─────────────────────────────────
function initMyQRModal() {
  const modal      = el('my-qr-modal');
  const btnOpen    = el('dash-my-qr-btn');
  const btnClose   = el('my-qr-close');
  const uploadInp  = el('my-qr-upload-input');
  const displayImg = el('my-qr-display-img');
  const emptyBox   = el('my-qr-empty');

  function renderSavedQR() {
    const saved = localStorage.getItem('pos_my_qr_code');
    if (saved && displayImg && emptyBox) {
      displayImg.src = saved;
      displayImg.classList.remove('d-none');
      emptyBox.classList.add('d-none');
    }
  }

  btnOpen?.addEventListener('click', () => {
    modal?.classList.remove('d-none');
    renderSavedQR();
  });

  btnClose?.addEventListener('click', () => modal?.classList.add('d-none'));
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('d-none');
  });

  uploadInp?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      localStorage.setItem('pos_my_qr_code', dataUrl);
      renderSavedQR();
      toast('Đã lưu mã QR nhận tiền của bạn!', 'success');
    };
    reader.readAsDataURL(file);
  });
}
