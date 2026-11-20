// Shared constants — used by background.js (module import) and mirrored in
// content.js / popup.js (content scripts and pages can't all share a module
// graph the same way, so the values are kept identical there and covered by
// tests/zoom-logic.test.js).

// Exactly the zoom factors Chrome itself cycles through with Cmd+ / Cmd-
// on macOS (and Ctrl+ / Ctrl- on Windows). One wheel step moves exactly one
// entry in this list — that is what "same sensitivity as Cmd+" means.
// Source: Chrome's built-in zoom levels: 25 33 50 67 75 80 90 100 110 125
// 150 175 200 250 300 400 500 (%).
export const ZOOM_LEVELS = [
  0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0, 2.5,
  3.0, 4.0, 5.0,
];

export const DEFAULT_SETTINGS = {
  enabled: true,
  // 'control' | 'alt' (Option) | 'meta' (Command)
  hotkey: "control",
};

// Anti-deep-zoom tuning (see content.js for how these are applied):
// - A mouse-wheel notch reports ~100-120 deltaY (pixels), so a 48px
//   threshold means one notch comfortably triggers exactly one step.
// - After a step, all further wheel input is swallowed for COOLDOWN_MS.
//   A trackpad flick / mouse free-spin fires dozens of events with momentum;
//   without this window one flick would burn through many zoom levels.
// - The accumulator decays after DECAY_MS of quiet, so slow, separate
//   scroll ticks never add up into a surprise zoom.
export const THRESHOLD_PX = 48;
export const COOLDOWN_MS = 140;
export const DECAY_MS = 100;

/** Index of the ZOOM_LEVELS entry closest to `zoom`. */
export function nearestLevelIndex(zoom) {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < ZOOM_LEVELS.length; i++) {
    const d = Math.abs(ZOOM_LEVELS[i] - zoom);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

/** The zoom factor one step from `currentZoom` in `direction` (+1 in, -1 out). */
export function steppedZoom(currentZoom, direction) {
  const idx = nearestLevelIndex(currentZoom);
  const next = Math.min(
    ZOOM_LEVELS.length - 1,
    Math.max(0, idx + (direction > 0 ? 1 : -1)),
  );
  return ZOOM_LEVELS[next];
}
