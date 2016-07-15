"use strict";
/// <reference path="_references.d.ts" />
var bluetooth_common_1 = require("./bluetooth-common");
var Bluetooth;
(function (Bluetooth) {
    var _state = {
        manager: null,
        centralDelegate: null,
        peripheralArray: null,
        connectCallbacks: {},
        disconnectCallbacks: {},
        onDiscovered: null
    };
    var Common = new bluetooth_common_1.common;
    var CBPeripheralDelegateImpl = (function () {
        function CBPeripheralDelegateImpl() {
        }
        CBPeripheralDelegateImpl.prototype.initWithCallback = function (callback) {
            this._callback = callback;
            // this._services = [];
            this._servicesWithCharacteristics = [];
            return this;
        };
        ;
        CBPeripheralDelegateImpl.prototype.peripheralDidDiscoverServices = function (peripheral, error) {
            console.log("----- delegate peripheralDidDiscoverServices");
            // map native services to a JS object
            this._services = [];
            for (var i = 0; i < peripheral.services.count; i++) {
                var service = peripheral.services.objectAtIndex(i);
                this._services.push({
                    UUID: service.UUID.UUIDString,
                    name: service.UUID
                });
                // NOTE: discover all is slow
                peripheral.discoverCharacteristicsForService(null, service);
            }
        };
        ;
        CBPeripheralDelegateImpl.prototype.peripheralDidDiscoverIncludedServicesForServiceError = function (peripheral, service, error) {
            console.log("----- delegate peripheral:didDiscoverIncludedServicesForService:error");
        };
        ;
        CBPeripheralDelegateImpl.prototype._getProperties = function (characteristic) {
            var props = characteristic.properties;
            return {
                broadcast: (props & CBCharacteristicPropertyBroadcast) == CBCharacteristicPropertyBroadcast,
                read: (props & CBCharacteristicPropertyRead) == CBCharacteristicPropertyRead,
                broadcast2: (props & CBCharacteristicPropertyBroadcast) == CBCharacteristicPropertyBroadcast,
                read2: (props & CBCharacteristicPropertyRead) == CBCharacteristicPropertyRead,
                write: (props & CBCharacteristicPropertyWrite) == CBCharacteristicPropertyWrite,
                writeWithoutResponse: (props & CBCharacteristicPropertyWriteWithoutResponse) == CBCharacteristicPropertyWriteWithoutResponse,
                notify: (props & CBCharacteristicPropertyNotify) == CBCharacteristicPropertyNotify,
                indicate: (props & CBCharacteristicPropertyIndicate) == CBCharacteristicPropertyIndicate,
                authenticatedSignedWrites: (props & CBCharacteristicPropertyAuthenticatedSignedWrites) == CBCharacteristicPropertyAuthenticatedSignedWrites,
                extendedProperties: (props & CBCharacteristicPropertyExtendedProperties) == CBCharacteristicPropertyExtendedProperties,
                notifyEncryptionRequired: (props & CBCharacteristicPropertyNotifyEncryptionRequired) == CBCharacteristicPropertyNotifyEncryptionRequired,
                indicateEncryptionRequired: (props & CBCharacteristicPropertyIndicateEncryptionRequired) == CBCharacteristicPropertyIndicateEncryptionRequired
            };
        };
        ;
        CBPeripheralDelegateImpl.prototype._getDescriptors = function (characteristic) {
            var descs = characteristic.descriptors;
            var descsJs = [];
            for (var i = 0; i < descs.count; i++) {
                var desc = descs.objectAtIndex(i);
                console.log("--------- descriptor value: " + desc.value);
                descsJs.push({
                    UUID: desc.UUID.UUIDString,
                    value: desc.value
                });
            }
            return descsJs;
        };
        ;
        CBPeripheralDelegateImpl.prototype.peripheralDidDiscoverCharacteristicsForServiceError = function (peripheral, service, error) {
            if (error) {
                // TODO invoke reject and stop processing
                return;
            }
            var characteristics = [];
            for (var i = 0; i < service.characteristics.count; i++) {
                var characteristic = service.characteristics.objectAtIndex(i);
                var result = {
                    UUID: characteristic.UUID.UUIDString,
                    name: characteristic.UUID,
                    // see serviceAndCharacteristicInfo in CBPer+Ext of Cordova plugin
                    value: characteristic.value ? characteristic.value.base64EncodedStringWithOptions(0) : null,
                    properties: this._getProperties(characteristic),
                    // descriptors: this._getDescriptors(characteristic), // TODO we're not currently discovering these
                    isNotifying: characteristic.isNotifying,
                    permissions: characteristic.permissions // prolly not too useful
                };
                characteristics.push(result);
                for (var j = 0; j < this._services.length; j++) {
                    var s = this._services[j];
                    if (s.UUID == service.UUID.UUIDString) {
                        s.characteristics = characteristics;
                        this._servicesWithCharacteristics.push(s);
                        // the same service may be found multiple times, so make sure it's not added yet
                        this._services.splice(j, 1);
                        break;
                    }
                }
            }
            if (this._services.length === 0) {
                if (this._callback) {
                    this._callback({
                        UUID: peripheral.identifier.UUIDString,
                        name: peripheral.name,
                        state: _getState(peripheral.state),
                        services: this._servicesWithCharacteristics
                    });
                    this._callback = null;
                }
            }
        };
        ;
        CBPeripheralDelegateImpl.prototype._toArrayBuffer = function (value) {
            if (value === null) {
                return null;
            }
            // value is of ObjC type: NSData
            var b = value.base64EncodedStringWithOptions(0);
            return Common._base64ToArrayBuffer(b);
        };
        ;
        // this is called when a value is read from a peripheral
        CBPeripheralDelegateImpl.prototype.peripheralDidUpdateValueForCharacteristicError = function (peripheral, characteristic, error) {
            if (!characteristic) {
                console.log("^^^^^^^^ NO peripheralDidUpdateValueForCharacteristicError");
                return;
            }
            if (error !== null) {
                // TODO handle.. pass in sep callback?
                console.log("------------ error @ peripheralDidUpdateValueForCharacteristicError!");
                return;
            }
            var result = {
                type: characteristic.isNotifying ? "notification" : "read",
                characteristicUUID: characteristic.UUID.UUIDString,
                valueRaw: characteristic.value,
                value: this._toArrayBuffer(characteristic.value)
            };
            if (result.type === "read") {
                if (_onReadPromise) {
                    _onReadPromise(result);
                }
                else {
                    console.log("No _onReadPromise found!");
                }
            }
            else {
                if (_onNotifyCallback) {
                    _onNotifyCallback(result);
                }
                else {
                    console.log("^^^^^^^^ CALLBACK IS GONE!");
                }
            }
        };
        ;
        CBPeripheralDelegateImpl.prototype.peripheralDidWriteValueForCharacteristicError = function (peripheral, characteristic, error) {
            console.log("----- delegate peripheral:didWriteValueForCharacteristic:error");
            if (_onWritePromise) {
                _onWritePromise({
                    characteristicUUID: characteristic.UUID.UUIDString
                });
            }
            else {
                console.log("No _onWritePromise found!");
            }
        };
        ;
        // The peripheral letting us know whether our subscribe/unsubscribe happened or not
        CBPeripheralDelegateImpl.prototype.peripheralDidUpdateNotificationStateForCharacteristicError = function (peripheral, characteristic, error) {
            console.log("----- delegate peripheral:didUpdateNotificationStateForCharacteristic:error, error: " + error);
            // alert("peripheralDidUpdateNotificationStateForCharacteristicError");
            if (error) {
                console.log("----- delegate peripheral:didUpdateNotificationStateForCharacteristic:error.localizedDescription, " + error.localizedDescription);
            }
            else {
                if (characteristic.isNotifying) {
                    console.log("------ Notification began on " + characteristic);
                }
                else {
                    console.log("------ Notification stopped on " + characteristic + ", consider diconnecting");
                }
            }
        };
        ;
        CBPeripheralDelegateImpl.prototype.peripheralDidDiscoverDescriptorsForCharacteristicError = function (peripheral, characteristic, error) {
            // NOTE that this cb won't be invoked bc we curr don't discover descriptors
            console.log("----- delegate peripheral:didDiscoverDescriptorsForCharacteristic:error");
            console.log("----- delegate peripheral:didDiscoverDescriptorsForCharacteristic:error characteristic.value: " + characteristic.value);
            // TODO extract details, see https://github.com/randdusing/cordova-plugin-bluetoothle/blob/master/src/ios/BluetoothLePlugin.m#L1844
            console.log(characteristic.descriptors);
            for (var i = 0; i < characteristic.descriptors.count; i++) {
                var descriptor = characteristic.descriptors.objectAtIndex(i);
                console.log("char desc UUID: " + descriptor.UUID.UUIDString);
            }
            // now let's see if we're ready to invoke the callback
            // TODO wait for the last one, THEN return
            if (this._services.length == this._servicesWithCharacteristics.length) {
                if (this._callback) {
                    this._callback({
                        UUID: peripheral.identifier.UUIDString,
                        name: peripheral.name,
                        state: _getState(peripheral.state),
                        services: this._services
                    });
                    this._callback = null;
                }
            }
        };
        ;
        CBPeripheralDelegateImpl.prototype.peripheralDidUpdateValueForDescriptorError = function (peripheral, descriptor, error) {
            console.log("----- delegate peripheral:didUpdateValueForDescriptor:error");
        };
        ;
        CBPeripheralDelegateImpl.prototype.peripheralDidWriteValueForDescriptorError = function (peripheral, descriptor, error) {
            console.log("----- delegate peripheral:didWriteValueForDescriptor:error");
        };
        ;
        return CBPeripheralDelegateImpl;
    }());
    //CBPeripheralDelegateImpl.ObjCProtocols = [CBPeripheralDelegate];
    //return CBPeripheralDelegateImpl;
    //}//)(NSObject);
    var CBCentralManagerDelegateImpl = (function () {
        function CBCentralManagerDelegateImpl() {
            this.ObjCProtocols = [CBCentralManagerDelegate];
        }
        CBCentralManagerDelegateImpl.prototype.initWithCallback = function (callback) {
            this._callback = callback;
            return this;
        };
        ;
        // fires when a peripheral is discovered after executing the 'scan' function
        CBCentralManagerDelegateImpl.prototype.centralManagerDidDiscoverPeripheralAdvertisementDataRSSI = function (central, peripheral, advData, RSSI) {
            console.log("----- delegate centralManager:didDiscoverPeripheral: " + peripheral.name + " @ " + RSSI);
            var peri = _findPeripheral(peripheral.identifier.UUIDString);
            if (!peri) {
                _state.peripheralArray.addObject(peripheral);
                if (_state.onDiscovered) {
                    _state.onDiscovered({
                        UUID: peripheral.identifier.UUIDString,
                        name: peripheral.name,
                        RSSI: RSSI,
                        state: _getState(peripheral.state)
                    });
                }
                else {
                    console.log("----- !!! No onDiscovered callback specified");
                }
            }
        };
        ;
        CBCentralManagerDelegateImpl.prototype.centralManagerDidUpdateState = function (central) {
            console.log("----- delegate centralManagerDidUpdateState: " + central.state);
            if (central.state == CBCentralManagerStateUnsupported) {
                console.log("WARNING: This hardware does not support Bluetooth Low Energy.");
            }
        };
        ;
        CBCentralManagerDelegateImpl.prototype.centralManagerWillRestoreState = function (central, dict) {
            console.log("----- delegate centralManager:willRestoreState");
        };
        ;
        CBCentralManagerDelegateImpl.prototype.centralManagerDidConnectPeripheral = function (central, peripheral) {
            console.log("----- delegate centralManager:didConnectPeripheral: " + peripheral);
            // find the peri in the array and attach the delegate to that
            var peri = _findPeripheral(peripheral.identifier.UUIDString);
            console.log("----- delegate centralManager:didConnectPeripheral: cached perio: " + peri);
            var cb = _state.connectCallbacks[peripheral.identifier.UUIDString];
            var delegate = this.initWithCallback(cb);
            CFRetain(delegate);
            peri.delegate = delegate;
            console.log("----- delegate centralManager:didConnectPeripheral, let's discover service");
            peri.discoverServices(null);
        };
        ;
        CBCentralManagerDelegateImpl.prototype.centralManagerDidDisconnectPeripheralError = function (central, peripheral, error) {
            // this event needs to be honored by the client as any action afterwards crashes the app
            var cb = _state.disconnectCallbacks[peripheral.identifier.UUIDString];
            if (cb) {
                cb({
                    UUID: peripheral.identifier.UUIDString,
                    name: peripheral.name
                });
            }
            else {
                console.log("----- !!! no disconnect callback found");
            }
            var foundAt = _state.peripheralArray.indexOfObject(peripheral);
            _state.peripheralArray.removeObject(foundAt);
        };
        ;
        CBCentralManagerDelegateImpl.prototype.centralManagerDidFailToConnectPeripheralError = function (central, peripheral, error) {
            // TODO send event to JS
            console.log("----- delegate centralManager:didFailToConnectPeripheral:error");
            // this._callback(error);
        };
        ;
        return CBCentralManagerDelegateImpl;
    }()); //)(NSObject);
    // check for bluetooth being enabled as soon as the app starts
    (function () {
        var _CBCentralManagerDelegateImpl = new CBCentralManagerDelegateImpl;
        _state.centralDelegate = _CBCentralManagerDelegateImpl.initWithCallback(function (obj) {
            console.log("----- centralDelegate obj: " + obj);
        });
        // TODO options? https://github.com/randdusing/cordova-plugin-bluetoothle/blob/master/src/ios/BluetoothLePlugin.m#L187
        _state.manager = CBCentralManager.alloc().initWithDelegateQueue(_state.centralDelegate, null);
    })();
    function _isEnabled(arg) {
        return _state.manager.state == CBCentralManagerStatePoweredOn;
    }
    ;
    function _getState(stateId) {
        if (stateId == CBPeripheralStateConnecting) {
            return 'connecting';
        }
        else if (stateId == CBPeripheralStateConnected) {
            return 'connected';
        }
        else if (stateId == CBPeripheralStateDisconnected) {
            return 'disconnected';
        }
        else {
            console.log("Unexpected state, returning 'disconnected': " + stateId);
            return 'disconnected';
        }
    }
    ;
    function isBluetoothEnabled(arg) {
        return new Promise(function (resolve, reject) {
            try {
                resolve(_isEnabled());
            }
            catch (ex) {
                console.log("Error in Bluetooth.isBluetoothEnabled: " + ex);
                reject(ex);
            }
        });
    }
    ;
    function startScanning(arg) {
        return new Promise(function (resolve, reject) {
            try {
                if (!_isEnabled()) {
                    reject("Bluetooth is not enabled");
                    return;
                }
                _state.peripheralArray = NSMutableArray.new();
                // TODO actualy, should init the delegate here with this as the callback (see 'onConnected') --> but first test if that works
                _state.onDiscovered = arg.onDiscovered;
                var serviceUUIDs = arg.serviceUUIDs || [];
                var services = [];
                for (var s in serviceUUIDs) {
                    services.push(CBUUID.UUIDWithString(serviceUUIDs[s]));
                }
                _state.manager.scanForPeripheralsWithServicesOptions(services, null);
                if (arg.seconds) {
                    setTimeout(function () {
                        // note that by now a manual 'stop' may have been invoked, but that doesn't hurt
                        _state.manager.stopScan();
                        resolve();
                    }, arg.seconds * 1000);
                }
                else {
                    resolve();
                }
            }
            catch (ex) {
                console.log("Error in Bluetooth.startScanning: " + ex);
                reject(ex);
            }
        });
    }
    ;
    function stopScanning(arg) {
        return new Promise(function (resolve, reject) {
            try {
                if (!_isEnabled()) {
                    reject("Bluetooth is not enabled");
                    return;
                }
                _state.manager.stopScan();
                resolve();
            }
            catch (ex) {
                console.log("Error in Bluetooth.stopScanning: " + ex);
                reject(ex);
            }
        });
    }
    ;
    function _findPeripheral(UUID) {
        for (var i = 0; i < _state.peripheralArray.count; i++) {
            var peripheral = _state.peripheralArray.objectAtIndex(i);
            if (UUID == peripheral.identifier.UUIDString) {
                return peripheral;
            }
        }
        return null;
    }
    ;
    // note that this doesn't make much sense without scanning first
    function connect(arg) {
        return new Promise(function (resolve, reject) {
            try {
                if (!_isEnabled()) {
                    reject("Bluetooth is not enabled");
                    return;
                }
                if (!arg.UUID) {
                    reject("No UUID was passed");
                    return;
                }
                var peripheral = _findPeripheral(arg.UUID);
                if (peripheral === null) {
                    reject("Could not find peripheral with UUID " + arg.UUID);
                }
                else {
                    console.log("Connecting to peripheral with UUID: " + arg.UUID);
                    _state.connectCallbacks[arg.UUID] = arg.onConnected;
                    _state.disconnectCallbacks[arg.UUID] = arg.onDisconnected;
                    _state.manager.connectPeripheralOptions(peripheral, null);
                    resolve();
                }
            }
            catch (ex) {
                console.log("Error in Bluetooth.connect: " + ex);
                reject(ex);
            }
        });
    }
    ;
    function disconnect(arg) {
        return new Promise(function (resolve, reject) {
            try {
                if (!_isEnabled()) {
                    reject("Bluetooth is not enabled");
                    return;
                }
                if (!arg.UUID) {
                    reject("No UUID was passed");
                    return;
                }
                var peripheral = _findPeripheral(arg.UUID);
                if (peripheral === null) {
                    reject("Could not find peripheral with UUID " + arg.UUID);
                }
                else {
                    console.log("Disconnecting peripheral with UUID: " + arg.UUID);
                    // no need to send an error when already disconnected, but it's wise to check it
                    if (peripheral.state != CBPeripheralStateDisconnected) {
                        _state.manager.cancelPeripheralConnection(peripheral);
                        peripheral.delegate = null;
                    }
                    resolve();
                }
            }
            catch (ex) {
                console.log("Error in Bluetooth.disconnect: " + ex);
                reject(ex);
            }
        });
    }
    ;
    function isConnected(arg) {
        return new Promise(function (resolve, reject) {
            try {
                if (!_isEnabled()) {
                    reject("Bluetooth is not enabled");
                    return;
                }
                if (!arg.UUID) {
                    reject("No UUID was passed");
                    return;
                }
                var peripheral = _findPeripheral(arg.UUID);
                if (peripheral === null) {
                    reject("Could not find peripheral with UUID " + arg.UUID);
                }
                else {
                    console.log("checking connection with peripheral UUID: " + arg.UUID);
                    resolve(peripheral.state == CBPeripheralStateConnected);
                }
            }
            catch (ex) {
                console.log("Error in Bluetooth.isConnected: " + ex);
                reject(ex);
            }
        });
    }
    ;
    function _findService(UUID, peripheral) {
        for (var i = 0; i < peripheral.services.count; i++) {
            var service = peripheral.services.objectAtIndex(i);
            // console.log("--- service.UUID: " + service.UUID);
            // TODO this may need a different compare, see Cordova plugin's findServiceFromUUID function
            if (UUID.UUIDString == service.UUID.UUIDString) {
                // console.log("--- found our service with UUID: " + service.UUID);
                return service;
            }
        }
        // service not found on this peripheral
        return null;
    }
    ;
    function _findCharacteristic(UUID, service, property) {
        // console.log("--- _findCharacteristic UUID: " + UUID);
        // console.log("--- _findCharacteristic service: " + service);
        console.log("--- _findCharacteristic characteristics: " + service.characteristics);
        // console.log("--- _findCharacteristic characteristics.count: " + service.characteristics.count);
        for (var i = 0; i < service.characteristics.count; i++) {
            var characteristic = service.characteristics.objectAtIndex(i);
            // console.log("--- characteristic.UUID: " + characteristic.UUID);
            if (UUID.UUIDString == characteristic.UUID.UUIDString) {
                if (property) {
                    if ((characteristic.properties & property) == property) {
                        // console.log("--- characteristic.found: " + characteristic.UUID);
                        return characteristic;
                    }
                }
                else {
                    return characteristic;
                }
            }
        }
        // characteristic not found on this service
        console.log("--- characteristic.NOT.found!");
        return null;
    }
    ;
    function _getWrapper(arg, property, reject) {
        if (!_isEnabled()) {
            reject("Bluetooth is not enabled");
            return;
        }
        if (!arg.peripheralUUID) {
            reject("No peripheralUUID was passed");
            return null;
        }
        if (!arg.serviceUUID) {
            reject("No serviceUUID was passed");
            return null;
        }
        if (!arg.characteristicUUID) {
            reject("No characteristicUUID was passed");
            return null;
        }
        var peripheral = _findPeripheral(arg.peripheralUUID);
        if (!peripheral) {
            reject("Could not find peripheral with UUID " + arg.peripheralUUID);
            return null;
        }
        if (peripheral.state != CBPeripheralStateConnected) {
            reject("The peripheral is disconnected");
            return null;
        }
        var serviceUUID = CBUUID.UUIDWithString(arg.serviceUUID);
        var service = _findService(serviceUUID, peripheral);
        if (!service) {
            reject("Could not find service with UUID " + arg.serviceUUID + " on peripheral with UUID " + arg.peripheralUUID);
            return null;
        }
        var characteristicUUID = CBUUID.UUIDWithString(arg.characteristicUUID);
        var characteristic = _findCharacteristic(characteristicUUID, service, property);
        // Special handling for INDICATE. If charateristic with notify is not found, check for indicate.
        if (property == CBCharacteristicPropertyNotify && !characteristic) {
            characteristic = _findCharacteristic(characteristicUUID, service, CBCharacteristicPropertyIndicate);
        }
        // As a last resort, try and find ANY characteristic with this UUID, even if it doesn't have the correct properties
        if (!characteristic) {
            characteristic = _findCharacteristic(characteristicUUID, service);
        }
        if (!characteristic) {
            reject("Could not find characteristic with UUID " + arg.characteristicUUID + " on service with UUID " + arg.serviceUUID + " on peripheral with UUID " + arg.peripheralUUID);
            return null;
        }
        // with that all being checked, let's return a wrapper object containing all the stuff we found here
        return {
            peripheral: peripheral,
            service: service,
            characteristic: characteristic
        };
    }
    ;
    function read(arg) {
        return new Promise(function (resolve, reject) {
            try {
                var wrapper = _getWrapper(arg, CBCharacteristicPropertyRead, reject);
                if (wrapper === null) {
                    // no need to reject, this has already been done
                    return;
                }
                // TODO we could (should?) make this characteristic-specific
                wrapper.peripheral.delegate._onReadPromise = resolve;
                wrapper.peripheral.readValueForCharacteristic(wrapper.characteristic);
            }
            catch (ex) {
                console.log("Error in Bluetooth.read: " + ex);
                reject(ex);
            }
        });
    }
    ;
    function startNotifying(arg) {
        return new Promise(function (resolve, reject) {
            try {
                var wrapper = _getWrapper(arg, CBCharacteristicPropertyNotify, reject);
                console.log("--------- startNotifying wrapper: " + wrapper);
                if (wrapper === null) {
                    // no need to reject, this has already been done
                    return;
                }
                var cb = arg.onNotify || function (result) { console.log("No 'onNotify' callback function specified for 'startNotifying'"); };
                // TODO we could (should?) make this characteristic-specific
                wrapper.peripheral.delegate._onNotifyCallback = cb;
                wrapper.peripheral.setNotifyValueForCharacteristic(true, wrapper.characteristic);
                resolve();
            }
            catch (ex) {
                console.log("Error in Bluetooth.startNotifying: " + ex);
                reject(ex);
            }
        });
    }
    ;
    function stopNotifying(arg) {
        return new Promise(function (resolve, reject) {
            try {
                var wrapper = _getWrapper(arg, CBCharacteristicPropertyNotify, reject);
                console.log("--------- stopNotifying wrapper: " + wrapper);
                if (wrapper === null) {
                    // no need to reject, this has already been done
                    return;
                }
                var peripheral = _findPeripheral(arg.peripheralUUID);
                // peripheral.delegate = null;
                peripheral.setNotifyValueForCharacteristic(false, wrapper.characteristic);
                resolve();
            }
            catch (ex) {
                console.log("Error in Bluetooth.stopNotifying: " + ex);
                reject(ex);
            }
        });
    }
    ;
    // val must be a Uint8Array or Uint16Array or a string like '0x01' or '0x007F' or '0x01,0x02', or '0x007F,'0x006F''
    function _encodeValue(val) {
        // if it's not a string assume it's a UintXArray
        if (typeof val != 'string') {
            return val.buffer;
        }
        var parts = val.split(',');
        if (parts[0].indexOf('x') == -1) {
            return null;
        }
        var result;
        if (parts[0].length == 4) {
            result = new Uint8Array(parts.length);
        }
        else {
            // assuming eg. 0x007F
            result = new Uint16Array(parts.length);
        }
        for (var i = 0; i < parts.length; i++) {
            result[i] = parts[i];
        }
        return result.buffer;
    }
    ;
    function write(arg) {
        return new Promise(function (resolve, reject) {
            try {
                if (!arg.value) {
                    reject("You need to provide some data to write in the 'value' property");
                    return;
                }
                var wrapper = _getWrapper(arg, CBCharacteristicPropertyWrite, reject);
                if (wrapper === null) {
                    // no need to reject, this has already been done
                    return;
                }
                var valueEncoded = _encodeValue(arg.value);
                if (valueEncoded === null) {
                    reject("Invalid value: " + arg.value);
                    return;
                }
                // the promise will be resolved from 'didWriteValueForCharacteristic',
                // but we should make this characteristic-specific (see .read)
                wrapper.peripheral.delegate._onWritePromise = resolve;
                wrapper.peripheral.writeValueForCharacteristicType(valueEncoded, wrapper.characteristic, CBCharacteristicWriteWithResponse);
            }
            catch (ex) {
                console.log("Error in Bluetooth.write: " + ex);
                reject(ex);
            }
        });
    }
    ;
    function writeWithoutResponse(arg) {
        return new Promise(function (resolve, reject) {
            try {
                if (!arg.value) {
                    reject("You need to provide some data to write in the 'value' property");
                    return;
                }
                var wrapper = _getWrapper(arg, CBCharacteristicPropertyWriteWithoutResponse, reject);
                if (wrapper === null) {
                    // no need to reject, this has already been done
                    return;
                }
                var valueEncoded = _encodeValue(arg.value);
                console.log("Attempting to write (encoded): " + valueEncoded);
                wrapper.peripheral.writeValueForCharacteristicType(valueEncoded, wrapper.characteristic, CBCharacteristicWriteWithoutResponse);
                resolve();
            }
            catch (ex) {
                console.log("Error in Bluetooth.writeWithoutResponse: " + ex);
                reject(ex);
            }
        });
    }
    ;
})(Bluetooth || (Bluetooth = {}));
module.exports = Bluetooth;

//# sourceMappingURL=bluetooth.ios.js.map
