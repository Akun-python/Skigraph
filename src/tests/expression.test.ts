import { test } from "node:test";
import assert from "node:assert/strict";

import { evaluateExpression } from "../core/expression.js";

const context = (decision: string) => ({ result: { decision }, loop: {} });

test("parses both sides of && even when the left side is false", () => {
  const source = 'result.decision != "single-cell" && result.decision != "microbiome"';
  assert.equal(evaluateExpression(source, context("bulk")), true);
  assert.equal(evaluateExpression(source, context("single-cell")), false);
  assert.equal(evaluateExpression(source, context("microbiome")), false);
});

test("parses both sides of || even when the left side is true", () => {
  const source = 'result.decision == "bulk" || result.decision == "microbiome"';
  assert.equal(evaluateExpression(source, context("bulk")), true);
  assert.equal(evaluateExpression(source, context("microbiome")), true);
  assert.equal(evaluateExpression(source, context("single-cell")), false);
});

test("chains three or more conjuncts", () => {
  const source = 'result.decision != "a" && result.decision != "b" && result.decision != "c"';
  assert.equal(evaluateExpression(source, context("c")), false);
  assert.equal(evaluateExpression(source, context("d")), true);
});

test("missing loop values resolve to null and compare unequal", () => {
  assert.equal(evaluateExpression('loop.round == 3', { result: {}, loop: {} }), false);
  assert.equal(evaluateExpression('loop.round == 3', { result: {}, loop: { round: 3 } }), true);
});

test("rejects references that are not result.<field> or loop.<field>", () => {
  assert.throws(() => evaluateExpression("secret.value", { result: {}, loop: {} }), /not allowed/);
});
