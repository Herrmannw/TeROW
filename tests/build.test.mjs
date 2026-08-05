import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";

const distUrl = new URL("../dist/", import.meta.url);
const html = await readFile(new URL("index.html", distUrl), "utf8");
const deploymentBase = "/TeROW";
const dom = new JSDOM(html, {
  url: `https://herrmannw.github.io${deploymentBase}/`,
});
const { document } = dom.window;

assert.doesNotMatch(html, /\/@fs\/|\/_image\?|127\.0\.0\.1|localhost/);
assert.equal(document.querySelectorAll(".service-card").length, 6);
assert.equal(document.querySelectorAll(".market-grid li").length, 8);
assert.equal(document.querySelectorAll(".service-catalog li").length, 20);
assert.equal(document.querySelectorAll(".gallery-card").length, 6);
assert.equal(document.querySelectorAll(".gallery-card__sample").length, 2);
assert.equal(document.querySelectorAll('a[href="#"]').length, 0);
assert.equal(
  document.title,
  "Commercial Landscaping & Land Management | TeROW Houston",
);
assert.match(
  document.querySelector('meta[name="description"]').content,
  /commercial landscaping and land management/i,
);
assert.doesNotMatch(
  document.body.textContent,
  /residential|homeowner|weekly upkeep|free estimate|sod installation|outdoor living/i,
);
assert.match(document.body.textContent, /832-692-4434/);
assert.match(document.body.textContent, /tx\.terow@gmail\.com/);

for (const anchor of document.querySelectorAll('a[href^="#"]')) {
  const target = anchor.getAttribute("href").slice(1);
  assert.ok(document.getElementById(target), `Anchor target #${target} exists.`);
}

for (const image of document.querySelectorAll("img")) {
  assert.ok(image.alt.trim(), `Image ${image.src} has descriptive alternative text.`);
}

const localReferences = new Set();
for (const element of document.querySelectorAll("[src], link[href]")) {
  const reference = element.getAttribute("src") ?? element.getAttribute("href");
  if (reference?.startsWith("/")) localReferences.add(reference);
}
for (const element of document.querySelectorAll("[srcset]")) {
  for (const candidate of element.getAttribute("srcset").split(",")) {
    const reference = candidate.trim().split(/\s+/)[0];
    if (reference.startsWith("/")) localReferences.add(reference);
  }
}
localReferences.add("/og.png");

for (const reference of localReferences) {
  const path = reference.startsWith(`${deploymentBase}/`)
    ? reference.slice(deploymentBase.length + 1)
    : reference.replace(/^\//, "");
  await access(new URL(path, distUrl));
}

assert.ok(
  localReferences.size > 30,
  "The generated responsive image and stylesheet assets were verified.",
);

console.log(
  `Static build check passed with ${localReferences.size} local asset references.`,
);
