type ChromelyBridgeResponse = {
  ResponseText: string;
};

type BoundControllerAsyncType = {
  getJson: (url: string, parameters: object | null, callback: (response: ChromelyBridgeResponse) => void) => void;
  postJson: (url: string, parameters: object, postData: string | undefined, callback: (response: ChromelyBridgeResponse) => void) => void;
};

declare const boundControllerAsync: BoundControllerAsyncType;
declare const __INITIAL_ROUTE_PATH__: string;
