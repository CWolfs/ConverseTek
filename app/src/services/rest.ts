type ResolveType<T> = (value: T | PromiseLike<T>) => void;

type RejectType = (reason?: unknown) => void;

type WebViewBridgeRequest = {
  id: string;
  method: 'GET' | 'POST';
  url: string;
  parameters: object | null;
  body?: object;
};

type WebViewBridgeResponse = {
  id: string;
  status: number;
  data: string;
  error?: string;
};

type PendingRequest = {
  resolve: ResolveType<unknown>;
  reject: RejectType;
};

const pendingRequests = new Map<string, PendingRequest>();
let messageListenerAttached = false;

export function infoTemp() {
  console.log('External - info');
  return { objective: 'External - ConverseTek Main Objectives', platform: 'External - Platforms', version: 'External - Version' };
}

export function get<T = unknown>(url: string, parameters: object | null = null): Promise<T> {
  return sendBridgeRequest<T>({
    id: createRequestId(),
    method: 'GET',
    url,
    parameters,
  });
}

export function post<T = unknown>(url: string, parameters: object, postData?: object): Promise<T> {
  return sendBridgeRequest<T>({
    id: createRequestId(),
    method: 'POST',
    url,
    parameters,
    body: postData,
  });
}

function sendBridgeRequest<T>(request: WebViewBridgeRequest): Promise<T> {
  ensureMessageListener();

  return new Promise<T>((resolve, reject) => {
    if (window.chrome?.webview == null) {
      reject(new Error('ConverseTek host bridge is not available.'));
      return;
    }

    pendingRequests.set(request.id, {
      resolve: resolve as ResolveType<unknown>,
      reject,
    });

    window.chrome.webview.postMessage(request);
  });
}

function ensureMessageListener() {
  if (messageListenerAttached || window.chrome?.webview == null) return;

  window.chrome.webview.addEventListener('message', (event: MessageEvent<WebViewBridgeResponse>) => {
    const response = event.data;
    const pendingRequest = pendingRequests.get(response.id);
    if (pendingRequest == null) return;

    pendingRequests.delete(response.id);

    if (response.status >= 200 && response.status < 300) {
      pendingRequest.resolve(parseResponseData(response.data));
      return;
    }

    pendingRequest.reject(new Error(response.error || `ConverseTek host request failed with status ${response.status}.`));
  });

  messageListenerAttached = true;
}

function parseResponseData(data: string) {
  if (data == null || data === '') return null;
  return JSON.parse(data) as unknown;
}

function createRequestId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default {
  infoTemp,
  get,
  post,
};
