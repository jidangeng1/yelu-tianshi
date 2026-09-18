"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const config = require("../js/config.js");
const { FeedHintPreference } = require("../js/preferences.js");

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, value)
  };
}

test("shows initially, persists dismissal, and stays dismissed after reload", () => {
  const storage = memoryStorage();
  const key = config.preferences.feedHintDismissedKey;
  const firstVisit = new FeedHintPreference(storage, key);
  assert.equal(firstVisit.isDismissed(), false);
  firstVisit.dismiss();
  assert.equal(firstVisit.isDismissed(), true);
  const refreshedVisit = new FeedHintPreference(storage, key);
  assert.equal(refreshedVisit.isDismissed(), true);
});

test("falls back to session dismissal when storage access fails", () => {
  const blockedStorage = {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("blocked"); }
  };
  const preference = new FeedHintPreference(blockedStorage, "test-key");
  assert.equal(preference.isDismissed(), false);
  assert.doesNotThrow(() => preference.dismiss());
  assert.equal(preference.isDismissed(), true);
});
