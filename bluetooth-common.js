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

module.exports = Bluetooth;