require('./base64');

var Bluetooth = {};

Bluetooth.requestCoarseLocationPermission = function () {
  return new Promise(function (resolve) {
    resolve(true);
  });
};

Bluetooth.hasCoarseLocationPermission = function () {
  return new Promise(function (resolve) {
    resolve(true);
  });
};

Bluetooth._base64ToArrayBuffer = function (b64) {
  var stringToArrayBuffer = function(str) {
    var ret = new Uint8Array(str.length);
    for (var i = 0; i < str.length; i++) {
      ret[i] = str.charCodeAt(i);
    }
    return ret.buffer;
  };
  return stringToArrayBuffer(atob(b64));
};

module.exports = Bluetooth;