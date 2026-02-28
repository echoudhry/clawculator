#!/usr/bin/env node
'use strict';

/**
 * Clawculator Test Suite
 * Run: node test/run.js
 */

const path = require('path');
const { parseTranscript, resolveModel, costPerCall, MODEL_PRICING } = require('../src/analyzer');

const FIXTURES = path.join(__dirname, 'fixtures');

let passed = 0;
let failed = 0;

function assert(condition, name, detail) {
  if (condition) {
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
    passed++;
  } else {
    console.log(`  \x1b[31m✗\x1b[0m ${name}`);
    if (detail) console.log(`    \x1b[90m${detail}\x1b[0m`);
    failed++;
  }
}

function approx(a, b, tolerance = 0.0001) {
  return Math.abs(a - b) < tolerance;
}

// ── parseTranscript Tests ────────────────────────────────

console.log('\n\x1b[36m── parseTranscript ──\x1b[0m\n');

// Standard format (entry.message.usage)
{
  const r = parseTranscript(path.join(FIXTURES, 'standard-format.jsonl'));
  assert(r !== null, 'standard format: parses successfully');
  assert(r.messageCount === 3, 'standard format: 3 messages', `got ${r.messageCount}`);
  assert(approx(r.totalCost, 0.0588), 'standard format: total cost $0.0588', `got ${r.totalCost}`);
  assert(r.input === 4300, 'standard format: input tokens 4300', `got ${r.input}`);
  assert(r.output === 2400, 'standard format: output tokens 2400', `got ${r.output}`);
  assert(r.cacheRead === 150000, 'standard format: cache read 150000', `got ${r.cacheRead}`);
  assert(r.cacheWrite === 3500, 'standard format: cache write 3500', `got ${r.cacheWrite}`);
  assert(r.model && r.model.includes('sonnet'), 'standard format: detects sonnet model', `got ${r.model}`);
  assert(r.firstTs < r.lastTs, 'standard format: timestamps ordered');
  assert(r.schemaDetected === 'standard', 'standard format: schema detected as standard', `got ${r.schemaDetected}`);
}

// Legacy format (entry.usage)
{
  const r = parseTranscript(path.join(FIXTURES, 'legacy-format.jsonl'));
  assert(r !== null, 'legacy format: parses successfully');
  assert(r.messageCount === 2, 'legacy format: 2 messages', `got ${r.messageCount}`);
  assert(approx(r.totalCost, 0.0312), 'legacy format: total cost $0.0312', `got ${r.totalCost}`);
  assert(r.cacheRead === 61000, 'legacy format: cache read 61000', `got ${r.cacheRead}`);
  assert(r.schemaDetected === 'legacy', 'legacy format: schema detected as legacy', `got ${r.schemaDetected}`);
}

// Snake_case format (raw Anthropic API)
{
  const r = parseTranscript(path.join(FIXTURES, 'snake-case-format.jsonl'));
  assert(r !== null, 'snake_case format: parses successfully');
  assert(r.messageCount === 2, 'snake_case format: 2 messages', `got ${r.messageCount}`);
  assert(approx(r.totalCost, 0.0557), 'snake_case format: total cost $0.0557', `got ${r.totalCost}`);
  assert(r.input === 4300, 'snake_case format: input_tokens mapped to input', `got ${r.input}`);
  assert(r.output === 1900, 'snake_case format: output_tokens mapped to output', `got ${r.output}`);
  assert(r.cacheRead === 91000, 'snake_case format: cache_read_input_tokens mapped', `got ${r.cacheRead}`);
  assert(r.cacheWrite === 3000, 'snake_case format: cache_creation_input_tokens mapped', `got ${r.cacheWrite}`);
}

// Mixed content (bad lines, heartbeats, system messages)
{
  const r = parseTranscript(path.join(FIXTURES, 'mixed-content.jsonl'));
  assert(r !== null, 'mixed content: parses successfully');
  assert(r.messageCount === 2, 'mixed content: only counts 2 real messages', `got ${r.messageCount}`);
  assert(approx(r.totalCost, 0.0027), 'mixed content: total cost $0.0027', `got ${r.totalCost}`);
  assert(r.model && r.model.includes('haiku'), 'mixed content: detects haiku model', `got ${r.model}`);
}

// No usage data
{
  const r = parseTranscript(path.join(FIXTURES, 'no-usage.jsonl'));
  assert(r === null, 'no usage: returns null for files with no usage data');
}

// Empty file
{
  const r = parseTranscript(path.join(FIXTURES, 'nonexistent-file.jsonl'));
  assert(r === null, 'nonexistent file: returns null gracefully');
}

// ── resolveModel Tests ───────────────────────────────────

console.log('\n\x1b[36m── resolveModel ──\x1b[0m\n');

assert(resolveModel('claude-sonnet-4-5-20250929') === 'claude-sonnet-4-5-20250929', 'resolves exact model string');
assert(resolveModel('anthropic/claude-sonnet-4-5-20250929') === 'claude-sonnet-4-5-20250929', 'strips anthropic/ prefix');
assert(resolveModel('openai/gpt-4o') === 'gpt-4o', 'strips openai/ prefix');
assert(resolveModel('openrouter/anthropic/claude-sonnet-4-5-20250929') === 'claude-sonnet-4-5-20250929', 'strips openrouter/provider/ prefix');
assert(resolveModel('claude-opus-4-5') === 'claude-opus-4-5', 'resolves Opus 4.5');
assert(resolveModel('claude-haiku-4-5-20251001') === 'claude-haiku-4-5-20251001', 'resolves Haiku 4.5');
assert(resolveModel(null) === null, 'returns null for null input');
assert(resolveModel('') === null, 'returns null for empty string');
assert(resolveModel('some-unknown-model') === null, 'returns null for unknown model');

// ── costPerCall Tests ────────────────────────────────────

console.log('\n\x1b[36m── costPerCall ──\x1b[0m\n');

{
  const cost = costPerCall('claude-sonnet-4-5-20250929', 1000, 500);
  assert(cost > 0, 'costPerCall: returns positive cost for valid model', `got ${cost}`);
  assert(approx(cost, 0.0105, 0.001), 'costPerCall: Sonnet 1K in / 500 out ≈ $0.0105', `got ${cost}`);
}

{
  const cost = costPerCall('unknown-model', 1000, 500);
  assert(cost === 0, 'costPerCall: returns 0 for unknown model');
}

// ── MODEL_PRICING Tests ──────────────────────────────────

console.log('\n\x1b[36m── MODEL_PRICING ──\x1b[0m\n');

const requiredModels = [
  'claude-opus-4-5', 'claude-sonnet-4-5-20250929', 'claude-haiku-4-5-20251001',
  'gpt-4o', 'gpt-4o-mini', 'gemini-2.0-flash',
];
for (const m of requiredModels) {
  assert(MODEL_PRICING[m] !== undefined, `pricing exists for ${m}`);
  assert(MODEL_PRICING[m].input > 0 || MODEL_PRICING[m].subscription, `${m} has positive input price (or is subscription)`);
  assert(MODEL_PRICING[m].label, `${m} has a label`);
}

// Verify pricing relationships make sense
assert(MODEL_PRICING['claude-opus-4-5'].input > MODEL_PRICING['claude-sonnet-4-5-20250929'].input, 'Opus more expensive than Sonnet (input)');
assert(MODEL_PRICING['claude-sonnet-4-5-20250929'].input > MODEL_PRICING['claude-haiku-4-5-20251001'].input, 'Sonnet more expensive than Haiku (input)');
assert(MODEL_PRICING['gpt-4o'].input > MODEL_PRICING['gpt-4o-mini'].input, 'GPT-4o more expensive than GPT-4o Mini (input)');

// ── Results ──────────────────────────────────────────────

console.log(`\n\x1b[90m──────────────────────────────────\x1b[0m`);
console.log(`  \x1b[32m${passed} passed\x1b[0m  ${failed > 0 ? `\x1b[31m${failed} failed\x1b[0m` : '\x1b[90m0 failed\x1b[0m'}`);
console.log(`\x1b[90m──────────────────────────────────\x1b[0m\n`);

process.exit(failed > 0 ? 1 : 0);
