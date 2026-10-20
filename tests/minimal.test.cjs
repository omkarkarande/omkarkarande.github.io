const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const engines = require("playwright");
const root = path.resolve(__dirname, "..");
const browsers = {};
let server, base;
before(async () => {
  server = http.createServer(async (req, res) => {
    try {
      const name = new URL(req.url, "http://localhost").pathname;
      const file = path.join(
        root,
        name.endsWith("/") ? name + "index.html" : name,
      );
      const data = await fs.readFile(file);
      res.setHeader(
        "Content-Type",
        {
          ".html": "text/html",
          ".css": "text/css",
          ".js": "text/javascript",
          ".svg": "image/svg+xml",
          ".woff2": "font/woff2",
        }[path.extname(file)] || "application/octet-stream",
      );
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  for (const name of (process.env.TEST_BROWSERS || "chromium").split(","))
    browsers[name] = await engines[name].launch();
});
after(async () => {
  await Promise.all(Object.values(browsers).map((browser) => browser.close()));
  await new Promise((resolve) => server.close(resolve));
});
for (const name of (process.env.TEST_BROWSERS || "chromium").split(",")) {
  test(`${name}: responsive, accessible, and fully functional without JavaScript`, async () => {
    for (const javaScriptEnabled of [true, false]) {
      const page = await browsers[name].newPage({
        javaScriptEnabled,
        reducedMotion: "reduce",
      });
      const failures = [];
      page.on("pageerror", (error) => failures.push(error.message));
      page.on("response", (response) => {
        if (response.status() >= 400) failures.push(response.url());
      });
      try {
        for (const width of [320, 390, 768, 1440]) {
          await page.setViewportSize({ width, height: 900 });
          await page.goto(base);
          await page.evaluate(async () => {
            await document.fonts.ready;
            await Promise.all(
              [...document.images].map((image) => {
                image.loading = "eager";
                return image.decode();
              }),
            );
          });
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            `overflow at ${width}`,
          );
          for (const figure of await page.locator(".hairline-figure").all())
            assert.ok(await figure.locator("img").isVisible());
          assert.ok(
            await page.evaluate(() => document.fonts.check("20px Anton")),
          );
          assert.ok(
            await page
              .locator("h1")
              .evaluate((el) => el.scrollWidth <= el.clientWidth),
          );
          assert.equal(await page.locator("header, nav").count(), 0);
          assert.ok(
            (await page.locator("a").allTextContents()).every(
              (text) => !text.includes("↗"),
            ),
            "Links must not include emoji-style diagonal arrows",
          );
          const layout = await page.evaluate(() => {
            const style = (selector) =>
              getComputedStyle(document.querySelector(selector));
            return {
              margin: document.querySelector(".shell").getBoundingClientRect()
                .left,
              title: parseFloat(style("h1").fontSize),
              sectionFont: style("h2").fontFamily,
              itemFont: style("h3").fontFamily,
              sectionSize: parseFloat(style("h2").fontSize),
              itemSize: parseFloat(style("h3").fontSize),
              borders: [
                ...document.querySelectorAll(
                  ".timeline-entry, .work-item, .other-list > div, .earlier, .section-tail",
                ),
              ].map((el) => getComputedStyle(el).borderTopWidth),
            };
          });
          assert.ok(layout.margin <= (width <= 700 ? 16 : 120));
          assert.ok(layout.title <= 112);
          assert.notEqual(layout.sectionFont, layout.itemFont);
          assert.ok(layout.sectionSize < layout.itemSize);
          assert.ok(layout.borders.every((value) => value === "0px"));
          const edges = await page
            .locator(
              "h1, h2, .timeline-entry > div, .work-copy, .other-list dd",
            )
            .evaluateAll((els) =>
              els.map((el) => el.getBoundingClientRect().left),
            );
          assert.ok(
            edges.every((x) => Math.abs(x - edges[0]) < 1),
            `unaligned text at ${width}: ${edges}`,
          );
          await page.goto(`${base}/#work`);
          assert.equal(new URL(page.url()).hash, "#work");
          assert.ok(
            Math.abs((await page.locator("#work").boundingBox()).y - 32) < 3,
          );
          await page.goBack();
          assert.equal(new URL(page.url()).hash, "");
          if (process.env.TEST_SCREENSHOTS && [390, 1440].includes(width)) {
            await fs.mkdir(process.env.TEST_SCREENSHOTS, { recursive: true });
            await page.evaluate(() => {
              document.activeElement.blur();
              scrollTo(0, 0);
            });
            await page.screenshot({
              path: path.join(
                process.env.TEST_SCREENSHOTS,
                `${name}-${width}-${javaScriptEnabled ? "static" : "nojs"}.png`,
              ),
              fullPage: true,
            });
          }
        }
        if (javaScriptEnabled) {
          await page.addScriptTag({
            path: require.resolve("axe-core/axe.min.js"),
          });
          const result = await page.evaluate(async () =>
            axe.run(document, {
              runOnly: {
                type: "tag",
                values: ["wcag2a", "wcag2aa", "wcag21aa"],
              },
            }),
          );
          assert.deepEqual(
            result.violations.map((v) => ({
              id: v.id,
              nodes: v.nodes.map((n) => n.target),
            })),
            [],
          );
        }
        for (const anchor of await page.locator('a[href^="#"]').all()) {
          const href = await anchor.getAttribute("href");
          assert.equal(await page.locator(href).count(), 1, href);
        }
        await page.emulateMedia({ media: "print" });
        assert.equal(
          await page
            .locator("body")
            .evaluate((el) => getComputedStyle(el).backgroundColor),
          "rgb(255, 255, 255)",
        );
        assert.deepEqual(failures, []);
      } finally {
        await page.close();
      }
    }
  });
  test(`${name}: all six Hairline figures enhance and tear down for reduced motion`, async () => {
    const page = await browsers[name].newPage({
      viewport: { width: 390, height: 844 },
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      await page.goto(base);
      await page.waitForFunction(
        () => document.querySelectorAll(".hairline-figure > svg").length === 6,
      );
      for (const figure of await page.locator(".hairline-figure").all()) {
        assert.equal(await figure.locator("img").isVisible(), false);
        assert.equal(
          await figure.evaluate((el) =>
            getComputedStyle(el).getPropertyValue("--hairline-plate").trim(),
          ),
          "#060606",
        );
        await figure.scrollIntoViewIfNeeded();
        assert.ok(await figure.locator("svg").isVisible());
      }
      if (process.env.TEST_SCREENSHOTS) {
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({
          path: path.join(
            process.env.TEST_SCREENSHOTS,
            `${name}-390-enhanced.png`,
          ),
          fullPage: true,
        });
      }
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.waitForFunction(
        () => !document.querySelector(".hairline-figure > svg"),
      );
      for (const figure of await page.locator(".hairline-figure").all())
        assert.ok(await figure.locator("img").isVisible());
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.waitForFunction(
        () => document.querySelectorAll(".hairline-figure > svg").length === 6,
      );
      assert.deepEqual(errors, []);
    } finally {
      await page.close();
    }
  });
  test(`${name}: original professional and project copy and destinations are preserved`, async () => {
    const oldHTML = execFileSync(
      "git",
      ["show", "magazine-design:index.html"],
      { cwd: root, encoding: "utf8" },
    );
    const oldPage = await browsers[name].newPage({ javaScriptEnabled: false });
    const page = await browsers[name].newPage({ javaScriptEnabled: false });
    const normalize = (value) => value.replace(/\s+/g, " ").trim();
    try {
      await oldPage.setContent(oldHTML);
      await page.goto(base);
      for (const selector of [
        ".timeline-entry div > p:last-child",
        ".work-copy > p:last-child",
      ]) {
        assert.deepEqual(
          (await page.locator(selector).allTextContents()).map(normalize),
          (await oldPage.locator(selector).allTextContents()).map(normalize),
        );
      }
      assert.deepEqual(
        await page
          .locator(".work-copy h3 a")
          .evaluateAll((links) => links.map((a) => a.href)),
        await oldPage
          .locator(".work-copy h3 a")
          .evaluateAll((links) => links.map((a) => a.href)),
      );
    } finally {
      await page.close();
      await oldPage.close();
    }
  });
  test(`${name}: minimal dark list portfolio`, async () => {
    const page = await browsers[name].newPage({
      colorScheme: "light",
      reducedMotion: "reduce",
    });
    try {
      await page.goto(base);
      assert.equal(
        await page
          .locator("body")
          .evaluate((el) => getComputedStyle(el).backgroundColor),
        "rgb(6, 6, 6)",
      );
      assert.equal(await page.locator("h1").innerText(), "OMI");
      assert.equal(
        await page.locator(".theme-toggle, .portrait-figure").count(),
        0,
      );
      assert.deepEqual(await page.locator("main h2").allTextContents(), [
        "Experience",
        "Projects",
        "Other stuff",
      ]);
      assert.equal(await page.locator(".timeline-entry").count(), 4);
      assert.equal(await page.locator(".work-item").count(), 6);
      assert.equal(await page.locator(".work-item [data-figure]").count(), 6);
      assert.equal(
        await page.locator("#fleu h3 a").getAttribute("href"),
        "https://fleu.app/",
      );
      assert.equal(
        await page
          .locator("h1")
          .evaluate((el) => getComputedStyle(el).fontFamily.includes("Anton")),
        true,
      );
    } finally {
      await page.close();
    }
  });
}
