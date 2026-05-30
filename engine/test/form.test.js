// engine/test/form.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { adjustedForm } from "../src/math/form.js";

test("adjustedForm regresses small samples toward the prior", () => {
  // 2 games, league mean 5, strong recent (8) but tiny sample -> pulled toward 5
  const r = adjustedForm({ values: [8, 8], oppStrength: [1, 1], leagueMean: 5,
    regressionGames: 10 });
  assert.ok(r.adjusted > 5 && r.adjusted < 6.5); // not the raw 8
});

test("adjustedForm rewards production vs strong opponents", () => {
  const weak = adjustedForm({ values: [8, 8, 8, 8, 8, 8, 8, 8, 8, 8],
    oppStrength: Array(10).fill(0.7), leagueMean: 5, regressionGames: 10 });
  const strong = adjustedForm({ values: [8, 8, 8, 8, 8, 8, 8, 8, 8, 8],
    oppStrength: Array(10).fill(1.3), leagueMean: 5, regressionGames: 10 });
  assert.ok(strong.adjusted > weak.adjusted); // same output, tougher slate => better
});

test("adjustedForm returns a 0-100 factor weight", () => {
  const r = adjustedForm({ values: [10, 10, 10], oppStrength: [1, 1, 1],
    leagueMean: 5, regressionGames: 10 });
  assert.ok(r.weight >= 0 && r.weight <= 100);
});
