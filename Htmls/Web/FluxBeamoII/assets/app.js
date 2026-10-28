/* 光雕彩印實驗室（beamo II 教師研習）— 導覽、單元切換、進度、FAQ 搜尋、初始化互動工具 */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const pages = $$('.page');
  // 計入進度的單元：沒有 data-nodone 的（data-auto 由程式自動完成，例如測驗通過）
  const counted = pages.filter(p => !p.dataset.nodone);
  const done = () => Store.get('done', {});

  const App = window.App = {
    markDone(id, v) { const d = done(); if (v === false) delete d[id]; else d[id] = 1; Store.set('done', d); refresh(); },
  };

  /* 側欄 */
  const side = $('#side');
  let grp = '', n = 0, html = '';
  pages.forEach(p => {
    if (p.dataset.grp !== grp) { grp = p.dataset.grp; html += `<div class="grp">${grp}</div>`; }
    const num = p.dataset.nodone && !p.dataset.auto ? (p.id === 'home' ? '⌂' : '＋') : ++n;
    p.dataset.num = num;
    html += `<a href="#${p.id}" data-id="${p.id}"><span class="n"><span>${num}</span></span>${p.dataset.title}</a>`;
  });
  side.innerHTML = html;

  /* 首頁單元卡 */
  $('#modCards').innerHTML = pages.filter(p => p.id !== 'home').map(p => {
    const sub = ($('.hero p', p) || {}).textContent || '';
    return `<a href="#${p.id}" data-id="${p.id}" style="--u:${p.dataset.u || '#1f2a44'}"><b>${p.dataset.num}. ${p.dataset.title}</b><span>${sub.slice(0, 46)}${sub.length > 46 ? '…' : ''}</span></a>`;
  }).join('');

  /* 每個單元底部的完成按鈕與上下頁 */
  pages.forEach((p, i) => {
    const prev = pages[i - 1], next = pages[i + 1];
    const bar = document.createElement('div');
    bar.className = 'done-bar';
    bar.innerHTML = `${prev ? `<a class="btn alt" href="#${prev.id}">← ${prev.dataset.title}</a>` : '<span></span>'}
      ${!p.dataset.nodone && !p.dataset.auto ? `<button class="btn green mark" data-id="${p.id}">✓ 我完成這個單元</button>` : p.dataset.auto ? '<span class="small">測驗 80 分以上自動完成</span>' : '<span></span>'}
      ${next ? `<a class="btn" href="#${next.id}">${next.dataset.title} →</a>` : '<span></span>'}`;
    p.appendChild(bar);
  });
  $$('.mark').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.id, on = !done()[id];
    App.markDone(id, on);
  }));

  function refresh() {
    const d = done();
    $$('[data-id]', side).forEach(a => a.classList.toggle('done', !!d[a.dataset.id]));
    $$('#modCards a').forEach(a => a.classList.toggle('done', !!d[a.dataset.id]));
    $$('.mark').forEach(b => { const on = !!d[b.dataset.id]; b.textContent = on ? '✓ 已完成（再按取消）' : '✓ 我完成這個單元'; b.classList.toggle('alt', on); b.classList.toggle('green', !on); });
    const k = counted.filter(p => d[p.id]).length;
    $('#progBar').style.width = (k / counted.length * 100) + '%';
    $('#progTxt').textContent = `${k}/${counted.length}`;
  }

  /* 互動工具：第一次進入該單元時才建立（canvas 在隱藏狀態下量不到尺寸） */
  const inited = new Set();
  function initTools(p) {
    $$('[data-tool]', p).forEach(el => {
      if (inited.has(el)) return;
      inited.add(el);
      const fn = window.TOOLS[el.dataset.tool];
      try { if (fn) fn(el); else el.textContent = '（找不到工具：' + el.dataset.tool + '）'; }
      catch (e) { console.error(e); el.innerHTML = '<div class="danger">這個互動工具載入失敗，請重新整理頁面。</div>'; }
    });
  }

  function go() {
    const id = (location.hash || '#home').slice(1);
    const p = pages.find(x => x.id === id) || pages[0];
    pages.forEach(x => x.classList.toggle('on', x === p));
    $$('a', side).forEach(a => a.classList.toggle('on', a.dataset.id === p.id));
    document.title = (p.id === 'home' ? '' : p.dataset.title + '｜') + '光雕彩印實驗室';
    initTools(p);
    document.body.classList.remove('menu-open');
    window.scrollTo(0, 0);
    Store.set('last', p.id);
  }
  window.addEventListener('hashchange', go);
  if (!location.hash && Store.get('last', '') && Store.get('last', '') !== 'home') {
    // 回到上次看的單元，但首頁仍可從左上角回去
    location.hash = '#' + Store.get('last', 'home');
  }
  go();
  refresh();

  $('#menuBtn').addEventListener('click', () => document.body.classList.toggle('menu-open'));
  $('#main').addEventListener('click', () => document.body.classList.remove('menu-open'));

  /* FAQ 搜尋 */
  const fs = $('#faqSearch');
  if (fs) fs.addEventListener('input', () => {
    const q = fs.value.trim().toLowerCase();
    $$('#faqList details').forEach(d => {
      const hit = !q || d.textContent.toLowerCase().includes(q);
      d.style.display = hit ? '' : 'none';
      if (q && hit) d.open = true;
    });
  });

  /* 清除紀錄（按兩次確認，不用跳出視窗） */
  const rs = $('#resetAll');
  if (rs) rs.addEventListener('click', () => {
    if (rs.dataset.sure) { Store.clear(); location.hash = '#home'; location.reload(); return; }
    rs.dataset.sure = 1; rs.textContent = '確定要清除嗎？再按一次';
    setTimeout(() => { delete rs.dataset.sure; rs.textContent = '清除本網站在這台電腦的所有紀錄'; }, 4000);
  });
})();
