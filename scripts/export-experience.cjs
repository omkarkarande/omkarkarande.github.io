// Export the official Hairline figures at rest as self-contained static SVGs.
const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
(async () => {
  const server = http.createServer(async (req,res) => {
    try {
      const file = path.join(root, new URL(req.url,'http://localhost').pathname);
      res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : 'text/css');
      res.end(await fs.readFile(file));
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(r => server.listen(0,'127.0.0.1',r));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/css/minimal.css`);
    await page.setContent('<link rel="stylesheet" href="/css/minimal.css">' + ['loupe','cabinet','router','drawer'].map(figure => `<article class="timeline-entry"><div class="hairline-figure" style="width:320px;height:220px" data-figure="${figure}" data-palette="dark"></div></article>`).join(''));
    await page.addScriptTag({type:'module',url:'/js/hairline.bundle.js'});
    await page.waitForFunction(() => document.querySelectorAll('.hairline-figure > svg').length === 4);
    const svgs = await page.locator('.hairline-figure > svg').evaluateAll(els => els.map(svg => {
      const clone = svg.cloneNode(true);
      clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
      const originals = [svg,...svg.querySelectorAll('*')];
      const copies = [clone,...clone.querySelectorAll('*')];
      originals.forEach((el,i) => {
        const style = getComputedStyle(el);
        for (const prop of ['fill','stroke','stroke-width','opacity']) copies[i].style.setProperty(prop,style.getPropertyValue(prop));
      });
      return new XMLSerializer().serializeToString(clone);
    }));
    for (const [i,name] of ['memories','platform','services','discovery'].entries()) {
      await fs.writeFile(path.join(root,`res/images/experience-${name}.svg`),svgs[i]);
    }
    console.log('Exported four official Hairline static fallbacks.');
  } finally { await browser.close(); server.close(); }
})().catch(error => {console.error(error);process.exitCode=1;});
