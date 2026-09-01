import assert from 'node:assert/strict';

import '../src/js/timer.js';

const { parseCountdownText } = globalThis.leetHubTimer;

assert.equal(parseCountdownText('00:15:00'), 900);
assert.equal(parseCountdownText('15:00'), 900);
assert.equal(parseCountdownText('01:02:03'), 3723);
assert.equal(parseCountdownText('00:00:00'), 0);
assert.equal(parseCountdownText('  15:00  '), 900);
assert.equal(parseCountdownText('unrelated timer text'), null);
assert.equal(parseCountdownText('01:99:00'), null);
assert.equal(parseCountdownText('15:60'), null);

console.log('Timer parser validation passed.');
