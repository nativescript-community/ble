require('./base64');
var bluetooth = (function () {
    function bluetooth() {
    }
    bluetooth.prototype.requestCoarseLocationPermission = function () {
        return new Promise(function (resolve) {
            resolve(true);
        });
    };
    ;
    bluetooth.prototype.hasCoarseLocationPermission = function () {
        return new Promise(function (resolve) {
            resolve(true);
        });
    };
    ;
    bluetooth.prototype._base64ToArrayBuffer = function (b64) {
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
    return bluetooth;
})();
exports.bluetooth = bluetooth;
