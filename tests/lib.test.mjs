/**
 * lib.test.mjs — unit tests for the vendored line-based parsers.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { configScalar } from '../scripts/lib.mjs';

test('configScalar: trailing comments stripped from unquoted values', () => {
  const raw = 'wiki:\n  title: fixture\n  page_budget: 50          # soft cap — never blocks\n';
  assert.equal(configScalar(raw, 'wiki', 'page_budget'), '50',
    'the budget must parse as a number-able string, or the over-budget warning can never fire');
  assert.equal(Number(configScalar(raw, 'wiki', 'page_budget')), 50);
});

test('configScalar: quoted values keep "#" and ": " intact', () => {
  const raw = 'wiki:\n  title: "repo: the #1 fixture"\n';
  assert.equal(configScalar(raw, 'wiki', 'title'), 'repo: the #1 fixture');
});
