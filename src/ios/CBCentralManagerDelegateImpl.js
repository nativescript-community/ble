"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var common_1 = require("../common");
var ios_main_1 = require("./ios_main");
var CBPeripheralDelegateImpl_1 = require("./CBPeripheralDelegateImpl");
var CBCentralManagerDelegateImpl = (function (_super) {
    __extends(CBCentralManagerDelegateImpl, _super);
    function CBCentralManagerDelegateImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    CBCentralManagerDelegateImpl.new = function () {
        return _super.new.call(this);
    };
    CBCentralManagerDelegateImpl.prototype.initWithCallback = function (owner, callback) {
        this._owner = owner;
        common_1.CLog(common_1.CLogTypes.info, "CBCentralManagerDelegateImpl.initWithCallback ---- this._owner: " + this._owner);
        this._callback = callback;
        return this;
    };
    CBCentralManagerDelegateImpl.prototype.centralManagerDidConnectPeripheral = function (central, peripheral) {
        common_1.CLog(common_1.CLogTypes.info, "----- CBCentralManagerDelegateImpl centralManager:didConnectPeripheral: " + peripheral);
        var UUID = peripheral.identifier.UUIDString;
        var peri = this._owner.get().findPeripheral(UUID);
        common_1.CLog(common_1.CLogTypes.info, "----- CBCentralManagerDelegateImpl centralManager:didConnectPeripheral: cached perio: " + peri);
        var cb = this._owner.get()._connectCallbacks[UUID];
        delete this._owner.get()._connectCallbacks[UUID];
        var delegate = CBPeripheralDelegateImpl_1.CBPeripheralDelegateImpl.new().initWithCallback(this._owner, cb);
        CFRetain(delegate);
        peri.delegate = delegate;
        common_1.CLog(common_1.CLogTypes.info, "----- CBCentralManagerDelegateImpl centralManager:didConnectPeripheral, let's discover service");
        peri.discoverServices(null);
    };
    CBCentralManagerDelegateImpl.prototype.centralManagerDidDisconnectPeripheralError = function (central, peripheral, error) {
        var UUID = peripheral.identifier.UUIDString;
        var cb = this._owner.get()._disconnectCallbacks[UUID];
        if (cb) {
            cb({
                UUID: peripheral.identifier.UUIDString,
                name: peripheral.name
            });
            delete this._owner.get()._disconnectCallbacks[UUID];
        }
        else {
            common_1.CLog(common_1.CLogTypes.info, "***** centralManagerDidDisconnectPeripheralError() no disconnect callback found *****");
        }
        var foundAt = this._owner.get()._peripheralArray.indexOfObject(peripheral);
        this._owner.get()._peripheralArray.removeObject(foundAt);
        peripheral.delegate = null;
    };
    CBCentralManagerDelegateImpl.prototype.centralManagerDidFailToConnectPeripheralError = function (central, peripheral, error) {
        common_1.CLog(common_1.CLogTypes.info, "CBCentralManagerDelegate.centralManagerDidFailToConnectPeripheralError ----", central, peripheral, error);
    };
    CBCentralManagerDelegateImpl.prototype.centralManagerDidDiscoverPeripheralAdvertisementDataRSSI = function (central, peripheral, advData, RSSI) {
        common_1.CLog(common_1.CLogTypes.info, "CBCentralManagerDelegateImpl.centralManagerDidDiscoverPeripheralAdvertisementDataRSSI ---- " + peripheral.name + " @ " + RSSI + " @ " + advData);
        var peri = this._owner.get().findPeripheral(peripheral.identifier.UUIDString);
        if (!peri) {
            this._owner.get()._peripheralArray.addObject(peripheral);
            if (this._owner.get()._onDiscovered) {
                var manufacturerId = void 0;
                var localName = void 0;
                var advertismentData = {};
                if (advData.objectForKey(CBAdvertisementDataManufacturerDataKey)) {
                    var manufacturerIdBuffer = this._owner
                        .get()
                        .toArrayBuffer(advData.objectForKey(CBAdvertisementDataManufacturerDataKey).subdataWithRange(NSMakeRange(0, 2)));
                    manufacturerId = new DataView(manufacturerIdBuffer, 0).getUint16(0, true);
                    advertismentData['manufacturerData'] = this._owner
                        .get()
                        .toArrayBuffer(advData
                        .objectForKey(CBAdvertisementDataManufacturerDataKey)
                        .subdataWithRange(NSMakeRange(2, advData.objectForKey(CBAdvertisementDataManufacturerDataKey).length - 2)));
                }
                if (advData.objectForKey(CBAdvertisementDataLocalNameKey)) {
                    advertismentData['localName'] = advData.objectForKey(CBAdvertisementDataLocalNameKey);
                }
                if (advData.objectForKey(CBAdvertisementDataServiceUUIDsKey)) {
                    advertismentData['uuids'] = advData.objectForKey(CBAdvertisementDataServiceUUIDsKey);
                }
                if (advData.objectForKey(CBAdvertisementDataIsConnectable)) {
                    advertismentData['connectable'] = advData.objectForKey(CBAdvertisementDataIsConnectable);
                }
                if (advData.objectForKey(CBAdvertisementDataServiceDataKey)) {
                    advertismentData['services'] = advData.objectForKey(CBAdvertisementDataServiceDataKey);
                }
                if (advData.objectForKey(CBAdvertisementDataTxPowerLevelKey)) {
                    advertismentData['txPowerLevel'] = advData.objectForKey(CBAdvertisementDataTxPowerLevelKey);
                }
                var payload = {
                    UUID: peripheral.identifier.UUIDString,
                    name: peripheral.name,
                    localName: localName,
                    RSSI: RSSI,
                    advertismentData: advertismentData,
                    state: this._owner.get()._getState(peripheral.state),
                    manufacturerId: manufacturerId
                };
                this._owner.get()._advData[payload.UUID] = advertismentData;
                this._owner.get()._onDiscovered(payload);
                this._owner.get().sendEvent(ios_main_1.Bluetooth.device_discovered_event, payload);
            }
            else {
                common_1.CLog(common_1.CLogTypes.warning, 'CBCentralManagerDelegateImpl.centralManagerDidDiscoverPeripheralAdvertisementDataRSSI ---- No onDiscovered callback specified');
            }
        }
    };
    CBCentralManagerDelegateImpl.prototype.centralManagerDidUpdateState = function (central) {
        if (central.state === 2) {
            common_1.CLog(common_1.CLogTypes.warning, "CBCentralManagerDelegateImpl.centralManagerDidUpdateState ---- This hardware does not support Bluetooth Low Energy.");
        }
        this._owner.get().sendEvent(ios_main_1.Bluetooth.bluetooth_status_event, {
            state: central.state === 2 ? 'unsupported' : central.state === 5 ? 'on' : 'off'
        });
    };
    CBCentralManagerDelegateImpl.prototype.centralManagerWillRestoreState = function (central, dict) {
        common_1.CLog(common_1.CLogTypes.info, "CBCentralManagerDelegateImpl.centralManagerWillRestoreState ---- central: " + central + ", dict: " + dict);
    };
    CBCentralManagerDelegateImpl.ObjCProtocols = [CBCentralManagerDelegate];
    return CBCentralManagerDelegateImpl;
}(NSObject));
exports.CBCentralManagerDelegateImpl = CBCentralManagerDelegateImpl;
//# sourceMappingURL=CBCentralManagerDelegateImpl.js.map