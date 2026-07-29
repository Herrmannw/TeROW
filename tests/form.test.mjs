import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";

const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
const dom = new JSDOM(html, {
  runScripts: "outside-only",
  url: "https://example.com/",
});
const { document, Event, KeyboardEvent } = dom.window;
const siteScript = [...document.querySelectorAll("script")].at(-1);

assert.ok(siteScript?.textContent, "The production interaction script is present.");
dom.window.eval(siteScript.textContent);

const form = document.querySelector("#estimate-form");
const success = document.querySelector("[data-form-success]");
const summary = document.querySelector("#form-summary");

assert.ok(form && success && summary, "The estimate form and feedback regions exist.");

const submit = () =>
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

submit();
assert.equal(summary.hidden, false, "Blank submission shows the error summary.");
assert.match(summary.textContent, /7 fields/, "Every required field group is counted.");
assert.match(
  document.querySelector("#contact-method-error").textContent,
  /phone number or email/,
  "At least one contact method is required.",
);
assert.equal(
  document.activeElement.id,
  "full-name",
  "The first invalid field receives focus.",
);

document.querySelector("#full-name").value = "Taylor Green";
document.querySelector("#service").value = "Lawn care & maintenance";
document.querySelector('input[name="propertyType"][value="Residential"]').checked =
  true;
document.querySelector("#location").value = "Houston, TX";
document.querySelector("#project-details").value =
  "Weekly mowing and edging for the front and back lawn.";
document
  .querySelector("#project-details")
  .dispatchEvent(new Event("input", { bubbles: true }));
document.querySelector("#consent").checked = true;
document.querySelector("#phone").value = "123";

submit();
assert.match(
  document.querySelector("#contact-method-error").textContent,
  /at least 10 digits/,
  "Short phone numbers are rejected.",
);

document.querySelector("#phone").value = "";
document.querySelector("#email").value = "not-an-email";
submit();
assert.match(
  document.querySelector("#contact-method-error").textContent,
  /valid email/,
  "Invalid email addresses are rejected.",
);

document.querySelector("#email").value = "taylor@example.com";
submit();
assert.equal(form.hidden, true, "A valid request hides the form.");
assert.equal(success.hidden, false, "A valid request shows the demo success state.");
assert.match(
  success.textContent,
  /nothing was sent or saved/,
  "The success state clearly explains demo behavior.",
);

document.querySelector("[data-form-reset]").click();
assert.equal(form.hidden, false, "The reset action restores the form.");
assert.equal(success.hidden, true, "The reset action hides the success state.");

const menuButton = document.querySelector("[data-menu-toggle]");
const navigation = document.querySelector("[data-nav]");
menuButton.click();
assert.equal(menuButton.getAttribute("aria-expanded"), "true");
assert.equal(navigation.hasAttribute("data-open"), true);
document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
assert.equal(menuButton.getAttribute("aria-expanded"), "false");
assert.equal(navigation.hasAttribute("data-open"), false);

assert.equal(
  document.querySelector("[data-current-year]").textContent,
  String(new Date().getFullYear()),
  "The footer year is current.",
);

console.log("Form, success/reset, and navigation interaction checks passed.");
