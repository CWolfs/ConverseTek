function promiseSupportedCallback(response) {
  const responseText = JSON.parse(response.ResponseText);
  if (responseText.ReadyState === 4 && responseText.Status === 200) {
    // console.log(`[Data] ${responseText.Data}`);
    const data = JSON.parse(responseText.Data);
    this.resolve(data);
  } else {
    this.reject();
  }
}

export function infoTemp() {
  console.log('External - info');
  return { objective: 'External - Chromely Main Objectives', platform: 'External - Platforms', version: 'External - Version' }
}

/*
* Get request for RegisterAsyncJsObject
* https://github.com/mattkol/Chromely/wiki/Expose-.NET-class-to-JavaScript
* url - Chromely route path
* request - a Json object
* response - callback response method
*/
export function get(url, parameters = null) {
  return new Promise(async (resolve, reject) => {
    const context = { resolve, reject };
    boundControllerAsync.getJson(url, parameters, promiseSupportedCallback.bind(context));
  });
}

export function post(url, parameters, postData) {
  return new Promise(async (resolve, reject) => {
    const context = { resolve, reject };
    boundControllerAsync.postJson(
      url,
      parameters,
      postData,
      promiseSupportedCallback.bind(context),
    );
  });
}

export function put(url, parameters, putData) {
  return new Promise(async (resolve, reject) => {
    const context = { resolve, reject };
    boundControllerAsync.putJson(
      url,
      parameters,
      JSON.stringify(putData),
      promiseSupportedCallback.bind(context),
    );
  });
}

export default {
  infoTemp,
  get,
  post,
};
