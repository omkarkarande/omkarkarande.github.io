const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const engines = require('playwright');
const root = path.resolve(__dirname, '..');
const names = (process.env.TEST_BROWSERS || 'chromium').split(',');
let server, base;
const browsers = {};
before(async () => {
  server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const file = path.join(root, pathname.endsWith('/') ? pathname + 'index.html' : pathname);
      if (!file.startsWith(root + path.sep)) throw Error('Outside root');
      const content = await fs.readFile(file);
      const type = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2'}[path.extname(file)];
      res.writeHead(200, {'Content-Type':type || 'application/octet-stream'}); res.end(content);
    } catch { res.writeHead(404); res.end('Not found'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  for (const name of names) browsers[name] = await engines[name].launch();
});
after(async () => {
  await Promise.all(Object.values(browsers).map(b => b.close()));
  if (server) await new Promise(resolve => server.close(resolve));
});
for (const name of names) {
  test(`${name}: effect lab selects only local chosen exports and shares URLs`, async () => {
    const page = await browsers[name].newPage();
    const requested = [], errors = [];
    page.on('request', r => { if (r.url().includes('/effects/')) requested.push(r.url()); });
    page.on('pageerror', e => errors.push(e.message));
    try {
      await page.goto(base + '/?font=fraunces#intro');
      const select = page.getByLabel('Portrait effect', {exact:true});
      assert.equal(await select.count(), 1);
      assert.equal(await select.inputValue(), 'baseline');
      assert.equal(requested.length, 0);
      const manifest = JSON.parse(await fs.readFile(path.join(root,'res/images/effects/manifest.json')));
      assert.deepEqual(await select.locator('option').evaluateAll(es=>es.map(e=>e.value)), ['baseline', ...manifest.effects.map(e=>e.id)]);
      for (const effect of [...manifest.effects, {id:'baseline',label:'Baseline',src:'/res/images/portrait-magic.webp'}]) {
        await select.selectOption(effect.id);
        await page.waitForFunction(src => document.querySelector('.ascii-portrait').src.endsWith(src), effect.src);
        assert.ok(await page.locator('.ascii-portrait').evaluate(e=>e.complete && e.naturalWidth===1500));
        assert.match(await page.locator('#effect-status').textContent(), new RegExp(effect.label));
        assert.equal(new URL(page.url()).searchParams.get('effect'), effect.id==='baseline' ? null : effect.id);
        assert.equal(new URL(page.url()).searchParams.get('font'),'fraunces');
        assert.equal(new URL(page.url()).hash,'#intro');
      }
      assert.equal(new Set(requested).size,6);
      assert.ok(requested.every(u=>u.endsWith('.webp')));
      assert.deepEqual(errors,[]);
      await page.goto(base+'/?effect=lines');
      await page.waitForFunction(()=>document.querySelector('.ascii-portrait').src.endsWith('portrait-lines.webp'));
      assert.equal(await select.inputValue(),'lines');
      await page.goto(base+'/?effect=not-a-style');
      assert.equal(await select.inputValue(),'baseline');
    } finally { await page.close(); }
  });
  test(`${name}: effect lab stays usable at narrow widths and keeps no-JS baseline`, async () => {
    const page = await browsers[name].newPage({reducedMotion:'reduce'});
    try {
      await page.goto(base);
      for (const width of [320,390,768,1440]) {
        await page.setViewportSize({width,height:900});
        for (const id of ['baseline','dither','dots','voxel','characters','lines','cross']) {
          await page.getByLabel('Portrait effect',{exact:true}).selectOption(id);
          await page.waitForFunction(()=>!document.querySelector('.effect-lab').hasAttribute('aria-busy'));
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width} ${id}`);
          for (const control of await page.locator('.effect-lab select,.effect-lab button,.motion-controls label').all()) {
            const box = await control.boundingBox();
            assert.ok(box.x>=0 && box.x+box.width<=width && box.height>=44,`${width} control fits and has touch target: ${await control.evaluate(e=>e.outerHTML)} ${JSON.stringify(box)}`);
          }
          if(process.env.TEST_SCREENSHOTS && [390,1440].includes(width)) {
            await fs.mkdir(process.env.TEST_SCREENSHOTS,{recursive:true});
            await page.evaluate(()=>{document.activeElement.blur();scrollTo({top:0,behavior:'instant'});});
            await page.locator('#intro').screenshot({path:path.join(process.env.TEST_SCREENSHOTS,`lab-${id}-${name}-${width}.png`)});
          }
        }
      }
      await page.getByLabel('Portrait effect',{exact:true}).focus();
      await page.keyboard.press(name === 'webkit' ? 'Alt+Tab' : 'Tab');
      assert.equal(await page.evaluate(()=>document.activeElement.id),'local-motion');
      await page.keyboard.press('Space');
      assert.equal(await page.getByLabel('Local motion',{exact:true}).isChecked(),true);
      await page.emulateMedia({media:'print'});
      assert.equal(await page.locator('.effect-lab').isVisible(),false);
    } finally { await page.close(); }
    const noJS = await browsers[name].newPage({javaScriptEnabled:false});
    try {
      await noJS.goto(base+'/?effect=voxel');
      assert.equal(await noJS.locator('.effect-lab').isVisible(),false);
      assert.equal(await noJS.locator('.ascii-portrait').getAttribute('src'),'res/images/portrait-magic.webp');
    } finally { await noJS.close(); }
  });
  test(`${name}: failed and racing exports never replace the last good image`, async () => {
    const page = await browsers[name].newPage();
    try {
      await page.goto(base);
      await page.route('**/portrait-dots.webp', route=>route.abort());
      await page.getByLabel('Portrait effect',{exact:true}).selectOption('dots');
      await page.waitForFunction(()=>document.querySelector('#effect-status').textContent.includes('Could not load'));
      assert.equal(await page.getByLabel('Portrait effect',{exact:true}).inputValue(),'baseline');
      assert.equal(await page.locator('.ascii-portrait').getAttribute('src'),'res/images/portrait-magic.webp');
      assert.equal(new URL(page.url()).searchParams.get('effect'),null);
      let release;
      const gate = new Promise(resolve=>{release=resolve;});
      await page.route('**/portrait-dither.webp', async route=>{await gate;await route.continue();});
      await page.getByLabel('Portrait effect',{exact:true}).selectOption('dither');
      await page.getByLabel('Portrait effect',{exact:true}).selectOption('cross');
      await page.waitForFunction(()=>document.querySelector('.ascii-portrait').src.endsWith('portrait-cross.webp'));
      const response = page.waitForResponse('**/portrait-dither.webp');
      release();
      await response;
      await page.waitForTimeout(100);
      assert.equal(await page.getByLabel('Portrait effect',{exact:true}).inputValue(),'cross');
      assert.match(await page.locator('.ascii-portrait').getAttribute('src'),/portrait-cross.webp$/);
      await page.evaluate(()=>{history.pushState(null,'','?effect=lines');dispatchEvent(new PopStateEvent('popstate'));});
      await page.waitForFunction(()=>document.querySelector('.ascii-portrait').src.endsWith('portrait-lines.webp'));
      await page.goBack();
      await page.waitForFunction(()=>document.querySelector('.ascii-portrait').src.endsWith('portrait-cross.webp'));
    } finally { await page.close(); }
  });
  test(`${name}: local motion is opt-in, pausable, offscreen-safe and respects runtime reduction`, async () => {
    const page = await browsers[name].newPage({viewport:{width:1440,height:1100}});
    try {
      await page.goto(base);
      const motion = page.getByLabel('Local motion', {exact:true});
      assert.equal(await motion.count(),1);
      assert.equal(await motion.isChecked(),false);
      const scan = page.locator('.portrait-scan');
      assert.equal(await scan.isVisible(),false);
      await motion.check();
      await page.waitForFunction(()=>document.querySelector('.portrait-surface').dataset.motion==='running');
      assert.equal(await scan.evaluate(e=>getComputedStyle(e).animationPlayState),'running');
      const firstFrame = await scan.evaluate(e=>getComputedStyle(e).clipPath);
      await page.waitForFunction(before=>getComputedStyle(document.querySelector('.portrait-scan')).clipPath!==before,firstFrame);
      await page.getByLabel('Portrait effect',{exact:true}).selectOption('dots');
      await page.waitForFunction(()=>document.querySelector('.portrait-scan').src.endsWith('portrait-dots.webp'));
      await page.getByRole('button',{name:'Pause motion',exact:true}).click();
      assert.equal(await scan.evaluate(e=>getComputedStyle(e).animationPlayState),'paused');
      await page.waitForTimeout(80);
      const pausedFrame = await scan.evaluate(e=>getComputedStyle(e).clipPath);
      await page.waitForTimeout(120);
      assert.equal(await scan.evaluate(e=>getComputedStyle(e).clipPath),pausedFrame);
      await page.getByRole('button',{name:'Resume motion',exact:true}).click();
      await page.locator('#contact').scrollIntoViewIfNeeded();
      await page.waitForFunction(()=>document.querySelector('.portrait-surface').dataset.motion==='suspended');
      await page.locator('.portrait-figure').scrollIntoViewIfNeeded();
      await page.waitForFunction(()=>document.querySelector('.portrait-surface').dataset.motion==='running');
      await page.emulateMedia({reducedMotion:'reduce'});
      await page.waitForFunction(()=>document.querySelector('.portrait-surface').dataset.motion==='reduced');
      assert.equal(await scan.isVisible(),false);
      assert.equal(await scan.evaluate(e=>getComputedStyle(e).animationName),'none');
      assert.match(await page.locator('#motion-status').textContent(),/reduced-motion/i);
      await page.emulateMedia({reducedMotion:'no-preference'});
      await page.waitForFunction(()=>document.querySelector('.portrait-surface').dataset.motion==='running');
      await motion.uncheck();
      assert.equal(await scan.isVisible(),false);
      assert.equal(await page.getByRole('button',{name:'Pause motion',exact:true}).isDisabled(),true);
    } finally { await page.close(); }
  });
  test(`${name}: ASCII portrait is substantial, local and available without JavaScript`, async () => {
    const page = await browsers[name].newPage({javaScriptEnabled:false});
    try {
      await page.goto(base);
      const art = page.locator('.ascii-portrait');
      assert.equal(await art.count(), 1);
      assert.match(await art.getAttribute('alt'), /ASCII portrait/);
      assert.ok(await art.evaluate(e => e.complete && e.naturalWidth >= 600));
      assert.equal(await art.getAttribute('src'), 'res/images/portrait-magic.webp');
      const source = await fs.readFile(path.join(root, 'res/images/portrait-magic.webp'));
      assert.equal(source.toString('ascii', 8, 12), 'WEBP');
      assert.ok(source.length > 20000 && source.length < 800000, 'Optimized local ASCII Magic export');
      assert.equal(await art.evaluate(e => e.naturalWidth), 1500);
      assert.equal(await art.evaluate(e => e.naturalHeight), 1500);
      assert.equal(await art.evaluate(e => {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
        const ctx = canvas.getContext('2d'); ctx.drawImage(e, 0, 0);
        return ctx.getImageData(0, 0, 1, 1).data[3];
      }), 0, 'Portrait corner is transparent, not a rectangular panel');
      for (const width of [320,390,768,1440]) {
        await page.setViewportSize({width,height:900});
        const box = await art.boundingBox();
        assert.ok(box.width > 250 && box.height > 250);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        if (process.env.TEST_SCREENSHOTS && [390,1440].includes(width)) {
          await fs.mkdir(process.env.TEST_SCREENSHOTS,{recursive:true});
          await page.locator('#intro').screenshot({path:path.join(process.env.TEST_SCREENSHOTS,`ascii-hero-${name}-${width}.png`)});
        }
      }
    } finally { await page.close(); }
  });
  test(`${name}: local Hairline figures enhance projects and experience`, async () => {
    const page = await browsers[name].newPage();
    const errors = [], remote = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', r => { if (!r.url().startsWith(base)) remote.push(r.url()); });
    try {
      await page.goto(base);
      assert.equal(await page.locator('#work [data-figure]').count(), 5);
      assert.equal(await page.locator('#experience [data-figure]').count(), 1);
      await page.waitForFunction(() => document.querySelectorAll('[data-hairline] > svg').length === 6);
      assert.deepEqual(await page.locator('[data-hairline]').evaluateAll(es => es.map(e => e.dataset.hairline)), ['cabinet','riffle','branches','terrain','exploded','branches']);
      for (const plate of await page.locator('#work .hairline-figure').all()) {
        assert.equal(await plate.evaluate(e => getComputedStyle(e).backgroundColor), 'rgba(0, 0, 0, 0)');
        assert.equal(await plate.evaluate(e => getComputedStyle(e).getPropertyValue('--hairline-hi').trim()), '#213c32');
      }
      assert.match(await page.locator('.work-item:nth-child(2) [data-figure]').getAttribute('aria-label'), /game.search/i);
      for (const figure of await page.locator('[data-figure]').all()) {
        assert.ok((await figure.getAttribute('aria-label')).length > 20);
        assert.equal(await figure.locator('img').isVisible(), false);
      }
      const figure = page.locator('[data-hairline="terrain"]');
      await figure.scrollIntoViewIfNeeded();
      const before = await figure.locator('svg').innerHTML();
      await figure.hover({position:{x:140,y:100}});
      await page.waitForFunction(old => document.querySelector('[data-hairline="terrain"] svg').innerHTML !== old, before);
      await page.addScriptTag({content:require('axe-core').source});
      assert.deepEqual(await page.evaluate(async () => (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>v.id)), []);
      assert.deepEqual(errors, []);
      assert.deepEqual(remote, []);
      const cards = page.locator('[data-hairline="riffle"]');
      await cards.focus();
      const resting = await cards.locator('svg').innerHTML();
      await page.keyboard.press('ArrowRight');
      await page.waitForFunction(old => document.querySelector('[data-hairline="riffle"] svg').innerHTML !== old, resting);
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({width,height:900});
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        for (const figure of await page.locator('[data-hairline]').all()) {
          const rect = await figure.locator('svg').boundingBox();
          assert.ok(rect.width > 100 && rect.height > 100, 'Figure is visible at responsive width');
          assert.ok(rect.x >= -1 && rect.x + rect.width <= width + 1, 'Figure fits viewport');
        }
        if (process.env.TEST_SCREENSHOTS && [390,1440].includes(width)) {
          await fs.mkdir(process.env.TEST_SCREENSHOTS,{recursive:true});
          await page.evaluate(() => { document.activeElement.blur(); window.scrollTo({top:0,behavior:'instant'}); });
          await page.screenshot({path:path.join(process.env.TEST_SCREENSHOTS,`hairline-${name}-${width}.png`),fullPage:true});
        }
      }
    } finally { await page.close(); }
  });
  test(`${name}: reduced motion is static and preference changes restore fallbacks`, async () => {
    const page = await browsers[name].newPage({reducedMotion:'reduce'});
    try {
      await page.goto(base);
      assert.equal(await page.locator('[data-hairline]').count(), 0);
      assert.equal(await page.locator('[data-figure] img:visible').count(), 6);
      const plate = page.locator('[data-figure="terrain"]');
      await plate.scrollIntoViewIfNeeded();
      const before = await plate.innerHTML();
      await plate.hover();
      await page.waitForTimeout(250);
      assert.equal(await plate.innerHTML(), before);
      assert.equal(await plate.locator('img').evaluate(e=>getComputedStyle(e).transform), 'none');
      await page.locator('.ascii-portrait').hover();
      assert.equal(await page.locator('.ascii-portrait').evaluate(e=>getComputedStyle(e).transform), 'none');
      assert.equal(await page.locator('.ascii-portrait').evaluate(e=>getComputedStyle(e).transitionDuration), '0s');
      for (let i=0; i<2; i++) {
        await page.emulateMedia({reducedMotion:'no-preference'});
        await page.waitForFunction(()=>document.querySelectorAll('[data-hairline]>svg').length===6);
        await page.emulateMedia({reducedMotion:'reduce'});
        await page.waitForFunction(()=>!document.querySelector('[data-hairline]'));
        assert.equal(await page.locator('[data-figure] img:visible').count(), 6);
        assert.equal(await page.locator('[data-figure][tabindex]').count(), 0);
      }
    } finally { await page.close(); }
  });
  test(`${name}: original copy and external destinations preserved`, async () => {
    const page = await browsers[name].newPage();
    try {
      const original = execFileSync('git', ['show','archive/magazine-design:index.html'], {cwd:root, encoding:'utf8'});
      await page.setContent(original);
      const getCopy = () => [...document.querySelectorAll('main h1,main h2,main h3,main p,main aside,main .about-footnotes')].map(e => e.textContent.replace(/\s+/g,' ').trim());
      const copy = await page.evaluate(getCopy);
      const getLinks = () => [...document.querySelectorAll('a[href^="https:"],a[href^="mailto:"]')].map(e=>e.getAttribute('href')).sort();
      const links = await page.evaluate(getLinks);
      await page.goto(base);
      const current = await page.evaluate(getCopy);
      for (const text of copy) assert.ok(current.includes(text), `Missing: ${text}`);
      assert.deepEqual(await page.evaluate(getLinks), links);
      assert.equal(await page.locator('.work-item').count(),5);
      assert.equal(await page.locator('h1').count(),1);
    } finally { await page.close(); }
  });
  test(`${name}: responsive geometry, assets, accessibility and reduced motion`, async () => {
    const page = await browsers[name].newPage({reducedMotion:'reduce'});
    const errors=[];
    page.on('pageerror', e=>errors.push(e.message));
    page.on('response', r=>{if(r.status()>=400) errors.push(r.url());});
    try {
      await page.goto(base);
      await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i=>{i.loading='eager';return i.decode();})); });
      for (const [width,height] of [[320,568],[390,844],[768,1024],[1024,768],[1440,900],[667,320]]) {
        await page.setViewportSize({width,height});
        const geometry = await page.evaluate(() => ({overflow:document.documentElement.scrollWidth>innerWidth, clipped:[...document.querySelectorAll('h1,h2,h3,p,aside,img')].filter(e=>{const r=e.getBoundingClientRect();return r.left < -1 || r.right > innerWidth+1;}).map(e=>e.outerHTML.slice(0,100))}));
        assert.equal(geometry.overflow,false, `${width} overflow`);
        assert.deepEqual(geometry.clipped,[],`${width} clipped`);
        if(name==='chromium') {
          await page.addScriptTag({content:require('axe-core').source});
          const violations=await page.evaluate(async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));
          assert.deepEqual(violations,[],`${width} accessibility`);
        }
      }
      assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).scrollBehavior),'auto');
      assert.ok(await page.locator('img').evaluateAll(images=>images.every(i=>i.complete&&i.naturalWidth>0)));
      assert.deepEqual(errors,[]);
      if(process.env.TEST_SCREENSHOTS) {
        await fs.mkdir(process.env.TEST_SCREENSHOTS,{recursive:true});
        for(const width of [1440,390]) {
          await page.setViewportSize({width,height:900});
          await page.screenshot({path:path.join(process.env.TEST_SCREENSHOTS,`fieldnotes-${name}-${width}.png`),fullPage:true});
        }
      }
    } finally {await page.close();}
  });
  test(`${name}: native links, history, legacy anchors, keyboard and no-JS`, async () => {
    for(const javaScriptEnabled of [true,false]) {
      const page=await browsers[name].newPage({javaScriptEnabled,reducedMotion:'reduce',viewport:{width:390,height:844}});
      try {
        await page.goto(base);
        await page.locator('.site-nav a[href="#work"]').click();
        assert.equal(new URL(page.url()).hash,'#work');
        assert.ok(await page.locator('#work').evaluate(e=>Math.abs(e.getBoundingClientRect().top)<40));
        await page.goto(base+'/#experience');
        await page.locator('.site-nav a[href="#contact"]').click();
        await page.goBack();
        assert.equal(new URL(page.url()).hash,'#experience');
        for(const id of ['experience-earlier','kinetic-canvas','youtube-macos','widgets','about']) {
          await page.goto(base+'/#'+id);
          assert.equal(await page.locator('#'+id).count(),1);
          assert.ok(await page.evaluate(()=>scrollY>0));
        }
        await page.goto(base);
        await page.keyboard.press(name === 'webkit' ? 'Alt+Tab' : 'Tab');
        assert.equal(await page.evaluate(()=>document.activeElement.className),'skip-link');
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(()=>document.activeElement.id),'main');
        assert.equal(await page.locator('[inert],section[aria-hidden]').count(),0);
        await page.emulateMedia({media:'print'});
        assert.equal(await page.locator('.page:visible').count(),4);
        assert.equal(await page.locator('.site-nav').isVisible(),false);
      } finally {await page.close();}
    }
  });
  test(`${name}: font preview retains native fragment navigation`,async()=>{
    const page=await browsers[name].newPage({reducedMotion:'reduce'});
    try {
      await page.goto(base+'/variants.html');
      await page.frames()[1].locator('.site-nav a[href="#experience"]').click();
      await page.locator('[data-font="runiga"]').click();
      await page.waitForFunction(()=>document.querySelector('#preview').contentWindow.location.search==='?font=runiga');
      assert.match(await page.locator('#full-preview').getAttribute('href'),/font=runiga#experience$/);
    } finally {await page.close();}
  });
}
