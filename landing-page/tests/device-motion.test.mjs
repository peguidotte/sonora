import test from "node:test";
import assert from "node:assert/strict";
import { createDeviceTimeline } from "../src/device-timeline.mjs";
function fixture() {
  return Object.fromEntries(
    ["root", "shell", "sensor", "board", "mount"].map((k) => [
      k,
      { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
    ]),
  );
}
function snapshot(parts) {
  return Object.values(parts).flatMap((o) => [
    o.position.x,
    o.position.z,
    o.rotation.x,
    o.rotation.y,
  ]);
}
test("device completes assembly → separation → same assembly", () => {
  const parts = fixture();
  const tl = createDeviceTimeline(parts);
  tl.progress(0);
  const initial = snapshot(parts);
  tl.progress(0.6);
  assert.ok(parts.shell.position.z > 1.5);
  assert.ok(parts.mount.position.z < -0.9);
  assert.ok(parts.sensor.position.z > 0.7);
  tl.progress(1);
  assert.deepEqual(snapshot(parts), initial);
  tl.kill();
});
test("reverse scroll revisits identical transforms without accumulating drift", () => {
  const parts = fixture();
  const tl = createDeviceTimeline(parts);
  tl.progress(0.36);
  const forward = snapshot(parts);
  tl.progress(0.93);
  tl.progress(0.36);
  assert.deepEqual(snapshot(parts), forward);
  tl.progress(0);
  assert.ok(snapshot(parts).every((v) => v === 0));
  tl.kill();
});
test("small scroll steps do not produce pose jumps", () => {
  const parts = fixture();
  const tl = createDeviceTimeline(parts);
  let prev = snapshot(parts);
  for (let i = 0; i <= 1000; i++) {
    tl.progress(i / 1000);
    const now = snapshot(parts);
    assert.ok(now.every((v, j) => Math.abs(v - prev[j]) < 0.04));
    prev = now;
  }
  tl.kill();
});
