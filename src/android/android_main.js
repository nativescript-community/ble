"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var utils = require("tns-core-modules/utils/utils");
var application = require("tns-core-modules/application/application");
var common_1 = require("../common");
var TNS_BluetoothGattCallback_1 = require("./TNS_BluetoothGattCallback");
var TNS_LeScanCallback_1 = require("./TNS_LeScanCallback");
var TNS_ScanCallback_1 = require("./TNS_ScanCallback");
var Queue = require("p-queue");
var ACCESS_COARSE_LOCATION_PERMISSION_REQUEST_CODE = 222;
var ACTION_REQUEST_ENABLE_BLUETOOTH_REQUEST_CODE = 223;
var ACTION_REQUEST_BLUETOOTH_DISCOVERABLE_REQUEST_CODE = 224;
var SDK_INT = android.os.Build.VERSION.SDK_INT;
var ScanMode;
(function (ScanMode) {
    ScanMode[ScanMode["LOW_LATENCY"] = 0] = "LOW_LATENCY";
    ScanMode[ScanMode["BALANCED"] = 1] = "BALANCED";
    ScanMode[ScanMode["LOW_POWER"] = 2] = "LOW_POWER";
    ScanMode[ScanMode["OPPORTUNISTIC"] = 3] = "OPPORTUNISTIC";
})(ScanMode = exports.ScanMode || (exports.ScanMode = {}));
function androidScanMode(mode) {
    switch (mode) {
        case ScanMode.BALANCED:
            return android.bluetooth.le.ScanSettings.SCAN_MODE_BALANCED;
        case ScanMode.LOW_POWER:
            return android.bluetooth.le.ScanSettings.SCAN_MODE_LOW_POWER;
        case ScanMode.OPPORTUNISTIC:
            return android.bluetooth.le.ScanSettings.SCAN_MODE_OPPORTUNISTIC;
        case ScanMode.LOW_LATENCY:
        default:
            return android.bluetooth.le.ScanSettings.SCAN_MODE_LOW_LATENCY;
    }
}
var MatchMode;
(function (MatchMode) {
    MatchMode[MatchMode["AGGRESSIVE"] = 0] = "AGGRESSIVE";
    MatchMode[MatchMode["STICKY"] = 1] = "STICKY";
})(MatchMode = exports.MatchMode || (exports.MatchMode = {}));
function androidMatchMode(mode) {
    switch (mode) {
        case MatchMode.STICKY:
            return android.bluetooth.le.ScanSettings.MATCH_MODE_STICKY;
        default:
            return android.bluetooth.le.ScanSettings.MATCH_MODE_AGGRESSIVE;
    }
}
var MatchNum;
(function (MatchNum) {
    MatchNum[MatchNum["MAX_ADVERTISEMENT"] = 0] = "MAX_ADVERTISEMENT";
    MatchNum[MatchNum["FEW_ADVERTISEMENT"] = 1] = "FEW_ADVERTISEMENT";
    MatchNum[MatchNum["ONE_ADVERTISEMENT"] = 2] = "ONE_ADVERTISEMENT";
})(MatchNum = exports.MatchNum || (exports.MatchNum = {}));
function androidMatchNum(mode) {
    switch (mode) {
        case MatchNum.ONE_ADVERTISEMENT:
            return android.bluetooth.le.ScanSettings.MATCH_NUM_ONE_ADVERTISEMENT;
        case MatchNum.FEW_ADVERTISEMENT:
            return android.bluetooth.le.ScanSettings.MATCH_NUM_FEW_ADVERTISEMENT;
        default:
            return android.bluetooth.le.ScanSettings.MATCH_NUM_MAX_ADVERTISEMENT;
    }
}
var CallbackType;
(function (CallbackType) {
    CallbackType[CallbackType["ALL_MATCHES"] = 0] = "ALL_MATCHES";
    CallbackType[CallbackType["FIRST_MATCH"] = 1] = "FIRST_MATCH";
    CallbackType[CallbackType["MATCH_LOST"] = 2] = "MATCH_LOST";
})(CallbackType = exports.CallbackType || (exports.CallbackType = {}));
function androidCallbackType(mode) {
    switch (mode) {
        case CallbackType.MATCH_LOST:
            return android.bluetooth.le.ScanSettings.CALLBACK_TYPE_MATCH_LOST;
        case CallbackType.FIRST_MATCH:
            return android.bluetooth.le.ScanSettings.CALLBACK_TYPE_FIRST_MATCH;
        default:
            return android.bluetooth.le.ScanSettings.CALLBACK_TYPE_ALL_MATCHES;
    }
}
var Bluetooth = (function (_super) {
    __extends(Bluetooth, _super);
    function Bluetooth() {
        var _this = _super.call(this) || this;
        _this.bluetoothManager = utils.ad
            .getApplicationContext()
            .getSystemService(android.content.Context.BLUETOOTH_SERVICE);
        _this.adapter = _this.bluetoothManager.getAdapter();
        _this.bluetoothGattCallback = new TNS_BluetoothGattCallback_1.TNS_BluetoothGattCallback();
        _this.gattQueue = new Queue({ concurrency: 1 });
        _this.connections = {};
        common_1.CLog(common_1.CLogTypes.info, '*** Android Bluetooth Constructor ***');
        common_1.CLog(common_1.CLogTypes.info, 'this.bluetoothManager', _this.bluetoothManager);
        common_1.CLog(common_1.CLogTypes.info, 'this.adapter', _this.adapter);
        if (SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
            _this.scanCallback = new TNS_ScanCallback_1.TNS_ScanCallback();
            _this.scanCallback.onInit(new WeakRef(_this));
        }
        else {
            _this.LeScanCallback = new TNS_LeScanCallback_1.TNS_LeScanCallback();
            _this.LeScanCallback.onInit(new WeakRef(_this));
        }
        _this.bluetoothGattCallback.onInit(new WeakRef(_this));
        _this.broadcastReceiver = application.android.registerBroadcastReceiver(android.bluetooth.BluetoothAdapter.ACTION_STATE_CHANGED, function (context, intent) {
            var state = intent.getIntExtra(android.bluetooth.BluetoothAdapter.EXTRA_STATE, android.bluetooth.BluetoothAdapter.ERROR);
            if (state === android.bluetooth.BluetoothAdapter.STATE_ON || state === android.bluetooth.BluetoothAdapter.STATE_OFF) {
                _this.sendEvent(Bluetooth.bluetooth_status_event, {
                    state: state === android.bluetooth.BluetoothAdapter.STATE_ON ? 'on' : 'off'
                });
            }
        });
        return _this;
    }
    Object.defineProperty(Bluetooth.prototype, "enabled", {
        get: function () {
            if (this.adapter !== null && this.adapter.isEnabled()) {
                return true;
            }
            else {
                return false;
            }
        },
        enumerable: true,
        configurable: true
    });
    Bluetooth.prototype.coarseLocationPermissionGranted = function () {
        var hasPermission = SDK_INT < 23;
        if (!hasPermission) {
            var ctx = this._getContext();
            common_1.CLog(common_1.CLogTypes.info, "app context " + ctx);
            hasPermission =
                android.content.pm.PackageManager.PERMISSION_GRANTED ===
                    android.support.v4.content.ContextCompat.checkSelfPermission(ctx, android.Manifest.permission.ACCESS_COARSE_LOCATION);
        }
        common_1.CLog(common_1.CLogTypes.info, 'Bluetooth.coarseLocationPermissionGranted ---- ACCESS_COARSE_LOCATION permission granted?', hasPermission);
        return hasPermission;
    };
    Bluetooth.prototype.hasCoarseLocationPermission = function () {
        var _this = this;
        return new Promise(function (resolve) {
            resolve(_this.coarseLocationPermissionGranted());
        });
    };
    Bluetooth.prototype.requestCoarseLocationPermission = function (callback) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var permissionCb = function (args) {
                if (args.requestCode === ACCESS_COARSE_LOCATION_PERMISSION_REQUEST_CODE) {
                    application.android.off(application.AndroidApplication.activityRequestPermissionsEvent, permissionCb);
                    permissionCb = null;
                    for (var i = 0; i < args.permissions.length; i++) {
                        if (args.grantResults[i] === android.content.pm.PackageManager.PERMISSION_DENIED) {
                            reject('Permission denied');
                            return;
                        }
                    }
                    if (callback) {
                        callback();
                    }
                    resolve();
                }
            };
            application.android.on(application.AndroidApplication.activityRequestPermissionsEvent, permissionCb);
            android.support.v4.app.ActivityCompat.requestPermissions(_this._getActivity(), [android.Manifest.permission.ACCESS_COARSE_LOCATION], ACCESS_COARSE_LOCATION_PERMISSION_REQUEST_CODE);
        });
    };
    Bluetooth.prototype.getAndroidLocationManager = function () {
        return application.android.context.getSystemService(android.content.Context.LOCATION_SERVICE);
    };
    Bluetooth.prototype.isGPSEnabled = function () {
        return this.getAndroidLocationManager().isProviderEnabled(android.location.LocationManager.GPS_PROVIDER);
    };
    Bluetooth.prototype.enableGPS = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var currentContext = application.android.currentContext;
            if (!_this.isGPSEnabled()) {
                var onActivityResultHandler_1 = function (data) {
                    application.android.off(application.AndroidApplication.activityResultEvent, onActivityResultHandler_1);
                    if (data.requestCode === 0) {
                        if (_this.isGPSEnabled()) {
                            resolve();
                        }
                        else {
                            reject('GPS not enabled');
                        }
                    }
                };
                application.android.on(application.AndroidApplication.activityResultEvent, onActivityResultHandler_1);
                currentContext.startActivityForResult(new android.content.Intent(android.provider.Settings.ACTION_LOCATION_SOURCE_SETTINGS), 0);
            }
            else {
                resolve();
            }
        });
    };
    Bluetooth.prototype.enable = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                var onBluetoothEnableResult_1 = function (args) {
                    common_1.CLog(common_1.CLogTypes.info, 'Bluetooth.onBluetoothEnableResult ---', "requestCode: " + args.requestCode + ", result: " + args.resultCode);
                    if (args.requestCode === ACTION_REQUEST_ENABLE_BLUETOOTH_REQUEST_CODE) {
                        try {
                            application.android.off(application.AndroidApplication.activityResultEvent, onBluetoothEnableResult_1);
                            if (args.resultCode === android.app.Activity.RESULT_OK) {
                                _this.sendEvent(Bluetooth.bluetooth_enabled_event);
                                resolve(true);
                            }
                            else {
                                resolve(false);
                            }
                        }
                        catch (ex) {
                            common_1.CLog(common_1.CLogTypes.error, ex);
                            application.android.off(application.AndroidApplication.activityResultEvent, onBluetoothEnableResult_1);
                            _this.sendEvent(Bluetooth.error_event, { error: ex }, "Bluetooth.enable ---- error: " + ex);
                            reject(ex);
                            return;
                        }
                    }
                    else {
                        application.android.off(application.AndroidApplication.activityResultEvent, onBluetoothEnableResult_1);
                        resolve(false);
                        return;
                    }
                };
                application.android.on(application.AndroidApplication.activityResultEvent, onBluetoothEnableResult_1);
                var intent = new android.content.Intent(android.bluetooth.BluetoothAdapter.ACTION_REQUEST_ENABLE);
                var activity = application.android.foregroundActivity || application.android.startActivity;
                activity.startActivityForResult(intent, ACTION_REQUEST_ENABLE_BLUETOOTH_REQUEST_CODE);
            }
            catch (ex) {
                common_1.CLog(common_1.CLogTypes.error, "Bluetooth.enable: " + ex);
                reject(ex);
                _this.sendEvent(Bluetooth.error_event, { error: ex }, 'Error enabling bluetooth.');
            }
        });
    };
    Bluetooth.prototype.isBluetoothEnabled = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                resolve(_this._isEnabled());
            }
            catch (ex) {
                common_1.CLog(common_1.CLogTypes.error, "Bluetooth.isBluetoothEnabled ---- error: " + ex);
                reject(ex);
            }
        });
    };
    Bluetooth.prototype.stopCurrentScan = function () {
        common_1.CLog(common_1.CLogTypes.info, 'Bluetooth.stopCurrentScan');
        if (SDK_INT < android.os.Build.VERSION_CODES.LOLLIPOP) {
            this.adapter.stopLeScan(this.LeScanCallback);
        }
        else {
            this.adapter.getBluetoothLeScanner().stopScan(this.scanCallback);
        }
        this.scanCallback.onPeripheralDiscovered = null;
        if (this.scanningReferTimer) {
            clearTimeout(this.scanningReferTimer.timer);
            this.scanningReferTimer.resolve();
            this.scanningReferTimer = null;
        }
    };
    Bluetooth.prototype.startScanning = function (arg) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                if (!_this._isEnabled()) {
                    reject('Bluetooth is not enabled');
                    return;
                }
                var onPermissionGranted = function () {
                    for (var key in _this.connections) {
                        if (_this.connections[key] && _this.connections[key].state === 'disconnected') {
                            delete _this.connections[key];
                        }
                    }
                    var filters = arg.filters || [];
                    if (SDK_INT < android.os.Build.VERSION_CODES.LOLLIPOP) {
                        var uuids_1 = [];
                        filters.forEach(function (f) {
                            if (f.serviceUUID) {
                                uuids_1.push(_this.stringToUuid(f.serviceUUID));
                            }
                        });
                        var didStart = uuids_1.length === 0 ? _this.adapter.startLeScan(_this.LeScanCallback) : _this.adapter.startLeScan(uuids_1, _this.LeScanCallback);
                        common_1.CLog(common_1.CLogTypes.info, "Bluetooth.startScanning ---- didStart scanning: " + didStart);
                        if (!didStart) {
                            reject("Scanning didn't start");
                            return;
                        }
                    }
                    else {
                        var scanFilters_1 = null;
                        if (filters.length > 0) {
                            scanFilters_1 = new java.util.ArrayList();
                            filters.forEach(function (f) {
                                var scanFilterBuilder = new android.bluetooth.le.ScanFilter.Builder();
                                if (f.serviceUUID) {
                                    scanFilterBuilder.setServiceUuid(new android.os.ParcelUuid(_this.stringToUuid(f.serviceUUID)));
                                }
                                if (f.deviceName) {
                                    scanFilterBuilder.setDeviceName(f.deviceName);
                                }
                                if (f.deviceAddress) {
                                    scanFilterBuilder.setDeviceAddress(f.deviceAddress);
                                }
                                if (f.manufacturerData) {
                                    var manufacturerId = new DataView(f.manufacturerData, 0).getUint16(0, true);
                                    scanFilterBuilder.setManufacturerData(manufacturerId, _this.encodeValue(f.manufacturerData));
                                }
                                scanFilters_1.add(scanFilterBuilder.build());
                            });
                        }
                        var scanSettings = new android.bluetooth.le.ScanSettings.Builder();
                        scanSettings.setReportDelay(0);
                        var scanMode = (arg.android && arg.android.scanMode) || ScanMode.LOW_LATENCY;
                        scanSettings.setScanMode(androidScanMode(scanMode));
                        if (SDK_INT >= 23) {
                            var matchMode = (arg.android && arg.android.matchMode) || MatchMode.AGGRESSIVE;
                            scanSettings.setMatchMode(androidMatchMode(matchMode));
                            var matchNum = (arg.android && arg.android.matchNum) || MatchNum.MAX_ADVERTISEMENT;
                            scanSettings.setNumOfMatches(androidMatchNum(matchNum));
                            var callbackType = (arg.android && arg.android.callbackType) || CallbackType.ALL_MATCHES;
                            scanSettings.setCallbackType(androidCallbackType(callbackType));
                        }
                        _this.adapter.getBluetoothLeScanner().startScan(scanFilters_1, scanSettings.build(), _this.scanCallback);
                        common_1.CLog(common_1.CLogTypes.info, "Bluetooth.startScanning ---- didStart scanning: " + filters);
                    }
                    if (_this.scanCallback) {
                        _this.scanCallback.onPeripheralDiscovered = arg.onDiscovered;
                    }
                    if (_this.LeScanCallback) {
                        _this.LeScanCallback.onPeripheralDiscovered = arg.onDiscovered;
                    }
                    if (_this.scanningReferTimer) {
                        _this.stopCurrentScan();
                    }
                    _this.scanningReferTimer = { resolve: resolve };
                    if (arg.seconds) {
                        _this.scanningReferTimer.timer = setTimeout(function () { return _this.stopCurrentScan(); }, arg.seconds * 1000);
                    }
                    else {
                        resolve();
                    }
                };
                if (arg.skipPermissionCheck !== true && !_this.coarseLocationPermissionGranted()) {
                    common_1.CLog(common_1.CLogTypes.info, 'Bluetooth.startScanning ---- Coarse Location Permission not granted on Android device, will request permission.');
                    _this.requestCoarseLocationPermission(onPermissionGranted);
                }
                else {
                    onPermissionGranted();
                }
            }
            catch (ex) {
                common_1.CLog(common_1.CLogTypes.error, "Bluetooth.startScanning ---- error: " + ex);
                reject(ex);
            }
        });
    };
    Bluetooth.prototype.stopScanning = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                if (!_this._isEnabled()) {
                    reject('Bluetooth is not enabled');
                    return;
                }
                common_1.CLog(common_1.CLogTypes.error, "Bluetooth.stopScanning: " + !!_this.scanningReferTimer);
                if (SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
                    _this.adapter.stopLeScan(_this.LeScanCallback);
                }
                else {
                    _this.adapter.getBluetoothLeScanner().stopScan(_this.scanCallback);
                }
                if (_this.scanningReferTimer) {
                    _this.scanningReferTimer.resolve && _this.scanningReferTimer.resolve();
                    clearTimeout(_this.scanningReferTimer.timer);
                    _this.scanningReferTimer = null;
                }
                resolve();
            }
            catch (ex) {
                common_1.CLog(common_1.CLogTypes.error, "Bluetooth.stopScanning: " + ex);
                reject(ex);
            }
        });
    };
    Bluetooth.prototype.connect = function (arg) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                if (!arg.UUID) {
                    reject('No UUID was passed');
                    return;
                }
                var bluetoothDevice = _this.adapter.getRemoteDevice(arg.UUID);
                if (bluetoothDevice === null) {
                    reject('Could not find peripheral with UUID ' + arg.UUID);
                }
                else {
                    common_1.CLog(common_1.CLogTypes.info, "Bluetooth.connect ---- Connecting to peripheral with UUID: " + arg.UUID);
                    var gatt = void 0;
                    if (SDK_INT >= 23) {
                        gatt = bluetoothDevice.connectGatt(utils.ad.getApplicationContext(), false, _this.bluetoothGattCallback);
                    }
                    else {
                        gatt = bluetoothDevice.connectGatt(utils.ad.getApplicationContext(), false, _this.bluetoothGattCallback, android.bluetooth.BluetoothDevice.TRANSPORT_LE);
                    }
                    _this.connections[arg.UUID] = {
                        state: 'connecting',
                        onConnected: arg.onConnected,
                        onDisconnected: arg.onDisconnected,
                        device: gatt
                    };
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
                if (!arg.UUID) {
                    reject('No UUID was passed');
                    return;
                }
                var connection = _this.connections[arg.UUID];
                common_1.CLog(common_1.CLogTypes.info, "Bluetooth.disconnect ---- connection: " + connection);
                if (!connection) {
                    reject("Peripheral wasn't connected");
                    return;
                }
                _this.gattDisconnect(connection.device);
                resolve();
            }
            catch (ex) {
                common_1.CLog(common_1.CLogTypes.error, "Bluetooth.disconnect ---- error: " + ex);
                reject(ex);
            }
        });
    };
    Bluetooth.prototype.read = function (arg) {
        var _this = this;
        return this.gattQueue.add(function () {
            return new Promise(function (resolve, reject) {
                try {
                    var wrapper = _this._getWrapper(arg, reject);
                    if (!wrapper) {
                        return;
                    }
                    var gatt = wrapper.gatt;
                    common_1.CLog(common_1.CLogTypes.info, "Bluetooth.read ---- gatt: " + gatt);
                    var bluetoothGattService = wrapper.bluetoothGattService;
                    common_1.CLog(common_1.CLogTypes.info, "Bluetooth.read ---- bluetoothGattService: " + bluetoothGattService);
                    var characteristicUUID = _this.stringToUuid(arg.characteristicUUID);
                    common_1.CLog(common_1.CLogTypes.info, "Bluetooth.read ---- characteristicUUID: " + characteristicUUID);
                    var bluetoothGattCharacteristic = _this._findCharacteristicOfType(bluetoothGattService, characteristicUUID, android.bluetooth.BluetoothGattCharacteristic.PROPERTY_READ);
                    common_1.CLog(common_1.CLogTypes.info, "Bluetooth.read ---- bluetoothGattCharacteristic: " + bluetoothGattCharacteristic);
                    if (!bluetoothGattCharacteristic) {
                        reject("Could not find characteristic with UUID " + arg.characteristicUUID + " on service with UUID " + arg.serviceUUID + " on peripheral with UUID " + arg.peripheralUUID);
                        return;
                    }
                    var stateObject = _this.connections[arg.peripheralUUID];
                    stateObject.onReadPromise = resolve;
                    if (!gatt.readCharacteristic(bluetoothGattCharacteristic)) {
                        reject('Failed to read client characteristic read for ' + characteristicUUID);
                    }
                }
                catch (ex) {
                    common_1.CLog(common_1.CLogTypes.error, "Bluetooth.read ---- error: " + ex);
                    reject(ex);
                }
            });
        });
    };
    Bluetooth.prototype.write = function (arg) {
        var _this = this;
        return this.gattQueue.add(function () {
            return new Promise(function (resolve, reject) {
                try {
                    if (!arg.value) {
                        reject("You need to provide some data to write in the 'value' property");
                        return;
                    }
                    var wrapper = _this._getWrapper(arg, reject);
                    if (wrapper === null) {
                        return;
                    }
                    var characteristic = _this._findCharacteristicOfType(wrapper.bluetoothGattService, _this.stringToUuid(arg.characteristicUUID), android.bluetooth.BluetoothGattCharacteristic.PROPERTY_WRITE);
                    common_1.CLog(common_1.CLogTypes.info, "Bluetooth.write ---- characteristic: " + characteristic);
                    if (!characteristic) {
                        reject("Could not find characteristic with UUID " + arg.characteristicUUID + " on service with UUID " + arg.serviceUUID + " on peripheral with UUID " + arg.peripheralUUID);
                        return;
                    }
                    var val = arg.raw === true ? arg.value : _this.encodeValue(arg.value);
                    common_1.CLog(common_1.CLogTypes.info, "Bluetooth.write ---- encodedValue: " + val);
                    if (val === null) {
                        reject('Invalid value: ' + arg.value);
                        return;
                    }
                    characteristic.setValue(val);
                    characteristic.setWriteType(android.bluetooth.BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT);
                    _this.connections[arg.peripheralUUID].onWritePromise = resolve;
                    if (!wrapper.gatt.writeCharacteristic(characteristic)) {
                        reject("Failed to write to characteristic " + arg.characteristicUUID + ", " + val);
                    }
                }
                catch (ex) {
                    common_1.CLog(common_1.CLogTypes.error, "Bluetooth.write ---- error: " + ex);
                    reject(ex);
                }
            });
        });
    };
    Bluetooth.prototype.writeWithoutResponse = function (arg) {
        var _this = this;
        return this.gattQueue.add(function () {
            return new Promise(function (resolve, reject) {
                try {
                    if (!arg.value) {
                        reject("You need to provide some data to write in the 'value' property");
                        return;
                    }
                    var wrapper = _this._getWrapper(arg, reject);
                    if (!wrapper) {
                        return;
                    }
                    var characteristic = _this._findCharacteristicOfType(wrapper.bluetoothGattService, _this.stringToUuid(arg.characteristicUUID), android.bluetooth.BluetoothGattCharacteristic.PROPERTY_WRITE);
                    common_1.CLog(common_1.CLogTypes.info, "Bluetooth.writeWithoutResponse ---- characteristic: " + characteristic);
                    if (!characteristic) {
                        reject("Could not find characteristic with UUID " + arg.characteristicUUID + " on service with UUID " + arg.serviceUUID + " on peripheral with UUID " + arg.peripheralUUID);
                        return;
                    }
                    var val = arg.raw === true ? arg.value : _this.encodeValue(arg.value);
                    common_1.CLog(common_1.CLogTypes.info, "Bluetooth.writeWithoutResponse ---- encodedValue: " + val);
                    if (!val) {
                        reject("Invalid value: " + arg.value);
                        return;
                    }
                    characteristic.setValue(val);
                    characteristic.setWriteType(android.bluetooth.BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE);
                    if (wrapper.gatt.writeCharacteristic(characteristic)) {
                        resolve();
                    }
                    else {
                        reject("Failed to write to characteristic " + arg.characteristicUUID + ", " + val);
                    }
                }
                catch (ex) {
                    common_1.CLog(common_1.CLogTypes.error, "Bluetooth.writeWithoutResponse ---- error: " + ex);
                    reject(ex);
                }
            });
        });
    };
    Bluetooth.prototype.startNotifying = function (arg) {
        var _this = this;
        return this.gattQueue.add(function () {
            return new Promise(function (resolve, reject) {
                try {
                    var wrapper = _this._getWrapper(arg, reject);
                    if (!wrapper) {
                        return;
                    }
                    var gatt = wrapper.gatt;
                    var bluetoothGattService = wrapper.bluetoothGattService;
                    var characteristicUUID = _this.stringToUuid(arg.characteristicUUID);
                    var characteristic = _this._findNotifyCharacteristic(bluetoothGattService, characteristicUUID);
                    common_1.CLog(common_1.CLogTypes.info, "Bluetooth.startNotifying ---- characteristic: " + characteristic);
                    if (!characteristic) {
                        reject("Could not find characteristic with UUID " + arg.characteristicUUID + " on service with UUID " + arg.serviceUUID + " on peripheral with UUID " + arg.peripheralUUID);
                        return;
                    }
                    if (!gatt.setCharacteristicNotification(characteristic, true)) {
                        reject("Failed to register notification for characteristic " + arg.characteristicUUID);
                        return;
                    }
                    var clientCharacteristicConfigId = _this.stringToUuid('2902');
                    var bluetoothGattDescriptor = characteristic.getDescriptor(clientCharacteristicConfigId);
                    if (!bluetoothGattDescriptor) {
                        bluetoothGattDescriptor = new android.bluetooth.BluetoothGattDescriptor(clientCharacteristicConfigId, android.bluetooth.BluetoothGattDescriptor.PERMISSION_WRITE);
                        characteristic.addDescriptor(bluetoothGattDescriptor);
                        common_1.CLog(common_1.CLogTypes.info, "Bluetooth.startNotifying ---- descriptor: " + bluetoothGattDescriptor);
                    }
                    if ((characteristic.getProperties() & android.bluetooth.BluetoothGattCharacteristic.PROPERTY_NOTIFY) !== 0) {
                        bluetoothGattDescriptor.setValue(android.bluetooth.BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE);
                    }
                    else if ((characteristic.getProperties() & android.bluetooth.BluetoothGattCharacteristic.PROPERTY_INDICATE) !== 0) {
                        bluetoothGattDescriptor.setValue(android.bluetooth.BluetoothGattDescriptor.ENABLE_INDICATION_VALUE);
                    }
                    else {
                        reject("Characteristic " + characteristicUUID + " does not have NOTIFY or INDICATE property set.");
                        return;
                    }
                    if (gatt.writeDescriptor(bluetoothGattDescriptor)) {
                        var cb = arg.onNotify ||
                            function (result) {
                                common_1.CLog(common_1.CLogTypes.warning, "No 'onNotify' callback function specified for 'startNotifying'");
                            };
                        var stateObject = _this.connections[arg.peripheralUUID];
                        stateObject.onNotifyCallback = cb;
                        common_1.CLog(common_1.CLogTypes.info, '--- notifying');
                        resolve();
                    }
                    else {
                        reject("Failed to set client characteristic notification for " + characteristicUUID);
                    }
                }
                catch (ex) {
                    common_1.CLog(common_1.CLogTypes.error, "Bluetooth.startNotifying ---- error: " + ex);
                    reject(ex);
                }
            });
        });
    };
    Bluetooth.prototype.stopNotifying = function (arg) {
        var _this = this;
        return this.gattQueue.add(function () {
            return new Promise(function (resolve, reject) {
                try {
                    var wrapper = _this._getWrapper(arg, reject);
                    if (!wrapper) {
                        return;
                    }
                    var gatt = wrapper.gatt;
                    var gattService = wrapper.bluetoothGattService;
                    var characteristicUUID = _this.stringToUuid(arg.characteristicUUID);
                    var characteristic = _this._findNotifyCharacteristic(gattService, characteristicUUID);
                    common_1.CLog(common_1.CLogTypes.info, "Bluetooth.stopNotifying ---- service characteristic: " + characteristic);
                    if (!characteristic) {
                        reject("Could not find characteristic with UUID " + arg.characteristicUUID + " on service with UUID " + arg.serviceUUID + " on peripheral with UUID " + arg.peripheralUUID);
                        return;
                    }
                    var stateObject = _this.connections[arg.peripheralUUID];
                    stateObject.onNotifyCallback = null;
                    if (gatt.setCharacteristicNotification(characteristic, false)) {
                        resolve();
                    }
                    else {
                        reject('Failed to remove client characteristic notification for ' + characteristicUUID);
                    }
                }
                catch (ex) {
                    common_1.CLog(common_1.CLogTypes.error, "Bluetooth.stopNotifying: " + ex);
                    reject(ex);
                }
            });
        });
    };
    Bluetooth.prototype.gattDisconnect = function (gatt) {
        if (gatt !== null) {
            var device = gatt.getDevice();
            common_1.CLog(common_1.CLogTypes.info, "Bluetooth.gattDisconnect ---- device: " + device);
            var stateObject = this.connections[device.getAddress()];
            common_1.CLog(common_1.CLogTypes.info, "Bluetooth.gattDisconnect ---- invoking disconnect callback");
            if (stateObject && stateObject.onDisconnected) {
                stateObject.onDisconnected({
                    UUID: device.getAddress(),
                    name: device.getName()
                });
            }
            else {
                common_1.CLog(common_1.CLogTypes.info, 'Bluetooth.gattDisconnect ---- no disconnect callback found');
            }
            this.connections[device.getAddress()] = null;
            common_1.CLog(common_1.CLogTypes.info, 'Bluetooth.gattDisconnect ---- Closing GATT client');
            gatt.close();
        }
    };
    Bluetooth.prototype.uuidToString = function (uuid) {
        var uuidStr = uuid.toString();
        var pattern = java.util.regex.Pattern.compile('0000(.{4})-0000-1000-8000-00805f9b34fb', 2);
        var matcher = pattern.matcher(uuidStr);
        return matcher.matches() ? matcher.group(1) : uuidStr;
    };
    Bluetooth.prototype.encodeValue = function (val) {
        var parts = val;
        if (typeof val === 'string') {
            parts = val.split(',');
            if (parts[0].indexOf('x') === -1) {
                return null;
            }
        }
        var result = Array.create('byte', parts.length);
        for (var i = 0; i < parts.length; i++) {
            result[i] = parts[i];
        }
        return result;
    };
    Bluetooth.prototype.decodeValue = function (value) {
        if (value === null) {
            return null;
        }
        var b = android.util.Base64.encodeToString(value, android.util.Base64.NO_WRAP);
        return this.base64ToArrayBuffer(b);
    };
    Bluetooth.prototype.stringToUuid = function (uuidStr) {
        if (uuidStr.length === 4) {
            uuidStr = '0000' + uuidStr + '-0000-1000-8000-00805f9b34fb';
        }
        return java.util.UUID.fromString(uuidStr);
    };
    Bluetooth.prototype.extractAdvertismentData = function (scanRecord) {
        var result = {};
        var index = 0, length, type, data;
        while (index < scanRecord.length) {
            length = scanRecord[index++];
            if (length === 0) {
                break;
            }
            type = scanRecord[index] & 0xff;
            if (type === 0) {
                break;
            }
            data = java.util.Arrays.copyOfRange(scanRecord, index + 1, index + length);
            switch (type) {
                case 0xff:
                    result['manufacturerData'] = this.encodeValue(data);
                    break;
                case 0x0a:
                    result['txPowerLevel'] = this.encodeValue(data);
                    break;
                case 0x09:
                    result['localName'] = String.fromCharCode.apply(String, data);
                    break;
                case 0x01:
                    result['flags'] = this.encodeValue(data);
                    break;
                case 0x02:
                    result['uuids'] = this.encodeValue(data);
                    break;
                case 0x0d:
                    result['class'] = this.encodeValue(data);
                    break;
                default:
                    break;
            }
            index += length;
        }
        return result;
    };
    Bluetooth.prototype._findNotifyCharacteristic = function (bluetoothGattService, characteristicUUID) {
        var characteristics = bluetoothGattService.getCharacteristics();
        for (var i = 0; i < characteristics.size(); i++) {
            var c = characteristics.get(i);
            if ((c.getProperties() & android.bluetooth.BluetoothGattCharacteristic.PROPERTY_NOTIFY) !== 0 &&
                characteristicUUID.equals(c.getUuid())) {
                return c;
            }
        }
        for (var j = 0; j < characteristics.size(); j++) {
            var ch = characteristics.get(j);
            if ((ch.getProperties() & android.bluetooth.BluetoothGattCharacteristic.PROPERTY_INDICATE) !== 0 &&
                characteristicUUID.equals(ch.getUuid())) {
                return ch;
            }
        }
        return bluetoothGattService.getCharacteristic(characteristicUUID);
    };
    Bluetooth.prototype._findCharacteristicOfType = function (bluetoothGattService, characteristicUUID, charType) {
        var characteristics = bluetoothGattService.getCharacteristics();
        for (var i = 0; i < characteristics.size(); i++) {
            var c = characteristics.get(i);
            if ((c.getProperties() & charType) !== 0 && characteristicUUID.equals(c.getUuid())) {
                return c;
            }
        }
        return bluetoothGattService.getCharacteristic(characteristicUUID);
    };
    Bluetooth.prototype._getWrapper = function (arg, reject) {
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
        var serviceUUID = this.stringToUuid(arg.serviceUUID);
        var stateObject = this.connections[arg.peripheralUUID];
        if (!stateObject) {
            reject('The peripheral is disconnected');
            return null;
        }
        var gatt = stateObject.device;
        var bluetoothGattService = gatt.getService(serviceUUID);
        if (!bluetoothGattService) {
            reject("Could not find service with UUID " + arg.serviceUUID + " on peripheral with UUID " + arg.peripheralUUID);
            return null;
        }
        return {
            gatt: gatt,
            bluetoothGattService: bluetoothGattService
        };
    };
    Bluetooth.prototype._isEnabled = function () {
        return this.adapter && this.adapter.isEnabled();
    };
    Bluetooth.prototype._getContext = function () {
        var ctx = java.lang.Class.forName('android.app.AppGlobals')
            .getMethod('getInitialApplication', null)
            .invoke(null, null);
        if (ctx) {
            return ctx;
        }
        return java.lang.Class.forName('android.app.ActivityThread')
            .getMethod('currentApplication', null)
            .invoke(null, null);
    };
    Bluetooth.prototype._getActivity = function () {
        var _this = this;
        var activity = application.android.foregroundActivity || application.android.startActivity;
        if (activity === null) {
            setTimeout(function () {
                _this._getActivity();
            }, 250);
            return;
        }
        else {
            return activity;
        }
    };
    Bluetooth.android = {
        ScanMode: ScanMode,
        MatchMode: MatchMode,
        MatchNum: MatchNum,
        CallbackType: CallbackType
    };
    return Bluetooth;
}(common_1.BluetoothCommon));
exports.Bluetooth = Bluetooth;
//# sourceMappingURL=android_main.js.map
