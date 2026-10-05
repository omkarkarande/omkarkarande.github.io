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
