import assert from 'node:assert/strict';

import '../src/js/timer.js';

const { createSessionTracker, getTimerControlAction, readAssociatedTimerSeconds } =
  globalThis.leetHubTimer;

const configuredInputs = [{ value: '00' }, { value: '30' }];
const headerControls = ['开始', '重置'].map(ariaLabel => ({
  getAttribute: attribute => (attribute === 'aria-label' ? ariaLabel : null),
}));
const timerGroup = {
  getAttribute: attribute => {
    if (attribute === 'aria-controls') {
      return 'native-timer-dialog';
    }
    if (attribute === 'aria-haspopup') {
      return 'dialog';
    }
    return null;
  },
  querySelectorAll: selector =>
    selector === 'button[aria-label], [role="button"][aria-label]' ? headerControls : [],
};
const ownerDocument = {
  querySelectorAll: selector =>
    selector === '[aria-controls][aria-haspopup="dialog"]' ? [timerGroup] : [],
};
const countdownDialog = {
  id: 'native-timer-dialog',
  ownerDocument,
  textContent: '倒计时 30:00',
  querySelectorAll: selector => (selector === 'input[type="number"]' ? configuredInputs : []),
};
const startControl = {
  tagName: 'BUTTON',
  textContent: '开始倒计时',
  getAttribute: () => null,
  closest: selector => (selector === '[role="dialog"]' ? countdownDialog : null),
};

assert.equal(startControl.textContent.includes('30:00'), false);
assert.equal(countdownDialog.textContent.includes('30:00'), true);

const action = getTimerControlAction(startControl);
const configuredSeconds = readAssociatedTimerSeconds(startControl);
const session = createSessionTracker('two-sum');
session.observeAction(action, configuredSeconds, 'two-sum');

assert.equal(action, 'start');
assert.equal(configuredSeconds, 1800);
assert.equal(session.getTargetSeconds(), 1800);

const unrelatedStartControl = {
  ...startControl,
  closest: () => ({ ...countdownDialog, ownerDocument: { querySelectorAll: () => [] } }),
};
assert.equal(readAssociatedTimerSeconds(unrelatedStartControl), null);

console.log('Timer DOM helper validation passed.');
