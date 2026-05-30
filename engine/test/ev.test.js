// engine/test/ev.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { evPct } from "../src/math/ev.js";

test("evPct positive when offered price beats fair", () => {
  // fair prob 0.55, offered decimal 2.0 -> EV = 0.55*2 - 1 = 0.10
  assert.ok(Math.abs(evPct(0.55, 2.0) - 0.10) < 1e-9);
});

test("evPct negative when offered price is worse than fair", () => {
  assert.ok(evPct(0.5, 1.8) < 0); // 0.5*1.8-1 = -0.10
});
