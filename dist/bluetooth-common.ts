require('./base64');

export class common {

  requestCoarseLocationPermission() {
    return new Promise(function (resolve) {
      resolve(true);
    });
  };

  hasCoarseLocationPermission() {
    return new Promise(function (resolve) {
      resolve(true);
    });
  };

  _base64ToArrayBuffer(b64) {
    var stringToArrayBuffer = function (str) {
      var ret = new Uint8Array(str.length);
      for (var i = 0; i < str.length; i++) {
        ret[i] = str.charCodeAt(i);
      }
      return ret.buffer;
    };
    return stringToArrayBuffer(atob(b64));
  };

}