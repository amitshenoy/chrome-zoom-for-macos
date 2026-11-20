// Background service worker: owns the actual zoom change.
//
// The content script decides *when* a step should happen (hotkey held,
// threshold reached, cooldown elapsed) and sends a single ZOOM_STEP message
// per step. This worker is a second guard: it enforces a minimum interval
// per tab so even a flood of messages can never produce a deep, fast zoom,
// and it applies exactly one Chrome zoom level per step (Cmd+ sensitivity).

import { ZOOM_LEVELS, steppedZoom } from "./shared.js";

const MIN_STEP_INTERVAL_MS = 80;
const lastStepAt = new Map(); // tabId -> timestamp

chrome.runtime.onInstalled.addListener(() => {
  // Seed defaults without overwriting an existing choice.
  chrome.storage.sync.get(["enabled", "hotkey"], (cur) => {
    const patch = {};
    if (cur.enabled === undefined) patch.enabled = true;
    if (!["control", "alt", "meta"].includes(cur.hotkey)) patch.hotkey = "control";
    if (Object.keys(patch).length) chrome.storage.sync.set(patch);
  });
});

async function applyStep(tabId, direction) {
  const now = Date.now();
  const last = lastStepAt.get(tabId) || 0;
  if (now - last < MIN_STEP_INTERVAL_MS) return; // second anti-runaway guard
  lastStepAt.set(tabId, now);

  try {
    const current = await chrome.tabs.getZoom(tabId);
    const target = steppedZoom(current, direction);
    if (target !== current) await chrome.tabs.setZoom(tabId, target);
  } catch {
    // Tab closed / chrome:// / Web Store page — zoom API is unavailable
    // there. Nothing to do; this is an expected, silent case.
  }
}

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg && msg.type === "ZOOM_STEP" && sender.tab && sender.tab.id != null) {
    const direction = msg.direction > 0 ? 1 : -1;
    applyStep(sender.tab.id, direction);
  } else if (msg && msg.type === "ZOOM_RESET" && sender.tab?.id != null) {
    chrome.tabs.setZoom(sender.tab.id, 0).catch(() => {}); // 0 = default (100%)
  }
  // No async response needed.
  return false;
});

// Popup asks for the active tab's zoom directly via chrome.tabs.getZoom,
// so no message handler is needed for that.

// Clean up per-tab throttle state when tabs close.
chrome.tabs.onRemoved.addListener((tabId) => lastStepAt.delete(tabId));

// Exposed for tests (harmless in production).
globalThis.__ZOOM_LEVELS__ = ZOOM_LEVELS;
