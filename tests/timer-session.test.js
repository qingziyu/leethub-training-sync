import assert from 'node:assert/strict';

import '../src/js/timer.js';

const { calculateElapsedSeconds, createSessionTracker, getTimerAction } = globalThis.leetHubTimer;
const capturedAt = '2026-09-01T09:45:21.123Z';

assert.equal(getTimerAction('开始'), 'start');
assert.equal(getTimerAction('Start'), 'start');
assert.equal(getTimerAction('暂停'), 'pause');
assert.equal(getTimerAction('Pause'), 'pause');
assert.equal(getTimerAction('继续'), 'resume');
assert.equal(getTimerAction('Resume'), 'resume');
assert.equal(getTimerAction('重置'), 'reset');
assert.equal(getTimerAction('Reset'), 'reset');

const session = createSessionTracker('two-sum');
session.observeAction('start', 900, 'two-sum');
assert.equal(session.getTargetSeconds(), 900);
session.observeAction('pause', 750, 'two-sum');
assert.equal(session.getTargetSeconds(), 900);
session.observeAction('resume', 750, 'two-sum');
assert.equal(session.getTargetSeconds(), 900);
assert.deepEqual(session.createSnapshot(720, capturedAt, 'two-sum'), {
  source: 'leetcode.cn-native-countdown',
  targetSeconds: 900,
  remainingSeconds: 720,
  elapsedSeconds: 180,
  capturedAt,
});

session.observeAction('reset', 720, 'two-sum');
assert.equal(session.getTargetSeconds(), null);
session.observeAction('start', 300, 'two-sum');
assert.equal(session.getTargetSeconds(), 300);
assert.equal(session.createSnapshot(301, capturedAt, 'two-sum').elapsedSeconds, null);
assert.equal(session.createSnapshot(null, capturedAt, 'two-sum').elapsedSeconds, null);

const lateSession = createSessionTracker('two-sum');
const lateSnapshot = lateSession.createSnapshot(754, capturedAt, 'two-sum');
assert.equal(lateSnapshot.targetSeconds, null);
assert.equal(lateSnapshot.elapsedSeconds, null);

session.syncProblemContext('three-sum');
assert.equal(session.getTargetSeconds(), null);

assert.equal(calculateElapsedSeconds(300, 301), null);
assert.equal(calculateElapsedSeconds(300, null), null);
assert.equal(calculateElapsedSeconds(null, 200), null);

console.log('Timer session validation passed.');
