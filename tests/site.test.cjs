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
  );
}
async function go(page, id) {
  await page.locator(`.site-nav a[href="#${id}"]`).click();
  await active(page, id);
}

for (const name of names) {
  test(`${name}: repeated native trackpad swipes, reversals and endpoints`, async () => {
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
      for (const [width, height] of [
        [1440, 900],
        [1024, 768],
        [390, 844],
        [320, 568],
        [768, 1024],
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
      await go(page, "experience"); // Reselecting the current page preserves reading position.
      assert.equal(
        await page.locator("#experience").evaluate((e) => e.scrollTop),
        top,
      );
      await page.setViewportSize({ width: 1200, height: 800 });
      await active(page, "experience");
      assert.deepEqual(errors, []);
      const resources = await page.evaluate(() =>
        performance.getEntriesByType("resource").map((r) => r.name),
      );
      assert.equal(
        resources.filter((url) => url.includes("transcity-regular.otf")).length,
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
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 });
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
