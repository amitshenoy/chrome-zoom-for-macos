// Options page: same storage keys as the popup.
(async () => {
  const settings = await chrome.storage.sync.get(["enabled", "hotkey"]);
  const enabledEl = document.getElementById("enabled");
  enabledEl.checked = settings.enabled !== false;
  const hotkey = ["control", "alt", "meta"].includes(settings.hotkey)
    ? settings.hotkey : "control";
  document.querySelector(`input[name="hotkey"][value="${hotkey}"]`).checked = true;

  enabledEl.addEventListener("change", (e) =>
    chrome.storage.sync.set({ enabled: e.target.checked }));
  document.querySelectorAll('input[name="hotkey"]').forEach((radio) =>
    radio.addEventListener("change", (e) =>
      chrome.storage.sync.set({ hotkey: e.target.value })));
})();
