(() => {
  if (typeof window !== 'undefined' && !window.location.hostname.endsWith('leetcode.cn')) {
    return;
  }

  const TIMER_SOURCE = 'leetcode.cn-native-countdown';
  const TIMER_CONTROL_SELECTOR = 'button[aria-label], [role="button"][aria-label]';
  const TIMER_ACTIONS = new Map([
    ['开始', 'start'],
    ['Start', 'start'],
    ['暂停', 'pause'],
    ['Pause', 'pause'],
    ['继续', 'resume'],
    ['Resume', 'resume'],
    ['重置', 'reset'],
    ['Reset', 'reset'],
  ]);

  const parseCountdownText = text => {
    if (typeof text !== 'string') {
      return null;
    }

    const match = text.trim().match(/^(?:(\d+):)?(\d{1,2}):(\d{2})$/);
    if (!match) {
      return null;
    }

    const hasHours = match[1] !== undefined;
    const hours = hasHours ? Number(match[1]) : 0;
    const minutes = Number(match[2]);
    const seconds = Number(match[3]);
    if (
      !Number.isSafeInteger(hours) ||
      !Number.isSafeInteger(minutes) ||
      !Number.isSafeInteger(seconds) ||
      seconds >= 60 ||
      (hasHours && minutes >= 60)
    ) {
      return null;
    }

    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    return Number.isSafeInteger(totalSeconds) ? totalSeconds : null;
  };

  const isValidSeconds = value => Number.isSafeInteger(value) && value >= 0;

  const calculateElapsedSeconds = (targetSeconds, remainingSeconds) => {
    if (
      !isValidSeconds(targetSeconds) ||
      !isValidSeconds(remainingSeconds) ||
      remainingSeconds > targetSeconds
    ) {
      return null;
    }
    return targetSeconds - remainingSeconds;
  };

  const normalizeProblemContext = context =>
    typeof context === 'string' && context.length > 0 ? context : null;

  const createSessionTracker = initialProblemContext => {
    let problemContext = normalizeProblemContext(initialProblemContext);
    let targetSeconds = null;

    const syncProblemContext = nextProblemContext => {
      const normalizedContext = normalizeProblemContext(nextProblemContext);
      if (normalizedContext !== problemContext) {
        problemContext = normalizedContext;
        targetSeconds = null;
      }
    };

    const observeAction = (action, remainingSeconds, nextProblemContext) => {
      syncProblemContext(nextProblemContext);
      if (action === 'reset') {
        targetSeconds = null;
      } else if (action === 'start') {
        targetSeconds = isValidSeconds(remainingSeconds) ? remainingSeconds : null;
      }
      return targetSeconds;
    };

    const createSnapshot = (remainingSeconds, capturedAt, nextProblemContext = problemContext) => {
      syncProblemContext(nextProblemContext);
      const normalizedRemaining = isValidSeconds(remainingSeconds) ? remainingSeconds : null;
      return {
        source: TIMER_SOURCE,
        targetSeconds,
        remainingSeconds: normalizedRemaining,
        elapsedSeconds: calculateElapsedSeconds(targetSeconds, normalizedRemaining),
        capturedAt,
      };
    };

    return Object.freeze({
      syncProblemContext,
      observeAction,
      createSnapshot,
      getTargetSeconds: () => targetSeconds,
    });
  };

  const getTimerAction = ariaLabel => TIMER_ACTIONS.get(ariaLabel?.trim()) ?? null;

  const getProblemContext = () => {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.location.pathname.match(/^\/problems\/([^/]+)/)?.[1] ?? null;
  };

  const isVisible = element => {
    const style = window.getComputedStyle(element);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      element.getClientRects().length > 0
    );
  };

  const hasNearbyResetControl = timerControl => {
    let container = timerControl.parentElement;
    for (let depth = 0; container && depth < 2; depth += 1) {
      const controls = container.querySelectorAll(TIMER_CONTROL_SELECTOR);
      if (
        Array.from(controls).some(
          control => getTimerAction(control.getAttribute('aria-label')) === 'reset',
        )
      ) {
        return true;
      }
      container = container.parentElement;
    }
    return false;
  };

  const readTimerControlSeconds = timerControl => {
    const action = getTimerAction(timerControl.getAttribute('aria-label'));
    if (
      action === null ||
      action === 'reset' ||
      !isVisible(timerControl) ||
      !hasNearbyResetControl(timerControl)
    ) {
      return null;
    }
    return parseCountdownText(timerControl.textContent);
  };

  const readAssociatedTimerSeconds = timerControl => {
    const action = getTimerAction(timerControl.getAttribute('aria-label'));
    if (action !== 'reset') {
      return readTimerControlSeconds(timerControl);
    }

    const controlGroup = timerControl.parentElement;
    if (!controlGroup) {
      return null;
    }
    for (const control of controlGroup.querySelectorAll(TIMER_CONTROL_SELECTOR)) {
      if (control !== timerControl) {
        const seconds = readTimerControlSeconds(control);
        if (seconds !== null) {
          return seconds;
        }
      }
    }
    return null;
  };

  const sessionTracker = createSessionTracker(getProblemContext());

  const syncCurrentProblemContext = () => {
    sessionTracker.syncProblemContext(getProblemContext());
  };

  const observeNativeTimerClick = event => {
    try {
      syncCurrentProblemContext();
      queueMicrotask(syncCurrentProblemContext);
      if (!(event.target instanceof Element)) {
        return;
      }
      const timerControl = event.target.closest(TIMER_CONTROL_SELECTOR);
      if (!timerControl) {
        return;
      }

      const action = getTimerAction(timerControl.getAttribute('aria-label'));
      if (!action) {
        return;
      }
      let remainingSeconds = null;
      if (action !== 'reset') {
        remainingSeconds = readAssociatedTimerSeconds(timerControl);
        if (remainingSeconds === null) {
          return;
        }
      }

      const targetSeconds = sessionTracker.observeAction(
        action,
        remainingSeconds,
        getProblemContext(),
      );
      if (typeof globalThis.leetHubDebugLog === 'function') {
        globalThis.leetHubDebugLog('[LeetHub Timer] observed native timer action', {
          action,
          remainingSeconds,
          targetSeconds,
        });
      }
    } catch (error) {
      console.error('[LeetHub Timer] unexpected timer observation failure', error);
    }
  };

  const captureSnapshot = () => {
    try {
      const problemContext = getProblemContext();
      sessionTracker.syncProblemContext(problemContext);
      const controls = document.querySelectorAll(TIMER_CONTROL_SELECTOR);
      for (const control of controls) {
        const remainingSeconds = readTimerControlSeconds(control);
        if (remainingSeconds === null) {
          continue;
        }

        const snapshot = Object.freeze(
          sessionTracker.createSnapshot(remainingSeconds, new Date().toISOString(), problemContext),
        );
        if (typeof globalThis.leetHubDebugLog === 'function') {
          globalThis.leetHubDebugLog('[LeetHub Timer] captured native timer', snapshot);
        }
        return snapshot;
      }
    } catch (error) {
      console.error('[LeetHub Timer] unexpected timer capture failure', error);
    }

    return null;
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('click', observeNativeTimerClick, true);
    window.addEventListener('popstate', syncCurrentProblemContext);
  }

  globalThis.leetHubTimer = Object.freeze({
    parseCountdownText,
    calculateElapsedSeconds,
    createSessionTracker,
    getTimerAction,
    captureSnapshot,
  });
})();
