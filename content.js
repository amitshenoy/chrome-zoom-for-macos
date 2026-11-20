// Content script: watches wheel events, and when the user's chosen hotkey
// is held, turns scrolling into discrete zoom steps.
//
// Why the logic lives here: the page must not scroll while the user is
// zooming, so we have to preventDefault() in the wheel handler itself —
// and only when the hotkey matches, otherwise normal scrolling must be
// completely untouched.
//
// Sensitivity design (the important part):
//   Chrome's Cmd+ moves exactly ONE zoom level per press
//   (100% -> 110% -> 125% -> ...). A scroll wheel / trackpad does not fire
//   once per "press" — a mouse notch fires once, a trackpad flick fires
//   dozens of times with momentum. Mapping every event to a step would
//   zoom wildly deep. So:
//   1. Deltas accumulate until THRESHOLD_PX is reached -> exactly 1 step.
//      (One mouse notch is ~100-120px, so one notch = one step.)
//   2. After a step, a COOLDOWN_MS window swallows ALL further wheel
//      input (still preventDefault-ing so the page doesn't scroll).
//      Momentum from a flick dies inside this window instead of stacking
//      steps. Max zoom speed is therefore ~7 levels/second even if you
//      spin as hard as you can — and a single flick gives a single step.
//   3. The accumulator resets after DECAY_MS of quiet, so slow, unrelated
//      ticks never sum into a surprise step.

(() => {
  "use strict";

  const THRESHOLD_PX = 48;
  const COOLDOWN_MS = 140;
  const DECAY_MS = 100;

  let settings = { enabled: true, hotkey: "control" };

  chrome.storage.sync.get(["enabled", "hotkey"], (cur) => {
    if (cur) {
      if (typeof cur.enabled === "boolean") settings.enabled = cur.enabled;
      if (["control", "alt", "meta"].includes(cur.hotkey)) settings.hotkey = cur.hotkey;
    }
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    if (changes.enabled) settings.enabled = changes.enabled.newValue !== false;
    if (changes.hotkey && ["control", "alt", "meta"].includes(changes.hotkey.newValue)) {
      settings.hotkey = changes.hotkey.newValue;
    }
    // Changing the hotkey mid-gesture should not carry a half-accumulated
    // scroll into the new key.
    accumulator = 0;
  });

  function hotkeyHeld(e) {
    const want = {
      control: e.ctrlKey,
      alt: e.altKey,
      meta: e.metaKey,
    };
    if (!want[settings.hotkey]) return false;
    // Strict: the other two modifiers must be up. This avoids clashing
    // with combos like Cmd+Ctrl+scroll and with macOS system gestures.
    // (Shift is ignored — Shift+hotkey+scroll still zooms.)
    for (const key of Object.keys(want)) {
      if (key !== settings.hotkey && want[key]) return false;
    }
    return true;
  }

  let accumulator = 0;
  let lastWheelAt = 0;
  let cooldownUntil = 0;

  function normalizeDelta(e) {
    // deltaMode: 0 = pixels, 1 = lines, 2 = pages.
    // Mouse wheels in line mode report ~3 lines/notch; pixels ~100/notch.
    // Normalise everything to pixel-equivalents so the threshold behaves
    // the same for mouse and trackpad.
    if (e.deltaMode === 1) return e.deltaY * 33;
    if (e.deltaMode === 2) return e.deltaY * 800;
    return e.deltaY;
  }

  function onWheel(e) {
    if (!settings.enabled) return;
    if (!hotkeyHeld(e)) return;

    // From here the gesture is ours: never let the page scroll with the
    // zoom hotkey held — including during cooldown.
    e.preventDefault();
    e.stopPropagation();

    const now = performance.now();
    if (now < cooldownUntil) return; // momentum / free-spin dies here

    if (now - lastWheelAt > DECAY_MS) accumulator = 0;
    lastWheelAt = now;

    // Use the dominant axis so a mostly-horizontal scroll doesn't zoom.
    const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? normalizeDelta(e) : 0;
    accumulator += delta;

    if (Math.abs(accumulator) >= THRESHOLD_PX) {
      const direction = accumulator < 0 ? 1 : -1; // scroll up = zoom in
      accumulator = 0;
      cooldownUntil = now + COOLDOWN_MS;
      try {
        chrome.runtime.sendMessage({ type: "ZOOM_STEP", direction });
      } catch {
        // Extension reloaded while page is open — ignore until refresh.
      }
    }
  }

  // capture: true so we win over page handlers that might stopPropagation;
  // passive: false is required for preventDefault() to work.
  window.addEventListener("wheel", onWheel, { capture: true, passive: false });
})();
