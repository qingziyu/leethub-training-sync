// Set this single flag to true when developing the extension to enable verbose logs.
globalThis.__LEETHUB_DEBUG__ = false;

globalThis.leetHubDebugLog = (...args) => {
  if (globalThis.__LEETHUB_DEBUG__) {
    console.debug(...args);
  }
};
