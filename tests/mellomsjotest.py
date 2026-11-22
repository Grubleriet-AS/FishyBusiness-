"""The middle sea on a GPU drawn by the CPU, and a context lost on the middle sea (klynge:17e72b4c, klynge:c25c6d05, 22.11.2026).
- Microsoft's basic renderer (WARP: Direct3D 11 drawn by the CPU, Windows with no GPU driver) lost its context every time on the middle
  sea, and the start failed until the browser gave it back. On it the start goes straight to the old level 1, no middle sea tried.
  (The renderer's name is put in from the test, through getParameter; the test machine's SwiftShader draws it.)
- A context lost on the middle sea is seen and marks the middle sea off (u2:no2), with no level bump; its sea try mark (dsb_sea_try)
  is cleared with it, so the next start does not take the seen loss for a try that never came back (1 of 2).
Prints OK or FEIL per check."""
import asyncio, json
from _env import GAME3D_MIN, boot
from playwright.async_api import async_playwright
WARP = 'ANGLE (Microsoft, Microsoft Basic Render Driver (0x0000008C) Direct3D11 vs_5_0 ps_5_0, D3D11)'
# before the page's own scripts: the renderer's name when t_gpu is set, and a context lost on the middle sea's vertex shader (the lite
# one: the sea's uniforms without the wake) when t_losemid is set, once
INIT = """(() => { let gpu = null, lose = false; try { gpu = localStorage.getItem('t_gpu'); lose = !!localStorage.getItem('t_losemid'); } catch (e){}
  for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext]){ if (!C) continue;
    const gp = C.prototype.getParameter, ss = C.prototype.shaderSource;
    C.prototype.getParameter = function(p){ return gpu && p === 0x9246 ? gpu : gp.call(this, p); };
    C.prototype.shaderSource = function(sh, src){ const r = ss.call(this, sh, src);
      if (lose && /uNFD;/.test(src) && !/wakeH\\(/.test(src)){ lose = false; try { localStorage.removeItem('t_losemid'); } catch (e){}
        window.__lc = this.getExtension('WEBGL_lose_context'); window.__lc.loseContext(); }
      return r; }; } })()"""
async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(args=['--disable-gpu-compositing', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        ctx = await br.new_context(viewport={'width': 900, 'height': 600}); await ctx.add_init_script(INIT); pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        URL = GAME3D_MIN
        SITE = URL.split('#')[0].rsplit('/', 1)[0] + '/kilder.html'
        KEYS = "['dsb_sea', 'dsb_sea_try', 'dsb_sea_gone', 'dsb_sea_ok', 'dsb_sea_mid', 'dsb_sea_midtry', 'dsb_sea_midgone', 'dsb_sea_re', 't_gpu', 't_losemid'].forEach(k => localStorage.removeItem(k))"
        READ = "({sea:localStorage.getItem('dsb_sea'), tryLeft:localStorage.getItem('dsb_sea_try'), gone:localStorage.getItem('dsb_sea_gone'), lvl:G3._debug.seaLvl, mid:!!G3._debug.seaMid, midMark:localStorage.getItem('dsb_sea_mid'), midTry:localStorage.getItem('dsb_sea_midtry'), midGone:localStorage.getItem('dsb_sea_midgone'), active:G3.isActive(), why:G3.failWhy || ''})"
        booted = []
        async def keys(setup):
            await pg.goto(SITE); await pg.evaluate(KEYS); await pg.evaluate(setup); await pg.goto('about:blank')
        async def game():
            if booted: pg.set_default_timeout(120000); await pg.goto(URL)
            else: await boot(pg, URL); booted.append(1)
        R = {}
        # WARP: no middle sea tried, the old level 1 drawn, no marks left
        await keys("localStorage.setItem('t_gpu', %s)" % json.dumps(WARP)); await game()
        await pg.wait_for_function("typeof G3 !== 'undefined' && G3.isActive()", timeout=180000); await pg.wait_for_timeout(1500)
        R['warp'] = await pg.evaluate(READ)
        # a context lost on the middle sea (this GPU, level 1, the full sea once more done with): marked off, the try mark gone with it;
        # given back, the same page starts on the old level 1 with nothing counted
        await keys("localStorage.setItem('dsb_sea', '1'); localStorage.setItem('dsb_sea_re', 'r1:no'); localStorage.setItem('t_losemid', '1')"); await game()
        await pg.wait_for_function("localStorage.getItem('dsb_sea_mid') === 'u2:no2'", timeout=180000); await pg.wait_for_timeout(500)
        R['lost'] = await pg.evaluate("({tryLeft:localStorage.getItem('dsb_sea_try'), midTry:localStorage.getItem('dsb_sea_midtry'), sea:localStorage.getItem('dsb_sea'), lc:!!window.__lc})")
        await pg.evaluate("window.__lc && window.__lc.restoreContext()")
        await pg.wait_for_function("typeof G3 !== 'undefined' && G3.isActive()", timeout=180000); await pg.wait_for_timeout(1500)
        R['back'] = await pg.evaluate(READ)
        print(json.dumps(dict(R, errs=errs[:3])))
        w, l, b = R['warp'], R['lost'], R['back']
        print(('OK  ' if w['active'] and w['lvl'] == 1 and not w['mid'] and w['midTry'] is None and w['midMark'] is None and w['tryLeft'] is None and not w['why'] else 'FEIL') + " Microsoft's basic renderer (WARP) starts on the old level 1 without trying the middle sea")
        print(('OK  ' if l['lc'] and l['tryLeft'] is None and l['midTry'] is None and l['sea'] == '1' else 'FEIL') + ' a context lost on the middle sea: marked off, no level bump, and its try mark is gone (the next start counts nothing)')
        print(('OK  ' if b['active'] and b['lvl'] == 1 and not b['mid'] and b['gone'] is None and b['tryLeft'] is None and b['midMark'] == 'u2:no2' else 'FEIL') + ' the context given back: the same page starts on the old level 1')
        print(('OK  ' if not errs else 'FEIL') + ' no page errors')
        await br.close()
asyncio.run(main())
