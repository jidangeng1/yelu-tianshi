"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require(process.env.YELU_PLAYWRIGHT_PATH);

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
  await page.screenshot({ path: "/tmp/yelu-idle.png" });
  const initial = await page.evaluate(() => ({
    state: window.__YELU_M0__.machine.state,
    hint: !document.getElementById("feed-hint").classList.contains("hidden"),
    canvas: [document.getElementById("scene").width, document.getElementById("scene").height]
  }));

  await page.click("#feed-button");
  await page.waitForTimeout(900);
  await page.screenshot({ path: "/tmp/yelu-strike.png" });
  const during = await page.evaluate(() => ({
    state: window.__YELU_M0__.machine.state,
    locked: window.__YELU_M0__.machine.locked,
    cycle: window.__YELU_M0__.machine.cycle,
    hintHidden: document.getElementById("feed-hint").classList.contains("hidden")
  }));
  await page.evaluate(() => {
    document.getElementById("feed-button").disabled = false;
    document.getElementById("feed-button").click();
  });
  const repeatedCycle = await page.evaluate(() => window.__YELU_M0__.machine.cycle);

  await page.waitForTimeout(1500);
  await page.screenshot({ path: "/tmp/yelu-poop.png" });
  await page.waitForFunction(() => window.__YELU_M0__.machine.state === "IDLE" && !window.__YELU_M0__.machine.locked, null, { timeout: 5000 });
  await page.screenshot({ path: "/tmp/yelu-restored.png" });
  const final = await page.evaluate(() => ({
    state: window.__YELU_M0__.machine.state,
    locked: window.__YELU_M0__.machine.locked,
    buttonDisabled: document.getElementById("feed-button").disabled
  }));

  const branchChecks = [];
  for (const targetIndex of [0, 1, 2]) {
    for (const variant of ["direct", "flutter"]) {
      await page.evaluate(({ targetIndex, variant }) => {
        const machine = window.__YELU_M0__.machine;
        machine.targetIndex = targetIndex;
        machine.swallowVariant = variant;
        machine.locked = true;
        machine.enter("STRIKE", performance.now() - 145);
      }, { targetIndex, variant });
      await page.waitForTimeout(50);
      branchChecks.push(await page.evaluate(() => ({
        target: window.__YELU_M0__.machine.snapshot(performance.now()).target.id,
        variant: window.__YELU_M0__.machine.swallowVariant,
        state: window.__YELU_M0__.machine.state
      })));
    }
  }

  const filePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const fileErrors = [];
  filePage.on("pageerror", (error) => fileErrors.push(String(error)));
  await filePage.goto(pathToFileURL(path.join(process.cwd(), "index.html")).href, { waitUntil: "load" });
  await filePage.waitForFunction(() => Boolean(window.__YELU_M0__));
  const directFileState = await filePage.evaluate(() => window.__YELU_M0__.machine.state);

  const result = { initial, during, repeatedCycle, final, branchChecks, directFileState, fileErrors, errors };
  fs.writeFileSync("/tmp/yelu-browser-result.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
  if (errors.length || fileErrors.length || directFileState !== "IDLE" || branchChecks.length !== 6 || !initial.hint || initial.state !== "IDLE" || !during.locked || repeatedCycle !== 1 || final.state !== "IDLE" || final.locked || final.buttonDisabled) process.exitCode = 1;
})().catch((error) => { console.error(error); process.exitCode = 1; });
