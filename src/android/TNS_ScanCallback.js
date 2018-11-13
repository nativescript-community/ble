"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var android_main_1 = require("./android_main");
var common_1 = require("../common");
var TNS_ScanCallback = (function (_super) {
    __extends(TNS_ScanCallback, _super);
    function TNS_ScanCallback() {
        var _this = _super.call(this) || this;
        return global.__native(_this);
    }
    TNS_ScanCallback.prototype.onInit = function (owner) {
        this.owner = owner;
        common_1.CLog(common_1.CLogTypes.info, "TNS_ScanCallback.onInit ---- this.owner: " + this.owner);
    };
    TNS_ScanCallback.prototype.onBatchScanResults = function (results) {
        common_1.CLog(common_1.CLogTypes.info, "TNS_ScanCallback.onBatchScanResults ---- results: " + results);
    };
    TNS_ScanCallback.prototype.onScanFailed = function (errorCode) {
        common_1.CLog(common_1.CLogTypes.info, "TNS_ScanCallback.onScanFailed ---- errorCode: " + errorCode);
        var errorMessage;
        if (errorCode === android.bluetooth.le.ScanCallback.SCAN_FAILED_ALREADY_STARTED) {
            errorMessage = 'Scan already started';
        }
        else if (errorCode === android.bluetooth.le.ScanCallback.SCAN_FAILED_APPLICATION_REGISTRATION_FAILED) {
            errorMessage = 'Application registration failed';
        }
        else if (errorCode === android.bluetooth.le.ScanCallback.SCAN_FAILED_FEATURE_UNSUPPORTED) {
            errorMessage = 'Feature unsupported';
        }
        else if (errorCode === android.bluetooth.le.ScanCallback.SCAN_FAILED_INTERNAL_ERROR) {
            errorMessage = 'Internal error';
        }
        else {
            errorMessage = 'Scan failed to start';
        }
        common_1.CLog(common_1.CLogTypes.info, "TNS_ScanCallback.onScanFailed errorMessage: " + errorMessage);
    };
    TNS_ScanCallback.prototype.onScanResult = function (callbackType, result) {
        common_1.CLog(common_1.CLogTypes.info, "TNS_ScanCallback.onScanResult ---- callbackType: " + callbackType + ", result: " + result);
        var stateObject = this.owner.get().connections[result.getDevice().getAddress()];
        if (!stateObject) {
            stateObject = this.owner.get().connections[result.getDevice().getAddress()] = {
                state: 'disconnected'
            };
        }
        var manufacturerId;
        var scanRecord = result.getScanRecord();
        var manufacturerData = scanRecord.getManufacturerSpecificData();
        if (manufacturerData.size() > 0) {
            manufacturerId = manufacturerData.keyAt(0);
            common_1.CLog(common_1.CLogTypes.info, "TNS_ScanCallback.onScanResult ---- manufacturerId: " + manufacturerId);
        }
        var advertismentData = (stateObject.advertismentData = this.owner.get().extractAdvertismentData(scanRecord.getBytes()));
        common_1.CLog(common_1.CLogTypes.info, "TNS_ScanCallback.onScanResult ---- advertismentData: " + JSON.stringify(advertismentData));
        var payload = {
            type: 'scanResult',
            UUID: result.getDevice().getAddress(),
            name: result.getDevice().getName(),
            RSSI: result.getRssi(),
            state: 'disconnected',
            advertisement: this.owner.get().decodeValue(scanRecord.getBytes()),
            manufacturerId: manufacturerId,
            advertismentData: advertismentData
        };
        common_1.CLog(common_1.CLogTypes.info, "TNS_ScanCallback.onScanResult ---- payload: " + JSON.stringify(payload));
        this.onPeripheralDiscovered && this.onPeripheralDiscovered(payload);
        this.owner.get().sendEvent(android_main_1.Bluetooth.device_discovered_event, payload);
    };
    TNS_ScanCallback = __decorate([
        JavaProxy('com.nativescript.TNS_ScanCallback'),
        __metadata("design:paramtypes", [])
    ], TNS_ScanCallback);
    return TNS_ScanCallback;
}(android.bluetooth.le.ScanCallback));
exports.TNS_ScanCallback = TNS_ScanCallback;
//# sourceMappingURL=TNS_ScanCallback.js.map