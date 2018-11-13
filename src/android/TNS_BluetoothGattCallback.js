"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var common_1 = require("../common");
var TNS_BluetoothGattCallback = (function (_super) {
    __extends(TNS_BluetoothGattCallback, _super);
    function TNS_BluetoothGattCallback() {
        var _this = _super.call(this) || this;
        return global.__native(_this);
    }
    TNS_BluetoothGattCallback.prototype.onInit = function (owner) {
        this.owner = owner;
        common_1.CLog(common_1.CLogTypes.info, "TNS_BluetoothGattCallback.onInit ---- this.owner: " + this.owner);
    };
    TNS_BluetoothGattCallback.prototype.onConnectionStateChange = function (gatt, status, newState) {
        common_1.CLog(common_1.CLogTypes.info, "TNS_BluetoothGattCallback.onConnectionStateChange ---- gatt: " + gatt + ", status: " + status + ", newState: " + newState);
        if (newState === android.bluetooth.BluetoothProfile.STATE_CONNECTED && status === android.bluetooth.BluetoothGatt.GATT_SUCCESS) {
            common_1.CLog(common_1.CLogTypes.info, 'TNS_BluetoothGattCallback.onConnectionStateChange ---- discovering services -----');
            gatt.discoverServices();
        }
        else {
            common_1.CLog(common_1.CLogTypes.info, "TNS_BluetoothGattCallback.onConnectionStateChange ---- disconnecting the gatt: " + gatt + " ----");
            this.owner.get().gattDisconnect(gatt);
        }
    };
    TNS_BluetoothGattCallback.prototype.onServicesDiscovered = function (gatt, status) {
        common_1.CLog(common_1.CLogTypes.info, "TNS_BluetoothGattCallback.onServicesDiscovered ---- gatt: " + gatt + ", status (0=success): " + status);
        if (status === android.bluetooth.BluetoothGatt.GATT_SUCCESS) {
            var services = gatt.getServices();
            var servicesJs = [];
            var btChar = android.bluetooth.BluetoothGattCharacteristic;
            for (var i = 0; i < services.size(); i++) {
                var service = services.get(i);
                var characteristics = service.getCharacteristics();
                var characteristicsJs = [];
                for (var j = 0; j < characteristics.size(); j++) {
                    var characteristic = characteristics.get(j);
                    var props = characteristic.getProperties();
                    var descriptors = characteristic.getDescriptors();
                    var descriptorsJs = [];
                    for (var k = 0; k < descriptors.size(); k++) {
                        var descriptor = descriptors.get(k);
                        var descriptorJs = {
                            UUID: this.owner.get().uuidToString(descriptor.getUuid()),
                            value: descriptor.getValue(),
                            permissions: null
                        };
                        var descPerms = descriptor.getPermissions();
                        if (descPerms > 0) {
                            descriptorJs.permissions = {
                                read: (descPerms & btChar.PERMISSION_READ) !== 0,
                                readEncrypted: (descPerms & btChar.PERMISSION_READ_ENCRYPTED) !== 0,
                                readEncryptedMitm: (descPerms & btChar.PERMISSION_READ_ENCRYPTED_MITM) !== 0,
                                write: (descPerms & btChar.PERMISSION_WRITE) !== 0,
                                writeEncrypted: (descPerms & btChar.PERMISSION_WRITE_ENCRYPTED) !== 0,
                                writeEncryptedMitm: (descPerms & btChar.PERMISSION_WRITE_ENCRYPTED_MITM) !== 0,
                                writeSigned: (descPerms & btChar.PERMISSION_WRITE_SIGNED) !== 0,
                                writeSignedMitm: (descPerms & btChar.PERMISSION_WRITE_SIGNED_MITM) !== 0
                            };
                        }
                        common_1.CLog(common_1.CLogTypes.info, "TNS_BluetoothGattCallback.onServicesDiscovered ---- pushing descriptor: " + descriptor);
                        descriptorsJs.push(descriptorJs);
                    }
                    var characteristicJs = {
                        serviceUUID: this.owner.get().uuidToString(service.getUuid()),
                        UUID: this.owner.get().uuidToString(characteristic.getUuid()),
                        name: this.owner.get().uuidToString(characteristic.getUuid()),
                        properties: {
                            read: (props & btChar.PROPERTY_READ) !== 0,
                            write: (props & btChar.PROPERTY_WRITE) !== 0,
                            writeWithoutResponse: (props & btChar.PROPERTY_WRITE_NO_RESPONSE) !== 0,
                            notify: (props & btChar.PROPERTY_NOTIFY) !== 0,
                            indicate: (props & btChar.PROPERTY_INDICATE) !== 0,
                            broadcast: (props & btChar.PROPERTY_BROADCAST) !== 0,
                            authenticatedSignedWrites: (props & btChar.PROPERTY_SIGNED_WRITE) !== 0,
                            extendedProperties: (props & btChar.PROPERTY_EXTENDED_PROPS) !== 0
                        },
                        descriptors: descriptorsJs,
                        permissions: null
                    };
                    var charPerms = characteristic.getPermissions();
                    if (charPerms > 0) {
                        characteristicJs.permissions = {
                            read: (charPerms & btChar.PERMISSION_READ) !== 0,
                            readEncrypted: (charPerms & btChar.PERMISSION_READ_ENCRYPTED) !== 0,
                            readEncryptedMitm: (charPerms & btChar.PERMISSION_READ_ENCRYPTED_MITM) !== 0,
                            write: (charPerms & btChar.PERMISSION_WRITE) !== 0,
                            writeEncrypted: (charPerms & btChar.PERMISSION_WRITE_ENCRYPTED) !== 0,
                            writeEncryptedMitm: (charPerms & btChar.PERMISSION_WRITE_ENCRYPTED_MITM) !== 0,
                            writeSigned: (charPerms & btChar.PERMISSION_WRITE_SIGNED) !== 0,
                            writeSignedMitm: (charPerms & btChar.PERMISSION_WRITE_SIGNED_MITM) !== 0
                        };
                    }
                    common_1.CLog(common_1.CLogTypes.info, "TNS_BluetoothGattCallback.onServicesDiscovered ---- pushing characteristic: " + JSON.stringify(characteristicJs));
                    characteristicsJs.push(characteristicJs);
                }
                servicesJs.push({
                    UUID: this.owner.get().uuidToString(service.getUuid()),
                    characteristics: characteristicsJs
                });
            }
            var device = gatt.getDevice();
            var stateObject = this.owner.get().connections[device.getAddress()];
            if (!stateObject) {
                this.owner.get().gattDisconnect(gatt);
                return;
            }
            stateObject.onConnected({
                UUID: device.getAddress(),
                name: device.getName(),
                state: 'connected',
                services: servicesJs,
                advertismentData: stateObject.advertismentData
            });
        }
    };
    TNS_BluetoothGattCallback.prototype.onCharacteristicRead = function (gatt, characteristic, status) {
        var device = gatt.getDevice();
        common_1.CLog(common_1.CLogTypes.info, "TNS_BluetoothGattCallback.onCharacteristicRead ---- gatt: " + gatt + ", characteristic: " + characteristic + ", status: " + status + ", device: " + device);
        var stateObject = this.owner.get().connections[device.getAddress()];
        if (!stateObject) {
            this.owner.get().gattDisconnect(gatt);
            return;
        }
        if (stateObject.onReadPromise) {
            var value = characteristic.getValue();
            stateObject.onReadPromise({
                valueRaw: value,
                value: this.owner.get().decodeValue(value),
                characteristicUUID: characteristic.getUuid()
            });
        }
    };
    TNS_BluetoothGattCallback.prototype.onCharacteristicChanged = function (gatt, characteristic) {
        var device = gatt.getDevice();
        common_1.CLog(common_1.CLogTypes.info, "TNS_BluetoothGattCallback.onCharacteristicChanged ---- gatt: " + gatt + ", characteristic: " + characteristic + ", device: " + device);
        var stateObject = this.owner.get().connections[device.getAddress()];
        if (!stateObject) {
            this.owner.get().gattDisconnect(gatt);
            return;
        }
        if (stateObject.onNotifyCallback) {
            var value = characteristic.getValue();
            stateObject.onNotifyCallback({
                valueRaw: value,
                value: this.owner.get().decodeValue(value),
                characteristicUUID: characteristic.getUuid()
            });
        }
    };
    TNS_BluetoothGattCallback.prototype.onCharacteristicWrite = function (gatt, characteristic, status) {
        var device = gatt.getDevice();
        common_1.CLog(common_1.CLogTypes.info, "TNS_BluetoothGattCallback.onCharacteristicWrite ---- characteristic: " + characteristic + ", status: " + status + ", device: " + device);
        var stateObject = this.owner.get().connections[device.getAddress()];
        if (!stateObject) {
            this.owner.get().gattDisconnect(gatt);
            return;
        }
        if (stateObject.onWritePromise) {
            stateObject.onWritePromise({
                characteristicUUID: characteristic.getUuid()
            });
        }
    };
    TNS_BluetoothGattCallback.prototype.onDescriptorRead = function (gatt, descriptor, status) {
        common_1.CLog(common_1.CLogTypes.info, "TNS_BluetoothGattCallback.onDescriptorRead ---- gatt: " + gatt + ", descriptor: " + descriptor + ", status: " + status);
    };
    TNS_BluetoothGattCallback.prototype.onDescriptorWrite = function (gatt, descriptor, status) {
        common_1.CLog(common_1.CLogTypes.info, "TNS_BluetoothGattCallback.onDescriptorWrite ---- gatt: " + gatt + ", descriptor: " + descriptor + ", status: " + status);
    };
    TNS_BluetoothGattCallback.prototype.onReadRemoteRssi = function (gatt, rssi, status) {
        common_1.CLog(common_1.CLogTypes.info, "TNS_BluetoothGattCallback.onReadRemoteRssi ---- gatt: " + gatt + " rssi: " + rssi + ", status: " + status);
    };
    TNS_BluetoothGattCallback.prototype.onMtuChanged = function (gatt, mtu, status) {
        common_1.CLog(common_1.CLogTypes.info, "TNS_BluetoothGattCallback.onMtuChanged ---- gatt: " + gatt + " mtu: " + mtu + ", status: " + status);
    };
    TNS_BluetoothGattCallback = __decorate([
        JavaProxy('com.nativescript.TNS_BluetoothGattCallback'),
        __metadata("design:paramtypes", [])
    ], TNS_BluetoothGattCallback);
    return TNS_BluetoothGattCallback;
}(android.bluetooth.BluetoothGattCallback));
exports.TNS_BluetoothGattCallback = TNS_BluetoothGattCallback;
//# sourceMappingURL=TNS_BluetoothGattCallback.js.map