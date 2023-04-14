type ResolveType<T> = (value: T | PromiseLike<T>) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RejectType = (reason?: any) => void;

type Response = {
  ResponseText: string;
};

type ParsedResponse = {
  ReadyState: number;
  Status: number;
  Data: string;
};

function promiseSupportedCallback<T>(response: Response, resolve: ResolveType<T>, reject: RejectType) {
  const responseText: ParsedResponse = JSON.parse(response.ResponseText) as ParsedResponse;
  if (responseText.ReadyState === 4 && responseText.Status === 200) {
    console.log(`[Data] ${responseText.Data}`);
    const data: T = JSON.parse(responseText.Data) as T;
    resolve(data);
  } else {
    reject();
  }
}

export function infoTemp() {
  console.log('External - info');
  return { objective: 'External - Chromely Main Objectives', platform: 'External - Platforms', version: 'External - Version' };
}

/*
 * Get request for RegisterAsyncJsObject
 * https://github.com/mattkol/Chromely/wiki/Expose-.NET-class-to-JavaScript
 * url - Chromely route path
 * request - a Json object
 * response - callback response method
 */
export function get<T>(url: string, parameters: object | null = null): Promise<any> {
  return new Promise<T>((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    boundControllerAsync.getJson(url, parameters, (response: Response) => promiseSupportedCallback<T>(response, resolve, reject));
  });
}

export function post<T>(url: string, parameters: object, postData?: object): Promise<any> {
  const postJsonData = JSON.stringify(postData);
  return new Promise<T>((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    boundControllerAsync.postJson(url, parameters, postJsonData, (response: Response) => promiseSupportedCallback<T>(response, resolve, reject));
  });
}

/*
export function put(url, parameters, putData) {
  return new Promise(async (resolve, reject) => {
    const context = { resolve, reject };
    boundControllerAsync.putJson(
      url,
      parameters,
      putJsonData,
      promiseSupportedCallback.bind(context),
    );
  });
*/

export default {
  infoTemp,
  get,
  post,
};
