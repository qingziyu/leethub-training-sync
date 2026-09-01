// Store reference to solution posts for communication with content script
window.leetHubSolutionPosts = [];

const detectedSubmissionIds = new Set();

const notifySubmissionId = submissionId => {
  if (submissionId == null) {
    return;
  }

  const normalizedSubmissionId = String(submissionId);
  if (detectedSubmissionIds.has(normalizedSubmissionId)) {
    return;
  }

  detectedSubmissionIds.add(normalizedSubmissionId);
  globalThis.leetHubDebugLog('LeetHub: Submission ID detected', normalizedSubmissionId);
  window.dispatchEvent(
    new CustomEvent('leetHubSubmissionId', {
      detail: { submissionId },
    }),
  );
};

// 1. Intercept fetch requests
const originalFetch = window.fetch;

window.fetch = async function (...args) {
  const [resource, options] = args;
  const url = typeof resource === 'string' ? resource : resource?.url;
  const method = options?.method || 'GET';

  globalThis.leetHubDebugLog('[LeetHub Fetch Intercept]', url, method);

  const response = await originalFetch.apply(this, args);
  if (url?.includes('/problems/') && url?.includes('/submit/')) {
    try {
      const clonedResponse = response.clone();
      const data = await clonedResponse.json();
      notifySubmissionId(data?.submission_id);
    } catch (e) {
      console.error('LeetHub: Error parsing submission response', e);
    }
  }

  if (url?.includes('/graphql/') && method === 'POST') {
    globalThis.leetHubDebugLog('LeetHub: GraphQL POST detected via fetch');
    try {
      const body = JSON.parse(options?.body || '{}');
      globalThis.leetHubDebugLog('LeetHub: GraphQL operation:', body.operationName);
      if (body.operationName === 'ugcArticlePublishSolution') {
        globalThis.leetHubDebugLog('LeetHub: Solution post operation detected!');
        const solutionData = body.variables?.data;
        globalThis.leetHubDebugLog('LeetHub: Solution data:', solutionData);
        if (solutionData?.questionSlug && solutionData?.content) {
          globalThis.leetHubDebugLog(
            'LeetHub: Valid solution data found, storing for processing...',
          );
          // Store the solution data for the content script to process
          window.leetHubSolutionPosts.push({
            questionSlug: solutionData.questionSlug,
            content: solutionData.content,
            title: solutionData.title,
            timestamp: Date.now(),
          });

          window.dispatchEvent(
            new CustomEvent('leetHubSolutionPost', {
              detail: {
                questionSlug: solutionData.questionSlug,
                content: solutionData.content,
                title: solutionData.title,
              },
            }),
          );
        } else {
          globalThis.leetHubDebugLog(
            'LeetHub: Missing questionSlug or content in solution data',
          );
        }
      }
    } catch (error) {
      console.error('LeetHub: Error parsing GraphQL body:', error);
    }
  }

  return response;
};

// 2. Intercept XMLHttpRequest (fallback)
const originalXHROpen = XMLHttpRequest.prototype.open;
const originalXHRSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function (method, url, ...args) {
  this._leethub_url = url;
  this._leethub_method = method;
  globalThis.leetHubDebugLog('LeetHub: XHR open intercepted', method, url);
  return originalXHROpen.apply(this, [method, url, ...args]);
};

XMLHttpRequest.prototype.send = function (data) {
  if (
    window.location.hostname.endsWith('leetcode.cn') &&
    this._leethub_url?.includes('/problems/') &&
    this._leethub_url?.includes('/submit/')
  ) {
    this.addEventListener(
      'load',
      () => {
        try {
          const responseData =
            typeof this.response === 'object' && this.response !== null
              ? this.response
              : JSON.parse(this.responseText || '{}');
          notifySubmissionId(responseData?.submission_id);
        } catch (error) {
          console.error('LeetHub: Error parsing XHR submission response', error);
        }
      },
      { once: true },
    );
  }

  if (
    this._leethub_url?.includes('/graphql/') &&
    this._leethub_method === 'POST'
  ) {
    globalThis.leetHubDebugLog('LeetHub: GraphQL POST detected via XHR');

    try {
      const body = JSON.parse(data || '{}');
      globalThis.leetHubDebugLog('LeetHub: XHR GraphQL operation:', body.operationName);
      if (body.operationName === 'ugcArticlePublishSolution') {
        globalThis.leetHubDebugLog('LeetHub: Solution post operation detected via XHR!');
        const solutionData = body.variables?.data;
        globalThis.leetHubDebugLog('LeetHub: XHR Solution data:', solutionData);
        if (solutionData?.questionSlug && solutionData?.content) {
          globalThis.leetHubDebugLog(
            'LeetHub: Valid solution data found via XHR, storing for processing...',
          );
          // Store the solution data for the content script to process
          window.leetHubSolutionPosts.push({
            questionSlug: solutionData.questionSlug,
            content: solutionData.content,
            title: solutionData.title,
            timestamp: Date.now(),
          });
          // Dispatch custom event to notify content script
          window.dispatchEvent(
            new CustomEvent('leetHubSolutionPost', {
              detail: {
                questionSlug: solutionData.questionSlug,
                content: solutionData.content,
                title: solutionData.title,
              },
            }),
          );
        } else {
          globalThis.leetHubDebugLog(
            'LeetHub: Missing questionSlug or content in XHR solution data',
          );
        }
      }
    } catch (error) {
      console.error('LeetHub: Error parsing XHR GraphQL body:', error);
    }
  }

  return originalXHRSend.apply(this, [data]);
};

globalThis.leetHubDebugLog('LeetHub: Request interceptors installed in page context');
