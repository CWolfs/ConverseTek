declare const __INITIAL_ROUTE_PATH__: string;

interface Window {
  chrome?: {
    webview?: {
      postMessage: (message: unknown) => void;
      addEventListener: (type: 'message', listener: (event: MessageEvent) => void) => void;
    };
  };
}
