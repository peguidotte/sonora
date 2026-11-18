import test from "node:test";
import assert from "node:assert/strict";
import { energyAverage, profileFor } from "../src/demo.mjs";
test("equal-duration samples use energy average, never arithmetic dB average", () =>
  assert.ok(Math.abs(energyAverage([60, 70]) - 67.4036268949) < 1e-8));
test("empty period is no-data, not zero dB", () =>
  assert.equal(profileFor("empty").level, null));
test("scenario is deterministic and finite", () =>
  assert.equal(profileFor("morning").level, profileFor("morning").level));
test("unknown scenarios reject", () =>
  assert.throws(() => profileFor("unknown"), RangeError));
test("invalid levels reject", () =>
  assert.throws(() => energyAverage([NaN]), RangeError));
