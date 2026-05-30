// engine/test/oddsMath.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { americanToDecimal, decimalToAmerican, impliedFromDecimal } from "../src/math/oddsMath.js";

test("americanToDecimal: favorite and underdog", () => {
  assert.ok(Math.abs(americanToDecimal(-125) - 1.8) < 1e-9);
  assert.ok(Math.abs(americanToDecimal(125) - 2.25) < 1e-9);
  assert.ok(Math.abs(americanToDecimal(-110) - 1.9090909) < 1e-6);
});

test("decimalToAmerican round-trips", () => {
  assert.equal(decimalToAmerican(1.8), -125);
  assert.equal(decimalToAmerican(2.25), 125);
});

test("impliedFromDecimal", () => {
  assert.ok(Math.abs(impliedFromDecimal(2.0) - 0.5) < 1e-9);
  assert.ok(Math.abs(impliedFromDecimal(1.8) - 0.5555556) < 1e-6);
});
