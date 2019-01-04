"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var common_1 = require("../common");
var CBCentralManagerDelegateImpl_1 = require("./CBCentralManagerDelegateImpl");
var Bluetooth = (function (_super) {
    __extends(Bluetooth, _super);
    function Bluetooth(restoreIdentifier) {
        var _this = _super.call(this) || this;
        _this._centralDelegate = CBCentralManagerDelegateImpl_1.CBCentralManagerDelegateImpl.new().initWithCallback(new WeakRef(_this), function (obj) {
            common_1.CLog(common_1.CLogTypes.info, "---- centralDelegate ---- obj: " + obj);
        });
        _this._peripheralArray = null;
        _this._connectCallbacks = {};
        _this._advData = {};
        _this._disconnectCallbacks = {};
        _this._onDiscovered = null;
        var options = null;
        if (restoreIdentifier) {
            options = new NSDictionary([restoreIdentifier], [CBCentralManagerOptionRestoreIdentifierKey]);
        }
        _this._centralManager = CBCentralManager.alloc().initWithDelegateQueueOptions(_this._centralDelegate, null, options);
        common_1.CLog(common_1.CLogTypes.info, '*** iOS Bluetooth Constructor *** ${restoreIdentifier}');
        common_1.CLog(common_1.CLogTypes.info, "this._centralManager: " + _this._centralManager);
        return _this;
    }
    Object.defineProperty(Bluetooth.prototype, "enabled", {
        get: function () {
            var state = this._centralManager.state;
            if (state === 5) {
                return true;
            }
            else {
                return false;
            }
        },
        enumerable: true,
        configurable: true
    });
    Bluetooth.prototype._getState = function (state) {
        if (state === 1) {
            return 'connecting';
        }
        else if (state === 2) {
            return 'connected';
        }
        else if (state === 0) {
            return 'disconnected';
        }
        else {
            common_1.CLog(common_1.CLogTypes.warning, "Bluetooth._getState ---- Unexpected state, returning 'disconnected' for state of " + state);
            return 'disconnected';
        }
    };
    Bluetooth.prototype.isBluetoothEnabled = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                var isEnabled = _this._isEnabled();
                resolve(isEnabled);
            }
            catch (ex) {
                common_1.CLog(common_1.CLogTypes.error, "Bluetooth.isBluetoothEnabled ---- " + ex);
                reject(ex);
            }
        });
    };
    Bluetooth.prototype.startScanning = function (arg) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                if (!_this._isEnabled()) {
                    common_1.CLog(common_1.CLogTypes.info, "Bluetooth.startScanning ---- Bluetooth is not enabled.");
                    reject('Bluetooth is not enabled.');
                    return;
                }
                _this._peripheralArray = NSMutableArray.new();
                _this._onDiscovered = arg.onDiscovered;
                var services_1 = null;
                if (arg.filters) {
                    services_1 = [];
                    arg.filters.forEach(function (f) {
                        if (f.serviceUUID) {
                            services_1.push(CBUUID.UUIDWithString(f.serviceUUID));
                        }
                    });
                }
                common_1.CLog(common_1.CLogTypes.info, "Bluetooth.startScanning ---- services: " + services_1);
                _this._centralManager.scanForPeripheralsWithServicesOptions(services_1, null);
                if (_this.scanningReferTimer) {
                    clearTimeout(_this.scanningReferTimer.timer);
                    _this.scanningReferTimer.resolve();
                }
                _this.scanningReferTimer = {};
                if (arg.seconds) {
                    _this.scanningReferTimer.timer = setTimeout(function () {
                        _this._centralManager.stopScan();
                        resolve();
                    }, arg.seconds * 1000);
                    _this.scanningReferTimer.resolve = resolve;
                }
                else {
                    resolve();
                }
            }
            catch (ex) {
                common_1.CLog(common_1.CLogTypes.error, "Bluetooth.startScanning ---- error: " + ex);
                reject(ex);
            }
        });
    };
    Bluetooth.prototype.toArrayBuffer = function (value) {
        if (value === null) {
            return null;
        }
        var b = value.base64EncodedStringWithOptions(0);
        return this.base64ToArrayBuffer(b);
    };
    Bluetooth.prototype.enable = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            common_1.CLog(common_1.CLogTypes.info, 'Bluetooth.enable ---- Not possible on iOS');
            resolve(_this._isEnabled());
        });
    };
    Bluetooth.prototype.isGPSEnabled = function () {
        return true;
    };
    Bluetooth.prototype.enableGPS = function () {
        return Promise.resolve();
    };
    Bluetooth.prototype.stopScanning = function (arg) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                if (!_this._isEnabled()) {
                    reject('Bluetooth is not enabled.');
                    return;
                }
                _this._centralManager.stopScan();
                if (_this.scanningReferTimer) {
                    _this.scanningReferTimer.resolve && _this.scanningReferTimer.resolve();
                    clearTimeout(_this.scanningReferTimer.timer);
                    _this.scanningReferTimer = null;
                }
                resolve();
            }
            catch (ex) {
                common_1.CLog(common_1.CLogTypes.error, "Bluetooth.stopScanning ---- error: " + ex);
                reject(ex);
            }
        });
    };
    Bluetooth.prototype.connect = function (args) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                if (!_this._isEnabled()) {
                    reject('Bluetooth is not enabled.');
                    return;
                }
                if (!args.UUID) {
                    reject('No UUID was passed');
                    return;
                }
                common_1.CLog(common_1.CLogTypes.info, "Bluetooth.connect ---- " + args.UUID);
                var peripheral = _this.findPeripheral(args.UUID);
                common_1.CLog(common_1.CLogTypes.info, "Bluetooth.connect ---- peripheral found: " + peripheral);
                if (!peripheral) {
                    reject("Could not find peripheral with UUID: " + args.UUID);
                }
                else {
                    common_1.CLog(common_1.CLogTypes.info, "Bluetooth.connect ---- Connecting to peripheral with UUID: " + args.UUID);
                    _this._connectCallbacks[args.UUID] = args.onConnected;
                    _this._disconnectCallbacks[args.UUID] = args.onDisconnected;
                    _this._centralManager.connectPeripheralOptions(peripheral, null);
                    resolve();
                }
            }
            catch (ex) {
                common_1.CLog(common_1.CLogTypes.error, "Bluetooth.connect ---- error: " + ex);
                reject(ex);
            }
        });
    };
    Bluetooth.prototype.disconnect = function (arg) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                if (!_this._isEnabled()) {
                    reject('Bluetooth is not enabled');
                    return;
                }
                if (!arg.UUID) {
                    reject('No UUID was passed');
                    return;
                }
                var peripheral = _this.findPeripheral(arg.UUID);
                if (!peripheral) {
                    reject('Could not find peripheral with UUID ' + arg.UUID);
                }
                else {
                    common_1.CLog(common_1.CLogTypes.info, "Bluetooth.disconnect ---- Disconnecting peripheral with UUID " + arg.UUID);
                    if (peripheral.state !== 0) {
                        _this._centralManager.cancelPeripheralConnection(peripheral);
                    }
                    resolve();
                }
            }
            catch (ex) {
                common_1.CLog(common_1.CLogTypes.error, "Bluetooth.disconnect ---- error: " + ex);
                reject(ex);
            }
        });
    };
    Bluetooth.prototype.isConnected = function (arg) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                if (!_this._isEnabled()) {
                    reject('Bluetooth is not enabled');
                    return;
                }
                if (!arg.UUID) {
                    reject('No UUID was passed');
                    return;
                }
                var peripheral = _this.findPeripheral(arg.UUID);
                if (peripheral === null) {
                    reject('Could not find peripheral with UUID ' + arg.UUID);
                }
                else {
                    common_1.CLog(common_1.CLogTypes.info, "Bluetooth.isConnected ---- checking connection with peripheral UUID: " + arg.UUID);
                    resolve(peripheral.state === 2);
                }
            }
            catch (ex) {
                common_1.CLog(common_1.CLogTypes.error, "Bluetooth.isConnected ---- error: " + ex);
                reject(ex);
            }
        });
    };
    Bluetooth.prototype.findPeripheral = function (UUID) {
        for (var i = 0; i < this._peripheralArray.count; i++) {
            var peripheral = this._peripheralArray.objectAtIndex(i);
            if (UUID === peripheral.identifier.UUIDString) {
                return peripheral;
            }
        }
        return null;
    };
    Bluetooth.prototype.read = function (arg) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                var wrapper = _this._getWrapper(arg, 2, reject);
                if (!wrapper) {
                    return;
                }
                wrapper.peripheral.delegate._onReadPromise = resolve;
                wrapper.peripheral.readValueForCharacteristic(wrapper.characteristic);
            }
            catch (ex) {
                common_1.CLog(common_1.CLogTypes.error, "Bluetooth.read ---- error: " + ex);
                reject(ex);
            }
        });
    };
    Bluetooth.prototype.write = function (arg) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                if (!arg.value) {
                    reject("You need to provide some data to write in the 'value' property.");
                    return;
                }
                var wrapper = _this._getWrapper(arg, 8, reject);
                if (!wrapper) {
                    return;
                }
                var valueEncoded = arg.raw === true ? arg.value : _this._encodeValue(arg.value);
                if (valueEncoded === null) {
                    reject('Invalid value: ' + arg.value);
                    return;
                }
                wrapper.peripheral.delegate._onWritePromise = resolve;
                wrapper.peripheral.writeValueForCharacteristicType(valueEncoded, wrapper.characteristic, 0);
            }
            catch (ex) {
                common_1.CLog(common_1.CLogTypes.error, "Bluetooth.write ---- error: " + ex);
                reject(ex);
            }
        });
    };
    Bluetooth.prototype.writeWithoutResponse = function (arg) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                if (!arg.value) {
                    reject("You need to provide some data to write in the 'value' property");
                    return;
                }
                var wrapper = _this._getWrapper(arg, 4, reject);
                if (!wrapper) {
                    return;
                }
                var valueEncoded = arg.raw === true ? _this.valueToNSData(arg.value) : _this._encodeValue(arg.value);
                common_1.CLog(common_1.CLogTypes.info, "Bluetooth.writeWithoutResponse ---- Attempting to write (" + (arg.raw === true ? 'raw' : 'encoded') + "): " + valueEncoded);
                wrapper.peripheral.writeValueForCharacteristicType(valueEncoded, wrapper.characteristic, 1);
                resolve();
            }
            catch (ex) {
                common_1.CLog(common_1.CLogTypes.error, "Bluetooth.writeWithoutResponse ---- error: " + ex);
                reject(ex);
            }
        });
    };
    Bluetooth.prototype.startNotifying = function (args) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                var wrapper = _this._getWrapper(args, 16, reject);
                common_1.CLog(common_1.CLogTypes.info, "Bluetooth.startNotifying ---- wrapper: " + wrapper);
                if (!wrapper) {
                    return;
                }
                var cb = args.onNotify ||
                    function (result) {
                        common_1.CLog(common_1.CLogTypes.info, "Bluetooth.startNotifying ---- No 'onNotify' callback function specified for 'startNotifying()'");
                    };
                wrapper.peripheral.delegate._onNotifyCallback = cb;
                wrapper.peripheral.setNotifyValueForCharacteristic(true, wrapper.characteristic);
                resolve();
            }
            catch (ex) {
                common_1.CLog(common_1.CLogTypes.error, "Bluetooth.startNotifying ---- error: " + ex);
                reject(ex);
            }
        });
    };
    Bluetooth.prototype.stopNotifying = function (args) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                var wrapper = _this._getWrapper(args, 16, reject);
                common_1.CLog(common_1.CLogTypes.info, "Bluetooth.stopNotifying ---- wrapper: " + wrapper);
                if (wrapper === null) {
                    return;
                }
                var peripheral = _this.findPeripheral(args.peripheralUUID);
                peripheral.setNotifyValueForCharacteristic(false, wrapper.characteristic);
                resolve();
            }
            catch (ex) {
                common_1.CLog(common_1.CLogTypes.error, "Bluetooth.stopNotifying ---- error: " + ex);
                reject(ex);
            }
        });
    };
    Bluetooth.prototype._isEnabled = function () {
        var state = this._centralManager.state;
        common_1.CLog(common_1.CLogTypes.info, "Bluetooth._isEnabled ---- this._centralManager.state: " + this._centralManager.state);
        return state === 5;
    };
    Bluetooth.prototype._stringToUuid = function (uuidStr) {
        if (uuidStr.length === 4) {
            uuidStr = "0000" + uuidStr + "-0000-1000-8000-00805f9b34fb";
        }
        return CFUUIDCreateFromString(null, uuidStr);
    };
    Bluetooth.prototype._findService = function (UUID, peripheral) {
        for (var i = 0; i < peripheral.services.count; i++) {
            var service = peripheral.services.objectAtIndex(i);
            if (UUID.UUIDString === service.UUID.UUIDString) {
                common_1.CLog(common_1.CLogTypes.info, "Bluetooth._findService ---- found service with UUID:  " + service.UUID);
                return service;
            }
        }
        return null;
    };
    Bluetooth.prototype._findCharacteristic = function (UUID, service, property) {
        common_1.CLog(common_1.CLogTypes.info, "Bluetooth._findCharacteristic ---- UUID: " + UUID + ", service: " + service + ", characteristics: " + service.characteristics);
        for (var i = 0; i < service.characteristics.count; i++) {
            var characteristic = service.characteristics.objectAtIndex(i);
            if (UUID.UUIDString === characteristic.UUID.UUIDString) {
                if (property && characteristic.properties) {
                    if (property === property) {
                        common_1.CLog(common_1.CLogTypes.info, "Bluetooth._findCharacteristic ---- characteristic.found: " + characteristic.UUID);
                        return characteristic;
                    }
                }
                else {
                    return characteristic;
                }
            }
        }
        common_1.CLog(common_1.CLogTypes.warning, 'Bluetooth._findCharacteristic ---- characteristic NOT found');
        return null;
    };
    Bluetooth.prototype._getWrapper = function (arg, property, reject) {
        if (!this._isEnabled()) {
            reject('Bluetooth is not enabled');
            return null;
        }
        if (!arg.peripheralUUID) {
            reject('No peripheralUUID was passed');
            return null;
        }
        if (!arg.serviceUUID) {
            reject('No serviceUUID was passed');
            return null;
        }
        if (!arg.characteristicUUID) {
            reject('No characteristicUUID was passed');
            return null;
        }
        var peripheral = this.findPeripheral(arg.peripheralUUID);
        if (!peripheral) {
            reject('Could not find peripheral with UUID ' + arg.peripheralUUID);
            return null;
        }
        if (peripheral.state !== 2) {
            reject('The peripheral is disconnected');
            return null;
        }
        var serviceUUID = CBUUID.UUIDWithString(arg.serviceUUID);
        var service = this._findService(serviceUUID, peripheral);
        if (!service) {
            reject("Could not find service with UUID " + arg.serviceUUID + " on peripheral with UUID " + arg.peripheralUUID);
            return null;
        }
        var characteristicUUID = CBUUID.UUIDWithString(arg.characteristicUUID);
        var characteristic = this._findCharacteristic(characteristicUUID, service, property);
        if (property === 16 && !characteristic) {
            characteristic = this._findCharacteristic(characteristicUUID, service, 32);
        }
        if (!characteristic) {
            characteristic = this._findCharacteristic(characteristicUUID, service, null);
        }
        if (!characteristic) {
            reject("Could not find characteristic with UUID " + arg.characteristicUUID + " on service with UUID " + arg.serviceUUID + " on peripheral with UUID " + arg.peripheralUUID);
            return null;
        }
        return {
            peripheral: peripheral,
            service: service,
            characteristic: characteristic
        };
    };
    Bluetooth.prototype._encodeValue = function (value) {
        if (typeof value !== 'string') {
            return value.buffer;
        }
        var parts = value.split(',');
        if (parts[0].indexOf('x') === -1) {
            return null;
        }
        var result;
        if (parts[0].length === 4) {
            result = new Uint8Array(parts.length);
        }
        else {
            result = new Uint16Array(parts.length);
        }
        for (var i = 0; i < parts.length; i++) {
            result[i] = parts[i];
        }
        return result.buffer;
    };
    Bluetooth.prototype.valueToNSData = function (value) {
        if (typeof value === 'string') {
            return NSString.stringWithString(value).dataUsingEncoding(NSUTF8StringEncoding);
        }
        else if (Array.isArray(value)) {
            var data = NSMutableData.alloc().initWithCapacity(value.length);
            for (var index_1 = 0; index_1 < value.length; index_1++) {
                var element = value[index_1];
                data.appendBytesLength(new Number(element).valueOf(), 1);
            }
            return data;
        }
        else {
            return null;
        }
    };
    return Bluetooth;
}(common_1.BluetoothCommon));
exports.Bluetooth = Bluetooth;
//# sourceMappingURL=ios_main.js.map