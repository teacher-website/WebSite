/* 光雕彩印實驗室（beamo II 教師研習）— 互動工具（每個工具一個函式，掛在 [data-tool] 上） */
(function () {
  'use strict';

  /* ---------- 共用小工具 ---------- */
  const Store = {
    key: 'beamo2-training',
    all() { try { return JSON.parse(localStorage.getItem(this.key)) || {}; } catch (e) { return {}; } },
    get(k, d) { const v = this.all()[k]; return v === undefined ? d : v; },
    set(k, v) { try { const a = this.all(); a[k] = v; localStorage.setItem(this.key, JSON.stringify(a)); } catch (e) { /* 私密視窗等情況存不了，畫面照常運作 */ } },
    clear() { try { localStorage.removeItem(this.key); } catch (e) { } },
  };
  window.Store = Store;

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const fmtTime = s => {
    if (!isFinite(s)) return '—';
    s = Math.round(s);
    const m = Math.floor(s / 60), r = s % 60;
    return m >= 60 ? `${Math.floor(m / 60)} 小時 ${m % 60} 分` : m ? `${m} 分 ${r} 秒` : `${r} 秒`;
  };
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const download = (name, text, type) => {
    const blob = new Blob([text], { type: type || 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  const T = window.TOOLS = {};

  /* 熱點圖：共用於機器構造與 Beam Studio 畫面 */
  function hotspots(el, svgInner, viewBox, parts, introText) {
    el.innerHTML = `<div class="machine-wrap">
      <div class="machine"><svg viewBox="${viewBox}" role="img">${svgInner}</svg></div>
      <div class="hot-info card" style="margin:0"><h4>${introText}</h4><p class="small">點圖上的紅色數字，或下面的按鈕。</p></div>
    </div><div class="hot-list"></div>`;
    const svg = $('svg', el), info = $('.hot-info', el), list = $('.hot-list', el);
    parts.forEach((p, i) => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'hot'); g.setAttribute('tabindex', '0');
      g.innerHTML = `<circle class="ring" cx="${p.x}" cy="${p.y}" r="14"></circle><text x="${p.x}" y="${p.y + 5}" text-anchor="middle">${i + 1}</text>`;
      svg.appendChild(g);
      const b = h(`<button type="button">${i + 1}. ${esc(p.t)}</button>`);
      list.appendChild(b);
      const show = () => {
        $$('.hot', svg).forEach((x, j) => x.classList.toggle('on', j === i));
        $$('button', list).forEach((x, j) => x.classList.toggle('on', j === i));
        info.innerHTML = `<h4>${i + 1}. ${esc(p.t)}</h4><p>${p.d}</p>`;
      };
      g.addEventListener('click', show);
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(); } });
      b.addEventListener('click', show);
    });
  }

  /* ---------- 1. 機器構造 ---------- */
  T.machine = el => {
    const svg = `
      <defs>
        <pattern id="hex" width="10" height="9" patternUnits="userSpaceOnUse"><path d="M0 4.5 L2.5 0 H7.5 L10 4.5 L7.5 9 H2.5Z" fill="none" stroke="#7d8597" stroke-width="1"/></pattern>
        <linearGradient id="cmykg" x1="0" x2="1"><stop offset="0" stop-color="#00a3e0"/><stop offset=".33" stop-color="#e0218a"/><stop offset=".66" stop-color="#f5c400"/><stop offset="1" stop-color="#222"/></linearGradient>
      </defs>
      <rect x="20" y="110" width="95" height="200" rx="10" fill="#f6f7fb" stroke="#9aa3b5" stroke-dasharray="6 4"/>
      <text x="67" y="130" text-anchor="middle" font-size="14" fill="#5e6880">背面</text>
      <circle cx="67" cy="175" r="20" fill="#cfd5e2" stroke="#7d8597" stroke-width="2"/><circle cx="67" cy="175" r="11" fill="#7d8597"/>
      <rect x="45" y="262" width="44" height="26" rx="5" fill="#cfd5e2" stroke="#7d8597"/><rect x="52" y="268" width="12" height="14" rx="2" fill="#1f2a44"/><circle cx="76" cy="275" r="5" fill="#7d8597"/>
      <path d="M130 110 L620 110 L580 45 L170 45 Z" fill="#dfe3ec" stroke="#9aa3b5" stroke-width="2"/>
      <path d="M180 100 L570 100 L540 55 L210 55 Z" fill="#5b3a2e" opacity=".55"/>
      <rect x="130" y="110" width="490" height="250" rx="16" fill="#eceff5" stroke="#9aa3b5" stroke-width="2"/>
      <rect x="150" y="135" width="360" height="170" rx="8" fill="#3a3f4b"/>
      <text x="160" y="152" font-size="11" fill="#c8cfdf">（內部示意）</text>
      <rect x="160" y="160" width="340" height="10" rx="4" fill="#aab2c3"/>
      <line x1="172" y1="150" x2="172" y2="300" stroke="#aab2c3" stroke-width="6"/>
      <line x1="488" y1="150" x2="488" y2="300" stroke="#aab2c3" stroke-width="6"/>
      <rect x="305" y="150" width="50" height="42" rx="6" fill="#e5484d"/><path d="M322 192 L338 192 L330 205 Z" fill="#c5363b"/>
      <circle cx="345" cy="160" r="5" fill="#1f2a44" stroke="#fff" stroke-width="1.5"/><rect x="290" y="158" width="12" height="4" rx="2" fill="#aab2c3"/>
      <line x1="330" y1="205" x2="330" y2="250" stroke="#ff6b6b" stroke-width="2" stroke-dasharray="4 3"/>
      <rect x="405" y="150" width="48" height="36" rx="6" fill="url(#cmykg)"/>
      <rect x="175" y="248" width="310" height="48" fill="#c9ced8"/><rect x="175" y="248" width="310" height="48" fill="url(#hex)"/>
      <rect x="250" y="252" width="120" height="30" fill="#d9b383" opacity=".9"/>
      <rect x="175" y="298" width="310" height="6" fill="#2b303b"/><circle cx="230" cy="301" r="2" fill="#7a4a22"/><circle cx="400" cy="300" r="2" fill="#7a4a22"/>
      <text x="330" y="352" text-anchor="middle" font-size="11" fill="#5e6880">（蜂巢板下方＝機殼底部，沒有抽屜）</text>
      <rect x="530" y="215" width="70" height="56" rx="8" fill="#1f2a44"/><rect x="537" y="222" width="56" height="36" rx="4" fill="#4dd0e1"/>
      <circle cx="548" cy="290" r="8" fill="#1f2a44"/><rect x="562" y="284" width="12" height="7" rx="1" fill="#7d8597"/><rect x="578" y="284" width="9" height="9" rx="1" fill="#7d8597"/>
      <rect x="616" y="300" width="10" height="50" rx="3" fill="#dfe3ec" stroke="#9aa3b5"/><circle cx="621" cy="325" r="12" fill="#f5c400"/><circle cx="621" cy="325" r="8" fill="#dc2626"/>`;
    hotspots(el, svg, '0 0 640 400', DATA.parts, 'beamo II 構造');
  };

  /* ---------- Beam Studio 畫面導覽 ---------- */
  T.bsui = el => {
    const svg = `
      <rect x="0" y="0" width="640" height="380" rx="12" fill="#f3f4f8" stroke="#c8cfdf"/>
      <rect x="0" y="0" width="640" height="44" rx="12" fill="#2d3b5e"/>
      <rect x="44" y="10" width="32" height="24" rx="5" fill="#556790"/><circle cx="60" cy="22" r="6" fill="none" stroke="#fff" stroke-width="2"/>
      <rect x="523" y="10" width="44" height="24" rx="5" fill="#556790"/><rect x="531" y="16" width="28" height="12" fill="none" stroke="#fff" stroke-width="1.5" stroke-dasharray="3 2"/>
      <rect x="575" y="8" width="52" height="28" rx="6" fill="#e5484d"/><path d="M594 14 L610 22 L594 30 Z" fill="#fff"/>
      <rect x="0" y="44" width="44" height="336" fill="#e3e7f0"/>
      ${[70, 100, 130, 160, 190, 220, 250].map(y => `<rect x="10" y="${y}" width="24" height="20" rx="4" fill="#c8cfdf"/>`).join('')}
      <rect x="60" y="60" width="420" height="300" fill="#fff" stroke="#c8cfdf"/>
      <rect x="130" y="130" width="230" height="150" fill="#d9b383" opacity=".55"/>
      <rect x="170" y="160" width="120" height="70" rx="8" fill="none" stroke="#ff0000" stroke-width="2"/>
      <text x="230" y="203" text-anchor="middle" font-size="22" font-weight="700">名牌</text>
      <rect x="490" y="44" width="150" height="336" fill="#fff" stroke="#c8cfdf"/>
      <text x="505" y="70" font-size="13" font-weight="700" fill="#2d3b5e">圖層</text>
      <rect x="500" y="82" width="130" height="24" rx="4" fill="#f0f3fa"/><rect x="506" y="88" width="12" height="12" fill="#000"/><text x="524" y="99" font-size="12">刻面</text>
      <rect x="500" y="110" width="130" height="24" rx="4" fill="#f0f3fa"/><rect x="506" y="116" width="12" height="12" fill="#0000ff"/><text x="524" y="127" font-size="12">雕線</text>
      <rect x="500" y="138" width="130" height="24" rx="4" fill="#fde8e8"/><rect x="506" y="144" width="12" height="12" fill="#ff0000"/><text x="524" y="155" font-size="12">切割</text>
      <text x="505" y="200" font-size="13" font-weight="700" fill="#2d3b5e">參數</text>
      <text x="505" y="225" font-size="12">功率 ▮▮▮▮▮▮▯▯ 65%</text>
      <text x="505" y="248" font-size="12">速度 8 mm/s</text>
      <text x="505" y="271" font-size="12">執行次數 1</text>`;
    hotspots(el, svg, '0 0 640 380', DATA.bsui, 'Beam Studio 畫面（示意）');
  };

  /* ---------- 工作範圍 ---------- */
  T.area = el => {
    el.innerHTML = `
      <div class="row no-print" style="margin-bottom:8px">
        <label class="field">材料寬 (mm)<input type="number" class="inp mw" value="300" min="10" max="600" style="width:90px"></label>
        <label class="field">材料高 (mm)<input type="number" class="inp mh" value="200" min="10" max="600" style="width:90px"></label>
        <div class="row presets">
          <button class="btn alt" data-p="300,200">30×20 cm 板</button>
          <button class="btn alt" data-p="297,210">A4</button>
          <button class="btn alt" data-p="400,300">40×30 cm 板</button>
          <button class="btn alt" data-p="90,54">名片</button>
        </div>
      </div>
      <div class="legend">
        <span><span class="color-sw" style="background:#fff;border:2px solid #1f2a44"></span>雷射工作範圍 360×240</span>
        <label><input type="checkbox" class="o-cam" checked> <span class="color-sw" style="background:#cde6ff"></span>相機一次預覽 ≈300×195</label>
        <label><input type="checkbox" class="o-ir"> <span class="color-sw" style="background:#ffe1c7"></span>紅外線（選配）≈270×190</label>
      </div>
      <svg class="area-svg" viewBox="-12 -12 384 264"></svg>
      <p class="status" style="font-weight:700;margin:.5em 0 0"></p>
      <p class="small">預覽範圍與紅外線範圍的實際位置依機器而定，這裡只畫出大小。機器平台可以放比工作範圍大的板子（約 415 × 335 mm），但只有工作範圍內能加工。</p>`;
    const svg = $('svg', el), mw = $('.mw', el), mh = $('.mh', el), st = $('.status', el);
    let mx = 20, my = 20, drag = null;
    const draw = () => {
      const W = +mw.value || 0, H = +mh.value || 0;
      let g = '';
      for (let x = 0; x <= 360; x += 10) g += `<line x1="${x}" y1="0" x2="${x}" y2="240" stroke="${x % 50 ? '#eef1f7' : '#dfe3ec'}" stroke-width=".6"/>`;
      for (let y = 0; y <= 240; y += 10) g += `<line x1="0" y1="${y}" x2="360" y2="${y}" stroke="${y % 50 ? '#eef1f7' : '#dfe3ec'}" stroke-width=".6"/>`;
      let o = '';
      if ($('.o-cam', el).checked) o += `<rect x="30" y="22.5" width="300" height="195" fill="#cde6ff" opacity=".55"/>`;
      if ($('.o-ir', el).checked) o += `<rect x="45" y="25" width="270" height="190" fill="#ffe1c7" opacity=".6"/>`;
      const inside = mx >= 0 && my >= 0 && mx + W <= 360 && my + H <= 240;
      svg.innerHTML = `${g}${o}
        <rect x="0" y="0" width="360" height="240" fill="none" stroke="#1f2a44" stroke-width="1.5"/>
        <text x="2" y="-3" font-size="8" fill="#5e6880">0,0（原點在左上）</text><text x="358" y="250" font-size="8" text-anchor="end" fill="#5e6880">360 × 240 mm</text>
        <g class="mat" style="cursor:move">
          <rect x="${mx}" y="${my}" width="${W}" height="${H}" fill="${inside ? 'rgba(36,87,197,.25)' : 'rgba(220,38,38,.25)'}" stroke="${inside ? '#2457c5' : '#dc2626'}" stroke-width="1.2"/>
          <text x="${mx + W / 2}" y="${my + H / 2 + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="${inside ? '#1d3f8f' : '#a11'}">${W}×${H} mm</text>
        </g>`;
      if (W > 360 || H > 240) {
        const rot = H <= 360 && W <= 240;
        st.textContent = rot ? '⚠ 這樣放不下工作範圍，但旋轉 90° 就可以。' : '✗ 材料比工作範圍大：放得進機器的話，只能加工 360×240 範圍內的部分。';
        st.style.color = 'var(--warn)';
      } else {
        st.textContent = inside ? '✓ 整塊材料都在工作範圍內。' : '⚠ 材料有一部分超出工作範圍，把它拖回框內。';
        st.style.color = inside ? 'var(--ok)' : 'var(--warn)';
      }
    };
    const pt = e => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); };
    svg.addEventListener('pointerdown', e => { if (!e.target.closest('.mat')) return; const p = pt(e); drag = { dx: p.x - mx, dy: p.y - my }; svg.setPointerCapture(e.pointerId); });
    svg.addEventListener('pointermove', e => { if (!drag) return; const p = pt(e); mx = Math.round(p.x - drag.dx); my = Math.round(p.y - drag.dy); draw(); });
    svg.addEventListener('pointerup', () => { drag = null; });
    [mw, mh, $('.o-cam', el), $('.o-ir', el)].forEach(i => i.addEventListener('input', draw));
    $$('.presets button', el).forEach(b => b.addEventListener('click', () => { const [w, hh] = b.dataset.p.split(','); mw.value = w; mh.value = hh; mx = 10; my = 10; draw(); }));
    draw();
  };

  /* ---------- 2. 材料判斷遊戲 ---------- */
  T.matgame = el => {
    const label = { cut: '可以切割與雕刻', eng: '只能雕刻', no: '禁止放入' };
    let order, i, score;
    const start = () => { order = DATA.mats.map((_, k) => k).sort(() => Math.random() - .5); i = 0; score = 0; show(); };
    const show = () => {
      if (i >= order.length) {
        el.innerHTML = `<div class="game-card"><div class="mat">🎉 完成！</div><p>答對 <b>${score}</b> / ${order.length} 題</p><button class="btn again">再玩一次</button></div>`;
        $('.again', el).addEventListener('click', start);
        return;
      }
      const m = DATA.mats[order[i]];
      el.innerHTML = `<div class="game-card">
        <div class="small">第 ${i + 1} / ${order.length} 題　答對 ${score}</div>
        <div class="mat">${esc(m.n)}</div>
        <div class="choices">
          <button class="btn green" data-k="cut">✂ 可以切割與雕刻</button>
          <button class="btn" data-k="eng" style="background:#5e6880">✎ 只能雕刻</button>
          <button class="btn red" data-k="no">⛔ 禁止放入</button>
        </div>
        <div class="feedback"></div></div>`;
      const fb = $('.feedback', el);
      $$('.choices button', el).forEach(b => b.addEventListener('click', () => {
        if (fb.classList.contains('show')) return;
        const ok = b.dataset.k === m.k;
        if (ok) score++;
        $$('.choices button', el).forEach(x => { x.disabled = true; });
        fb.className = 'feedback show ' + (ok ? 'good' : 'badf');
        fb.innerHTML = `${ok ? '✓ 答對了！' : '✗ 答案是「' + label[m.k] + '」'}　${esc(m.why)}<div style="margin-top:8px"><button class="btn next">下一個 →</button></div>`;
        $('.next', fb).addEventListener('click', () => { i++; show(); });
      }));
    };
    start();
  };

  /* ---------- 3. 加工模擬器 ---------- */
  T.sim = el => {
    const MODES = {
      cut: { n: '切割', walk: '沿著星星的外框走（向量）', pw: '高（約 60–70%）', sp: 8, eff: '燒穿材料，星星掉下來' },
      line: { n: '雕線', walk: '沿著星星的外框走（向量）', pw: '低（約 15–30%）', sp: 60, eff: '表面留下一條細線，不會穿透' },
      fill: { n: '刻面', walk: '左右來回掃描，一行一行往下（點陣）', pw: '低～中（約 15–30%）', sp: 300, eff: '整個星星燒成深色的面' },
      print: { n: '彩色列印', walk: '墨頭左右來回噴墨（類似刻面）', pw: '不用雷射', sp: 0, eff: '印出彩色圖案，常接著用雷射切外形' },
    };
    el.innerHTML = `<div class="sim">
      <div><div class="mode-tabs">${Object.entries(MODES).map(([k, m]) => `<button data-m="${k}">${m.n}</button>`).join('')}</div>
        <canvas width="600" height="400"></canvas>
        <div class="row" style="margin-top:8px"><button class="btn red go">▶ 開始</button><button class="btn alt reset">重來</button><span class="small speedup"></span></div></div>
      <div class="card" style="margin:0"><h4 class="mn"></h4><dl class="kv">
        <dt>雷射頭走法</dt><dd class="k-walk"></dd><dt>功率</dt><dd class="k-pw"></dd><dt>速度</dt><dd class="k-sp"></dd>
        <dt>這顆星星要多久</dt><dd class="k-t"></dd><dt>效果</dt><dd class="k-eff"></dd></dl>
        <p class="small" style="margin-top:10px">星星外接約 44 × 42 mm。刻面以 250 DPI（行距 0.1 mm）估算；數字只是示意，實際依參數與機器而定。</p></div></div>`;
    const cv = $('canvas', el), ctx = cv.getContext('2d');
    const S = 6; // 每 mm 幾個像素
    const star = [];
    for (let k = 0; k < 10; k++) { const r = k % 2 ? 9 : 22, a = -Math.PI / 2 + k * Math.PI / 5; star.push([50 + r * Math.cos(a), 34 + r * Math.sin(a)]); }
    star.push(star[0]);
    const segs = []; let L = 0;
    for (let k = 0; k < star.length - 1; k++) { const [x1, y1] = star[k], [x2, y2] = star[k + 1]; const l = Math.hypot(x2 - x1, y2 - y1); segs.push({ x1, y1, x2, y2, l, s: L }); L += l; }
    const ys = star.map(p => p[1]), xs = star.map(p => p[0]);
    const bx = Math.min(...xs), by = Math.min(...ys), bw = Math.max(...xs) - bx, bh = Math.max(...ys) - by;
    const realT = {
      cut: L / 8, line: L / 60, fill: (bh / 0.1) * (bw / 300 + 0.02), print: NaN,
    };
    let mode = 'cut', raf = 0, t0 = 0, dur = 6000, done = false;
    const starPath = c => { c.beginPath(); star.forEach(([x, y], k) => k ? c.lineTo(x * S, y * S) : c.moveTo(x * S, y * S)); c.closePath(); };
    const wood = () => {
      ctx.fillStyle = '#d9b383'; ctx.fillRect(0, 0, 600, 400);
      ctx.strokeStyle = 'rgba(140,95,50,.18)'; ctx.lineWidth = 2;
      for (let y = 10; y < 400; y += 22) { ctx.beginPath(); ctx.moveTo(0, y); for (let x = 0; x <= 600; x += 30) ctx.lineTo(x, y + Math.sin((x + y) / 60) * 4); ctx.stroke(); }
      ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1; starPath(ctx); ctx.stroke(); ctx.setLineDash([]);
    };
    const head = (x, y, col) => {
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = 'rgba(255,80,80,.35)'; ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.fill();
    };
    const pointAt = d => { for (const s of segs) if (d <= s.s + s.l) { const f = (d - s.s) / s.l; return [s.x1 + (s.x2 - s.x1) * f, s.y1 + (s.y2 - s.y1) * f]; } return star[star.length - 1]; };
    const frame = f => {
      wood();
      if (mode === 'cut' || mode === 'line') {
        const d = L * f;
        ctx.strokeStyle = mode === 'cut' ? '#1a0d05' : '#7a4a22'; ctx.lineWidth = mode === 'cut' ? 2.6 : 1.3;
        ctx.beginPath(); ctx.moveTo(star[0][0] * S, star[0][1] * S);
        for (const s of segs) { if (s.s + s.l <= d) ctx.lineTo(s.x2 * S, s.y2 * S); else { const [x, y] = pointAt(d); ctx.lineTo(x * S, y * S); break; } }
        ctx.stroke();
        if (mode === 'cut' && f >= 1) {
          ctx.fillStyle = '#2b2b2b'; starPath(ctx); ctx.fill();
          ctx.save(); ctx.translate(200, 40); ctx.rotate(.12); ctx.fillStyle = '#d9b383'; starPath(ctx); ctx.fill(); ctx.strokeStyle = '#5a3515'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
          ctx.fillStyle = '#1f2a44'; ctx.font = 'bold 18px sans-serif'; ctx.fillText('星星掉下來了 → 留下一個洞', 330, 370);
        }
        if (f < 1) { const [x, y] = pointAt(d); head(x * S, y * S, '#e5484d'); }
      } else {
        const rows = Math.round(bh / 0.8); // 動畫用較粗的行
        const cur = f * rows, rowH = bh / rows;
        ctx.save(); starPath(ctx); ctx.clip();
        if (mode === 'fill') { ctx.fillStyle = '#3b230f'; ctx.fillRect(bx * S, by * S, bw * S, Math.floor(cur) * rowH * S); }
        else {
          const gr = ctx.createLinearGradient(bx * S, 0, (bx + bw) * S, 0);
          gr.addColorStop(0, '#00a3e0'); gr.addColorStop(.5, '#e0218a'); gr.addColorStop(1, '#f5c400');
          ctx.fillStyle = gr; ctx.fillRect(bx * S, by * S, bw * S, Math.floor(cur) * rowH * S);
        }
        ctx.restore();
        if (f < 1) {
          const r = Math.floor(cur), fr = cur - r, ltr = r % 2 === 0;
          const x = (bx + bw * (ltr ? fr : 1 - fr)) * S, y = (by + (r + .5) * rowH) * S;
          ctx.strokeStyle = 'rgba(229,72,77,.4)'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(bx * S, y); ctx.lineTo((bx + bw) * S, y); ctx.stroke(); ctx.setLineDash([]);
          head(x, y, mode === 'fill' ? '#e5484d' : '#e0218a');
        }
      }
    };
    const info = () => {
      const m = MODES[mode];
      $$('.mode-tabs button', el).forEach(b => b.classList.toggle('on', b.dataset.m === mode));
      $('.mn', el).textContent = m.n;
      $('.k-walk', el).textContent = m.walk; $('.k-pw', el).textContent = m.pw;
      $('.k-sp', el).textContent = m.sp ? `約 ${m.sp} mm/s` : '—';
      $('.k-t', el).textContent = mode === 'print' ? '依解析度、面積與列印次數而定' : '約 ' + fmtTime(realT[mode]);
      $('.k-eff', el).textContent = m.eff;
      const rt = realT[mode] * 1000;
      dur = mode === 'print' ? 6000 : Math.max(3000, Math.min(8000, rt));
      $('.speedup', el).textContent = isFinite(rt) && rt > dur ? `動畫已加速約 ${Math.round(rt / dur)} 倍` : '';
    };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    const run = () => {
      stop(); t0 = performance.now(); done = false;
      const step = now => { const f = Math.min(1, (now - t0) / dur); frame(f); if (f < 1) raf = requestAnimationFrame(step); else { done = true; raf = 0; el.dataset.done = mode; } };
      raf = requestAnimationFrame(step);
    };
    $$('.mode-tabs button', el).forEach(b => b.addEventListener('click', () => { mode = b.dataset.m; stop(); info(); frame(0); }));
    $('.go', el).addEventListener('click', run);
    $('.reset', el).addEventListener('click', () => { stop(); frame(0); });
    info(); frame(0);
    T.sim._finish = () => { stop(); frame(1); el.dataset.done = mode; return done; };
  };

  /* ---------- 時間估算器 ---------- */
  T.timecalc = el => {
    el.innerHTML = `
      <div class="grid g3">
        <div><h4><span class="pill cut">切割</span></h4>
          <label class="field">線總長 (mm)<input type="number" class="inp" data-k="cl" value="400"></label>
          <label class="field">速度 (mm/s)<input type="number" class="inp" data-k="cs" value="8"></label>
          <label class="field">執行次數<input type="number" class="inp" data-k="cn" value="1" min="1"></label></div>
        <div><h4><span class="pill line">雕線</span></h4>
          <label class="field">線總長 (mm)<input type="number" class="inp" data-k="ll" value="250"></label>
          <label class="field">速度 (mm/s)<input type="number" class="inp" data-k="ls" value="60"></label></div>
        <div><h4><span class="pill fill">刻面</span></h4>
          <label class="field">寬 (mm)<input type="number" class="inp" data-k="fw" value="60"></label>
          <label class="field">高 (mm)<input type="number" class="inp" data-k="fh" value="20"></label>
          <label class="field">速度 (mm/s)<input type="number" class="inp" data-k="fs" value="300"></label>
          <label class="field">解析度<select class="inp" data-k="dpi"><option>125</option><option selected>250</option><option>500</option><option>1000</option></select></label></div>
      </div>
      <div class="row" style="margin-top:10px"><label class="field">份數（全班幾個人）<input type="number" class="inp" data-k="n" value="1" min="1" style="width:100px"></label></div>
      <div class="out card" style="background:#f7f8fc;box-shadow:none"></div>
      <p class="small">名牌 80×30 mm 外框周長約 210 mm、加吊孔約 13 mm。刻面每行另加約 0.02 秒的轉向時間；實際時間以 Beam Studio 路徑預覽為準。</p>`;
    const v = k => +$(`[data-k=${k}]`, el).value || 0;
    const calc = () => {
      const cut = v('cs') ? v('cl') / v('cs') * Math.max(1, v('cn')) : 0;
      const line = v('ls') ? v('ll') / v('ls') : 0;
      const pitch = 25.4 / v('dpi');
      const rf = (w, hh) => v('fs') && w && hh ? (hh / pitch) * (w / v('fs') + 0.02) : 0;
      const fill = rf(v('fw'), v('fh')), fillRot = rf(v('fh'), v('fw'));
      const one = cut + line + fill, n = Math.max(1, v('n'));
      $('.out', el).innerHTML = `<div class="grid g4">
        <div><span class="small">切割</span><b class="big" style="font-size:1.2em;display:block">${fmtTime(cut)}</b></div>
        <div><span class="small">雕線</span><b class="big" style="font-size:1.2em;display:block">${fmtTime(line)}</b></div>
        <div><span class="small">刻面（${Math.round(v('fh') / pitch)} 行）</span><b class="big" style="font-size:1.2em;display:block">${fmtTime(fill)}</b></div>
        <div><span class="small">一份合計 ／ ${n} 份</span><b class="big" style="font-size:1.2em;display:block;color:var(--accent)">${fmtTime(one)} ／ ${fmtTime(one * n)}</b></div></div>
        <p style="margin:.6em 0 0">${fill && fillRot > fill * 1.05 ? `💡 如果把刻面轉 90°（變成 ${v('fh')}×${v('fw')}），要 ${fmtTime(fillRot)}，<b>多花 ${fmtTime(fillRot - fill)}</b>。橫著刻比較快！` : fill && fill > fillRot * 1.05 ? `💡 把刻面轉 90°（變成 ${v('fh')}×${v('fw')}）只要 ${fmtTime(fillRot)}，<b>可省 ${fmtTime(fill - fillRot)}</b>！` : ''}</p>`;
    };
    $$('input,select', el).forEach(i => i.addEventListener('input', calc));
    calc();
  };

  /* ---------- 點陣 vs 向量 ---------- */
  T.vecraster = el => {
    el.innerHTML = `<label class="field">放大倍率 <input type="range" min="1" max="12" value="1" class="z"></label>
      <div class="grid g2" style="margin-top:6px"><div><canvas width="220" height="220" style="width:100%;border-radius:10px;background:#fff;border:1px solid var(--line-c)" class="cr"></canvas><div class="small" style="text-align:center">點陣圖（照片、PNG）放大會出現鋸齒</div></div>
      <div><canvas width="220" height="220" style="width:100%;border-radius:10px;background:#fff;border:1px solid var(--line-c)" class="cv"></canvas><div class="small" style="text-align:center">向量圖（SVG）放大依然平滑</div></div></div>`;
    const bmp = document.createElement('canvas'); bmp.width = bmp.height = 24;
    const b = bmp.getContext('2d'); b.fillStyle = '#e5484d'; b.beginPath(); b.arc(12, 12, 9, 0, 7); b.fill(); b.fillStyle = '#fff'; b.beginPath(); b.arc(12, 12, 4, 0, 7); b.fill();
    const draw = () => {
      const z = +$('.z', el).value;
      const r = $('.cr', el).getContext('2d'), v = $('.cv', el).getContext('2d');
      [r, v].forEach(c => { c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 220, 220); });
      const s = 220 / 24 * z, off = 110 - 12 * s;
      r.imageSmoothingEnabled = false; r.drawImage(bmp, off, off, 24 * s, 24 * s);
      v.fillStyle = '#e5484d'; v.beginPath(); v.arc(110, 110, 9 * s, 0, 7); v.arc(110, 110, 4 * s, 0, 7, true); v.fill();
      v.strokeStyle = '#ff0000'; v.lineWidth = 1.5; v.beginPath(); v.arc(110, 110, 9 * s, 0, 7); v.stroke();
    };
    $('.z', el).addEventListener('input', draw); draw();
  };

  /* ---------- CMYK 混色 ---------- */
  T.cmyk = el => {
    el.innerHTML = `<div class="row" style="align-items:flex-start;gap:16px">
      <svg viewBox="0 0 160 160" style="width:150px;flex:none"><g style="mix-blend-mode:multiply"></g></svg>
      <div style="flex:1;min-width:180px">
        ${['C 青', 'M 洋紅', 'Y 黃', 'K 黑'].map((n, i) => `<label class="field">${n} <input type="range" min="0" max="100" value="${[0, 80, 90, 0][i]}" data-i="${i}"></label>`).join('')}
        <div class="row" style="margin-top:6px"><span class="swatch" style="display:inline-block;width:46px;height:46px;border-radius:10px;border:1px solid #ccc"></span><span class="small out"></span></div>
        <div class="row" style="margin-top:6px">
          <button class="btn alt" data-p="0,100,100,0">紅</button><button class="btn alt" data-p="100,0,100,0">綠</button><button class="btn alt" data-p="100,100,0,0">藍</button><button class="btn alt" data-p="0,25,40,0">膚色</button><button class="btn alt" data-p="0,0,0,100">黑</button>
        </div></div></div>`;
    const g = $('svg g', el), out = $('.out', el), sw = $('.swatch', el);
    const cols = ['#00aeef', '#ec008c', '#fff200', '#231f20'];
    const pos = [[60, 60], [100, 60], [80, 95], [80, 75]];
    const draw = () => {
      const v = $$('input', el).map(i => +i.value / 100);
      g.innerHTML = v.map((a, i) => `<circle cx="${pos[i][0]}" cy="${pos[i][1]}" r="${i === 3 ? 18 : 38}" fill="${cols[i]}" opacity="${a}" style="mix-blend-mode:multiply"/>`).join('');
      const [c, m, y, k] = v;
      const rgb = [1 - c, 1 - m, 1 - y].map(x => Math.round(255 * x * (1 - k)));
      sw.style.background = `rgb(${rgb})`;
      out.textContent = `C${Math.round(c * 100)} M${Math.round(m * 100)} Y${Math.round(y * 100)} K${Math.round(k * 100)} → 疊出來大約是這個顏色`;
    };
    $$('input', el).forEach(i => i.addEventListener('input', draw));
    $$('button[data-p]', el).forEach(b => b.addEventListener('click', () => { b.dataset.p.split(',').forEach((x, i) => { $$('input', el)[i].value = x; }); draw(); }));
    draw();
  };

  /* ---------- 8. SOP 精靈 ---------- */
  const illu = {
    place: `<rect x="40" y="150" width="520" height="14" fill="#c8a272"/><rect x="200" y="80" width="200" height="70" rx="8" fill="#dfe3ec" stroke="#7d8597"/><text x="300" y="122" text-anchor="middle" font-size="16">beamo II</text>
      <path d="M150 115 H195 M405 115 H450" stroke="#2457c5" stroke-width="2" marker-end="url(#ar)" marker-start="url(#ar)"/><text x="172" y="105" text-anchor="middle" font-size="12" fill="#2457c5">≥10 cm</text><text x="428" y="105" text-anchor="middle" font-size="12" fill="#2457c5">≥10 cm</text>
      <rect x="480" y="20" width="80" height="70" fill="#cde6ff" stroke="#7d8597"/><text x="520" y="52" text-anchor="middle" font-size="13">窗戶</text><text x="520" y="110" text-anchor="middle" font-size="12" fill="#dc2626">避開陽光直射</text>`,
    exhaust: `<rect x="60" y="70" width="200" height="90" rx="8" fill="#dfe3ec" stroke="#7d8597"/><text x="160" y="120" text-anchor="middle" font-size="15">機器背面</text><circle cx="250" cy="100" r="14" fill="#7d8597"/>
      <path d="M264 100 C340 100 340 60 420 60 L500 60" fill="none" stroke="#9aa3b5" stroke-width="22" stroke-linecap="round"/><path d="M264 100 C340 100 340 60 420 60 L500 60" fill="none" stroke="#c8cfdf" stroke-width="14" stroke-dasharray="6 6"/>
      <rect x="500" y="20" width="70" height="90" fill="#cde6ff" stroke="#7d8597"/><text x="535" y="130" text-anchor="middle" font-size="13">窗外／Beam Air</text>`,
    inside: `<rect x="80" y="40" width="440" height="140" fill="#c9ced8"/>${Array.from({ length: 22 }, (_, i) => `<line x1="${90 + i * 20}" y1="40" x2="${90 + i * 20}" y2="180" stroke="#9aa3b5"/>`).join('')}
      <circle cx="200" cy="90" r="5" fill="#7a4a22"/><circle cx="330" cy="130" r="4" fill="#7a4a22"/><rect x="400" y="70" width="12" height="7" fill="#7a4a22"/>
      <text x="300" y="205" text-anchor="middle" font-size="14" fill="#dc2626">碎片要清乾淨（最容易起火）</text>`,
    import: `<rect x="150" y="30" width="300" height="160" rx="10" fill="#fff" stroke="#9aa3b5"/><text x="300" y="60" text-anchor="middle" font-size="15" font-weight="700">匯入 SVG</text>
      <rect x="180" y="75" width="240" height="30" rx="6" fill="#f0f3fa"/><text x="300" y="95" text-anchor="middle" font-size="13">依圖層</text>
      <rect x="180" y="110" width="240" height="30" rx="6" fill="#e5484d"/><text x="300" y="130" text-anchor="middle" font-size="13" fill="#fff" font-weight="700">依顏色分層 ✓</text>
      <rect x="180" y="145" width="240" height="30" rx="6" fill="#f0f3fa"/><text x="300" y="165" text-anchor="middle" font-size="13">單一圖層</text>`,
    layers: `<rect x="170" y="25" width="260" height="170" rx="10" fill="#fff" stroke="#9aa3b5"/><text x="190" y="50" font-size="14" font-weight="700">圖層（由上而下執行）</text>
      ${[['#000', '刻面', 1], ['#0000ff', '雕線', 2], ['#ff0000', '切割（最後）', 3]].map(([c, n, k], i) => `<rect x="190" y="${62 + i * 42}" width="220" height="34" rx="6" fill="${i === 2 ? '#fde8e8' : '#f0f3fa'}"/><rect x="200" y="${71 + i * 42}" width="16" height="16" fill="${c}"/><text x="226" y="${84 + i * 42}" font-size="14">${k}. ${n}</text>`).join('')}
      <path d="M450 70 V180" stroke="#2457c5" stroke-width="3" marker-end="url(#ar)"/>`,
    focus: `<rect x="120" y="150" width="360" height="22" fill="#d9b383"/><rect x="270" y="40" width="60" height="50" rx="8" fill="#e5484d"/><path d="M290 90 H310 L300 110 Z" fill="#c5363b"/>
      <path d="M350 100 V145" stroke="#2457c5" stroke-width="3" marker-end="url(#ar)" marker-start="url(#ar)"/><text x="360" y="118" font-size="14" fill="#2457c5">往下拉對焦拉桿</text><text x="360" y="138" font-size="14" fill="#2457c5">碰到材料彈起＝完成</text>
      <rect x="236" y="55" width="30" height="8" rx="3" fill="#5e6880"/><path d="M240 59 V80" stroke="#5e6880" stroke-width="3"/>`,
    camera: `<rect x="100" y="25" width="400" height="170" fill="#fff" stroke="#9aa3b5"/><rect x="160" y="55" width="250" height="110" fill="#d9b383" opacity=".7"/>
      <rect x="210" y="85" width="110" height="50" rx="8" fill="none" stroke="#ff0000" stroke-width="2"/><text x="265" y="116" text-anchor="middle" font-size="16" font-weight="700">名牌</text>
      <path d="M460 140 L335 115" stroke="#2457c5" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#ar)"/><text x="440" y="165" font-size="13" fill="#2457c5">拖到材料上</text>`,
    go: `<rect x="230" y="60" width="140" height="70" rx="14" fill="#e5484d"/><path d="M280 75 L325 95 L280 115 Z" fill="#fff"/><text x="300" y="165" text-anchor="middle" font-size="15">關蓋 → 右上箭頭送出 → 人在旁邊看</text>`,
    bleed: `<rect x="200" y="30" width="200" height="160" fill="url(#rb)"/><rect x="215" y="45" width="170" height="130" rx="16" fill="none" stroke="#ff0000" stroke-width="2.5"/><circle cx="240" cy="70" r="8" fill="#fff" stroke="#ff0000" stroke-width="2"/>
      <text x="420" y="50" font-size="13" fill="#5e6880">圖片比外框大一圈</text><text x="420" y="70" font-size="13" fill="#5e6880">（出血約 1 mm）</text>`,
    ink: `<rect x="230" y="40" width="90" height="120" rx="10" fill="#5e6880"/><rect x="240" y="160" width="70" height="16" fill="#1f2a44"/>
      <path d="M200 192 H360" stroke="#2457c5" stroke-width="3" marker-end="url(#ar)"/><text x="380" y="196" font-size="14" fill="#2457c5">無塵布＋99% 酒精，同一方向擦</text>`,
    printlayer: `<rect x="150" y="30" width="300" height="160" rx="10" fill="#fff" stroke="#9aa3b5"/>
      <rect x="170" y="50" width="260" height="40" rx="6" fill="#ffe6f3"/><rect x="180" y="62" width="16" height="16" fill="url(#rb)"/><text x="205" y="76" font-size="14">彩色圖片</text><rect x="330" y="58" width="90" height="24" rx="5" fill="#e0218a"/><text x="375" y="75" text-anchor="middle" font-size="13" fill="#fff">模組：列印</text>
      <rect x="170" y="100" width="260" height="40" rx="6" fill="#fde8e8"/><rect x="180" y="112" width="16" height="16" fill="#ff0000"/><text x="205" y="126" font-size="14">切割外框</text><rect x="330" y="108" width="90" height="24" rx="5" fill="#1f2a44"/><text x="375" y="125" text-anchor="middle" font-size="13" fill="#fff">模組：雷射</text>
      <text x="300" y="170" text-anchor="middle" font-size="13" fill="#5e6880">切割放最後</text>`,
    cap: `<rect x="250" y="40" width="90" height="110" rx="10" fill="#5e6880"/><rect x="245" y="150" width="100" height="26" rx="6" fill="#2457c5"/><text x="295" y="168" text-anchor="middle" font-size="13" fill="#fff">保護蓋</text>
      <text x="370" y="90" font-size="14">噴頭朝上保存</text><text x="370" y="112" font-size="14">15–30 °C</text><text x="370" y="134" font-size="14">開封 3 個月內用完</text>`,
  };
  const plateIllu = n => {
    let s = `<rect x="120" y="40" width="360" height="135" rx="18" fill="#f3dfc1" stroke="#ff0000" stroke-width="2.5"/>`;
    if (n >= 2) s += `<circle cx="146" cy="107" r="9" fill="#fff" stroke="#ff0000" stroke-width="2.5"/>`;
    if (n >= 3) s += `<text x="310" y="124" text-anchor="middle" font-size="46" font-weight="800" fill="#111">王小明</text>`;
    if (n >= 4) s += `<rect x="170" y="54" width="296" height="107" rx="12" fill="none" stroke="#0000ff" stroke-width="2"/>`;
    return s;
  };
  const illuSvg = k => {
    const body = /^plate(\d)$/.test(k) ? plateIllu(+k.slice(5)) : illu[k];
    if (!body) return '';
    return `<div class="sop-illu"><svg viewBox="0 0 600 220"><defs><marker id="ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="#2457c5"/></marker>
      <linearGradient id="rb" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#00a3e0"/><stop offset=".5" stop-color="#e0218a"/><stop offset="1" stop-color="#f5c400"/></linearGradient></defs>${body}</svg></div>`;
  };

  T.sop = el => {
    const st = Store.get('sop', {});
    el.innerHTML = `<div class="sop-pick no-print"></div><div class="sop-box"></div>`;
    const pick = $('.sop-pick', el), box = $('.sop-box', el);
    let cur = Store.get('sopCur', 'B');
    const marks = id => { st[id] = st[id] || {}; return st[id]; };
    const stepDone = (sop, i) => { const m = marks(sop.id)[i] || []; return sop.steps[i].c.every((_, j) => m[j]); };
    const pct = sop => Math.round(sop.steps.filter((_, i) => stepDone(sop, i)).length / sop.steps.length * 100);
    const save = () => Store.set('sop', st);
    const drawPick = () => {
      pick.innerHTML = DATA.sops.map(s => `<button data-id="${s.id}" class="${s.id === cur ? 'on' : ''}"><span class="pct">${pct(s) ? pct(s) + '%' : ''}</span><b>${esc(s.name)}</b><span>${esc(s.sub)}・${s.steps.length} 步</span></button>`).join('');
      $$('button', pick).forEach(b => b.addEventListener('click', () => { cur = b.dataset.id; Store.set('sopCur', cur); drawPick(); drawBox(); }));
    };
    const drawBox = () => {
      const sop = DATA.sops.find(s => s.id === cur) || DATA.sops[0];
      const idxKey = 'sopIdx_' + sop.id;
      let i = Math.min(Store.get(idxKey, 0), sop.steps.length - 1);
      const render = () => {
        const s = sop.steps[i], m = marks(sop.id)[i] || [];
        const all = sop.steps.every((_, k) => stepDone(sop, k));
        box.innerHTML = `<div class="sop-head"><b>${esc(sop.name)}</b><div class="sbar"><i style="width:${pct(sop)}%"></i></div>
            <span class="row"><button class="btn alt pr" style="padding:4px 10px">🖨 列印這份 SOP</button><button class="btn alt rs" style="padding:4px 10px">重新開始</button></span></div>
          <div class="sop-body">
            <ol class="sop-steps">${sop.steps.map((x, k) => `<li data-k="${k}" class="${k === i ? 'cur' : ''} ${stepDone(sop, k) ? 'ok' : ''}"><span class="ck"></span><span class="t">${k + 1}. ${esc(x.t)}</span></li>`).join('')}</ol>
            <div class="sop-cur">
              <div class="stepno">步驟 ${i + 1} / ${sop.steps.length}</div>
              <h3>${esc(s.t)}</h3><span class="where">📍 ${esc(s.w)}</span>
              <p>${esc(s.d)}</p>
              ${s.i ? illuSvg(s.i) : ''}
              <ul class="checks">${s.c.map((c, j) => `<li><input type="checkbox" id="ck${sop.id}${i}_${j}" data-j="${j}" ${m[j] ? 'checked' : ''}><label for="ck${sop.id}${i}_${j}">${esc(c)}</label></li>`).join('')}</ul>
              ${s.x ? `<div class="warn"><b>⚠</b>${esc(s.x)}</div>` : ''}
              ${all ? `<div class="tip"><b>🎉</b>這份 SOP 全部完成了！</div>` : ''}
              <div class="sop-nav"><button class="btn alt prev" ${i === 0 ? 'disabled' : ''}>← 上一步</button>
                <button class="btn ${stepDone(sop, i) ? 'green' : ''} next">${i === sop.steps.length - 1 ? '完成' : stepDone(sop, i) ? '下一步 →' : '還有項目沒打勾，先看下一步 →'}</button></div>
            </div></div>`;
        $$('.checks input', box).forEach(c => c.addEventListener('change', () => {
          const mm = marks(sop.id); mm[i] = mm[i] || []; mm[i][+c.dataset.j] = c.checked; save();
          const keep = window.scrollY; render(); window.scrollTo(0, keep); drawPick();
        }));
        $$('.sop-steps li', box).forEach(li => li.addEventListener('click', () => { i = +li.dataset.k; Store.set(idxKey, i); render(); }));
        $('.prev', box).addEventListener('click', () => { if (i > 0) { i--; Store.set(idxKey, i); render(); } });
        $('.next', box).addEventListener('click', () => { if (i < sop.steps.length - 1) { i++; Store.set(idxKey, i); render(); box.scrollIntoView({ block: 'start', behavior: 'smooth' }); } });
        $('.rs', box).addEventListener('click', e => {
          const b = e.currentTarget;
          if (b.dataset.sure) { st[sop.id] = {}; save(); i = 0; Store.set(idxKey, 0); render(); drawPick(); }
          else { b.dataset.sure = 1; b.textContent = '再按一次確認清除'; setTimeout(() => { if (b.isConnected) { delete b.dataset.sure; b.textContent = '重新開始'; } }, 3000); }
        });
        $('.pr', box).addEventListener('click', () => printSop(sop));
      };
      render();
    };
    const printSop = sop => {
      const p = $('#sopPrint');
      p.innerHTML = `<h2>beamo II 操作 SOP：${esc(sop.name)}</h2>` + sop.steps.map((s, k) => `<div style="break-inside:avoid;margin:8px 0;border:1px solid #ccc;border-radius:8px;padding:6px 10px"><b>${k + 1}. ${esc(s.t)}</b>　<span class="small">（${esc(s.w)}）</span><div>${esc(s.d)}</div>${s.c.map(c => `<div>☐ ${esc(c)}</div>`).join('')}${s.x ? `<div><b>⚠ ${esc(s.x)}</b></div>` : ''}</div>`).join('');
      document.body.classList.add('print-sop');
      const off = () => { document.body.classList.remove('print-sop'); window.removeEventListener('afterprint', off); };
      window.addEventListener('afterprint', off);
      window.print();
      setTimeout(off, 1000);
    };
    drawPick(); drawBox();
  };

  /* ---------- 9. 作品產生器 ---------- */
  const TYPES = {
    card: { n: '三模式對照卡', f: { w: 80, h: 50, text: 'beamo II' } },
    plate: { n: '名牌', f: { w: 80, h: 30, text: '王小明', r: 4, hole: 4, frame: 1, tmode: 'fill' } },
    coaster: { n: '杯墊', f: { shape: 'circle', d: 90, text: '研習紀念', rings: 2 } },
    key: { n: '彩印鑰匙圈外框', f: { kshape: 'round', w: 40, h: 50, hole: 4 } },
  };
  const C = { cut: '#ff0000', line: '#0000ff', fill: '#000000' };
  const SW = 0.1;
  const font = `font-family="Microsoft JhengHei, 微軟正黑體, sans-serif" font-weight="700"`;
  const starD = (cx, cy, R, r) => { let d = ''; for (let k = 0; k < 10; k++) { const rr = k % 2 ? r : R, a = -Math.PI / 2 + k * Math.PI / 5; d += (k ? 'L' : 'M') + (cx + rr * Math.cos(a)).toFixed(2) + ' ' + (cy + rr * Math.sin(a)).toFixed(2) + ' '; } return d + 'Z'; };
  const textFit = (s, boxW, boxH) => Math.max(3, Math.min(boxH * 0.62, boxW / Math.max(1, [...s].reduce((a, c) => a + (/[\x00-\x7f]/.test(c) ? .6 : 1), 0))));
  function makeSvg(type, o) {
    let W, H, body = '';
    const cut = (s) => s.replace('/>', ` fill="none" stroke="${C.cut}" stroke-width="${SW}"/>`);
    const line = (s) => s.replace('/>', ` fill="none" stroke="${C.line}" stroke-width="${SW}"/>`);
    if (type === 'card') {
      W = o.w; H = o.h;
      const u = Math.min(W / 80, H / 50);
      body += `<g id="切割">` + cut(`<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="4"/>`) + cut(`<circle cx="6" cy="${H / 2}" r="2"/>`) + cut(`<circle cx="${W * 0.8}" cy="${H * 0.52}" r="${6 * u}"/>`) + `</g>`;
      body += `<g id="雕線">` + line(`<path d="${starD(W * 0.3, H * 0.52, 9 * u, 3.8 * u)}"/>`) + line(`<rect x="3" y="3" width="${W - 6}" height="${H - 6}" rx="2.5"/>`) + `</g>`;
      body += `<g id="刻面" fill="${C.fill}"><rect x="${W * 0.55 - 6 * u}" y="${H * 0.52 - 6 * u}" width="${12 * u}" height="${12 * u}"/>
        <text x="${W / 2}" y="${H * 0.25}" font-size="${6 * u}" text-anchor="middle" ${font}>${esc(o.text)}</text>
        <text x="${W * 0.3}" y="${H * 0.86}" font-size="${3.6 * u}" text-anchor="middle" ${font}>雕線</text>
        <text x="${W * 0.55}" y="${H * 0.86}" font-size="${3.6 * u}" text-anchor="middle" ${font}>刻面</text>
        <text x="${W * 0.8}" y="${H * 0.86}" font-size="${3.6 * u}" text-anchor="middle" ${font}>切割</text></g>`;
    } else if (type === 'plate') {
      W = o.w; H = o.h;
      const hr = o.hole / 2, hx = hr + 3.5;
      body += `<g id="切割">` + cut(`<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="${o.r}"/>`) + (o.hole > 0 ? cut(`<circle cx="${hx}" cy="${H / 2}" r="${hr}"/>`) : '') + `</g>`;
      const fx = o.hole > 0 ? hx + hr + 2.5 : 3, fw = W - 3 - fx;
      if (o.frame) body += `<g id="雕線">` + line(`<rect x="${fx}" y="3" width="${fw}" height="${H - 6}" rx="${Math.max(0, o.r - 1.5)}"/>`) + `</g>`;
      const fs = textFit(o.text, fw - 6, H - 8);
      const tAttr = o.tmode === 'fill' ? `fill="${C.fill}"` : `fill="none" stroke="${C.line}" stroke-width="${SW}"`;
      body += `<g id="${o.tmode === 'fill' ? '刻面' : '雕線文字'}"><text x="${fx + fw / 2}" y="${H / 2 + fs * 0.36}" font-size="${fs.toFixed(2)}" text-anchor="middle" ${font} ${tAttr}>${esc(o.text)}</text></g>`;
    } else if (type === 'coaster') {
      W = H = o.d; const c = o.d / 2;
      const shp = (inset, f) => o.shape === 'circle' ? f(`<circle cx="${c}" cy="${c}" r="${c - inset}"/>`) : f(`<rect x="${inset}" y="${inset}" width="${o.d - 2 * inset}" height="${o.d - 2 * inset}" rx="${Math.max(1, 10 - inset / 2)}"/>`);
      body += `<g id="切割">` + shp(0.5, cut) + `</g><g id="雕線">`;
      for (let k = 0; k < o.rings; k++) body += shp(5 + k * 3, line);
      body += `</g>`;
      const fs = textFit(o.text, o.d * 0.6, o.d * 0.25);
      body += `<g id="刻面" fill="${C.fill}"><text x="${c}" y="${c + fs * 0.36}" font-size="${fs.toFixed(2)}" text-anchor="middle" ${font}>${esc(o.text)}</text></g>`;
    } else {
      W = o.w; H = o.h;
      const hr = o.hole / 2;
      let outline;
      if (o.kshape === 'circle') { const r = Math.min(W, H) / 2 - 0.5; W = H = Math.min(W, H); outline = `<circle cx="${W / 2}" cy="${H / 2}" r="${r}"/>`; }
      else if (o.kshape === 'pill') outline = `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="${Math.min(W, H) / 2 - 0.5}"/>`;
      else outline = `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="6"/>`;
      body += `<g id="切割">` + cut(outline) + cut(`<circle cx="${W / 2}" cy="${hr + 4}" r="${hr}"/>`) + `</g>`;
    }
    W = +(+W).toFixed(2); H = +(+H).toFixed(2);
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">\n<!-- 光雕彩印實驗室 作品產生器：紅 #FF0000 切割、藍 #0000FF 雕線、黑色填色 刻面。文字請在 Inkscape 轉成路徑 -->\n${body}\n</svg>\n`;
  }
  T._makeSvg = makeSvg;

  T.gen = el => {
    el.innerHTML = `<div class="gen-grid"><div>
      <label class="field">作品類型<select class="inp ty">${Object.entries(TYPES).map(([k, t]) => `<option value="${k}">${t.n}</option>`).join('')}</select></label>
      <div class="opts" style="display:grid;gap:8px;margin-top:8px"></div>
      <div class="row" style="margin-top:12px"><button class="btn red dl">⬇ 下載 SVG</button></div>
      <div class="hint small" style="margin-top:8px"></div></div>
      <div><div class="preview-box"></div><div class="small sz" style="margin-top:6px"></div>
      <div class="legend"><span><span class="color-sw" style="background:#f00"></span>切割</span><span><span class="color-sw" style="background:#00f"></span>雕線</span><span><span class="color-sw" style="background:#000"></span>刻面</span></div></div></div>`;
    const ty = $('.ty', el), opts = $('.opts', el), pv = $('.preview-box', el);
    const FIELDS = {
      w: ['寬 (mm)', 'number'], h: ['高 (mm)', 'number'], text: ['文字', 'text'], r: ['圓角 (mm)', 'number'], hole: ['吊孔直徑 (mm，0＝不要)', 'number'],
      frame: ['雕線裝飾框', 'check'], tmode: ['文字加工', ['fill:刻面（實心）', 'line:雕線（空心描邊）']], shape: ['形狀', ['circle:圓形', 'square:圓角方形']],
      d: ['直徑／邊長 (mm)', 'number'], rings: ['雕線圈數', 'number'], kshape: ['外形', ['round:圓角方形', 'circle:圓形', 'pill:膠囊']],
    };
    const HINT = {
      card: '切完後比較：紅色圓孔掉下來（切割）、星星是細線（雕線）、方塊與文字是深色的面（刻面）。可以把切割、雕線、刻面三個圖層各試一組參數，當作材料測試卡。',
      plate: '文字請在 Inkscape 轉成路徑。吊孔離邊緣 3.5 mm；字太長會自動縮小。',
      coaster: '軟木只能雕刻不要切；木頭杯墊建議 3 mm 以上。',
      key: '在 Inkscape 匯入彩色圖片放在紅框「下面」、每邊大 1 mm（出血），吊孔附近不要放重要圖案。Beam Studio 把圖片圖層設為「列印」，紅框圖層切割放最後。',
    };
    const state = Store.get('gen', {});
    const vals = () => { const t = ty.value; const o = Object.assign({}, TYPES[t].f, state[t] || {}); return o; };
    const build = () => {
      const t = ty.value, o = vals();
      opts.innerHTML = Object.keys(TYPES[t].f).map(k => {
        const [lab, kind] = FIELDS[k];
        if (kind === 'check') return `<label><input type="checkbox" data-k="${k}" ${o[k] ? 'checked' : ''}> ${lab}</label>`;
        if (Array.isArray(kind)) return `<label class="field">${lab}<select class="inp" data-k="${k}">${kind.map(x => { const [v, n] = x.split(':'); return `<option value="${v}" ${o[k] === v ? 'selected' : ''}>${n}</option>`; }).join('')}</select></label>`;
        return `<label class="field">${lab}<input class="inp" type="${kind}" data-k="${k}" value="${esc(o[k])}" ${kind === 'number' ? 'min="0" step="0.5"' : 'maxlength="20"'}></label>`;
      }).join('');
      $$('[data-k]', opts).forEach(i => i.addEventListener('input', () => {
        const k = i.dataset.k; state[t] = state[t] || {};
        state[t][k] = i.type === 'checkbox' ? (i.checked ? 1 : 0) : i.type === 'number' ? Math.max(0, +i.value || 0) : i.value;
        Store.set('gen', state); preview();
      }));
      $('.hint', el).textContent = HINT[t];
      preview();
    };
    const clamp = (t, o) => {
      const max = (k, lo, hi) => { if (k in o) o[k] = Math.min(hi, Math.max(lo, +o[k] || lo)); };
      max('w', 10, 360); max('h', 10, 240); max('d', 20, 240); max('r', 0, 20); max('hole', 0, 10); max('rings', 0, 6);
      return o;
    };
    const preview = () => {
      const t = ty.value, o = clamp(t, vals());
      const svg = makeSvg(t, o);
      pv.innerHTML = svg.replace(/<\?xml[^>]*>/, '');
      const s = $('svg', pv); s.removeAttribute('width'); s.removeAttribute('height'); s.style.width = '100%'; s.style.maxHeight = '340px';
      $$('[stroke-width]', s).forEach(e => e.setAttribute('stroke-width', '0.35'));
      const m = /width="([\d.]+)mm" height="([\d.]+)mm"/.exec(svg);
      $('.sz', el).textContent = `實際尺寸 ${m[1]} × ${m[2]} mm（預覽中線條加粗方便看，下載檔為 0.1 mm）`;
      el._svg = svg; el._name = `${TYPES[t].n}_${m[1]}x${m[2]}mm.svg`;
    };
    ty.value = Store.get('genType', 'card');
    ty.addEventListener('change', () => { Store.set('genType', ty.value); build(); });
    $('.dl', el).addEventListener('click', () => download(el._name, el._svg, 'image/svg+xml'));
    build();
  };

  /* ---------- 10. SVG 檢查器 ---------- */
  const SAMPLE = `<svg xmlns="http://www.w3.org/2000/svg" width="100mm" height="60mm" viewBox="0 0 100 60">
  <rect x="1" y="1" width="98" height="58" rx="5" fill="none" stroke="#ff0000" stroke-width="0.1"/>
  <circle cx="8" cy="30" r="2" fill="none" stroke="#FE0000" stroke-width="0.1"/>
  <text x="55" y="28" font-size="12" text-anchor="middle" fill="#000">範例文字</text>
  <rect x="20" y="38" width="30" height="12" fill="#000" stroke="#ff0000" stroke-width="0.1"/>
  <polyline points="60,40 75,50 90,40" fill="none" stroke="#ff0000" stroke-width="0.1"/>
  <path d="M60 10 L90 10" fill="none" stroke="#0000ff" stroke-width="0.1"/>
</svg>`;
  const UNIT = { mm: 1, cm: 10, in: 25.4, px: 25.4 / 96, pt: 25.4 / 72, pc: 25.4 / 6, '': 25.4 / 96 };
  const lenMM = v => { const m = /^\s*([\d.]+)\s*(mm|cm|in|px|pt|pc)?\s*$/.exec(v || ''); return m ? +m[1] * UNIT[m[2] || ''] : null; };
  const rgb = s => { const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/.exec(s || ''); return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null; };
  const hex = c => '#' + [c.r, c.g, c.b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('').toUpperCase();

  function analyzeSvg(text, holder) {
    const res = { ok: false, issues: [], cats: { cut: [], line: [], fill: [], color: [], bitmap: [], other: [] }, len: { cut: 0, line: 0 } };
    const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
    const root = doc.documentElement;
    if (doc.querySelector('parsererror') || !root || root.nodeName.toLowerCase() !== 'svg') { res.issues.push(['e', '這不是有效的 SVG 檔，無法讀取。']); return res; }
    $$('script', root).forEach(s => s.remove());
    root.querySelectorAll('*').forEach(n => { [...n.attributes].forEach(a => { if (/^on/i.test(a.name)) n.removeAttribute(a.name); }); });
    const vb = (root.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
    let wmm = lenMM(root.getAttribute('width')), hmm = lenMM(root.getAttribute('height'));
    const wu = root.getAttribute('width') || '', hasVB = vb.length === 4 && vb[2] > 0 && vb[3] > 0;
    if (wmm == null && hasVB) { wmm = vb[2] * UNIT.px; hmm = vb[3] * UNIT.px; res.issues.push(['w', '檔案沒有標示寬高單位，以 px（96 DPI）計算。建議在 Inkscape 文件屬性把單位改成 mm。']); }
    if (wmm == null) { res.issues.push(['e', '讀不到檔案的寬高。']); return res; }
    if (!/mm\s*$/.test(wu)) res.issues.push(['w', `文件寬度單位是「${wu.replace(/[\d.\s]/g, '') || 'px'}」，不是 mm。尺寸已換算，但建議改成 mm 避免匯入時大小跑掉。`]);
    const mmPerU = hasVB ? wmm / vb[2] : UNIT.px;
    if (!hasVB) root.setAttribute('viewBox', `0 0 ${wmm / UNIT.px} ${hmm / UNIT.px}`);
    root.setAttribute('width', '100%'); root.removeAttribute('height');
    root.style.maxHeight = '360px';
    holder.innerHTML = '';
    const svg = document.importNode(root, true);
    holder.appendChild(svg);
    res.w = wmm; res.h = hmm;
    const skip = el => el.closest('defs,clipPath,mask,symbol,marker,pattern,metadata');
    const scaleOf = el => { try { const m = svg.getScreenCTM().inverse().multiply(el.getScreenCTM()); return Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)); } catch (e) { return 1; } };
    const isRed = c => c && c.r === 255 && c.g === 0 && c.b === 0, isBlue = c => c && c.r === 0 && c.g === 0 && c.b === 255, isBlack = c => c && c.r === 0 && c.g === 0 && c.b === 0;
    const near = (c, t) => c && Math.abs(c.r - t[0]) + Math.abs(c.g - t[1]) + Math.abs(c.b - t[2]) < 60;
    let textN = 0, both = 0, open = 0, oddColors = new Set();
    const fonts = new Set();
    $$('path,rect,circle,ellipse,line,polyline,polygon,text,image', svg).forEach(el => {
      if (skip(el)) return;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      const tag = el.tagName.toLowerCase();
      if (tag === 'image') { res.cats.bitmap.push(el); return; }
      if (tag === 'text') { textN++; fonts.add(cs.fontFamily.split(',')[0].replace(/["']/g, '')); }
      const fill = cs.fill === 'none' || +cs.fillOpacity === 0 ? null : (rgb(cs.fill) || { r: -1, g: -1, b: -1, url: true });
      const sw = parseFloat(cs.strokeWidth) || 0;
      const stroke = cs.stroke === 'none' || sw === 0 || +cs.strokeOpacity === 0 ? null : (rgb(cs.stroke) || { r: -1, g: -1, b: -1, url: true });
      const geomFill = fill && !['line', 'polyline'].includes(tag) ? fill : (fill && tag === 'polyline' ? fill : null);
      if (geomFill && stroke) both++;
      const lenOf = () => { try { return el.getTotalLength() * scaleOf(el) * mmPerU; } catch (e) { return 0; } };
      if (stroke && !geomFill) {
        if (isRed(stroke)) {
          res.cats.cut.push(el); res.len.cut += lenOf();
          let closed = ['rect', 'circle', 'ellipse', 'polygon'].includes(tag);
          if (tag === 'path') {
            const d = el.getAttribute('d') || '', nM = (d.match(/[Mm]/g) || []).length, nZ = (d.match(/[Zz]/g) || []).length;
            if (nZ >= nM) closed = true;
            else if (nM === 1) { try { const L = el.getTotalLength(), a = el.getPointAtLength(0), b = el.getPointAtLength(L); closed = Math.hypot(a.x - b.x, a.y - b.y) * mmPerU < 0.05; } catch (e) { } }
          }
          if (!closed) { open++; el.setAttribute('data-open', '1'); }
        } else if (isBlue(stroke)) { res.cats.line.push(el); res.len.line += lenOf(); }
        else { res.cats.other.push(el); if (stroke.url || !(near(stroke, [255, 0, 0]) || near(stroke, [0, 0, 255]) || near(stroke, [0, 0, 0]))) oddColors.add(stroke.url ? '漸層' : hex(stroke)); }
      } else if (geomFill) {
        if (isBlack(geomFill)) res.cats.fill.push(el);
        else { res.cats.color.push(el); }
        if (stroke && !isRed(stroke) && !isBlue(stroke) && (stroke.url || !(near(stroke, [255, 0, 0]) || near(stroke, [0, 0, 255]) || near(stroke, [0, 0, 0])))) oddColors.add(stroke.url ? '漸層' : hex(stroke));
      }
      [fill, stroke].forEach(c => { if (c && !c.url && !isRed(c) && !isBlue(c) && !isBlack(c) && (near(c, [255, 0, 0]) || near(c, [0, 0, 255]) || near(c, [0, 0, 0]))) oddColors.add(hex(c) + '（接近規範色但不完全相同）'); });
    });
    let bb = null;
    try { const b = svg.getBBox(); if (b.width || b.height) bb = { x: b.x * mmPerU, y: b.y * mmPerU, w: b.width * mmPerU, h: b.height * mmPerU }; } catch (e) { }
    res.bb = bb;
    if (bb && (bb.w > 360.5 || bb.h > 240.5)) res.issues.push(['e', `圖案範圍 ${bb.w.toFixed(1)} × ${bb.h.toFixed(1)} mm，超過 beamo II 工作範圍 360 × 240 mm。`]);
    else if (bb) res.issues.push(['ok', `圖案範圍 ${bb.w.toFixed(1)} × ${bb.h.toFixed(1)} mm，在工作範圍內。`]);
    if (textN) res.issues.push(['e', `有 ${textN} 個文字物件還沒轉成路徑（字型：${[...fonts].join('、')}）。請在 Inkscape 選取後按 Shift+Ctrl+C。`]);
    if (open) res.issues.push(['w', `有 ${open} 條紅色切割線沒有封閉，零件可能不會掉下來（預覽中以橘色虛線標出）。`]);
    if (both) res.issues.push(['w', `有 ${both} 個物件同時有填色與邊框，Beam Studio 可能同時刻面又切割。建議分開成兩個物件。`]);
    if (oddColors.size) res.issues.push(['w', `有不在規範內的顏色：${[...oddColors].join('、')}。匯入時會多出圖層，請改成 #FF0000／#0000FF／#000000。`]);
    if (res.cats.bitmap.length) res.issues.push(['w', `有 ${res.cats.bitmap.length} 張點陣圖片：會變成刻面（灰階）或彩色列印圖層，確認這是你要的。`]);
    if (res.cats.color.length) res.issues.push(['w', `有 ${res.cats.color.length} 個彩色填色物件：用雷射會變成灰階刻面；要彩印請在 Beam Studio 把該圖層設為「列印」。`]);
    if (!res.cats.cut.length) res.issues.push(['w', '沒有紅色切割線，作品不會被切下來（只雕刻就沒關係）。']);
    if (!res.issues.some(x => x[0] !== 'ok')) res.issues.push(['ok', '沒有發現問題，可以匯入 Beam Studio！']);
    $$('[data-open]', svg).forEach(e => { e.style.stroke = '#f59e0b'; e.style.strokeDasharray = '2 1'; });
    $$('*', svg).forEach(e => { const w = parseFloat(getComputedStyle(e).strokeWidth); if (w && w * mmPerU < 0.4) e.style.strokeWidth = (0.4 / mmPerU) + 'px'; });
    res.ok = true;
    return res;
  }
  T._analyzeSvg = analyzeSvg;

  T.checker = el => {
    el.innerHTML = `<div class="drop no-print" tabindex="0"><b>把 SVG 檔拖到這裡</b>，或<label style="color:#2457c5;cursor:pointer;text-decoration:underline">點這裡選檔案<input type="file" accept=".svg,image/svg+xml" hidden></label>
      <div class="small" style="margin-top:6px">也可以 <button class="btn alt demo" style="padding:2px 10px">載入有錯誤的範例</button></div></div>
      <div class="result" style="display:none;margin-top:14px"><div class="gen-grid"><div class="preview-box"></div><div>
        <h4 class="fname" style="margin-top:0"></h4><div class="summary"></div><ul class="issues"></ul></div></div></div>`;
    const drop = $('.drop', el), file = $('input[type=file]', el);
    const run = (text, name) => {
      $('.result', el).style.display = '';
      const pv = $('.preview-box', el);
      const r = analyzeSvg(text, pv);
      $('.fname', el).textContent = name;
      const n = r.cats;
      const t = r.len.cut / 8 + r.len.line / 60;
      $('.summary', el).innerHTML = r.ok ? `<div class="tbl-wrap"><table>
        <tr><th>檔案尺寸</th><td>${r.w.toFixed(1)} × ${r.h.toFixed(1)} mm</td></tr>
        <tr><th><span class="pill cut">切割</span></th><td>${n.cut.length} 個，線長約 ${r.len.cut.toFixed(0)} mm</td></tr>
        <tr><th><span class="pill line">雕線</span></th><td>${n.line.length} 個，線長約 ${r.len.line.toFixed(0)} mm</td></tr>
        <tr><th><span class="pill fill">刻面</span></th><td>${n.fill.length} 個黑色填色</td></tr>
        <tr><th><span class="pill print">彩色／圖片</span></th><td>${n.color.length} 個彩色填色、${n.bitmap.length} 張圖片</td></tr>
        <tr><th>向量加工時間</th><td>約 ${fmtTime(t)}（切割 8 mm/s、雕線 60 mm/s 估算，不含刻面）</td></tr></table></div>` : '';
      $('.issues', el).innerHTML = r.issues.map(([k, m]) => `<li class="${k === 'ok' ? 'ok' : k}">${k === 'e' ? '✗' : k === 'w' ? '⚠' : '✓'} ${esc(m)}</li>`).join('');
      el._result = r;
    };
    const readFile = f => { if (!f) return; const rd = new FileReader(); rd.onload = () => run(rd.result, f.name); rd.readAsText(f); };
    file.addEventListener('change', () => readFile(file.files[0]));
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); readFile(e.dataTransfer.files[0]); });
    $('.demo', el).addEventListener('click', e => { e.preventDefault(); run(SAMPLE, '範例（含錯誤）.svg'); });
    T.checker._run = run;
  };

  /* ---------- 11. 保養打勾表 ---------- */
  T.maintlog = el => {
    const data = Store.get('maint', { last: {}, hist: [] });
    const draw = () => {
      const now = new Date(today());
      el.innerHTML = `<div class="row no-print" style="margin-bottom:8px"><label class="field">執行人<input class="inp who" value="${esc(Store.get('maintWho', ''))}" placeholder="姓名"></label>
        <button class="btn alt pr">🖨 列印保養表</button></div>
        <div class="tbl-wrap"><table class="maint-table"><tr><th>項目</th><th>頻率</th><th>上次完成</th><th>狀態</th><th class="no-print"></th></tr>
        ${DATA.maint.map(m => {
          const last = data.last[m.id];
          let stt = '<span class="pill mid">尚未記錄</span>';
          if (last) {
            if (!m.day) stt = '<span class="pill ok">每次使用後都要做</span>';
            else {
              const due = new Date(last); due.setDate(due.getDate() + m.day);
              const left = Math.round((due - now) / 864e5);
              stt = left < 0 ? `<span class="pill no">已到期 ${-left} 天</span>` : left <= 3 ? `<span class="pill mid">${left} 天內到期</span>` : `<span class="pill ok">${left} 天後</span>`;
            }
          }
          return `<tr><td>${m.must ? '★ ' : ''}${esc(m.t)}</td><td>${esc(m.f)}</td><td>${last || '—'}</td><td>${stt}</td><td class="no-print"><button class="btn green" data-id="${m.id}" style="padding:3px 10px">✓ 今天完成</button></td></tr>`;
        }).join('')}</table></div>
        <h4>最近紀錄</h4>${data.hist.length ? `<ul class="clean small">${data.hist.slice(-12).reverse().map(x => `<li>${x.d}　${esc(x.t)}　${esc(x.w || '')}</li>`).join('')}</ul>` : '<p class="small">還沒有紀錄。</p>'}`;
      $('.who', el).addEventListener('input', e => Store.set('maintWho', e.target.value));
      $$('button[data-id]', el).forEach(b => b.addEventListener('click', () => {
        const m = DATA.maint.find(x => x.id === b.dataset.id);
        data.last[m.id] = today(); data.hist.push({ d: today(), t: m.t, w: $('.who', el).value });
        if (data.hist.length > 200) data.hist = data.hist.slice(-200);
        Store.set('maint', data); draw();
      }));
      $('.pr', el).addEventListener('click', () => window.print());
    };
    draw();
  };

  /* ---------- 13. 參數紀錄本 ---------- */
  T.paramlog = el => {
    const COLS = [['date', '日期'], ['mat', '材料'], ['thick', '厚度 mm'], ['mode', '加工'], ['power', '功率 %'], ['speed', '速度 mm/s'], ['passes', '次數'], ['note', 'DPI／備註'], ['result', '效果'], ['who', '記錄者']];
    let rows = Store.get('params', []);
    el.innerHTML = `<div class="grid g4 no-print form">
        <label class="field">材料<input data-k="mat" placeholder="例：椴木合板"></label>
        <label class="field">厚度 mm<input data-k="thick" type="number" step="0.1" value="3"></label>
        <label class="field">加工<select data-k="mode"><option>切割</option><option>雕線</option><option>刻面</option><option>彩色列印</option></select></label>
        <label class="field">功率 %<input data-k="power" type="number" min="0" max="100"></label>
        <label class="field">速度 mm/s<input data-k="speed" type="number" min="0"></label>
        <label class="field">次數<input data-k="passes" type="number" min="1" value="1"></label>
        <label class="field">DPI／備註<input data-k="note" placeholder="例：250 DPI、貼紙膠帶"></label>
        <label class="field">效果<select data-k="result"><option>👍 剛好</option><option>😐 普通</option><option>👎 不好</option></select></label>
        <label class="field">記錄者<input data-k="who"></label>
      </div>
      <div class="row no-print" style="margin:10px 0"><button class="btn add">＋ 加入紀錄</button><button class="btn alt exp">⬇ 匯出 CSV（Excel 可開）</button>
        <label class="btn alt" style="cursor:pointer">⬆ 匯入 CSV<input type="file" accept=".csv,text/csv" hidden class="imp"></label><span class="small msg"></span></div>
      <div class="tbl-wrap"><table class="log-table"><thead><tr>${COLS.map(c => `<th>${c[1]}</th>`).join('')}<th class="no-print"></th></tr></thead><tbody></tbody></table></div>`;
    const tb = $('tbody', el), msg = $('.msg', el);
    $('[data-k=who]', el).value = Store.get('maintWho', '');
    const draw = () => {
      tb.innerHTML = rows.length ? rows.map((r, i) => `<tr>${COLS.map(c => `<td>${esc(r[c[0]] || '')}</td>`).join('')}<td class="no-print"><button class="btn alt del" data-i="${i}" style="padding:2px 8px">刪除</button></td></tr>`).join('')
        : `<tr><td colspan="${COLS.length + 1}" class="small">還沒有紀錄。試切成功後把參數記下來吧！</td></tr>`;
      $$('.del', tb).forEach(b => b.addEventListener('click', () => {
        if (b.dataset.sure) { rows.splice(+b.dataset.i, 1); Store.set('params', rows); draw(); }
        else { b.dataset.sure = 1; b.textContent = '確定？'; }
      }));
    };
    $('.add', el).addEventListener('click', () => {
      const r = { date: today() };
      $$('[data-k]', el).forEach(i => { r[i.dataset.k] = i.value.trim(); });
      if (!r.mat) { msg.textContent = '請至少填寫材料。'; return; }
      rows.push(r); Store.set('params', rows); draw(); msg.textContent = '已加入。';
    });
    const csvCell = v => /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    $('.exp', el).addEventListener('click', () => {
      const txt = '﻿' + [COLS.map(c => c[1]).join(',')].concat(rows.map(r => COLS.map(c => csvCell(String(r[c[0]] || ''))).join(','))).join('\r\n');
      download(`beamoII參數紀錄_${today()}.csv`, txt, 'text/csv');
    });
    const parseCsv = t => {
      const out = []; let row = [], cell = '', q = false;
      t = t.replace(/^﻿/, '');
      for (let i = 0; i < t.length; i++) {
        const ch = t[i];
        if (q) { if (ch === '"' && t[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
        else if (ch === '"') q = true;
        else if (ch === ',') { row.push(cell); cell = ''; }
        else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; row.push(cell); out.push(row); row = []; cell = ''; }
        else cell += ch;
      }
      if (cell || row.length) { row.push(cell); out.push(row); }
      return out.filter(r => r.some(x => x.trim()));
    };
    $('.imp', el).addEventListener('change', e => {
      const f = e.target.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        const all = parseCsv(rd.result); const head = all.shift() || [];
        const idx = COLS.map(c => head.indexOf(c[1]));
        if (idx.every(i => i < 0)) { msg.textContent = '看不懂這個 CSV（第一列要是欄位名稱）。'; return; }
        const add = all.map(r => { const o = {}; COLS.forEach((c, k) => { o[c[0]] = idx[k] >= 0 ? (r[idx[k]] || '') : ''; }); return o; });
        const sig = r => COLS.map(c => r[c[0]]).join('|');
        const have = new Set(rows.map(sig));
        const fresh = add.filter(r => !have.has(sig(r)));
        rows = rows.concat(fresh); Store.set('params', rows); draw();
        msg.textContent = `匯入 ${fresh.length} 筆（略過重複 ${add.length - fresh.length} 筆）。`;
        e.target.value = '';
      };
      rd.readAsText(f);
    });
    draw();
  };

  /* ---------- 14. 測驗與認證 ---------- */
  T.quiz = el => {
    el.innerHTML = `<div class="quiz">${DATA.quiz.map((q, i) => `<div class="q" data-i="${i}"><b>${i + 1}. ${esc(q.q)}</b><div class="opts">${q.o.map((o, j) => `<label><input type="radio" name="q${i}" value="${j}"> ${esc(o)}</label>`).join('')}</div><div class="why">💡 ${esc(q.why)}</div></div>`).join('')}</div>
      <div class="row no-print" style="margin-top:12px"><button class="btn red submit">交卷</button><button class="btn alt redo">重新作答</button><b class="score"></b></div>
      <div class="cert"><div style="font-size:.95em;color:#7a5a1c">— 校內設備使用認證 —</div><h2>結 業 證 明</h2>
        <div class="who"></div>
        <p>已完成「<span class="ctitle"></span>」<br>內容包含雷射安全、切割與雕線刻面、Inkscape 向量繪圖、Beam Studio 操作、彩色列印與保養維護，<br>並通過測驗（<b class="cscore"></b> 分），可依校內規範自主使用 FLUX beamo II。</p>
        <p class="cdate" style="margin-top:20px"></p>
        <div class="no-print" style="margin-top:12px"><button class="btn pc">🖨 列印認證</button></div></div>`;
    const box = $('.quiz', el), cert = $('.cert', el);
    const submit = () => {
      let right = 0;
      DATA.quiz.forEach((q, i) => {
        const c = $(`input[name=q${i}]:checked`, box), qd = $(`.q[data-i="${i}"]`, box);
        const ok = c && +c.value === q.a; if (ok) right++;
        qd.classList.toggle('right', !!ok); qd.classList.toggle('wrong', !ok);
      });
      box.classList.add('checked');
      const sc = Math.round(right / DATA.quiz.length * 100);
      $('.score', el).textContent = `${right} / ${DATA.quiz.length} 題，${sc} 分 ${sc >= 80 ? '🎉 通過！' : '（80 分通過，看看說明再試一次）'}`;
      if (sc >= 80) {
        const d = new Date();
        $('.who', cert).textContent = ($('#certName') && $('#certName').value.trim()) || '＿＿＿＿＿＿';
        $('.ctitle', cert).textContent = ($('#certTitle') && $('#certTitle').value.trim()) || '光雕彩印實驗室：beamo II 從設計到成品一次上手';
        $('.cscore', cert).textContent = sc;
        $('.cdate', cert).textContent = `中華民國 ${d.getFullYear() - 1911} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
        cert.classList.add('show');
        Store.set('quizBest', Math.max(sc, Store.get('quizBest', 0)));
        if (window.App) window.App.markDone('quiz');
      } else cert.classList.remove('show');
      el.dataset.score = sc;
    };
    $('.submit', el).addEventListener('click', submit);
    $('.redo', el).addEventListener('click', () => { $$('input', box).forEach(i => { i.checked = false; }); box.classList.remove('checked'); $$('.q', box).forEach(q => q.classList.remove('right', 'wrong')); $('.score', el).textContent = ''; cert.classList.remove('show'); });
    $('.pc', el).addEventListener('click', () => {
      document.body.classList.add('print-cert');
      const off = () => { document.body.classList.remove('print-cert'); window.removeEventListener('afterprint', off); };
      window.addEventListener('afterprint', off); window.print(); setTimeout(off, 1000);
    });
    ['#certName', '#certTitle'].forEach(s => { const i = $(s); if (i) { const k = s === '#certTitle' ? 'certTitle2' : s; i.value = Store.get(k, i.value); i.addEventListener('input', () => { Store.set(k, i.value); if (cert.classList.contains('show')) { $('.who', cert).textContent = $('#certName').value.trim() || '＿＿＿＿＿＿'; $('.ctitle', cert).textContent = $('#certTitle').value.trim(); } }); } });
  };
})();
