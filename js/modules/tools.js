/* ================================================================
   modules/tools.js — Power Tools & No-Install Utilities
   Guaranteed 100% Client-Side & High-Reliability Features:
   1. Volume Booster 200%-300% (Web Audio API GainNode)
   2. Client-side OCR Text Extractor (Tesseract.js)
   3. Ping Radar & Network Inspector
   4. Picture-in-Picture Floating Notepad (Always on Top)
   5. Voice-to-Text Dictation (Web Speech API Vietnamese)
   6. Native QR & Barcode Scanner
   7. PDF Splitter & Merger (pdf-lib)
   8. 1-Click System Backup & Restore
   9. Procedural Ambient Sound Mixer (Web Audio Synthesis)
   ================================================================ */

const Tools = (() => {

  let activeTab = 'audio'; // 'audio' | 'ocr' | 'ping' | 'pip' | 'voice' | 'qr' | 'pdf' | 'backup'

  // ── Global State for Tools ──
  // Audio Booster
  let audioCtx = null;
  let gainNode = null;
  let audioSource = null;
  let analyserNode = null;
  let animId = null;

  // Ambient Mixer state
  let ambientCtx = null;
  const ambientChannels = {
    rain:    { name: '🌧️ Tiếng mưa rơi',     gain: 0, node: null, playing: false },
    thunder: { name: '⚡ Sấm chớp rền',       gain: 0, node: null, playing: false },
    white:   { name: '☕ Quán cà phê / Noise', gain: 0, node: null, playing: false },
    ocean:   { name: '🌊 Sóng biển dạt dào', gain: 0, node: null, playing: false },
    keys:    { name: '⌨️ Gõ phím cơ',        gain: 0, node: null, playing: false },
  };

  // Voice recognition state
  let recognition = null;
  let isRecording = false;

  // QR scanner state
  let qrStream = null;
  let qrScanActive = false;

  // ── Main Render ──────────────────────────────────────────────────
  async function render(container) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h2><i class="bi bi-tools me-2 text-primary"></i>Hộp Công Cụ Tiện Ích</h2>
          <p class="text-muted small mb-0">Các công cụ phần cứng & tiện ích 100% chạy trên máy (Client-Side), an toàn và bảo mật</p>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="d-flex gap-2 mb-4 overflow-auto pb-2" id="tools-tab-bar" style="white-space:nowrap">
        <button class="tool-tab-btn ${activeTab === 'audio'  ? 'active' : ''}" data-tab="audio"><i class="bi bi-volume-up-fill"></i> Kích âm & Mixer</button>
        <button class="tool-tab-btn ${activeTab === 'ocr'    ? 'active' : ''}" data-tab="ocr"><i class="bi bi-file-text"></i> OCR Quét chữ</button>
        <button class="tool-tab-btn ${activeTab === 'voice'  ? 'active' : ''}" data-tab="voice"><i class="bi bi-mic-fill"></i> Gõ giọng nói</button>
        <button class="tool-tab-btn ${activeTab === 'pip'    ? 'active' : ''}" data-tab="pip"><i class="bi bi-window-stack"></i> Note nổi PiP</button>
        <button class="tool-tab-btn ${activeTab === 'qr'     ? 'active' : ''}" data-tab="qr"><i class="bi bi-qr-code-scan"></i> Quét QR / Barcode</button>
        <button class="tool-tab-btn ${activeTab === 'pdf'    ? 'active' : ''}" data-tab="pdf"><i class="bi bi-file-pdf"></i> Ghép/Cắt PDF</button>
        <button class="tool-tab-btn ${activeTab === 'ping'   ? 'active' : ''}" data-tab="ping"><i class="bi bi-speedometer2"></i> Ping Radar</button>
        <button class="tool-tab-btn ${activeTab === 'backup' ? 'active' : ''}" data-tab="backup"><i class="bi bi-shield-check"></i> Sao lưu / Phục hồi</button>
      </div>

      <!-- Tool Content Area -->
      <div id="tool-content-wrap"></div>
    `;

    // Tab buttons event
    container.querySelectorAll('.tool-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.tool-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeTab = btn.dataset.tab;
        renderActiveTool();
      });
    });

    renderActiveTool();
  }

  function renderActiveTool() {
    const wrap = el('tool-content-wrap');
    if (!wrap) return;

    if (activeTab === 'audio')  renderAudioTools(wrap);
    if (activeTab === 'ocr')    renderOcrTool(wrap);
    if (activeTab === 'voice')  renderVoiceTool(wrap);
    if (activeTab === 'pip')    renderPipTool(wrap);
    if (activeTab === 'qr')     renderQrTool(wrap);
    if (activeTab === 'pdf')    renderPdfTool(wrap);
    if (activeTab === 'ping')   renderPingTool(wrap);
    if (activeTab === 'backup') renderBackupTool(wrap);
  }

  // ════════════════════════════════════════════════════════════════
  // 1. AUDIO TOOLS: Kích âm lượng 300% & Ambient Sound Mixer
  // ════════════════════════════════════════════════════════════════
  function renderAudioTools(container) {
    container.innerHTML = `
      <div class="row g-4">
        <!-- Volume Booster -->
        <div class="col-12 col-lg-6">
          <div class="panel h-100">
            <div class="panel-header">
              <span class="panel-title"><i class="bi bi-soundwave text-primary me-2"></i>Kích âm lượng vượt trần (200% - 300%)</span>
              <span class="badge-pill badge-primary">GainNode</span>
            </div>
            <div class="panel-body">
              <p class="text-muted small">Tăng âm lượng file âm thanh/video bị nhỏ bằng bộ khuếch đại Web Audio API không méo tiếng.</p>

              <div class="mb-3">
                <label class="form-label">Chọn file âm thanh hoặc video từ máy:</label>
                <input type="file" id="booster-file-input" class="form-ctrl" accept="audio/*,video/*" />
              </div>

              <div class="mb-3">
                <audio id="booster-audio-el" controls class="w-100 d-none mb-3"></audio>
                <button class="btn-secondary btn-sm" id="booster-sample-btn">
                  <i class="bi bi-play-circle me-1"></i>Thử phát âm thanh mẫu
                </button>
              </div>

              <!-- Gain Slider -->
              <div class="p-3 rounded mb-3" style="background:var(--clr-surface-2);border:1px solid var(--clr-border)">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <span class="fw-semibold small">Mức khuếch đại âm lượng:</span>
                  <span class="badge-pill badge-warning fw-bold fs-6" id="booster-gain-label">100%</span>
                </div>
                <input type="range" class="form-range w-100" id="booster-gain-slider" min="100" max="300" step="5" value="100" />
                <div class="d-flex justify-content-between text-muted" style="font-size:11px">
                  <span>Chuẩn (100%)</span>
                  <span>Gấp đôi (200%)</span>
                  <span>Cực đại (300%)</span>
                </div>
              </div>

              <!-- Visualizer -->
              <canvas id="booster-visualizer" class="audio-visualizer"></canvas>
            </div>
          </div>
        </div>

        <!-- Ambient Sound Mixer -->
        <div class="col-12 col-lg-6">
          <div class="panel h-100">
            <div class="panel-header">
              <span class="panel-title"><i class="bi bi-headphones text-success me-2"></i>Ambient Mixer — Âm thanh tập trung</span>
              <button class="btn-ghost btn-sm" id="ambient-toggle-all"><i class="bi bi-power"></i> Tắt hết</button>
            </div>
            <div class="panel-body">
              <p class="text-muted small">Tự phối âm thanh tự nhiên tổng hợp (không cần tải file, chạy ngầm kể cả khi đổi tab):</p>
              
              <div class="ambient-grid">
                ${Object.entries(ambientChannels).map(([k, ch]) => `
                  <div class="ambient-card ${ch.gain > 0 ? 'playing' : ''}" id="amb-card-${k}">
                    <div class="d-flex justify-content-between align-items-center">
                      <span class="fw-semibold small">${ch.name}</span>
                      <span class="badge-pill badge-muted" id="amb-val-${k}">${ch.gain}%</span>
                    </div>
                    <input type="range" class="form-range" id="amb-slider-${k}" min="0" max="100" value="${ch.gain}" />
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // ── Volume Booster Logic ──
    const fileInput  = el('booster-file-input');
    const audioEl    = el('booster-audio-el');
    const gainSlider = el('booster-gain-slider');
    const gainLabel  = el('booster-gain-label');
    const visualizer = el('booster-visualizer');
    const sampleBtn  = el('booster-sample-btn');

    function initAudioContext() {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        gainNode = audioCtx.createGain();
        analyserNode = audioCtx.createAnalyser();
        analyserNode.fftSize = 64;

        audioSource = audioCtx.createMediaElementSource(audioEl);
        audioSource.connect(gainNode);
        gainNode.connect(analyserNode);
        analyserNode.connect(audioCtx.destination);

        drawVisualizer();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    }

    function drawVisualizer() {
      if (!visualizer) return;
      const ctx = visualizer.getContext('2d');
      const bufferLen = analyserNode.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLen);

      function render() {
        animId = requestAnimationFrame(render);
        analyserNode.getByteFrequencyData(dataArray);

        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--clr-surface-3') || '#161b22';
        ctx.fillRect(0, 0, visualizer.width, visualizer.height);

        const barWidth = (visualizer.width / bufferLen) * 2;
        let x = 0;

        for (let i = 0; i < bufferLen; i++) {
          const barHeight = (dataArray[i] / 255) * visualizer.height;
          ctx.fillStyle = '#2f81f7';
          ctx.fillRect(x, visualizer.height - barHeight, barWidth - 1, barHeight);
          x += barWidth;
        }
      }
      render();
    }

    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      initAudioContext();
      audioEl.src = URL.createObjectURL(file);
      audioEl.classList.remove('d-none');
      audioEl.play().catch(() => {});
      toast('Đang phát file: ' + file.name, 'info');
    });

    sampleBtn?.addEventListener('click', () => {
      initAudioContext();
      // Generate a pleasant synth chime
      playChimeTone(audioCtx);
      toast('Đang phát âm thanh mẫu qua GainNode!', 'info');
    });

    gainSlider?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      gainLabel.textContent = `${val}%`;
      if (gainNode) {
        gainNode.gain.value = val / 100;
      }
    });

    // ── Ambient Mixer Logic ──
    Object.keys(ambientChannels).forEach(key => {
      const slider = el(`amb-slider-${key}`);
      slider?.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        ambientChannels[key].gain = val;
        el(`amb-val-${key}`).textContent = `${val}%`;
        const card = el(`amb-card-${key}`);
        if (val > 0) card?.classList.add('playing');
        else card?.classList.remove('playing');
        updateAmbientSound(key, val);
      });
    });

    el('ambient-toggle-all')?.addEventListener('click', () => {
      Object.keys(ambientChannels).forEach(key => {
        ambientChannels[key].gain = 0;
        const slider = el(`amb-slider-${key}`);
        if (slider) slider.value = 0;
        const lbl = el(`amb-val-${key}`);
        if (lbl) lbl.textContent = '0%';
        el(`amb-card-${key}`)?.classList.remove('playing');
        updateAmbientSound(key, 0);
      });
      toast('Đã tắt toàn bộ âm thanh tập trung', 'info');
    });
  }

  // Synthesized tone for sample
  function playChimeTone(ctx) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 1.2);
    g.gain.setValueAtTime(0.5 * (gainNode ? gainNode.gain.value : 1), ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.5);
  }

  // Ambient sound synthesis (Brown/Pink Noise + Filters, 100% offline!)
  function updateAmbientSound(key, volumePercent) {
    if (!ambientCtx) {
      ambientCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ambientCtx.state === 'suspended') {
      ambientCtx.resume();
    }

    const ch = ambientChannels[key];
    const gainVal = (volumePercent / 100) * 0.4;

    if (gainVal <= 0) {
      if (ch.node) {
        try { ch.node.gain.gain.setValueAtTime(0, ambientCtx.currentTime); } catch {}
      }
      return;
    }

    if (!ch.node) {
      ch.node = createSoundGenerator(key, ambientCtx);
    }
    try {
      ch.node.gain.gain.setValueAtTime(gainVal, ambientCtx.currentTime);
    } catch {}
  }

  function createSoundGenerator(type, ctx) {
    // Generate 5s noise buffer
    const bufferSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Brown noise for rain & thunder
      lastOut = (lastOut + (0.02 * white)) / 1.02;
      data[i] = lastOut * 3.5;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    gain.gain.value = 0;

    if (type === 'rain') {
      filter.type = 'lowpass';
      filter.frequency.value = 900;
    } else if (type === 'thunder') {
      filter.type = 'lowpass';
      filter.frequency.value = 220;
    } else if (type === 'ocean') {
      filter.type = 'bandpass';
      filter.frequency.value = 450;
    } else if (type === 'keys') {
      filter.type = 'highpass';
      filter.frequency.value = 1800;
    } else {
      filter.type = 'bandpass';
      filter.frequency.value = 1200;
    }

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();

    return { noise, filter, gain };
  }

  // ════════════════════════════════════════════════════════════════
  // 2. OCR CLIENT-SIDE (Tesseract.js)
  // ════════════════════════════════════════════════════════════════
  function renderOcrTool(container) {
    container.innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title"><i class="bi bi-file-text text-primary me-2"></i>OCR Nhận diện & Trích xuất chữ từ ảnh (Client-Side)</span>
          <span class="badge-pill badge-success">Tesseract.js</span>
        </div>
        <div class="panel-body">
          <p class="text-muted small">Dán ảnh màn hình, bảng số liệu hoặc tài liệu giấy (<kbd class="kbd">Ctrl+V</kbd> hoặc tải ảnh lên). Văn bản sẽ được quét và xuất ra ngay lập tức mà không gửi ảnh ra ngoài.</p>

          <div class="row g-3">
            <div class="col-12 col-md-5">
              <div class="drop-zone p-4 mb-3 text-center" id="ocr-drop-zone">
                <i class="bi bi-image fs-1 text-primary"></i>
                <p class="mb-1 fw-semibold">Nhấn Ctrl+V để dán ảnh</p>
                <p class="text-muted small mb-2">hoặc chạm để chọn ảnh từ máy/camera</p>
                <input type="file" id="ocr-file-input" accept="image/*" class="d-none" />
                <button type="button" class="btn-secondary btn-sm" onclick="document.getElementById('ocr-file-input').click()">
                  <i class="bi bi-folder2-open me-1"></i>Chọn file ảnh
                </button>
              </div>

              <div class="d-flex gap-2 align-items-center mb-3">
                <label class="form-label mb-0 small text-nowrap">Ngôn ngữ:</label>
                <select class="form-ctrl btn-sm" id="ocr-lang-select">
                  <option value="vie+eng" selected>Tiếng Việt & Tiếng Anh</option>
                  <option value="vie">Tiếng Việt</option>
                  <option value="eng">Tiếng Anh</option>
                </select>
                <button class="btn-primary btn-sm flex-shrink-0" id="ocr-run-btn">
                  <i class="bi bi-play-fill"></i> Quét chữ
                </button>
              </div>

              <!-- Preview Image -->
              <div id="ocr-preview-wrap" class="p-2 rounded text-center d-none" style="background:var(--clr-surface-2);border:1px solid var(--clr-border)">
                <img id="ocr-preview-img" style="max-width:100%;max-height:220px;border-radius:4px" />
              </div>
            </div>

            <div class="col-12 col-md-7">
              <!-- Progress -->
              <div id="ocr-progress-wrap" class="mb-2 d-none">
                <div class="d-flex justify-content-between small text-muted mb-1">
                  <span id="ocr-status-text">Đang chuẩn bị...</span>
                  <span id="ocr-percent-text">0%</span>
                </div>
                <div class="progress-bar-wrap">
                  <div class="progress-bar-fill" id="ocr-progress-bar" style="width:0%"></div>
                </div>
              </div>

              <!-- Result Text -->
              <div class="d-flex justify-content-between align-items-center mb-1">
                <label class="form-label mb-0">Nội dung văn bản trích xuất:</label>
                <div class="d-flex gap-1">
                  <button class="btn-ghost btn-sm" id="ocr-copy-btn" title="Copy text"><i class="bi bi-copy"></i> Copy</button>
                  <button class="btn-ghost btn-sm text-primary" id="ocr-save-brain-btn" title="Lưu vào Second Brain"><i class="bi bi-journal-plus"></i> Lưu Brain</button>
                </div>
              </div>
              <textarea id="ocr-result-text" class="form-ctrl" rows="12" placeholder="Nội dung chữ sau khi nhận diện sẽ hiện ở đây..."></textarea>
            </div>
          </div>
        </div>
      </div>
    `;

    let curImageSrc = null;

    function handleOcrImage(fileOrBlob) {
      const reader = new FileReader();
      reader.onload = (e) => {
        curImageSrc = e.target.result;
        const img = el('ocr-preview-img');
        if (img) img.src = curImageSrc;
        el('ocr-preview-wrap')?.classList.remove('d-none');
        toast('Đã nạp ảnh! Bấm "Quét chữ" để nhận diện.', 'info');
      };
      reader.readAsDataURL(fileOrBlob);
    }

    el('ocr-file-input')?.addEventListener('change', (e) => {
      if (e.target.files[0]) handleOcrImage(e.target.files[0]);
    });

    const dropZone = el('ocr-drop-zone');
    dropZone?.addEventListener('paste', (e) => {
      const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
      if (item) handleOcrImage(item.getAsFile());
    });
    document.addEventListener('paste', (e) => {
      if (activeTab !== 'ocr') return;
      const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
      if (item) handleOcrImage(item.getAsFile());
    });

    el('ocr-run-btn')?.addEventListener('click', async () => {
      if (!curImageSrc) { toast('Vui lòng chọn hoặc dán ảnh trước!', 'warning'); return; }

      if (typeof Tesseract === 'undefined') {
        toast('Đang tải thư viện OCR Tesseract...', 'info');
        await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
      }

      const pWrap = el('ocr-progress-wrap');
      const pBar  = el('ocr-progress-bar');
      const pStat = el('ocr-status-text');
      const pPerc = el('ocr-percent-text');
      const resEl = el('ocr-result-text');

      pWrap?.classList.remove('d-none');

      try {
        const lang = el('ocr-lang-select')?.value || 'vie+eng';
        const result = await Tesseract.recognize(curImageSrc, lang, {
          logger: m => {
            if (m.status === 'recognizing text' && m.progress != null) {
              const p = Math.round(m.progress * 100);
              if (pBar)  pBar.style.width = `${p}%`;
              if (pPerc) pPerc.textContent = `${p}%`;
              if (pStat) pStat.textContent = 'Đang nhận diện chữ...';
            } else if (m.status) {
              if (pStat) pStat.textContent = m.status;
            }
          }
        });

        if (resEl) resEl.value = result.data.text.trim();
        toast('Nhận diện chữ thành công!', 'success');
      } catch (err) {
        console.error('OCR Error', err);
        toast('Lỗi OCR: ' + err.message, 'error');
      } finally {
        pWrap?.classList.add('d-none');
      }
    });

    el('ocr-copy-btn')?.addEventListener('click', () => {
      const txt = el('ocr-result-text')?.value;
      if (!txt) return;
      navigator.clipboard.writeText(txt);
      toast('Đã copy văn bản!', 'success');
    });

    el('ocr-save-brain-btn')?.addEventListener('click', async () => {
      const txt = el('ocr-result-text')?.value;
      if (!txt) { toast('Chưa có nội dung!', 'warning'); return; }
      try {
        // Save to scrapbook IndexedDB
        const item = {
          id: genId(),
          type: 'note',
          title: 'OCR: ' + txt.slice(0, 35) + '...',
          content: txt,
          tags: ['ocr', 'scan'],
          pinned: false,
          starred: false,
          createdAt: new Date().toISOString(),
        };
        const db = await indexedDB.open('pos_scrapbook', 1);
        db.onsuccess = (e) => {
          const tx = e.target.result.transaction('items', 'readwrite');
          tx.objectStore('items').put(item);
          toast('Đã lưu nội dung OCR vào Second Brain!', 'success');
        };
      } catch (err) {
        toast('Lưu thất bại: ' + err.message, 'error');
      }
    });
  }

  // ════════════════════════════════════════════════════════════════
  // 3. VOICE-TO-TEXT DICTATION (Web Speech Recognition)
  // ════════════════════════════════════════════════════════════════
  function renderVoiceTool(container) {
    container.innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title"><i class="bi bi-mic-fill text-danger me-2"></i>Voice-to-Text Dictation (Nói tiếng Việt tự gõ chữ)</span>
          <span class="badge-pill badge-primary">Web Speech API</span>
        </div>
        <div class="panel-body">
          <p class="text-muted small">Nhận diện giọng nói tiếng Việt chuẩn xác bằng engine tích hợp sẵn trong trình duyệt Chrome/Edge (Không mất phí API, không gián đoạn).</p>

          <div class="d-flex gap-2 align-items-center mb-3 flex-wrap">
            <button class="btn-primary" id="voice-toggle-btn">
              <i class="bi bi-mic-fill me-1"></i> <span id="voice-btn-text">Bắt đầu nói</span>
            </button>
            <div class="d-flex align-items-center gap-2">
              <select class="form-ctrl btn-sm" id="voice-lang-select" style="width:auto">
                <option value="vi-VN" selected>Tiếng Việt (vi-VN)</option>
                <option value="en-US">English (en-US)</option>
              </select>
            </div>
            <div class="ms-auto d-flex gap-1">
              <button class="btn-ghost btn-sm" id="voice-copy-btn"><i class="bi bi-copy"></i> Copy</button>
              <button class="btn-ghost btn-sm" id="voice-clear-btn"><i class="bi bi-trash"></i> Xóa</button>
              <button class="btn-secondary btn-sm" id="voice-save-btn"><i class="bi bi-journal-plus me-1"></i>Lưu vào Second Brain</button>
            </div>
          </div>

          <!-- Interim preview box -->
          <div id="voice-interim" class="p-2 mb-2 rounded small text-primary fst-italic d-none" style="background:var(--clr-surface-2);border:1px dashed var(--clr-border)">
            Đang nghe...
          </div>

          <!-- Main Transcript Box -->
          <textarea id="voice-result-box" class="form-ctrl fs-6" rows="12" placeholder="Bấm 'Bắt đầu nói' và nói vào mic, chữ sẽ tự động gõ ra đây thời gian thực..."></textarea>
        </div>
      </div>
    `;

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRec) {
      toast('Trình duyệt của bạn chưa hỗ trợ Web Speech API. Hãy dùng Chrome hoặc Edge.', 'warning');
      return;
    }

    const toggleBtn = el('voice-toggle-btn');
    const btnText   = el('voice-btn-text');
    const langSel   = el('voice-lang-select');
    const resBox    = el('voice-result-box');
    const interimBox= el('voice-interim');

    recognition = new SpeechRec();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      isRecording = true;
      toggleBtn.className = 'btn-danger';
      btnText.textContent = 'Dừng ghi âm';
      interimBox?.classList.remove('d-none');
      toast('Đang lắng nghe mic...', 'info');
    };

    recognition.onresult = (e) => {
      let interim = '';
      let final = '';

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          final += transcript + ' ';
        } else {
          interim += transcript;
        }
      }

      if (final && resBox) {
        resBox.value += final;
      }
      if (interimBox) {
        interimBox.textContent = interim ? `Đang nói: "${interim}"` : 'Đang nghe...';
      }
    };

    recognition.onerror = (e) => {
      console.warn('Speech error', e.error);
      if (e.error !== 'no-speech') {
        toast('Lỗi micro: ' + e.error, 'warning');
      }
    };

    recognition.onend = () => {
      if (isRecording) {
        // Auto restart for continuous speaking
        try { recognition.start(); } catch {}
      } else {
        toggleBtn.className = 'btn-primary';
        btnText.textContent = 'Bắt đầu nói';
        interimBox?.classList.add('d-none');
      }
    };

    toggleBtn?.addEventListener('click', () => {
      if (!isRecording) {
        recognition.lang = langSel?.value || 'vi-VN';
        try {
          recognition.start();
        } catch (err) {
          toast('Không thể mở micro: ' + err.message, 'error');
        }
      } else {
        isRecording = false;
        recognition.stop();
        toast('Đã dừng thu âm', 'info');
      }
    });

    el('voice-copy-btn')?.addEventListener('click', () => {
      const val = resBox?.value;
      if (!val) return;
      navigator.clipboard.writeText(val);
      toast('Đã copy nội dung nói!', 'success');
    });

    el('voice-clear-btn')?.addEventListener('click', () => {
      if (resBox) resBox.value = '';
    });

    el('voice-save-btn')?.addEventListener('click', () => {
      const val = resBox?.value?.trim();
      if (!val) { toast('Chưa có nội dung!', 'warning'); return; }
      saveToBrain('Voice Dictation: ' + val.slice(0, 30), val, ['voice', 'dictation']);
    });
  }

  // ════════════════════════════════════════════════════════════════
  // 4. PICTURE-IN-PICTURE NOTEPAD (Always On Top)
  // ════════════════════════════════════════════════════════════════
  function renderPipTool(container) {
    container.innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title"><i class="bi bi-window-stack text-warning me-2"></i>Picture-in-Picture Notepad (Ghi chú nổi Always-on-Top)</span>
          <span class="badge-pill badge-primary">Canvas + PiP</span>
        </div>
        <div class="panel-body">
          <p class="text-muted small">Tạo một cửa sổ nhỏ ghim nổi đè lên mọi ứng dụng (kể cả game, video, tài liệu khác) để vừa làm việc vừa xem ghi chú hoặc đồng hồ.</p>

          <div class="row g-4">
            <div class="col-12 col-md-6">
              <div class="form-group">
                <label class="form-label">Tiêu đề ghi chú nổi:</label>
                <input id="pip-title-input" class="form-ctrl" value="🚀 Ghi chú công việc" placeholder="Tiêu đề..." />
              </div>
              <div class="form-group">
                <label class="form-label">Nội dung ghi chú:</label>
                <textarea id="pip-text-input" class="form-ctrl" rows="6" placeholder="Nhập ghi chú cần ghim nổi...">- Hoàn thành báo cáo&#10;- Họp team 14:00&#10;- Review code pull request</textarea>
              </div>
              <div class="d-flex gap-2">
                <button class="btn-primary" id="pip-launch-btn">
                  <i class="bi bi-pip me-1"></i> Bật Cửa Sổ Nổi (PiP)
                </button>
              </div>
            </div>

            <div class="col-12 col-md-6 text-center">
              <label class="form-label mb-2 d-block">Xem trước cửa sổ nổi:</label>
              <canvas id="pip-canvas" width="380" height="220" class="pip-canvas mx-auto mb-2"></canvas>
              <!-- Hidden video element for PiP stream -->
              <video id="pip-video" autoplay muted playsinline class="d-none"></video>
            </div>
          </div>
        </div>
      </div>
    `;

    const canvas = el('pip-canvas');
    const video  = el('pip-video');
    const titleInp = el('pip-title-input');
    const textInp  = el('pip-text-input');
    const launchBtn= el('pip-launch-btn');

    function drawPipCanvas() {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const w = canvas.width, h = canvas.height;

      // Dark card background
      ctx.fillStyle = '#0d1117';
      ctx.fillRect(0, 0, w, h);

      // Border header
      ctx.fillStyle = '#161b22';
      ctx.fillRect(0, 0, w, 40);

      // Clock + Title
      const now = new Date();
      const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      ctx.fillStyle = '#58a6ff';
      ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
      ctx.fillText(titleInp?.value || 'Ghi chú nổi', 14, 25);

      ctx.fillStyle = '#8b949e';
      ctx.font = '12px monospace';
      ctx.fillText(timeStr, w - 75, 25);

      // Content text
      ctx.fillStyle = '#e6edf3';
      ctx.font = '14px system-ui, -apple-system, sans-serif';
      const lines = (textInp?.value || '').split('\n');
      let y = 68;
      for (const line of lines.slice(0, 7)) {
        ctx.fillText(line, 14, y);
        y += 22;
      }
    }

    drawPipCanvas();
    // Live update canvas when typing
    titleInp?.addEventListener('input', drawPipCanvas);
    textInp?.addEventListener('input', drawPipCanvas);

    // Redraw every second for the clock
    const clockTimer = setInterval(drawPipCanvas, 1000);

    launchBtn?.addEventListener('click', async () => {
      if (!document.pictureInPictureEnabled) {
        toast('Trình duyệt không hỗ trợ Picture-in-Picture!', 'warning');
        return;
      }

      drawPipCanvas();

      if (!video.srcObject) {
        const stream = canvas.captureStream(30);
        video.srcObject = stream;
        await video.play();
      }

      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await video.requestPictureInPicture();
          toast('Cửa sổ nổi đã kích hoạt! Hãy chuyển sang app khác để xem.', 'success');
        }
      } catch (err) {
        toast('Lỗi mở PiP: ' + err.message, 'error');
      }
    });
  }

  // ════════════════════════════════════════════════════════════════
  // 5. NATIVE QR & BARCODE SCANNER
  // ════════════════════════════════════════════════════════════════
  function renderQrTool(container) {
    container.innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title"><i class="bi bi-qr-code-scan text-primary me-2"></i>Quét mã QR / Barcode "Native" (Camera & Ảnh)</span>
          <span class="badge-pill badge-primary">BarcodeDetector API</span>
        </div>
        <div class="panel-body">
          <p class="text-muted small">Sử dụng API BarcodeDetector trực tiếp từ phần cứng trình duyệt, không cần kéo thư viện nặng.</p>

          <div class="row g-4">
            <div class="col-12 col-md-6 text-center">
              <div class="d-flex gap-2 justify-content-center mb-3">
                <button class="btn-primary btn-sm" id="qr-cam-start"><i class="bi bi-camera me-1"></i> Bật Camera quét</button>
                <button class="btn-secondary btn-sm" id="qr-cam-stop"><i class="bi bi-stop-circle me-1"></i> Tắt</button>
                <button class="btn-secondary btn-sm" onclick="document.getElementById('qr-img-input').click()"><i class="bi bi-image me-1"></i> Quét từ ảnh</button>
                <input type="file" id="qr-img-input" accept="image/*" class="d-none" />
              </div>

              <!-- Camera View -->
              <video id="qr-video" class="qr-scanner-video mx-auto mb-2" autoplay playsinline muted></video>
              <canvas id="qr-canvas" class="d-none"></canvas>
            </div>

            <div class="col-12 col-md-6">
              <label class="form-label">Kết quả quét được:</label>
              <div class="p-3 rounded mb-3" style="background:var(--clr-surface-2);border:1px solid var(--clr-border);min-height:120px" id="qr-result-box">
                <span class="text-muted">Chưa có kết quả. Hướng camera vào mã QR hoặc dán ảnh vào đây...</span>
              </div>

              <div class="d-flex gap-2 flex-wrap">
                <button class="btn-secondary btn-sm" id="qr-copy-btn"><i class="bi bi-copy me-1"></i> Copy link/text</button>
                <button class="btn-primary btn-sm d-none" id="qr-open-btn"><i class="bi bi-window me-1"></i> Mở trong Web Opener</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const video    = el('qr-video');
    const canvas   = el('qr-canvas');
    const resBox   = el('qr-result-box');
    const openBtn  = el('qr-open-btn');
    const copyBtn  = el('qr-copy-btn');
    let lastResult = '';

    async function detectCode(source) {
      if ('BarcodeDetector' in window) {
        try {
          const detector = new BarcodeDetector({ formats: ['qr_code', 'ean_13', 'code_128', 'data_matrix'] });
          const barcodes = await detector.detect(source);
          if (barcodes.length > 0) {
            handleScanSuccess(barcodes[0].rawValue);
          }
        } catch {}
      } else {
        // Fallback to jsQR if loaded
        if (typeof jsQR !== 'undefined' && canvas) {
          const ctx = canvas.getContext('2d');
          canvas.width = source.videoWidth || source.naturalWidth || 300;
          canvas.height = source.videoHeight || source.naturalHeight || 300;
          ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imgData.data, imgData.width, imgData.height);
          if (code) handleScanSuccess(code.data);
        }
      }
    }

    function handleScanSuccess(text) {
      if (!text || text === lastResult) return;
      lastResult = text;
      resBox.innerHTML = `
        <div class="text-success fw-bold mb-1"><i class="bi bi-check-circle-fill me-1"></i> Đã quét thành công:</div>
        <div class="text-break fs-6" style="color:var(--clr-text)">${sanitize(text)}</div>
      `;
      toast('Đã tìm thấy mã: ' + text.slice(0, 30), 'success');

      if (/^https?:\/\//i.test(text)) {
        openBtn?.classList.remove('d-none');
        openBtn.onclick = () => WebOpener.openModal(text);
      } else {
        openBtn?.classList.add('d-none');
      }
    }

    el('qr-cam-start')?.addEventListener('click', async () => {
      try {
        qrStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        video.srcObject = qrStream;
        qrScanActive = true;

        const scanLoop = async () => {
          if (!qrScanActive) return;
          if (video.readyState === video.HAVE_ENOUGH_DATA) {
            await detectCode(video);
          }
          requestAnimationFrame(scanLoop);
        };
        requestAnimationFrame(scanLoop);
        toast('Camera đã bật!', 'info');
      } catch (err) {
        toast('Không thể mở camera: ' + err.message, 'error');
      }
    });

    el('qr-cam-stop')?.addEventListener('click', () => {
      qrScanActive = false;
      if (qrStream) {
        qrStream.getTracks().forEach(t => t.stop());
        qrStream = null;
      }
      video.srcObject = null;
      toast('Đã tắt camera', 'info');
    });

    el('qr-img-input')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const img = new Image();
      img.onload = async () => {
        await detectCode(img);
      };
      img.src = URL.createObjectURL(file);
    });

    copyBtn?.addEventListener('click', () => {
      if (!lastResult) return;
      navigator.clipboard.writeText(lastResult);
      toast('Đã copy nội dung mã!', 'success');
    });
  }

  // ════════════════════════════════════════════════════════════════
  // 6. PDF SPLITTER & MERGER (pdf-lib 100% Client-Side)
  // ════════════════════════════════════════════════════════════════
  function renderPdfTool(container) {
    container.innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title"><i class="bi bi-file-pdf text-danger me-2"></i>PDF Splitter & Merger (Ghép & Tách file PDF 100% trên máy)</span>
          <span class="badge-pill badge-primary">pdf-lib Client</span>
        </div>
        <div class="panel-body">
          <p class="text-muted small">Cắt và ghép tài liệu PDF trực tiếp bằng thư viện pdf-lib ngay trong trình duyệt. Không bao giờ tải file lên máy chủ bên thứ ba.</p>

          <div class="row g-4">
            <!-- Merger -->
            <div class="col-12 col-md-6 border-end" style="border-color:var(--clr-border) !important">
              <h5 class="fs-6 fw-bold mb-2"><i class="bi bi-files me-1 text-primary"></i> 1. Ghép nhiều file PDF thành 1</h5>
              <p class="text-muted small">Chọn 2 hoặc nhiều file PDF để gộp thành một tài liệu duy nhất.</p>

              <input type="file" id="pdf-merge-input" multiple accept="application/pdf" class="form-ctrl mb-3" />
              <div id="pdf-merge-list" class="mb-3 small text-muted">Chưa chọn file nào</div>
              <button class="btn-primary" id="pdf-merge-btn"><i class="bi bi-file-earmark-plus me-1"></i> Ghép & Tải PDF về</button>
            </div>

            <!-- Splitter -->
            <div class="col-12 col-md-6">
              <h5 class="fs-6 fw-bold mb-2"><i class="bi bi-scissors me-1 text-warning"></i> 2. Tách trang lẻ từ file PDF</h5>
              <p class="text-muted small">Chọn file PDF và nhập các trang muốn trích xuất (vd: <code>1-3, 5, 8</code>).</p>

              <input type="file" id="pdf-split-input" accept="application/pdf" class="form-ctrl mb-2" />
              <div class="form-group mb-3">
                <label class="form-label small">Các trang muốn lấy (1-indexed):</label>
                <input type="text" id="pdf-split-pages" class="form-ctrl" placeholder="Ví dụ: 1-3, 5" value="1" />
              </div>
              <button class="btn-secondary" id="pdf-split-btn"><i class="bi bi-file-earmark-minus me-1"></i> Tách trang & Tải về</button>
            </div>
          </div>
        </div>
      </div>
    `;

    async function ensurePdfLib() {
      if (typeof PDFLib === 'undefined') {
        toast('Đang nạp thư viện pdf-lib...', 'info');
        await loadScript('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.9/dist/pdf-lib.min.js');
      }
    }

    // Merge
    let mergeFiles = [];
    el('pdf-merge-input')?.addEventListener('change', (e) => {
      mergeFiles = [...e.target.files];
      const listEl = el('pdf-merge-list');
      if (listEl) {
        listEl.innerHTML = mergeFiles.map((f, i) => `<div>${i + 1}. <strong>${sanitize(f.name)}</strong> (${(f.size/1024).toFixed(1)} KB)</div>`).join('');
      }
    });

    el('pdf-merge-btn')?.addEventListener('click', async () => {
      if (mergeFiles.length < 2) { toast('Chọn ít nhất 2 file PDF để ghép!', 'warning'); return; }
      await ensurePdfLib();
      toast('Đang ghép các file PDF...', 'info');

      try {
        const mergedDoc = await PDFLib.PDFDocument.create();

        for (const file of mergeFiles) {
          const bytes = await file.arrayBuffer();
          const doc = await PDFLib.PDFDocument.load(bytes);
          const copiedPages = await mergedDoc.copyPages(doc, doc.getPageIndices());
          copiedPages.forEach(page => mergedDoc.addPage(page));
        }

        const mergedBytes = await mergedDoc.save();
        downloadBlob(new Blob([mergedBytes], { type: 'application/pdf' }), `merged_${todayVN()}.pdf`);
        toast('Đã ghép và tải file PDF thành công!', 'success');
      } catch (err) {
        toast('Lỗi ghép PDF: ' + err.message, 'error');
      }
    });

    // Split
    el('pdf-split-btn')?.addEventListener('click', async () => {
      const fileInput = el('pdf-split-input');
      const file = fileInput?.files[0];
      const rangeStr = el('pdf-split-pages')?.value.trim();

      if (!file) { toast('Chọn file PDF cần tách!', 'warning'); return; }
      if (!rangeStr) { toast('Nhập số trang cần tách!', 'warning'); return; }

      await ensurePdfLib();
      toast('Đang tách trang...', 'info');

      try {
        const bytes = await file.arrayBuffer();
        const srcDoc = await PDFLib.PDFDocument.load(bytes);
        const total = srcDoc.getPageCount();

        // Parse range like "1-3, 5" -> 0-indexed indices
        const indices = new Set();
        rangeStr.split(',').forEach(part => {
          part = part.trim();
          if (part.includes('-')) {
            const [start, end] = part.split('-').map(n => parseInt(n.trim()));
            for (let i = start; i <= end; i++) {
              if (i >= 1 && i <= total) indices.add(i - 1);
            }
          } else {
            const p = parseInt(part);
            if (p >= 1 && p <= total) indices.add(p - 1);
          }
        });

        if (indices.size === 0) { toast('Số trang không hợp lệ!', 'warning'); return; }

        const newDoc = await PDFLib.PDFDocument.create();
        const copied = await newDoc.copyPages(srcDoc, [...indices]);
        copied.forEach(p => newDoc.addPage(p));

        const outBytes = await newDoc.save();
        downloadBlob(new Blob([outBytes], { type: 'application/pdf' }), `split_${file.name}`);
        toast(`Đã trích xuất ${indices.size} trang thành công!`, 'success');
      } catch (err) {
        toast('Lỗi tách PDF: ' + err.message, 'error');
      }
    });
  }

  // ════════════════════════════════════════════════════════════════
  // 7. PING RADAR & NETWORK INSPECTOR
  // ════════════════════════════════════════════════════════════════
  function renderPingTool(container) {
    container.innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title"><i class="bi bi-speedometer2 text-primary me-2"></i>Ping Radar & Kiểm tra mạng nhanh</span>
          <button class="btn-primary btn-sm" id="ping-refresh-btn"><i class="bi bi-arrow-clockwise"></i> Đo lại</button>
        </div>
        <div class="panel-body">
          <p class="text-muted small">Đo độ trễ (Latency/Ping) trực tiếp từ trình duyệt tới các máy chủ lớn và kiểm tra IP công khai.</p>

          <div class="row g-3 mb-4">
            <div class="col-12 col-md-4">
              <div class="ping-card">
                <div>
                  <div class="fw-semibold">Cloudflare (1.1.1.1)</div>
                  <div class="text-muted small">Fast Anycast DNS</div>
                </div>
                <div class="ping-value ping-good" id="ping-cf">— ms</div>
              </div>
            </div>

            <div class="col-12 col-md-4">
              <div class="ping-card">
                <div>
                  <div class="fw-semibold">Google DNS (8.8.8.8)</div>
                  <div class="text-muted small">Global Google Gateway</div>
                </div>
                <div class="ping-value ping-good" id="ping-google">— ms</div>
              </div>
            </div>

            <div class="col-12 col-md-4">
              <div class="ping-card">
                <div>
                  <div class="fw-semibold">GitHub Core API</div>
                  <div class="text-muted small">Code & CI/CD Hub</div>
                </div>
                <div class="ping-value ping-good" id="ping-github">— ms</div>
              </div>
            </div>
          </div>

          <!-- IP & Network Info Card -->
          <div class="p-3 rounded" style="background:var(--clr-surface-2);border:1px solid var(--clr-border)">
            <h6 class="fw-bold mb-3"><i class="bi bi-globe me-2 text-primary"></i>Thông tin kết nối mạng của bạn:</h6>
            <div class="row g-2 small">
              <div class="col-6 col-md-3"><strong>Trạng thái:</strong> <span class="badge-pill badge-success" id="net-online">Đang Online</span></div>
              <div class="col-6 col-md-3"><strong>IP công khai:</strong> <span id="net-ip" class="font-monospace">Đang lấy...</span></div>
              <div class="col-6 col-md-3"><strong>Nhà mạng (ISP):</strong> <span id="net-isp">—</span></div>
              <div class="col-6 col-md-3"><strong>Vị trí:</strong> <span id="net-loc">—</span></div>
            </div>
          </div>
        </div>
      </div>
    `;

    async function measurePing(url) {
      const start = performance.now();
      try {
        await fetch(url, { mode: 'no-cors', cache: 'no-store' });
        return Math.round(performance.now() - start);
      } catch {
        return Math.round(performance.now() - start);
      }
    }

    async function runPingTests() {
      // 1. Cloudflare
      const cfPing = await measurePing('https://cloudflare.com/cdn-cgi/trace?' + Date.now());
      updatePingUI('ping-cf', cfPing);

      // 2. Google
      const gPing = await measurePing('https://www.google.com/favicon.ico?' + Date.now());
      updatePingUI('ping-google', gPing);

      // 3. GitHub
      const ghPing = await measurePing('https://github.com/favicon.ico?' + Date.now());
      updatePingUI('ping-github', ghPing);

      // 4. Fetch IP
      try {
        const res = await fetch('https://ipapi.co/json/');
        if (res.ok) {
          const d = await res.json();
          el('net-ip').textContent  = d.ip || '—';
          el('net-isp').textContent = d.org || '—';
          el('net-loc').textContent = `${d.city || ''}, ${d.country_name || ''}`;
        }
      } catch {
        try {
          const res2 = await fetch('https://api.ipify.org?format=json');
          const d2 = await res2.json();
          el('net-ip').textContent = d2.ip || '—';
        } catch {
          el('net-ip').textContent = 'Không lấy được';
        }
      }
    }

    function updatePingUI(id, val) {
      const elVal = el(id);
      if (!elVal) return;
      elVal.textContent = `${val} ms`;
      elVal.className = 'ping-value ' + (val < 60 ? 'ping-good' : val < 160 ? 'ping-warn' : 'ping-bad');
    }

    el('ping-refresh-btn')?.addEventListener('click', runPingTests);
    runPingTests();
  }

  // ════════════════════════════════════════════════════════════════
  // 8. 1-CLICK SYSTEM BACKUP & RESTORE
  // ════════════════════════════════════════════════════════════════
  function renderBackupTool(container) {
    container.innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title"><i class="bi bi-shield-check text-success me-2"></i>Tính Năng Sống Còn: 1-Click Backup & Restore</span>
          <span class="badge-pill badge-success">All-In-One</span>
        </div>
        <div class="panel-body">
          <p class="text-muted small">Toàn bộ dữ liệu của bạn trên trình duyệt (Timesheet, Chi tiêu, Bookmarks, Snippets, Second Brain IndexedDB) được đóng gói an toàn vào một file duy nhất <code>PersonalOS_Backup.json</code>.</p>

          <div class="row g-4 mt-1">
            <!-- Backup -->
            <div class="col-12 col-md-6 border-end" style="border-color:var(--clr-border) !important">
              <div class="text-center p-4 rounded" style="background:var(--clr-surface-2);border:1px solid var(--clr-border)">
                <i class="bi bi-cloud-arrow-down-fill text-primary" style="font-size:48px"></i>
                <h5 class="fs-6 fw-bold mt-2">Xuất dữ liệu hệ thống (Backup)</h5>
                <p class="text-muted small mb-3">Tải về một file JSON duy nhất chứa toàn bộ cơ sở dữ liệu trên máy tính/điện thoại.</p>
                <button class="btn-primary" id="backup-export-btn">
                  <i class="bi bi-download me-1"></i> Tải bản Backup ngay (.json)
                </button>
              </div>
            </div>

            <!-- Restore -->
            <div class="col-12 col-md-6">
              <div class="text-center p-4 rounded" style="background:var(--clr-surface-2);border:1px solid var(--clr-border)">
                <i class="bi bi-cloud-arrow-up-fill text-warning" style="font-size:48px"></i>
                <h5 class="fs-6 fw-bold mt-2">Khôi phục dữ liệu (Restore)</h5>
                <p class="text-muted small mb-3">Chọn hoặc thả file <code>PersonalOS_Backup_*.json</code> để phục hồi lại 100% nguyên vẹn.</p>
                <input type="file" id="backup-restore-input" accept=".json" class="d-none" />
                <button class="btn-secondary" onclick="document.getElementById('backup-restore-input').click()">
                  <i class="bi bi-upload me-1"></i> Chọn file để Khôi phục
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // ── Export Backup ──
    el('backup-export-btn')?.addEventListener('click', async () => {
      toast('Đang đóng gói dữ liệu hệ thống...', 'info');

      const backupData = {
        meta: {
          app: 'Personal OS',
          version: '2.0',
          exportedAt: new Date().toISOString(),
        },
        localStorage: {},
        indexedDB: {},
      };

      // 1. Collect all LocalStorage keys
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        backupData.localStorage[k] = localStorage.getItem(k);
      }

      // 2. Collect Second Brain IndexedDB items
      try {
        const db = await openIDB('pos_scrapbook', 1);
        if (db) {
          const items = await new Promise((res) => {
            const tx = db.transaction('items', 'readonly');
            const req = tx.objectStore('items').getAll();
            req.onsuccess = () => res(req.result || []);
            req.onerror   = () => res([]);
          });
          backupData.indexedDB['pos_scrapbook'] = items;
        }
      } catch (e) {
        console.warn('IDB backup note', e);
      }

      const jsonStr = JSON.stringify(backupData, null, 2);
      downloadBlob(new Blob([jsonStr], { type: 'application/json' }), `PersonalOS_Backup_${todayVN()}.json`);
      toast('Đã xuất bản backup thành công!', 'success');
    });

    // ── Restore Backup ──
    el('backup-restore-input')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!confirm(`Bạn có chắc chắn muốn khôi phục dữ liệu từ file "${file.name}"? Dữ liệu hiện tại sẽ được cập nhật/ghi đè.`)) {
        return;
      }

      try {
        const text = await file.text();
        const backup = JSON.parse(text);

        if (!backup.localStorage && !backup.indexedDB) {
          throw new Error('Định dạng file backup không đúng.');
        }

        // Restore LocalStorage
        if (backup.localStorage) {
          Object.entries(backup.localStorage).forEach(([k, v]) => {
            localStorage.setItem(k, v);
          });
        }

        // Restore IndexedDB
        if (backup.indexedDB && backup.indexedDB['pos_scrapbook']) {
          const db = await openIDB('pos_scrapbook', 1);
          if (db) {
            const tx = db.transaction('items', 'readwrite');
            const store = tx.objectStore('items');
            for (const item of backup.indexedDB['pos_scrapbook']) {
              store.put(item);
            }
          }
        }

        toast('Khôi phục hoàn tất 100%! Đang tải lại ứng dụng...', 'success');
        setTimeout(() => location.reload(), 1200);
      } catch (err) {
        toast('Lỗi khôi phục: ' + err.message, 'error');
      }
    });
  }

  // ── Helpers ──
  function openIDB(name, version) {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(name, version);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function downloadBlob(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function saveToBrain(title, content, tags) {
    try {
      const item = {
        id: genId(),
        type: 'note',
        title,
        content,
        tags: tags || [],
        pinned: false,
        starred: false,
        createdAt: new Date().toISOString(),
      };
      const req = indexedDB.open('pos_scrapbook', 1);
      req.onsuccess = (e) => {
        const tx = e.target.result.transaction('items', 'readwrite');
        tx.objectStore('items').put(item);
        toast('Đã lưu vào Second Brain!', 'success');
      };
    } catch (e) {
      toast('Lỗi lưu: ' + e.message, 'error');
    }
  }

  return { render };
})();
