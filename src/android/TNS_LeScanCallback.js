"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var android_main_1 = require("./android_main");
var common_1 = require("../common");
var TNS_LeScanCallback = (function (_super) {
    __extends(TNS_LeScanCallback, _super);
    function TNS_LeScanCallback() {
        var _this = _super.call(this, {
            onLeScan: function (device, rssi, scanRecord) {
                common_1.CLog(common_1.CLogTypes.info, "TNS_LeScanCallback.onLeScan ---- device: " + device + ", rssi: " + rssi + ", scanRecord: " + scanRecord);
                var stateObject = this.owner.get().connections[device.getAddress()];
                if (!stateObject) {
                    stateObject = this.owner.get().connections[device.getAddress()] = {
                        state: 'disconnected'
                    };
                    var advertismentData = (stateObject.advertismentData = this.owner.get().extractAdvertismentData(scanRecord));
                    var manufacturerId = void 0;
                    common_1.CLog(common_1.CLogTypes.info, "TNS_LeScanCallback.onLeScan ---- advertismentData: " + advertismentData);
                    if (advertismentData.manufacturerData) {
                        manufacturerId = new DataView(advertismentData.manufacturerData, 0).getUint16(0, true);
                        common_1.CLog(common_1.CLogTypes.info, "TNS_LeScanCallback.onLeScan ---- manufacturerId: " + manufacturerId);
                        common_1.CLog(common_1.CLogTypes.info, "TNS_LeScanCallback.onLeScan ---- manufacturerData: " + advertismentData.manufacturerData);
                    }
                    var payload = {
                        type: 'scanResult',
                        UUID: device.getAddress(),
                        name: device.getName(),
                        RSSI: rssi,
                        state: 'disconnected',
                        advertismentData: advertismentData,
                        manufacturerId: manufacturerId
                    };
                    common_1.CLog(common_1.CLogTypes.info, "TNS_LeScanCallback.onLeScan ---- payload: " + JSON.stringify(payload));
                    this.onPeripheralDiscovered && this.onPeripheralDiscovered(payload);
                    this.owner.get().sendEvent(android_main_1.Bluetooth.device_discovered_event, payload);
                }
            }
        }) || this;
        return global.__native(_this);
    }
    TNS_LeScanCallback.prototype.onInit = function (owner) {
        this.owner = owner;
        common_1.CLog(common_1.CLogTypes.info, "TNS_LeScanCallback.onInit ---- this.owner: " + this.owner);
    };
    TNS_LeScanCallback = __decorate([
        JavaProxy('com.nativescript.TNS_LeScanCallback'),
        __metadata("design:paramtypes", [])
    ], TNS_LeScanCallback);
    return TNS_LeScanCallback;
}(android.bluetooth.BluetoothAdapter.LeScanCallback));
exports.TNS_LeScanCallback = TNS_LeScanCallback;
//# sourceMappingURL=TNS_LeScanCallback.js.map