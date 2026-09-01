(() => {
  if (typeof window !== 'undefined' && !window.location.hostname.endsWith('leetcode.cn')) {
    return;
  }

  const TIMER_SOURCE = 'leetcode.cn-native-countdown';
  const TIMER_CONTROL_LABELS = new Set(['开始', '暂停', '继续', 'Start', 'Pause', 'Resume']);
  const TIMER_RESET_LABELS = new Set(['重置', 'Reset']);

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
      const controls = container.querySelectorAll(
        'button[aria-label], [role="button"][aria-label]',
      );
      if (
        Array.from(controls).some(control =>
          TIMER_RESET_LABELS.has(control.getAttribute('aria-label')?.trim()),
        )
      ) {
        return true;
      }
      container = container.parentElement;
    }
    return false;
  };

  const captureSnapshot = () => {
    try {
      const controls = document.querySelectorAll('button[aria-label], [role="button"][aria-label]');
      for (const control of controls) {
        const label = control.getAttribute('aria-label')?.trim();
        if (
          !TIMER_CONTROL_LABELS.has(label) ||
          !isVisible(control) ||
          !hasNearbyResetControl(control)
        ) {
          continue;
        }

        const remainingSeconds = parseCountdownText(control.textContent);
        if (remainingSeconds === null) {
          continue;
        }

        const snapshot = {
          source: TIMER_SOURCE,
          targetSeconds: null,
          remainingSeconds,
          elapsedSeconds: null,
          capturedAt: new Date().toISOString(),
        };
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

  globalThis.leetHubTimer = Object.freeze({
    parseCountdownText,
    captureSnapshot,
  });
})();
