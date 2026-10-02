const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium, webkit, firefox } = require("playwright");
const root = path.resolve(__dirname, "..");
let server, base;
const engines = { chromium, webkit, firefox };
const names = (process.env.TEST_BROWSERS || "chromium").split(",");
const browsers = [];

before(async () => {
  server = http.createServer(async (req, res) => {
    const pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    const file = path.join(
      root,
      pathname.endsWith("/") ? pathname + "index.html" : pathname,
    );
    try {
      if (!file.startsWith(root + path.sep)) throw new Error("Outside root");
      const content = await fs.readFile(file);
      const type = {
        ".html": "text/html",
        ".css": "text/css",
        ".js": "text/javascript",
        ".svg": "image/svg+xml",
        ".webp": "image/webp",
        ".otf": "font/otf",
        ".ttf": "font/ttf",
        ".woff2": "font/woff2",
      }[path.extname(file)];
      res.writeHead(200, {
        "Content-Type": type || "application/octet-stream",
      });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  for (const name of names)
    browsers.push([name, await engines[name].launch({ timeout: 20000 })]);
});
after(async () => {
  await Promise.all(browsers.map(([, browser]) => browser.close()));
  await new Promise((resolve) => server.close(resolve));
});

async function active(page, id) {
  await page.waitForFunction(
    (id) => {
      const main = document.querySelector("#main");
      const current = document.querySelector("[data-page]:not([aria-hidden])");
      return (
        current?.id === id &&
        location.hash === `#${id}` &&
        Math.abs(
          current.getBoundingClientRect().left -
            main.getBoundingClientRect().left,
        ) < 2
      );
    },
    id,
    { timeout: 6000 },
  ).catch(async error => {
    const state = await page.evaluate(() => ({
      hash: location.hash, scroll: document.querySelector('#main').scrollLeft,
      focus: document.activeElement.outerHTML.slice(0, 200),
      pages: [...document.querySelectorAll('[data-page]')].map(e => ({
        id: e.id, hidden: e.getAttribute('aria-hidden'), x: e.getBoundingClientRect().x
      }))
    }));
    throw new Error(`Expected ${id}: ${JSON.stringify(state)}`, { cause: error });
  });
}
async function go(page, id) {
  await page.locator(`.site-nav a[href="#${id}"]`).click();
  await active(page, id);
}

for (const name of names) {
  test(`${name}: repeated trackpad swipes, reversals and endpoints`, async () => {
    const browser = browsers.find(([n]) => n === name)[1];
    const page = await browser.newPage({
      viewport: { width: 960, height: 900 },
    });
    try {
      await page.goto(base + "/#intro");
      await active(page, "intro");
      await page.mouse.move(470, 420);
      for (let round = 0; round < 3; round++) {
        for (const id of ["experience", "work", "contact"]) {
          await page.mouse.wheel(700, 3);
          await active(page, id);
        }
        for (const id of ["work", "experience", "intro"]) {
          await page.mouse.wheel(-700, 2);
          await active(page, id);
        }
      }
      // Engines differ on small-wheel snap thresholds, but must finish on a page.
      await page.mouse.wheel(15, 0);
      await page.waitForTimeout(1500);
      const id = await page
        .locator("[data-page]:not([aria-hidden])")
        .getAttribute("id");
      await active(page, id);
      await go(page, "intro");
      assert.equal(await page.locator("#previous-page").isDisabled(), true);
      await page.mouse.wheel(-700, 0);
      await active(page, "intro");
    } finally {
      await page.close();
    }
  });

  test(`${name}: diagonal wheel bursts escape a long page and navigation cancels pending movement`, async () => {
    const browser = browsers.find(([n]) => n === name)[1];
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    try {
      await page.goto(base + "/#experience");
      await active(page, "experience");
      assert.ok(await page.locator("#experience").evaluate(e => e.scrollHeight > e.clientHeight));
      await page.mouse.move(210, 440);
      for (let i = 0; i < 5; i++) await page.mouse.wheel(52, 3);
      await active(page, "work");
      for (let i = 0; i < 5; i++) await page.mouse.wheel(-52, 3);
      await active(page, "experience");
      await page.mouse.wheel(0, 240);
      await page.waitForFunction(() => document.querySelector("#experience").scrollTop > 0);
      await active(page, "experience");
      // Wheel input can focus the scrollable sheet; reader endpoints belong
      // to controls outside it, not the article's native Home/End behavior.
      await page.locator('#next-page').focus();
      await page.mouse.wheel(65, 0);
      await page.keyboard.press("End");
      await active(page, "contact");
      await page.waitForTimeout(250);
      await active(page, "contact");
      assert.equal(await page.locator("#main").evaluate(e => e.style.scrollSnapType), "none");
      await page.locator('#main').dispatchEvent('pointerdown');
      assert.equal(await page.locator('#main').evaluate(e => getComputedStyle(e).scrollSnapType), 'x mandatory');
    } finally { await page.close(); }
  });

  test(`${name}: keyboard, links, deep links, focus and history`, async () => {
    const browser = browsers.find(([n]) => n === name)[1];
    const page = await browser.newPage();
    try {
      await page.goto(base + "/?font=transcity#experience");
      await active(page, "experience");
      await page.locator("#next-page").click();
      await active(page, "work");
      await page.keyboard.press("ArrowRight");
      await active(page, "contact");
      await page.goBack();
      await active(page, "work");
      await page.goForward();
      await active(page, "contact");
      await page.locator('#previous-page').focus();
      await page.keyboard.press("Home");
      await active(page, "intro");
      await page.locator('.hero-links a[href="#experience"]').click();
      await active(page, "experience");
      assert.equal(
        await page.evaluate(() => document.activeElement.id),
        "experience-heading",
      );
      assert.equal(await page.locator("[data-page][inert]").count(), 3);
      assert.equal(
        await page
          .locator('.site-nav a[aria-current="page"]')
          .getAttribute("href"),
        "#experience",
      );
      await page.locator(".skip-link").focus();
      await page.keyboard.press("Enter");
      await active(page, "experience");
      assert.equal(
        await page.evaluate(() => document.activeElement.id),
        "experience-heading",
      );
      // Outside the reading surface, Home/End still provide reader endpoints.
      await page.locator('#next-page').focus();
      await page.keyboard.press("End");
      await active(page, "contact");
      assert.equal(await page.locator("#next-page").isDisabled(), true);
    } finally {
      await page.close();
    }
  });

  test(`${name}: responsive pages, resizing, vertical scrolling, assets and console`, async () => {
    const browser = browsers.find(([n]) => n === name)[1];
    const page = await browser.newPage({ reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => {
      if (response.status() >= 400) errors.push(response.url());
    });
    try {
      await page.goto(base + "/#intro");
      const dailyPaper = page.locator('#work a[href="https://github.com/omkarkarande/daily-paper"]');
      assert.equal(await dailyPaper.count(), 1);
      assert.match(await dailyPaper.textContent(), /Daily Paper/);
      assert.equal(await dailyPaper.getAttribute('rel'), 'noopener noreferrer');
      for (const [width, height] of [
        [1440, 900],
        [1024, 768],
        [390, 844],
        [320, 568],
        [768, 1024],
        [844, 390],
        [667, 320],
      ]) {
        await page.setViewportSize({ width, height });
        for (const id of ["intro", "experience", "work", "contact"]) {
          await go(page, id);
          await page.evaluate(() => document.fonts.ready);
          assert.equal(
            await page
              .locator(`#${id}`)
              .evaluate((e) => e.scrollWidth > e.clientWidth + 1),
            false,
            `${width}: ${id} overflow`,
          );
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth > innerWidth,
            ),
            false,
          );
          assert.equal(
            await page
              .locator(`#${id}`)
              .evaluate((e) => e.getBoundingClientRect().width),
            width,
          );
          if (process.env.TEST_SCREENSHOTS) {
            await page.screenshot({ path: path.join(process.env.TEST_SCREENSHOTS,
              `portfolio-${name}-${width}x${height}-${id}.png`) });
          }
        }
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await go(page, "experience");
      await page.mouse.move(210, 440);
      await page.mouse.wheel(0, 420);
      await page.waitForFunction(
        () => document.querySelector("#experience").scrollTop > 0,
      );
      const top = await page
        .locator("#experience")
        .evaluate((e) => e.scrollTop);
      // Paging controls preserve reading position; explicit content links reveal the heading.
      await page.locator('#next-page').click();
      await active(page, 'work');
      await page.locator('#previous-page').click();
      await active(page, 'experience');
      assert.equal(
        await page.locator("#experience").evaluate((e) => e.scrollTop),
        top,
      );
      await go(page, 'experience');
      assert.equal(await page.locator('#experience').evaluate(e => e.scrollTop), 0);
      await page.setViewportSize({ width: 1200, height: 800 });
      await active(page, "experience");
      assert.deepEqual(errors, []);
      const resources = await page.evaluate(() =>
        performance.getEntriesByType("resource").map((r) => r.name),
      );
      assert.equal(
        resources.filter((url) => url.includes("fraunces-400-normal.woff2")).length,
        1,
      );
    } finally {
      await page.close();
    }
  });

  test(`${name}: reduced motion, print and no-JavaScript fallback`, async () => {
    const browser = browsers.find(([n]) => n === name)[1];
    const page = await browser.newPage({ reducedMotion: "reduce" });
    try {
      await page.goto(base + "/#intro");
      await go(page, "contact");
      await page.emulateMedia({ media: "print" });
      assert.equal(
        await page
          .locator("#main")
          .evaluate((e) => getComputedStyle(e).display),
        "block",
      );
      assert.equal(await page.locator(".page:visible").count(), 4);
      assert.equal(await page.locator('.site-nav').isVisible(), false);
      assert.ok(await page.locator('[data-page]').evaluateAll(pages => pages.every(e =>
        e.clientHeight >= e.scrollHeight - 1)), 'print must not clip a scrolled sheet');
      if (process.env.TEST_SCREENSHOTS) await page.screenshot({
        path: path.join(process.env.TEST_SCREENSHOTS, `portfolio-${name}-print.png`), fullPage: true });
    } finally {
      await page.close();
    }
    const plain = await browser.newPage({ javaScriptEnabled: false });
    try {
      await plain.goto(base);
      assert.equal(await plain.locator(".page:visible").count(), 4);
      assert.equal(await plain.locator(".page-controls").isVisible(), false);
      await plain.locator('.site-nav a[href="#work"]').click();
      assert.equal(new URL(plain.url()).hash, "#work");
      for (const width of [320, 390, 1440]) {
        await plain.setViewportSize({ width, height: 844 });
        assert.equal(await plain.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        assert.equal(await plain.locator('[data-page][inert], [data-page][aria-hidden]').count(), 0);
        if (process.env.TEST_SCREENSHOTS) await plain.screenshot({
          path: path.join(process.env.TEST_SCREENSHOTS, `portfolio-${name}-nojs-${width}.png`), fullPage: true });
      }
    } finally {
      await plain.close();
    }
  });

  test(`${name}: font variants retain the current section`, async () => {
    const browser = browsers.find(([n]) => n === name)[1];
    const page = await browser.newPage();
    try {
      await page.goto(base + "/variants.html");
      let frame = page.frames()[1];
      await frame.locator('.site-nav a[href="#experience"]').click();
      await active(frame, "experience");
      await page.locator('[data-font="runiga"]').click();
      await page.waitForFunction(
        () =>
          document.querySelector("#preview").contentWindow.location.search ===
          "?font=runiga",
      );
      frame = page.frames()[1];
      await active(frame, "experience");
      assert.match(
        await page.locator("#full-preview").getAttribute("href"),
        /font=runiga#experience$/,
      );
      await frame.locator("#next-page").click();
      await active(frame, "work");
      assert.match(
        await page.locator("#full-preview").getAttribute("href"),
        /#work$/,
      );
    } finally {
      await page.close();
    }
  });
}

test(
  "chromium: real touch input repeatedly crosses sections and still scrolls vertically",
  { skip: !names.includes("chromium") },
  async () => {
    const browser = browsers.find(([name]) => name === "chromium")[1];
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    try {
      const client = await context.newCDPSession(page);
      await page.goto(base + "/#intro");
      async function swipe(x1, y1, x2, y2) {
        await client.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [{ x: x1, y: y1 }],
        });
        for (let i = 1; i <= 12; i++) {
          await client.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [
              { x: x1 + ((x2 - x1) * i) / 12, y: y1 + ((y2 - y1) * i) / 12 },
            ],
          });
        }
        await client.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
      }
      for (let round = 0; round < 2; round++) {
        for (const id of ["experience", "work", "contact"]) {
          await swipe(335, 440, 55, 440);
          await active(page, id);
        }
        for (const id of ["work", "experience", "intro"]) {
          await swipe(55, 440, 335, 440);
          await active(page, id);
        }
      }
      await swipe(335, 440, 55, 440);
      await active(page, "experience");
      await swipe(210, 680, 210, 300);
      await page.waitForFunction(
        () => document.querySelector("#experience").scrollTop > 0,
      );
      await active(page, "experience");
    } finally {
      await context.close();
    }
  },
);

test(
  "chromium: WCAG checks for each active section at desktop and mobile widths",
  { skip: !names.includes("chromium") },
  async () => {
    const browser = browsers.find(([name]) => name === "chromium")[1];
    const page = await browser.newPage();
    try {
      for (const [width, height] of [[1440, 900], [390, 844], [320, 568], [667, 320]]) {
        await page.setViewportSize({ width, height });
        for (const id of ["intro", "experience", "work", "contact"]) {
          await page.goto(base + "/#" + id);
          await page.evaluate(() => document.fonts.ready);
          await page.addScriptTag({ content: require("axe-core").source });
          const violations = await page.evaluate(async () =>
            (
              await axe.run(document, {
                runOnly: {
                  type: "tag",
                  values: ["wcag2a", "wcag2aa", "wcag21aa"],
                },
              })
            ).violations.map((v) => ({
              id: v.id,
              targets: v.nodes.map((n) => n.target),
            })),
          );
          assert.deepEqual(violations, [], `${width}: ${id}`);
        }
      }
    } finally {
      await page.close();
    }
  },
);

for (const name of names) {
  test(`${name}: editorial editions, layout, focus and complete reading at every width`, async () => {
    const browser = browsers.find(([n]) => n === name)[1];
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400) errors.push(r.url()); });
    try {
      await page.goto(base + '/#intro');
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
      assert.equal(await page.locator('h1').count(), 1);
      assert.equal(await page.locator('.work-item').count(), 5);
      assert.doesNotMatch(await page.locator('#work').textContent(), /Übersicht/);
      assert.equal(await page.locator('.hero-engraving').count(), 0);
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: width === 320 ? 568 : 900 });
        const dimensions = {};
        for (const theme of ['light', 'dark']) {
          await page.evaluate(t => document.documentElement.dataset.theme = t, theme);
          assert.equal(await page.locator('body').evaluate(e => getComputedStyle(e).backgroundColor),
            theme === 'light' ? 'rgb(242, 238, 229)' : 'rgb(0, 0, 0)');
          for (const id of ['intro', 'experience', 'work', 'contact']) {
            await go(page, id);
            await page.evaluate(() => document.fonts.ready);
            const geometry = await page.locator(`#${id}`).evaluate(sheet => {
              const bounds = sheet.getBoundingClientRect();
              const content = sheet.querySelector('.page-inner').getBoundingClientRect();
              return { width: content.width, height: content.height,
                overflow: sheet.scrollWidth > sheet.clientWidth + 1,
                clipped: [...sheet.querySelectorAll('h1,h2,h3,p,img,aside')].some(e => {
                  const r = e.getBoundingClientRect();
                  return r.left < bounds.left - 1 || r.right > bounds.right + 1;
                }) };
            });
            assert.equal(geometry.overflow, false, `${theme}/${width}/${id} overflow`);
            assert.equal(geometry.clipped, false, `${theme}/${width}/${id} clipped content`);
            if (theme === 'light') dimensions[id] = geometry;
            else assert.deepEqual(geometry, dimensions[id], 'editions must share their composition');
            await page.locator(`#${id} img`).evaluateAll(images => Promise.all(images.map(i => {
              i.loading = 'eager';
              return i.decode();
            })));
            assert.ok(await page.locator(`#${id} img`).evaluateAll(images => images.every(i => i.complete && i.naturalWidth > 0)));
            if (process.env.TEST_SCREENSHOTS) await page.screenshot({ path: path.join(process.env.TEST_SCREENSHOTS,
              `editorial-${name}-${theme}-${width}-${id}.png`) });
            await page.locator(`#${id}`).evaluate(e => { e.scrollTop = e.scrollHeight; });
            assert.ok(await page.locator(`#${id}`).evaluate(e => {
              const end = e.querySelector('.page-inner').getBoundingClientRect().bottom;
              return end <= e.getBoundingClientRect().bottom + 1;
            }), 'last content must remain reachable above the footer');
            if (id === 'work' && process.env.TEST_SCREENSHOTS) await page.screenshot({ path: path.join(process.env.TEST_SCREENSHOTS,
              `editorial-${name}-${theme}-${width}-work-end.png`) });
            if (name === 'chromium') {
              await page.addScriptTag({ content: require('axe-core').source });
              const violations = await page.evaluate(async () => (await axe.run(document, {
                runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] }
              })).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })));
              assert.deepEqual(violations, [], `${theme}/${width}/${id}`);
            }
          }
          await page.keyboard.press('Tab');
          await page.locator('.site-nav a').first().focus();
          assert.equal(await page.locator('.site-nav a').first().evaluate(e => getComputedStyle(e).outlineStyle), 'solid');
        }
      }
      const resources = await page.evaluate(() => performance.getEntriesByType('resource').map(r => r.name));
      assert.ok(resources.every(url => !/paper-grain|engraved-border|transcity-regular/.test(url)), 'no texture or evaluation font payload');
      assert.deepEqual(errors, []);
    } finally { await page.close(); }
  });

  test(`${name}: explicit navigation stays aligned after native scroll settling`, async () => {
    const browser = browsers.find(([n]) => n === name)[1];
    const page = await browser.newPage();
    try {
      for (let i = 0; i < 8; i++) {
        await page.goto(base + '/?font=transcity#experience');
        await active(page, 'experience');
        await page.locator('#next-page').click();
        await active(page, 'work');
        // Catch WebKit reverting to the prior native snap target after a frame.
        await page.waitForTimeout(300);
        await active(page, 'work');
        await page.locator('.site-nav a[href="#intro"]').click();
        await page.waitForTimeout(250);
        await active(page, 'intro');
      }
    } finally { await page.close(); }
  });

  test(`${name}: Home and End scroll the focused sheet without changing pages`, async () => {
    const browser = browsers.find(([n]) => n === name)[1];
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    try {
      await page.goto(base + '/#experience');
      await active(page, 'experience');
      await page.locator('#experience').focus();
      await page.keyboard.press('End');
      await page.waitForTimeout(400);
      assert.equal(new URL(page.url()).hash, '#experience', 'End must not leave the article being read');
      assert.ok(await page.locator('#experience').evaluate(e => e.scrollTop > 0));
      await page.keyboard.press('Home');
      await page.waitForTimeout(400);
      assert.equal(new URL(page.url()).hash, '#experience');
      assert.equal(await page.locator('#experience').evaluate(e => e.scrollTop), 0);
      await page.keyboard.press('ArrowRight');
      await active(page, 'work');
    } finally { await page.close(); }
  });

  test(`${name}: legacy deep links do not add duplicate history entries`, async () => {
    const browser = browsers.find(([n]) => n === name)[1];
    const page = await browser.newPage();
    try {
      await page.goto(base + '/#intro');
      await active(page, 'intro');
      const initial = await page.evaluate(() => history.length);
      await page.evaluate(() => { location.hash = 'kinetic-canvas'; });
      await page.waitForTimeout(500);
      assert.equal(await page.locator('[data-page]:not([aria-hidden])').getAttribute('id'), 'work');
      assert.equal(await page.evaluate(() => history.length), initial + 1,
        'resolving a legacy fragment must not push an extra history entry');
      await page.goBack();
      await active(page, 'intro');
      await page.goForward();
      await page.waitForTimeout(300);
      assert.equal(await page.locator('[data-page]:not([aria-hidden])').getAttribute('id'), 'work');
    } finally { await page.close(); }
  });

  test(`${name}: content navigation reveals a previously scrolled heading`, async () => {
    const browser = browsers.find(([n]) => n === name)[1];
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    try {
      await page.goto(base + '/#experience');
      await active(page, 'experience');
      await page.locator('#experience').evaluate(e => { e.scrollTop = e.scrollHeight; });
      await go(page, 'intro');
      await page.locator('.hero-links a[href="#experience"]').click();
      await active(page, 'experience');
      const visible = await page.locator('#experience-heading').evaluate(e => {
        const heading = e.getBoundingClientRect();
        const sheet = e.closest('[data-page]').getBoundingClientRect();
        return document.activeElement === e && heading.top >= sheet.top && heading.bottom <= sheet.bottom;
      });
      assert.ok(visible, 'the focused heading must be visible, not above the scrolled sheet');
    } finally { await page.close(); }
  });

  test(`${name}: portrait precedes mobile copy and stays beside desktop copy`, async () => {
    const browser = browsers.find(([n]) => n === name)[1];
    for (const javaScriptEnabled of [true, false]) {
      const page = await browser.newPage({ javaScriptEnabled });
      try {
        await page.goto(base + '/#intro');
        await page.evaluate(() => document.fonts.ready);
        assert.equal(await page.locator('#intro .eyebrow, #intro figcaption').count(), 0);
        assert.doesNotMatch(await page.locator('#intro').textContent(), /Currently|Amazon Photos Memories|SOFTWARE & SIDE PROJECTS/);
        await page.locator('.portrait-figure img').evaluate(image => image.decode());
        for (const width of [320, 390, 430, 600, 601, 768, 1440, 390]) {
          await page.setViewportSize({ width, height: 900 });
          const photo = await page.locator('.portrait-figure').boundingBox();
          const text = await page.locator('.hero-text').boundingBox();
          if (width <= 600) {
            assert.ok(Math.abs(photo.x - text.x + 8) < 1,
              `${width}px: mobile portrait must sit 8px left of the text`);
            assert.ok(photo.y + photo.height <= text.y,
              `${width}px: portrait must be above the text (JS: ${javaScriptEnabled})`);
          } else {
            assert.ok(text.x + text.width <= photo.x,
              `${width}px: desktop text must remain left of the portrait`);
          }
        }
      } finally { await page.close(); }
    }
  });

  test(`${name}: transparent portrait and safe-area layout`, async () => {
    const browser = browsers.find(([n]) => n === name)[1];
    const page = await browser.newPage({viewport:{width:390,height:844}});
    try {
      await page.goto(base + '/#intro');
      assert.match(await page.locator('meta[name="viewport"]').getAttribute('content'), /viewport-fit=cover/);
      const alpha = await page.locator('.portrait-figure img').evaluate(async image => {
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image,0,0);
        return ctx.getImageData(0,0,1,1).data[3];
      });
      assert.equal(alpha,0,'portrait corner must be genuinely transparent');
      // Use a colored paper to verify the rendered face, not just the CSS value.
      await page.addStyleTag({content: ':root[data-theme] { --paper: #ff0000; }'});
      const portraitImage = page.locator('.portrait-figure img');
      const screenshot = await portraitImage.screenshot();
      const tinted = await page.evaluate(async data => {
        const image = new Image();
        image.src = 'data:image/png;base64,' + data;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image,0,0);
        const pixels = ctx.getImageData(0,0,image.width,image.height).data;
        let lightPixels = 0;
        for (let i=0;i<pixels.length;i+=4) {
          if (pixels[i]>120) {
            lightPixels++;
            if (pixels[i+1]>5 || pixels[i+2]>5) return false;
          }
        }
        return lightPixels>100;
      }, screenshot.toString('base64'));
      assert.ok(tinted,'light face and hair pixels must take their color from the paper');
      await page.addStyleTag({content: ':root[data-theme] { --paper: #f2eee5; }'});
      // Desktop engines expose zero system insets; simulate them to check layout math.
      await page.addStyleTag({content:':root { --safe-top:59px; --safe-bottom:34px; }'});
      assert.equal(await page.locator('body').evaluate(e=>getComputedStyle(e).paddingTop),'59px');
      assert.equal(await page.locator('body').evaluate(e=>getComputedStyle(e).paddingBottom),'34px');
      const portrait = await page.evaluate(()=>({
        header:document.querySelector('.site-header').getBoundingClientRect().top,
        footer:document.querySelector('.site-footer').getBoundingClientRect().bottom,
        height:innerHeight,
        overflow:document.documentElement.scrollHeight>innerHeight
      }));
      assert.ok(portrait.header>=59);
      assert.ok(portrait.footer<=portrait.height-34);
      assert.equal(portrait.overflow,false);
      await page.setViewportSize({width:844,height:390});
      await page.addStyleTag({content:':root { --safe-top:0px; --safe-bottom:21px; --safe-left:59px; --safe-right:59px; }'});
      await active(page,'intro');
      const landscape = await page.evaluate(()=>({
        left:document.querySelector('#previous-page').getBoundingClientRect().left,
        right:document.querySelector('#next-page').getBoundingClientRect().right,
        width:innerWidth
      }));
      assert.ok(landscape.left>=59);
      assert.ok(landscape.right<=landscape.width-59);
    } finally { await page.close(); }
  });
}
