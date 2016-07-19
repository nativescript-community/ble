require('./base64');

export var bluetooth: any = {};

bluetooth.requestCoarseLocationPermission = function () {
  return new Promise(function (resolve) {
    resolve(true);
  });
};

bluetooth.hasCoarseLocationPermission = function () {
  return new Promise(function (resolve) {
    resolve(true);
  });
};

bluetooth._base64ToArrayBuffer = function (b64) {
  var stringToArrayBuffer = function(str) {
    var ret = new Uint8Array(str.length);
    for (var i = 0; i < str.length; i++) {
      ret[i] = str.charCodeAt(i);
    }
    return ret.buffer;
  };
  return stringToArrayBuffer(atob(b64));
};
