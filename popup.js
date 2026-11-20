// Popup: current-zoom controls + the same settings the options page edits.
// Settings live in chrome.storage.sync so popup, options and every tab's
// content script stay in agreement.

const ZOOM_LEVELS = [
  0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0, 2.5,
  3.0, 4.0, 5.0,
];

function stepped(current, direction) {
  let best = 0, bestDist = Infinity;
  ZOOM_LEVELS.forEach((z, i) => {
    const d = Math.abs(z - current);
    if (d < bestDist) { bestDist = d; best = i; }
  });
  const next = Math.min(ZOOM_LEVELS.length - 1, Math.max(0, best + direction));
  return ZOOM_LEVELS[next];
}

let activeTabId = null;

async function refreshZoomLabel() {
  if (activeTabId == null) return;
  try {
    const zoom = await chrome.tabs.getZoom(activeTabId);
    document.getElementById("zoom-level").textContent =
      `${Math.round(zoom * 100)}%`;
  } catch { /* chrome:// etc. */ }
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTabId = tab?.id ?? null;
  await refreshZoomLabel();

  const settings = await chrome.storage.sync.get(["enabled", "hotkey"]);
  document.getElementById("enabled").checked = settings.enabled !== false;
  const hotkey = ["control", "alt", "meta"].includes(settings.hotkey)
    ? settings.hotkey : "control";
  document.querySelector(`input[name="hotkey"][value="${hotkey}"]`).checked = true;

  document.getElementById("enabled").addEventListener("change", (e) => {
    chrome.storage.sync.set({ enabled: e.target.checked });
  });
  document.querySelectorAll('input[name="hotkey"]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
      chrome.storage.sync.set({ hotkey: e.target.value });
    });
  });

  document.getElementById("zoom-in").addEventListener("click", async () => {
    if (activeTabId == null) return;
    const cur = await chrome.tabs.getZoom(activeTabId);
    await chrome.tabs.setZoom(activeTabId, stepped(cur, +1));
    refreshZoomLabel();
  });
  document.getElementById("zoom-out").addEventListener("click", async () => {
    if (activeTabId == null) return;
    const cur = await chrome.tabs.getZoom(activeTabId);
    await chrome.tabs.setZoom(activeTabId, stepped(cur, -1));
    refreshZoomLabel();
  });
  document.getElementById("zoom-level").addEventListener("click", async () => {
    if (activeTabId == null) return;
    await chrome.tabs.setZoom(activeTabId, 0); // 0 = default 100%
    refreshZoomLabel();
  });
}

init();
