"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var common_1 = require("../common");
var CBPeripheralDelegateImpl = (function (_super) {
    __extends(CBPeripheralDelegateImpl, _super);
    function CBPeripheralDelegateImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    CBPeripheralDelegateImpl.new = function () {
        return _super.new.call(this);
    };
    CBPeripheralDelegateImpl.prototype.initWithCallback = function (owner, callback) {
        this._owner = owner;
        common_1.CLog(common_1.CLogTypes.info, "CBPeripheralDelegateImpl.initWithCallback ---- this._owner: " + this._owner);
        this._callback = callback;
        this._servicesWithCharacteristics = [];
        return this;
    };
    CBPeripheralDelegateImpl.prototype.peripheralDidDiscoverServices = function (peripheral, error) {
        common_1.CLog(common_1.CLogTypes.info, "CBPeripheralDelegateImpl.peripheralDidDiscoverServices ---- peripheral: " + peripheral + ", " + error);
        this._services = [];
        for (var i = 0; i < peripheral.services.count; i++) {
            var service = peripheral.services.objectAtIndex(i);
            this._services.push({
                UUID: service.UUID.UUIDString,
                name: service.UUID
            });
            peripheral.discoverCharacteristicsForService(null, service);
        }
    };
    CBPeripheralDelegateImpl.prototype.peripheralDidDiscoverIncludedServicesForServiceError = function (peripheral, service, error) {
        common_1.CLog(common_1.CLogTypes.info, "CBPeripheralDelegateImpl.peripheralDidDiscoverIncludedServicesForServiceError ---- peripheral: " + peripheral + ", service: " + service + ", error: " + error);
    };
    CBPeripheralDelegateImpl.prototype.peripheralDidDiscoverCharacteristicsForServiceError = function (peripheral, service, error) {
        common_1.CLog(common_1.CLogTypes.info, "CBPeripheralDelegateImpl.peripheralDidDiscoverCharacteristicsForServiceError ---- peripheral: " + peripheral + ", service: " + service + ", error: " + error);
        if (error) {
            return;
        }
        var characteristics = [];
        for (var i = 0; i < service.characteristics.count; i++) {
            var characteristic = service.characteristics.objectAtIndex(i);
            var result = {
                serviceUUID: service.UUID.UUIDString,
                UUID: characteristic.UUID.UUIDString,
                name: characteristic.UUID,
                value: characteristic.value ? characteristic.value.base64EncodedStringWithOptions(0) : null,
                properties: this._getProperties(characteristic),
                isNotifying: characteristic.isNotifying
            };
            characteristics.push(result);
            for (var j = 0; j < this._services.length; j++) {
                var s = this._services[j];
                if (s.UUID === service.UUID.UUIDString) {
                    s.characteristics = characteristics;
                    this._servicesWithCharacteristics.push(s);
                    this._services.splice(j, 1);
                    break;
                }
            }
        }
        if (this._services.length === 0) {
            if (this._callback) {
                var UUID = peripheral.identifier.UUIDString;
                this._callback({
                    UUID: UUID,
                    name: peripheral.name,
                    state: this._owner.get()._getState(peripheral.state),
                    services: this._servicesWithCharacteristics,
                    advertismentData: this._owner.get()._advData[UUID]
                });
                this._callback = null;
                delete this._owner.get()._advData[UUID];
            }
        }
    };
    CBPeripheralDelegateImpl.prototype.peripheralDidDiscoverDescriptorsForCharacteristicError = function (peripheral, characteristic, error) {
        common_1.CLog(common_1.CLogTypes.info, "CBPeripheralDelegateImpl.peripheralDidDiscoverDescriptorsForCharacteristicError ---- peripheral: " + peripheral + ", characteristic: " + characteristic + ", error: " + error);
        common_1.CLog(common_1.CLogTypes.info, "CBPeripheralDelegateImpl.peripheralDidDiscoverDescriptorsForCharacteristicError ---- characteristic.descriptors: " + characteristic.descriptors);
        for (var i = 0; i < characteristic.descriptors.count; i++) {
            var descriptor = characteristic.descriptors.objectAtIndex(i);
            common_1.CLog(common_1.CLogTypes.info, "CBPeripheralDelegateImpl.peripheralDidDiscoverDescriptorsForCharacteristicError ---- char desc UUID: " + descriptor.UUID.UUIDString);
        }
        if (this._services.length === this._servicesWithCharacteristics.length) {
            if (this._callback) {
                this._callback({
                    UUID: peripheral.identifier.UUIDString,
                    name: peripheral.name,
                    state: this._owner.get()._getState(peripheral.state),
                    services: this._services
                });
                this._callback = null;
            }
        }
    };
    CBPeripheralDelegateImpl.prototype.peripheralDidUpdateValueForCharacteristicError = function (peripheral, characteristic, error) {
        if (!characteristic) {
            common_1.CLog(common_1.CLogTypes.warning, "CBPeripheralDelegateImpl.peripheralDidUpdateValueForCharacteristicError ---- No CBCharacteristic.");
            return;
        }
        if (error !== null) {
            common_1.CLog(common_1.CLogTypes.error, "CBPeripheralDelegateImpl.peripheralDidUpdateValueForCharacteristicError ---- " + error);
            return;
        }
        var result = {
            type: characteristic.isNotifying ? 'notification' : 'read',
            characteristicUUID: characteristic.UUID.UUIDString,
            valueRaw: characteristic.value,
            value: this._owner.get().toArrayBuffer(characteristic.value)
        };
        if (result.type === 'read') {
            if (this._onReadPromise) {
                this._onReadPromise(result);
            }
            else {
                common_1.CLog(common_1.CLogTypes.info, 'No _onReadPromise found!');
            }
        }
        else {
            if (this._onNotifyCallback) {
                this._onNotifyCallback(result);
            }
            else {
                common_1.CLog(common_1.CLogTypes.info, '----- CALLBACK IS GONE -----');
            }
        }
    };
    CBPeripheralDelegateImpl.prototype.peripheralDidUpdateValueForDescriptorError = function (peripheral, descriptor, error) {
        common_1.CLog(common_1.CLogTypes.info, "CBPeripheralDelegateImpl.peripheralDidUpdateValueForDescriptorError ---- peripheral: " + peripheral + ", descriptor: " + descriptor + ", error: " + error);
    };
    CBPeripheralDelegateImpl.prototype.peripheralDidWriteValueForCharacteristicError = function (peripheral, characteristic, error) {
        common_1.CLog(common_1.CLogTypes.info, "CBPeripheralDelegateImpl.peripheralDidWriteValueForCharacteristicError ---- peripheral: " + peripheral + ", characteristic: " + characteristic + ", error: " + error);
        if (this._onWritePromise) {
            this._onWritePromise({
                characteristicUUID: characteristic.UUID.UUIDString
            });
        }
        else {
            common_1.CLog(common_1.CLogTypes.warning, 'CBPeripheralDelegateImpl.peripheralDidWriteValueForCharacteristicError ---- No _onWritePromise found!');
        }
    };
    CBPeripheralDelegateImpl.prototype.peripheralDidUpdateNotificationStateForCharacteristicError = function (peripheral, characteristic, error) {
        common_1.CLog(common_1.CLogTypes.info, "CBPeripheralDelegateImpl.peripheralDidUpdateNotificationStateForCharacteristicError ---- peripheral: " + peripheral + ", characteristic: " + characteristic + ", error: " + error);
        if (error) {
            common_1.CLog(common_1.CLogTypes.error, "CBPeripheralDelegateImpl.peripheralDidUpdateNotificationStateForCharacteristicError ---- " + error);
        }
        else {
            if (characteristic.isNotifying) {
                common_1.CLog(common_1.CLogTypes.info, "CBPeripheralDelegateImpl.peripheralDidUpdateNotificationStateForCharacteristicError ---- Notification began on " + characteristic);
            }
            else {
                common_1.CLog(common_1.CLogTypes.info, "CBPeripheralDelegateImpl.peripheralDidUpdateNotificationStateForCharacteristicError ---- Notification stopped on  " + characteristic + ", consider disconnecting");
            }
        }
    };
    CBPeripheralDelegateImpl.prototype.peripheralDidWriteValueForDescriptorError = function (peripheral, descriptor, error) {
        common_1.CLog(common_1.CLogTypes.info, "CBPeripheralDelegateImpl.peripheralDidWriteValueForDescriptorError ---- peripheral: " + peripheral + ", descriptor: " + descriptor + ", error: " + error);
    };
    CBPeripheralDelegateImpl.prototype._getProperties = function (characteristic) {
        var props = characteristic.properties;
        return {
            broadcast: (props & 1) === 1,
            read: (props & 2) === 2,
            broadcast2: (props & 1) === 1,
            read2: (props & 2) === 2,
            write: (props & 8) === 8,
            writeWithoutResponse: (props & 4) === 4,
            notify: (props & 16) === 16,
            indicate: (props & 32) === 32,
            authenticatedSignedWrites: (props & 64) ===
                64,
            extendedProperties: (props & 128) === 128,
            notifyEncryptionRequired: (props & 256) ===
                256,
            indicateEncryptionRequired: (props & 512) ===
                512
        };
    };
    CBPeripheralDelegateImpl.prototype._getDescriptors = function (characteristic) {
        var descs = characteristic.descriptors;
        var descsJs = [];
        for (var i = 0; i < descs.count; i++) {
            var desc = descs.objectAtIndex(i);
            common_1.CLog(common_1.CLogTypes.info, "CBPeripheralDelegateImpl._getDescriptors ---- descriptor value: " + desc.value);
            descsJs.push({
                UUID: desc.UUID.UUIDString,
                value: desc.value
            });
        }
        return descsJs;
    };
    CBPeripheralDelegateImpl.ObjCProtocols = [CBPeripheralDelegate];
    return CBPeripheralDelegateImpl;
}(NSObject));
exports.CBPeripheralDelegateImpl = CBPeripheralDelegateImpl;
//# sourceMappingURL=CBPeripheralDelegateImpl.js.map