(function (root) {
  "use strict";

  class FeedHintPreference {
    constructor(storage, key) {
      this.storage = storage || null;
      this.key = key;
      this.sessionDismissed = false;
    }

    isDismissed() {
      if (this.sessionDismissed) return true;
      try {
        return this.storage && this.storage.getItem(this.key) === "1";
      } catch (_error) {
        return false;
      }
    }

    dismiss() {
      this.sessionDismissed = true;
      try {
        if (this.storage) this.storage.setItem(this.key, "1");
      } catch (_error) {
        // Storage can be blocked for file:// or privacy-restricted contexts.
      }
    }
  }

  const api = { FeedHintPreference };
  root.YeluPreferences = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
