"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const artifacts = path.join(root, "test-results");
const contentTypes = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript" };

function startServer() {
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url, "http://127.0.0.1").pathname;
    const relative = pathname === "/" ? "index.html" : pathname.slice(1);
    const file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    fs.readFile(file, (error, data) => {
      if (error) { response.writeHead(404).end(); return; }
      response.setHeader("Content-Type", contentTypes[path.extname(file)] || "application/octet-stream");
      response.writeHead(200); response.end(data);
    });
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

function collectErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  return errors;
}

async function addRandomSequence(page, values) {
  await page.addInitScript((sequence) => {
    const items = sequence.slice();
    window.__YELU_RANDOM__ = () => items.shift() ?? 0;
  }, values);
}

let server;
let browser;

(async () => {
  fs.mkdirSync(artifacts, { recursive: true });
  server = await startServer();
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = collectErrors(page);
  await addRandomSequence(page, [0.4, 0.2]);

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  const initial = await page.evaluate(() => ({
    state: window.__YELU_M0__.machine.state,
    hintVisible: !document.getElementById("feed-hint").classList.contains("hidden"),
    canvas: [document.getElementById("scene").width, document.getElementById("scene").height],
    assetPack: window.__YELU_M0__.assetPack.id,
    placeholder: window.__YELU_M0__.assetPack.placeholder
  }));
  assert.deepEqual(initial.canvas, [390, 844]);
  assert.equal(initial.state, "IDLE");
  assert.equal(initial.hintVisible, true);
  assert.equal(initial.assetPack, "m0-canvas-placeholder");
  assert.equal(initial.placeholder, true);
  await page.screenshot({ path: path.join(artifacts, "idle.png") });

  await page.click("#feed-button");
  const afterClick = await page.evaluate(() => ({
    locked: window.__YELU_M0__.machine.locked,
    cycle: window.__YELU_M0__.machine.cycle,
    hintHidden: document.getElementById("feed-hint").classList.contains("hidden")
  }));
  assert.deepEqual(afterClick, { locked: true, cycle: 1, hintHidden: true });
  const repeated = await page.evaluate(() => {
    document.getElementById("feed-button").disabled = false;
    document.getElementById("feed-button").click();
    return window.__YELU_M0__.machine.cycle;
  });
  assert.equal(repeated, 1);

  await page.waitForFunction(() => window.__YELU_M0__.machine.state === "POOP");
  await page.screenshot({ path: path.join(artifacts, "poop.png") });
  await page.waitForFunction(() => window.__YELU_M0__.machine.state === "IDLE" && !window.__YELU_M0__.machine.locked, null, { timeout: 6000 });
  const completed = await page.evaluate(() => ({
    events: window.__YELU_M0__.sound.events,
    buttonDisabled: document.getElementById("feed-button").disabled
  }));
  assert.deepEqual(completed.events, ["swallow", "plop"]);
  assert.equal(completed.buttonDisabled, false);

  await page.reload({ waitUntil: "networkidle" });
  const persisted = await page.evaluate(() => ({
    hintHidden: document.getElementById("feed-hint").classList.contains("hidden"),
    stored: localStorage.getItem(window.YeluConfig.preferences.feedHintDismissedKey)
  }));
  assert.deepEqual(persisted, { hintHidden: true, stored: "1" });

  const branchChecks = [];
  for (const testCase of [
    { values: [0.01, 0.1], target: "left", variant: "direct" },
    { values: [0.01, 0.9], target: "left", variant: "flutter" },
    { values: [0.4, 0.1], target: "center", variant: "direct" },
    { values: [0.4, 0.9], target: "center", variant: "flutter" },
    { values: [0.99, 0.1], target: "right", variant: "direct" },
    { values: [0.99, 0.9], target: "right", variant: "flutter" }
  ]) {
    const branchPage = await context.newPage();
    await addRandomSequence(branchPage, testCase.values);
    await branchPage.goto(baseUrl, { waitUntil: "load" });
    await branchPage.click("#feed-button");
    const actual = await branchPage.evaluate(() => ({
      target: window.__YELU_M0__.machine.snapshot(performance.now()).target.id,
      variant: window.__YELU_M0__.machine.swallowVariant
    }));
    assert.deepEqual(actual, { target: testCase.target, variant: testCase.variant });
    branchChecks.push(actual);
    await branchPage.close();
  }

  const filePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const fileErrors = collectErrors(filePage);
  await filePage.goto(pathToFileURL(path.join(root, "index.html")).href, { waitUntil: "load" });
  await filePage.waitForFunction(() => Boolean(window.__YELU_M0__));
  assert.equal(await filePage.evaluate(() => window.__YELU_M0__.machine.state), "IDLE");
  assert.deepEqual(fileErrors, []);
  assert.deepEqual(errors, []);

  const result = { initial, afterClick, repeated, completed, persisted, branchChecks, errors, fileErrors };
  fs.writeFileSync(path.join(artifacts, "browser-result.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  if (browser) await browser.close().catch(() => {});
  if (server) await new Promise((resolve) => server.close(resolve));
});
