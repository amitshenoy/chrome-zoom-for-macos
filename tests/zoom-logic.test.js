// Node tests for the zoom-stepping and anti-runaway logic.
// Run: node --test tests/zoom-logic.test.js  (or: node tests/zoom-logic.test.js)
import { test } from "node:test";
import assert from "node:assert/strict";
import { ZOOM_LEVELS, steppedZoom, nearestLevelIndex, THRESHOLD_PX, COOLDOWN_MS } from "../shared.js";

test("zoom levels are Chrome's own Cmd+ levels", () => {
  assert.deepEqual(
    ZOOM_LEVELS.map((z) => Math.round(z * 100)),
    [25, 33, 50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200, 250, 300, 400, 500],
  );
});

test("one step from 100% in = 110%, out = 90% (Cmd+ sensitivity)", () => {
  assert.equal(steppedZoom(1.0, +1), 1.1);
  assert.equal(steppedZoom(1.0, -1), 0.9);
});

test("steps clamp at min and max", () => {
  assert.equal(steppedZoom(0.25, -1), 0.25);
  assert.equal(steppedZoom(5.0, +1), 5.0);
});

test("non-standard current zoom snaps to nearest level first", () => {
  // e.g. a page set to 103% by Chrome's per-site memory
  assert.equal(nearestLevelIndex(1.03), ZOOM_LEVELS.indexOf(1.0));
  assert.equal(steppedZoom(1.03, +1), 1.1);
});

test("threshold is less than one mouse notch (~100px) so one notch = one step", () => {
  assert.ok(THRESHOLD_PX < 100 && THRESHOLD_PX > 0);
});

test("cooldown bounds max zoom speed", () => {
  // Even with infinite scroll events, steps/sec <= 1000/cooldown
  assert.ok(1000 / COOLDOWN_MS <= 8, "max ~7 steps/sec");
});

// Simulate the content-script accumulator against a trackpad flick:
// 30 events of 20px in 60ms should produce exactly ONE step, not six.
test("trackpad flick produces a single step", () => {
  let accumulator = 0, cooldownUntil = 0, steps = 0, lastWheelAt = 0;
  const DECAY_MS = 100;
  function onWheel(deltaY, now) {
    if (now < cooldownUntil) return;
    if (now - lastWheelAt > DECAY_MS) accumulator = 0;
    lastWheelAt = now;
    accumulator += deltaY;
    if (Math.abs(accumulator) >= THRESHOLD_PX) {
      steps++; accumulator = 0; cooldownUntil = now + COOLDOWN_MS;
    }
  }
  for (let i = 0; i < 30; i++) onWheel(-20, i * 2); // flick up over 60ms
  assert.equal(steps, 1);
  // After cooldown expires, a fresh deliberate notch steps again
  onWheel(-110, 1000);
  assert.equal(steps, 2);
});
