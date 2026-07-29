import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";

const baseUrl = "http://127.0.0.1:4321/";
const screenshotDir = "/tmp/terow-responsive";
const viewports = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

await mkdir(screenshotDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    const browserErrors = [];

    page.on("pageerror", (error) => browserErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(message.text());
    });

    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.waitForFunction(() =>
      document.querySelector(".hero__image-frame img")?.naturalWidth > 0,
    );

    const layout = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      brokenImages: [...document.images]
        .filter((image) => image.complete && image.naturalWidth === 0)
        .map((image) => image.getAttribute("src")),
      menuDisplay: getComputedStyle(
        document.querySelector("[data-menu-toggle]"),
      ).display,
      navDisplay: getComputedStyle(document.querySelector("[data-nav]")).display,
      mobileActionsDisplay: getComputedStyle(
        document.querySelector(".mobile-actions"),
      ).display,
    }));

    assert.ok(
      layout.scrollWidth <= layout.clientWidth + 1,
      `${viewport.width}×${viewport.height} has no horizontal overflow.`,
    );
    assert.deepEqual(
      layout.brokenImages,
      [],
      `${viewport.width}×${viewport.height} has no broken images.`,
    );

    if (viewport.width <= 860) {
      assert.notEqual(layout.menuDisplay, "none", "Compact layouts show the menu button.");
      assert.equal(layout.navDisplay, "none", "Compact navigation starts closed.");
    } else {
      assert.equal(layout.menuDisplay, "none", "Wide layouts hide the menu button.");
      assert.equal(layout.navDisplay, "flex", "Wide layouts show primary navigation.");
    }

    if (viewport.width <= 620) {
      assert.equal(
        layout.mobileActionsDisplay,
        "grid",
        "Phone layouts show fixed quick actions.",
      );
    } else {
      assert.equal(
        layout.mobileActionsDisplay,
        "none",
        "Larger layouts do not show fixed phone actions.",
      );
    }

    assert.deepEqual(
      browserErrors,
      [],
      `${viewport.width}×${viewport.height} emits no browser errors.`,
    );

    await page.screenshot({
      path: `${screenshotDir}/${viewport.width}x${viewport.height}-top.png`,
    });

    if (viewport.width === 390 || viewport.width === 1440) {
      await page.evaluate(async () => {
        const pause = () => new Promise((resolve) => setTimeout(resolve, 100));
        for (
          let position = 0;
          position < document.documentElement.scrollHeight;
          position += Math.min(window.innerHeight * 0.7, 600)
        ) {
          window.scrollTo(0, position);
          await pause();
        }
      });
      await page.waitForFunction(
        () =>
          [...document.images].every(
            (image) => image.complete && image.naturalWidth > 0,
          ),
        { timeout: 10_000 },
      );
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(150);
      const failedLazyImages = await page.evaluate(() =>
        [...document.images]
          .filter((image) => image.complete && image.naturalWidth === 0)
          .map((image) => image.getAttribute("src")),
      );
      assert.deepEqual(
        failedLazyImages,
        [],
        `${viewport.width}×${viewport.height} has no broken lazy-loaded images.`,
      );
      await page.screenshot({
        path: `${screenshotDir}/${viewport.width}x${viewport.height}-full.png`,
        fullPage: true,
      });
    }

    if (viewport.width === 390) {
      const menu = page.locator("[data-menu-toggle]");
      const nav = page.locator("[data-nav]");
      await menu.click();
      await assert.doesNotReject(() => nav.waitFor({ state: "visible" }));
      assert.equal(await menu.getAttribute("aria-expanded"), "true");
      await page.keyboard.press("Escape");
      await assert.doesNotReject(() => nav.waitFor({ state: "hidden" }));

      await page.locator("#contact").scrollIntoViewIfNeeded();
      await page.locator(".form-submit").click();
      await assert.doesNotReject(() =>
        page.locator("#form-summary").waitFor({ state: "visible" }),
      );
      assert.match(await page.locator("#form-summary").innerText(), /7 fields/);

      await page.locator("#full-name").fill("Taylor Green");
      await page
        .locator("#service")
        .selectOption({ label: "Lawn care & maintenance" });
      await page
        .locator('input[name="propertyType"][value="Residential"]')
        .check();
      await page.locator("#email").fill("taylor@example.com");
      await page.locator("#location").fill("Houston, TX");
      await page
        .locator("#project-details")
        .fill("Weekly mowing and edging for the front and back lawn.");
      await page.locator("#consent").check();
      await page.locator(".form-submit").click();
      await assert.doesNotReject(() =>
        page.locator("[data-form-success]").waitFor({ state: "visible" }),
      );
      assert.match(
        await page.locator("[data-form-success]").innerText(),
        /nothing was sent or saved/,
      );
      await page.locator("[data-form-reset]").click();
      await assert.doesNotReject(() =>
        page.locator("[data-estimate-form]").waitFor({ state: "visible" }),
      );

      await page.screenshot({
        path: `${screenshotDir}/390x844-contact.png`,
      });
    }

    await page.close();
  }

  const reducedMotionPage = await browser.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  await reducedMotionPage.goto(baseUrl, { waitUntil: "networkidle" });
  assert.equal(
    await reducedMotionPage.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    ),
    "auto",
    "Reduced-motion preference disables smooth scrolling.",
  );
  await reducedMotionPage.close();
} finally {
  await browser.close();
}

console.log(
  `Responsive checks passed at ${viewports
    .map(({ width, height }) => `${width}×${height}`)
    .join(", ")}.`,
);
