"use strict";
require('./base64');
var common = (function () {
    function common() {
    }
    common.prototype.requestCoarseLocationPermission = function () {
        return new Promise(function (resolve) {
            resolve(true);
        });
    };
    ;
    common.prototype.hasCoarseLocationPermission = function () {
        return new Promise(function (resolve) {
            resolve(true);
        });
    };
    ;
    common.prototype._base64ToArrayBuffer = function (b64) {
        var stringToArrayBuffer = function (str) {
            var ret = new Uint8Array(str.length);
            for (var i = 0; i < str.length; i++) {
                ret[i] = str.charCodeAt(i);
            }
            return ret.buffer;
        };
        return stringToArrayBuffer(atob(b64));
    };
    ;
    return common;
}());
exports.common = common;

//# sourceMappingURL=bluetooth-common.js.map
