"use strict";
require('./base64');
exports.bluetooth = {};
exports.bluetooth.requestCoarseLocationPermission = function () {
    return new Promise(function (resolve) {
        resolve(true);
    });
};
exports.bluetooth.hasCoarseLocationPermission = function () {
    return new Promise(function (resolve) {
        resolve(true);
    });
};
exports.bluetooth._base64ToArrayBuffer = function (b64) {
    var stringToArrayBuffer = function (str) {
        var ret = new Uint8Array(str.length);
        for (var i = 0; i < str.length; i++) {
            ret[i] = str.charCodeAt(i);
        }
        return ret.buffer;
    };
    return stringToArrayBuffer(atob(b64));
};

//# sourceMappingURL=bluetooth-common.js.map
