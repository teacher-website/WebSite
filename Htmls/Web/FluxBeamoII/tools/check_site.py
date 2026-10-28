# -*- coding: utf-8 -*-
"""Playwright 檢查 beamo II 教師研習網站：
每個單元 × 1280／390 寬的 console 錯誤、水平捲動、互動工具是否載入；
再實際操作：加工模擬、作品產生器（下載 SVG 並解析）、SVG 檢查器、測驗與認證、SOP、
材料遊戲、保養表、參數紀錄本（匯出 → 匯入去重）、時間估算。
用法：python tools/check_site.py [截圖資料夾]
"""
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
ROOT = Path(__file__).resolve().parent.parent
URL = (ROOT / 'index.html').as_uri()
SHOT = Path(sys.argv[1]) if len(sys.argv) > 1 else None
bad = 0


def report(ok, msg):
    global bad
    bad += not ok
    print(('OK ' if ok else 'XX ') + msg)


with sync_playwright() as pw:
    br = pw.chromium.launch()
    for width in (1280, 390):
        ctx = br.new_context(viewport={'width': width, 'height': 900}, accept_downloads=True)
        page = ctx.new_page()
        errs = []
        page.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        page.on('pageerror', lambda e: errs.append(str(e)))
        page.goto(URL + '#home')
        page.evaluate('localStorage.clear()')
        page.goto(URL + '#home')
        page.reload()
        ids = page.eval_on_selector_all('.page', 'ps => ps.map(p => p.id)')
        for pid in ids:
            page.evaluate(f'location.hash = "#{pid}"')
            page.wait_for_timeout(250)
            on = page.eval_on_selector('.page.on', 'p => p.id')
            sw = page.evaluate('document.documentElement.scrollWidth - innerWidth')
            tools = page.eval_on_selector_all(f'#{pid} [data-tool]', 'ts => ts.map(t => [t.dataset.tool, t.children.length])')
            empty = [t for t, n in tools if n == 0]
            failed = page.eval_on_selector_all(f'#{pid} [data-tool] .danger', 'x => x.length')
            report(on == pid and sw <= 1 and not empty and not failed,
                   f'{width}px #{pid}: 水平捲動 {sw}px、工具 {len(tools)} 個{"、空白：" + ",".join(empty) if empty else ""}')
            if SHOT:
                SHOT.mkdir(parents=True, exist_ok=True)
                page.screenshot(path=str(SHOT / f'{width}_{pid}.png'), full_page=True)
        report(not errs, f'{width}px console 錯誤 {len(errs)} 個 {errs[:3]}')

        if width != 1280:
            ctx.close()
            continue

        # ---- 加工模擬：切割完成後星星中心是洞（深色） ----
        page.evaluate('location.hash="#principle"')
        page.wait_for_timeout(200)
        page.click('#principle .mode-tabs button[data-m=cut]')
        page.evaluate('TOOLS.sim._finish()')
        px = page.evaluate('''() => { const c = document.querySelector('#principle canvas'); return Array.from(c.getContext('2d').getImageData(300, 210, 1, 1).data); }''')
        report(sum(px[:3]) < 150, f'切割模擬完成：星星中心像素 {px[:3]}（應為深色的洞）')
        page.click('#principle .mode-tabs button[data-m=fill]')
        t_fill = page.inner_text('#principle .k-t')
        page.click('#principle .mode-tabs button[data-m=line]')
        t_line = page.inner_text('#principle .k-t')
        report('秒' in t_fill and '秒' in t_line, f'模擬時間：刻面 {t_fill}、雕線 {t_line}')

        # ---- 時間估算：預設 60×20 刻面，轉 90° 要多花時間 ----
        tip = page.inner_text('#principle [data-tool=timecalc] .out')
        report('多花' in tip, '時間估算：橫向刻面比轉 90° 快的提示有出現')

        # ---- 作品產生器：每種類型都產生合法 mm SVG，並實際下載一次 ----
        page.evaluate('location.hash="#practice"')
        page.wait_for_timeout(200)
        for t in ['card', 'plate', 'coaster', 'key']:
            page.select_option('#practice .ty', t)
            page.wait_for_timeout(100)
            with page.expect_download() as dl:
                page.click('#practice .dl')
            path = dl.value.path()
            root = ET.parse(path).getroot()
            w, h = root.get('width'), root.get('height')
            reds = [e for e in root.iter() if (e.get('stroke') or '').lower() == '#ff0000']
            blues = [e for e in root.iter() if (e.get('stroke') or '').lower() == '#0000ff']
            report(w.endswith('mm') and h.endswith('mm') and reds,
                   f'產生器 {t}：{dl.value.suggested_filename}、{w}×{h}、紅 {len(reds)} 藍 {len(blues)}')
            svg = Path(path).read_text(encoding='utf-8')
            # 用 SVG 檢查器分析產生器自己的檔案
            page.evaluate('location.hash="#checker"')
            page.wait_for_timeout(150)
            page.evaluate('([s, n]) => TOOLS.checker._run(s, n)', [svg, t + '.svg'])
            iss = page.eval_on_selector_all('#checker .issues li', 'ls => ls.map(l => l.className + " " + l.textContent)')
            errors = [x for x in iss if x.startswith('e ')]
            warns = [x for x in iss if x.startswith('w ')]
            only_text = all('文字物件' in x for x in errors)
            report(only_text and not warns, f'檢查器分析產生器 {t}：錯誤 {len(errors)}（只允許文字未轉路徑）、警告 {len(warns)} {warns[:2]}')
            page.evaluate('location.hash="#practice"')
            page.wait_for_timeout(150)

        # ---- SVG 檢查器：有錯誤的範例 ----
        page.evaluate('location.hash="#checker"')
        page.wait_for_timeout(150)
        page.click('#checker .demo')
        txt = page.inner_text('#checker .issues')
        want = ['文字物件', '沒有封閉', '同時有填色與邊框', '#FE0000']
        report(all(k in txt for k in want), f'檢查器範例抓到：{[k for k in want if k in txt]}')
        summ = page.inner_text('#checker .summary')
        report('100.0 × 60.0 mm' in summ, '檢查器讀出範例尺寸 100×60 mm')

        # ---- 材料遊戲：全部答完 ----
        page.evaluate('location.hash="#safety"')
        page.wait_for_timeout(150)
        for _ in range(40):
            if page.locator('#safety .again').count():
                break
            page.click('#safety .choices button >> nth=0')
            page.click('#safety .next')
        report(page.locator('#safety .again').count() == 1, '材料判斷遊戲 18 題可以一路答完：' + page.inner_text('#safety [data-tool=matgame] p'))

        # ---- SOP：G 全部打勾 → 100% ----
        page.evaluate('location.hash="#sop"')
        page.wait_for_timeout(150)
        page.click('#sop .sop-pick button[data-id=G]')
        for step in range(5):
            page.click(f'#sop .sop-steps li[data-k="{step}"]')
            for cb in page.locator('#sop .checks input').all():
                cb.check()
        pct = page.inner_text('#sop .sop-pick button[data-id=G] .pct')
        report(pct == '100%' and page.locator('#sop .tip').count() == 1, f'SOP G 全部打勾：{pct}')
        page.reload()
        page.wait_for_timeout(300)
        pct2 = page.inner_text('#sop .sop-pick button[data-id=G] .pct')
        report(pct2 == '100%', f'重新整理後 SOP 進度還在：{pct2}')

        # ---- 保養表 ----
        page.evaluate('location.hash="#maint"')
        page.wait_for_timeout(150)
        page.click('#maint button[data-id=lens]')
        row = page.inner_text('#maint .maint-table tr:has(button[data-id=lens])')
        report('天後' in row, f'保養表記錄鏡片清潔：{row.split(chr(9))[2:4]}')

        # ---- 參數紀錄本：新增 → 匯出 → 匯入（應去重 1 筆） ----
        page.evaluate('location.hash="#log"')
        page.wait_for_timeout(150)
        page.fill('#log [data-k=mat]', '椴木合板, "測試"')
        page.fill('#log [data-k=power]', '65')
        page.fill('#log [data-k=speed]', '8')
        page.click('#log .add')
        with page.expect_download() as dl:
            page.click('#log .exp')
        csv = Path(dl.value.path())
        page.set_input_files('#log .imp', str(csv))
        page.wait_for_timeout(300)
        msg = page.inner_text('#log .msg')
        nrow = page.locator('#log tbody tr').count()
        report('匯入 0 筆' in msg and '略過重複 1 筆' in msg and nrow == 1, f'參數紀錄 CSV 匯出再匯入：{msg}，表格 {nrow} 列')

        # ---- 測驗：全對 → 認證 ----
        page.evaluate('location.hash="#quiz"')
        page.wait_for_timeout(150)
        page.fill('#certName', '測試老師')
        answers = page.evaluate('DATA.quiz.map(q => q.a)')
        for i, a in enumerate(answers):
            page.check(f'#quiz input[name=q{i}][value="{a}"]')
        page.click('#quiz .submit')
        cert = page.locator('#quiz .cert.show')
        report(cert.count() == 1 and '測試老師' in cert.inner_text(), '測驗全對：出現認證且有姓名 ' + page.inner_text('#quiz .score'))
        prog = page.inner_text('#progTxt')
        report(prog.startswith('1/'), f'測驗通過自動完成單元，進度 {prog}')
        if SHOT:
            page.screenshot(path=str(SHOT / 'quiz_cert.png'), full_page=True)
            page.evaluate('location.hash="#checker"')
            page.wait_for_timeout(200)
            page.click('#checker .demo')
            page.screenshot(path=str(SHOT / 'checker_demo.png'), full_page=True)
            page.evaluate('location.hash="#sop"')
            page.wait_for_timeout(200)
            page.click('#sop .sop-pick button[data-id=C]')
            page.click('#sop .sop-steps li[data-k="4"]')
            page.screenshot(path=str(SHOT / 'sop_C5.png'), full_page=True)
        report(not errs, f'操作測試後 console 錯誤 {len(errs)} 個 {errs[:3]}')
        ctx.close()
    br.close()

print('全部通過' if not bad else f'{bad} 項失敗')
sys.exit(1 if bad else 0)
