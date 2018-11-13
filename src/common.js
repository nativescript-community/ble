"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var observable_1 = require("tns-core-modules/data/observable/observable");
require('./base64');
var BluetoothUtil = (function () {
    function BluetoothUtil() {
    }
    BluetoothUtil.debug = false;
    return BluetoothUtil;
}());
exports.BluetoothUtil = BluetoothUtil;
var CLogTypes;
(function (CLogTypes) {
    CLogTypes[CLogTypes["info"] = 0] = "info";
    CLogTypes[CLogTypes["warning"] = 1] = "warning";
    CLogTypes[CLogTypes["error"] = 2] = "error";
})(CLogTypes = exports.CLogTypes || (exports.CLogTypes = {}));
exports.CLog = function (type) {
    if (type === void 0) { type = 0; }
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    if (BluetoothUtil.debug) {
        if (type === 0) {
            console.log('NativeScript-Bluetooth: INFO', args);
        }
        else if (type === 1) {
            console.log('NativeScript-Bluetooth: WARNING', args);
        }
        else if (type === 2) {
            console.log('NativeScript-Bluetooth: ERROR', args);
        }
    }
};
var BluetoothCommon = (function (_super) {
    __extends(BluetoothCommon, _super);
    function BluetoothCommon() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Object.defineProperty(BluetoothCommon.prototype, "debug", {
        set: function (value) {
            BluetoothUtil.debug = value;
        },
        enumerable: true,
        configurable: true
    });
    BluetoothCommon.prototype.base64ToArrayBuffer = function (b64) {
        var decoded = atob(b64);
        var ret = new Uint8Array(decoded.length);
        for (var i = 0; i < decoded.length; i++) {
            ret[i] = decoded.charCodeAt(i);
        }
        return ret.buffer;
    };
    BluetoothCommon.prototype.requestCoarseLocationPermission = function () {
        return new Promise(function (resolve) {
            resolve(true);
        });
    };
    BluetoothCommon.prototype.hasCoarseLocationPermission = function () {
        return new Promise(function (resolve) {
            resolve(true);
        });
    };
    BluetoothCommon.prototype.sendEvent = function (eventName, data, msg) {
        this.notify({
            eventName: eventName,
            object: this,
            data: data,
            message: msg
        });
    };
    BluetoothCommon.error_event = 'error_event';
    BluetoothCommon.bluetooth_status_event = 'bluetooth_status_event';
    BluetoothCommon.bluetooth_enabled_event = 'bluetooth_enabled_event';
    BluetoothCommon.bluetooth_discoverable_event = 'bluetooth_discoverable_event';
    BluetoothCommon.bluetooth_advertise_success_event = 'bluetooth_advertise_success_event';
    BluetoothCommon.bluetooth_advertise_failure_event = 'bluetooth_advertise_failure_event';
    BluetoothCommon.server_connection_state_changed_event = 'server_connection_state_changed_event';
    BluetoothCommon.bond_status_change_event = 'bond_status_change_event';
    BluetoothCommon.device_discovered_event = 'device_discovered_event';
    BluetoothCommon.device_name_change_event = 'device_name_change_event';
    BluetoothCommon.device_uuid_change_event = 'device_uuid_change_event';
    BluetoothCommon.device_acl_disconnected_event = 'device_acl_disconnected_event';
    BluetoothCommon.characteristic_write_request_event = 'characteristic_write_request_event';
    BluetoothCommon.characteristic_read_request_event = 'characteristic_read_request_event';
    BluetoothCommon.descriptor_write_request_event = 'descriptor_write_request_event';
    BluetoothCommon.descriptor_read_request_event = 'descriptor_read_request_event';
    BluetoothCommon.execute_write_event = 'execute_write_event';
    return BluetoothCommon;
}(observable_1.Observable));
exports.BluetoothCommon = BluetoothCommon;
//# sourceMappingURL=common.js.map