import * as utils from 'tns-core-modules/utils/utils';
import * as application from 'tns-core-modules/application/application';
import {
    BluetoothCommon,
    BluetoothUtil,
    CLog,
    CLogTypes,
    ConnectOptions,
    DisconnectOptions,
    ReadOptions,
    StartNotifyingOptions,
    StartScanningOptions,
    StopNotifyingOptions,
    WriteOptions
} from '../common';
import { TNS_BluetoothGattCallback } from './TNS_BluetoothGattCallback';
import { TNS_LeScanCallback } from './TNS_LeScanCallback';
import { TNS_ScanCallback } from './TNS_ScanCallback';
import * as Queue from 'p-queue';
import { AdvertismentData, ConnectionState } from '../bluetooth';

const ACCESS_COARSE_LOCATION_PERMISSION_REQUEST_CODE = 222;
const ACTION_REQUEST_ENABLE_BLUETOOTH_REQUEST_CODE = 223;
const ACTION_REQUEST_BLUETOOTH_DISCOVERABLE_REQUEST_CODE = 224;

let ANDROID_SDK = -1;
function getAndroidSDK() {
    if (ANDROID_SDK === -1) {
        ANDROID_SDK = android.os.Build.VERSION.SDK_INT;
    }
    return ANDROID_SDK;
}

const LOLLIPOP = 21;
const MARSHMALLOW = 23;
// const SDK_INT >= LOLLIPOP = SDK_INT >= LOLLIPOP;
// const SDK_INT >= 23 /* android.os.Build.VERSION_CODES.M */ = SDK_INT >= 23 /* android.os.Build.VERSION_CODES.M */;

export enum ScanMode {
    LOW_LATENCY, // = android.bluetooth.le.ScanSettings.SCAN_MODE_LOW_LATENCY,
    BALANCED, // = android.bluetooth.le.ScanSettings.SCAN_MODE_BALANCED,
    LOW_POWER, // = android.bluetooth.le.ScanSettings.SCAN_MODE_LOW_POWER,
    OPPORTUNISTIC // = android.bluetooth.le.ScanSettings.SCAN_MODE_OPPORTUNISTIC
}

function androidScanMode(mode: ScanMode) {
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
export enum MatchMode {
    AGGRESSIVE, // = android.bluetooth.le.ScanSettings.MATCH_MODE_AGGRESSIVE,
    STICKY // = android.bluetooth.le.ScanSettings.MATCH_MODE_STICKY
}

function androidMatchMode(mode: MatchMode) {
    switch (mode) {
        case MatchMode.STICKY:
            return android.bluetooth.le.ScanSettings.MATCH_MODE_STICKY;
        default:
            return android.bluetooth.le.ScanSettings.MATCH_MODE_AGGRESSIVE;
    }
}

export enum MatchNum {
    MAX_ADVERTISEMENT, // = android.bluetooth.le.ScanSettings.MATCH_NUM_MAX_ADVERTISEMENT,
    FEW_ADVERTISEMENT, // = android.bluetooth.le.ScanSettings.MATCH_NUM_FEW_ADVERTISEMENT,
    ONE_ADVERTISEMENT // = android.bluetooth.le.ScanSettings.MATCH_NUM_ONE_ADVERTISEMENT
}

function androidMatchNum(mode: MatchNum) {
    switch (mode) {
        case MatchNum.ONE_ADVERTISEMENT:
            return android.bluetooth.le.ScanSettings.MATCH_NUM_ONE_ADVERTISEMENT;
        case MatchNum.FEW_ADVERTISEMENT:
            return android.bluetooth.le.ScanSettings.MATCH_NUM_FEW_ADVERTISEMENT;
        default:
            return android.bluetooth.le.ScanSettings.MATCH_NUM_MAX_ADVERTISEMENT;
    }
}
export enum CallbackType {
    ALL_MATCHES, // = android.bluetooth.le.ScanSettings.CALLBACK_TYPE_ALL_MATCHES,
    FIRST_MATCH, // = android.bluetooth.le.ScanSettings.CALLBACK_TYPE_FIRST_MATCH,
    MATCH_LOST // = android.bluetooth.le.ScanSettings.CALLBACK_TYPE_MATCH_LOST
}
function androidCallbackType(mode: CallbackType) {
    switch (mode) {
        case CallbackType.MATCH_LOST:
            return android.bluetooth.le.ScanSettings.CALLBACK_TYPE_MATCH_LOST;
        case CallbackType.FIRST_MATCH:
            return android.bluetooth.le.ScanSettings.CALLBACK_TYPE_FIRST_MATCH;
        default:
            return android.bluetooth.le.ScanSettings.CALLBACK_TYPE_ALL_MATCHES;
    }
}

export enum Phy {
    LE_1M, // = android.bluetooth.BluetoothDevice.PHY_LE_1M,
    LE_CODED, // = android.bluetooth.BluetoothDevice.PHY_LE_CODED,
    LE_ALL_SUPPORTED // = android.bluetooth.le.ScanSettings.PHY_LE_ALL_SUPPORTED
}
function androidPhy(mode: Phy) {
    switch (mode) {
        case Phy.LE_1M:
            return android.bluetooth.BluetoothDevice.PHY_LE_1M;
        case Phy.LE_CODED:
            return android.bluetooth.BluetoothDevice.PHY_LE_CODED;
        default:
            // PHY_LE_ALL_SUPPORTED
            return android.bluetooth.le.ScanSettings.PHY_LE_ALL_SUPPORTED;
    }
}

export function uuidToString(uuid) {
    const uuidStr = uuid.toString();
    const pattern = java.util.regex.Pattern.compile('0000(.{4})-0000-1000-8000-00805f9b34fb', 2);
    const matcher = pattern.matcher(uuidStr);
    return matcher.matches() ? matcher.group(1) : uuidStr;
}

// val must be a Uint8Array or Uint16Array or a string like '0x01' or '0x007F' or '0x01,0x02', or '0x007F,'0x006F''
export function encodeValue(val) {
    let parts = val;
    // if it's not a string assume it's a byte array already
    if (typeof val === 'string') {
        parts = val.split(',');

        if (parts[0].indexOf('x') === -1) {
            return null;
        }
    }

    const result = Array.create('byte', parts.length);

    for (let i = 0; i < parts.length; i++) {
        result[i] = parts[i];
    }
    return result;
}

// export function decodeValue(value) {
//     if (value === null) {
//         return null;
//     }

//     // value is of Java type: byte[]
//     const b = android.util.Base64.encodeToString(value, android.util.Base64.NO_WRAP);
//     return this.base64ToArrayBuffer(b);
// }

function nativeEncoding(encoding: string) {
    const result = java.nio.charset.Charset.forName(encoding);
    // console.log('nativeEncoding', encoding, encoding.toUpperCase(), result.displayName());
    return result;
}

export function valueToByteArray(value, encoding = 'iso-8859-1') {
    if (typeof value === 'string') {
        return new java.lang.String(value).getBytes(nativeEncoding(encoding));
        // const bytes = Array.create('byte', value.length);
        // for (let i = 0; i < value.length; i++) {
        //     bytes[i] = value.charCodeAt(i);
        // }
        // return bytes;
    } else if (Array.isArray(value)) {
        return value;
    }
    return null;
}
export function byteArrayToBuffer(value) {
    if (!value) {
        return null;
    }
    // if (typeof value === 'string') {
    //     value = new java.lang.String(value).getBytes('UTF-8');
    // }
    const ret = new Uint8Array(value.length);
    const isString = typeof value === 'string';
    for (let i = 0; i < value.length; i++) {
        ret[i] = isString ? value.charCodeAt(i) : value[i];
    }
    return ret.buffer;
}

export function printValueToString(value) {
    if (value instanceof java.lang.Object) {
        const array = [];
        const bytes = value as any;
        for (let i = 0; i < bytes.length; i++) {
            array.push(new Number(bytes[i]).valueOf());
        }
        return array;
    }
    return value;
}

// JS UUID -> Java
export function stringToUuid(uuidStr) {
    if (uuidStr.length === 4) {
        uuidStr = '0000' + uuidStr + '-0000-1000-8000-00805f9b34fb';
    }
    return java.util.UUID.fromString(uuidStr);
}

export class Bluetooth extends BluetoothCommon {
    private _adapter: android.bluetooth.BluetoothAdapter;

    get adapter() {
        if (!this._adapter) {
            this._adapter = this.bluetoothManager.getAdapter();
        }
        return this._adapter;
    }
    private _bluetoothManager: android.bluetooth.BluetoothManager;

    get bluetoothManager() {
        if (!this._bluetoothManager) {
            this._bluetoothManager = utils.ad.getApplicationContext().getSystemService(android.content.Context.BLUETOOTH_SERVICE);
        }
        return this._bluetoothManager;
    }
    // public gattServer: android.bluetooth.BluetoothGattServer;
    public bluetoothGattCallback = new TNS_BluetoothGattCallback();
    // not initializing here, if the Android API is < 21  use LeScanCallback
    public scanCallback: TNS_ScanCallback;
    public LeScanCallback: TNS_LeScanCallback;

    // with gatt all operations must be queued. Parallel operations will fail
    private gattQueue = new Queue({ concurrency: 1 });

    static readonly android = {
        ScanMode,
        MatchMode,
        MatchNum,
        CallbackType
    };

    /**
     * Connections are stored as key-val pairs of UUID-Connection.
     * So something like this:
     * [{
     *   34343-2434-5454: {
     *     state: 'connected',
     *     discoveredState: '',
     *     operationConnect: someCallbackFunction
     *   },
     *   1323213-21321323: {
     *     ..
     *   }
     * }, ..]
     */
    public connections: {
        [k: string]: {
            state: ConnectionState;
            onConnected?: (
                e: {
                    UUID: string;
                    name: string;
                    state: string;
                    services: any[];
                    advertismentData: AdvertismentData;
                }
            ) => void;
            onDisconnected?: (e: { UUID: string; name: string }) => void;
            device?: android.bluetooth.BluetoothGatt;
            onReadPromise?;
            onWritePromise?;
            onNotifyCallback?;
            advertismentData?: AdvertismentData;
        };
    } = {};
    private broadcastReceiver;
    constructor() {
        super();
        CLog(CLogTypes.info, '*** Android Bluetooth Constructor ***');
        // CLog(CLogTypes.info, 'this.bluetoothManager', this.bluetoothManager);
        // CLog(CLogTypes.info, 'this.adapter', this.adapter);

        // if >= Android21 (Lollipop)
        if (android.os.Build.VERSION.SDK_INT >= LOLLIPOP) {
            this.scanCallback = new (require('./TNS_ScanCallback')).TNS_ScanCallback();
            this.scanCallback.onInit(new WeakRef(this));
        } else {
            this.LeScanCallback = new (require('./TNS_LeScanCallback')).TNS_LeScanCallback();
            this.LeScanCallback.onInit(new WeakRef(this));
        }

        this.bluetoothGattCallback.onInit(new WeakRef(this));

        this.broadcastReceiver = application.android.registerBroadcastReceiver(android.bluetooth.BluetoothAdapter.ACTION_STATE_CHANGED, (context, intent) => {
            const state = intent.getIntExtra(android.bluetooth.BluetoothAdapter.EXTRA_STATE, android.bluetooth.BluetoothAdapter.ERROR);
            if (state === android.bluetooth.BluetoothAdapter.STATE_ON || state === android.bluetooth.BluetoothAdapter.STATE_OFF) {
                this.sendEvent(Bluetooth.bluetooth_status_event, {
                    state: state === android.bluetooth.BluetoothAdapter.STATE_ON ? 'on' : 'off'
                });
            }
        });
    }

    // Getter/Setters
    get enabled() {
        return this._isEnabled();
    }

    public coarseLocationPermissionGranted() {
        let hasPermission = getAndroidSDK() < MARSHMALLOW;
        if (!hasPermission) {
            const ctx = this._getContext();
            CLog(CLogTypes.info, 'app context', ctx);

            hasPermission =
                android.content.pm.PackageManager.PERMISSION_GRANTED === android.support.v4.content.ContextCompat.checkSelfPermission(ctx, android.Manifest.permission.ACCESS_COARSE_LOCATION);
        }
        CLog(CLogTypes.info, 'coarseLocationPermissionGranted ---- ACCESS_COARSE_LOCATION permission granted?', hasPermission);
        return hasPermission;
    }

    public hasCoarseLocationPermission() {
        return new Promise(resolve => {
            resolve(this.coarseLocationPermissionGranted());
        });
    }

    public requestCoarseLocationPermission(callback?: () => void): Promise<boolean> {
        return new Promise((resolve, reject) => {
            let permissionCb = (args: application.AndroidActivityRequestPermissionsEventData) => {
                if (args.requestCode === ACCESS_COARSE_LOCATION_PERMISSION_REQUEST_CODE) {
                    application.android.off(application.AndroidApplication.activityRequestPermissionsEvent, permissionCb);
                    permissionCb = null;
                    for (let i = 0; i < args.permissions.length; i++) {
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

            // grab the permission dialog result
            application.android.on(application.AndroidApplication.activityRequestPermissionsEvent, permissionCb);

            // invoke the permission dialog
            android.support.v4.app.ActivityCompat.requestPermissions(this._getActivity(), [android.Manifest.permission.ACCESS_COARSE_LOCATION], ACCESS_COARSE_LOCATION_PERMISSION_REQUEST_CODE);
        });
    }
    getAndroidLocationManager(): android.location.LocationManager {
        return (application.android.context as android.content.Context).getSystemService(android.content.Context.LOCATION_SERVICE) as android.location.LocationManager;
    }
    public isGPSEnabled() {
        if (!this.hasCoarseLocationPermission()) {
            return this.requestCoarseLocationPermission().then(() => this.isGPSEnabled());
        }
        const result = this.getAndroidLocationManager().isProviderEnabled(android.location.LocationManager.GPS_PROVIDER);
        if (BluetoothUtil.debug) {
            const providers = this.getAndroidLocationManager().getProviders(false);
            CLog(CLogTypes.info, 'isGPSEnabled providers', providers);
            CLog(CLogTypes.info, 'isGPSEnabled: ', result);
        }
        return Promise.resolve(result);
    }
    public enableGPS(): Promise<void> {
        CLog(CLogTypes.info, 'Bluetooth.enableGPS');
        return new Promise((resolve, reject) => {
            const currentContext = application.android.currentContext as android.app.Activity;
            if (!this.isGPSEnabled()) {
                const onActivityResultHandler = (data: application.AndroidActivityResultEventData) => {
                    application.android.off(application.AndroidApplication.activityResultEvent, onActivityResultHandler);
                    if (data.requestCode === 0) {
                        if (this.isGPSEnabled()) {
                            resolve();
                        } else {
                            reject('GPS not enabled');
                        }
                    }
                };
                application.android.on(application.AndroidApplication.activityResultEvent, onActivityResultHandler);
                currentContext.startActivityForResult(new android.content.Intent(android.provider.Settings.ACTION_LOCATION_SOURCE_SETTINGS), 0);
            } else {
                resolve();
            }
        });
    }

    public enable() {
        CLog(CLogTypes.info, 'enable:', this._isEnabled());
        return new Promise((resolve, reject) => {
            if (this._isEnabled()) {
                return resolve(true);
            }
            try {
                CLog(CLogTypes.info, 'enable: asking to enable bluetooth');
                // activityResult event
                const onBluetoothEnableResult = (args: application.AndroidActivityResultEventData) => {
                    CLog(CLogTypes.info, 'Bluetooth.onBluetoothEnableResult ---', `requestCode: ${args.requestCode}, result: ${args.resultCode}`);

                    if (args.requestCode === ACTION_REQUEST_ENABLE_BLUETOOTH_REQUEST_CODE) {
                        try {
                            // remove the event listener
                            application.android.off(application.AndroidApplication.activityResultEvent, onBluetoothEnableResult);

                            // RESULT_OK = -1
                            if (args.resultCode === android.app.Activity.RESULT_OK) {
                                this.sendEvent(Bluetooth.bluetooth_enabled_event);
                                resolve(true);
                            } else {
                                resolve(false);
                            }
                        } catch (ex) {
                            CLog(CLogTypes.error, ex);
                            application.android.off(application.AndroidApplication.activityResultEvent, onBluetoothEnableResult);
                            this.sendEvent(Bluetooth.error_event, { error: ex }, `enable ---- error: ${ex}`);
                            reject(ex);
                            return;
                        }
                    } else {
                        application.android.off(application.AndroidApplication.activityResultEvent, onBluetoothEnableResult);
                        resolve(false);
                        return;
                    }
                };

                // set the onBluetoothEnableResult for the intent
                application.android.on(application.AndroidApplication.activityResultEvent, onBluetoothEnableResult);

                // create the intent to start the bluetooth enable request
                const intent = new android.content.Intent(android.bluetooth.BluetoothAdapter.ACTION_REQUEST_ENABLE);
                const activity = application.android.foregroundActivity || application.android.startActivity;
                CLog(CLogTypes.info, 'enable: startActivityForResult');
                activity.startActivityForResult(intent, ACTION_REQUEST_ENABLE_BLUETOOTH_REQUEST_CODE);
            } catch (ex) {
                CLog(CLogTypes.error, 'enable:', ex);
                reject(ex);
                this.sendEvent(Bluetooth.error_event, { error: ex }, 'Error enabling bluetooth.');
            }
        });
    }
    public isBluetoothEnabled() {
        return new Promise((resolve, reject) => {
            try {
                resolve(this._isEnabled());
            } catch (ex) {
                CLog(CLogTypes.error, 'isBluetoothEnabled ---- error:', ex);
                reject(ex);
            }
        });
    }

    public openBluetoothSettings() {
        return new Promise((resolve, reject) => {
            const currentContext = application.android.currentContext as android.app.Activity;
            if (!this._isEnabled()) {
                const that = this;
                const onActivityResultHandler = function(data: application.AndroidActivityResultEventData) {
                    application.android.off(application.AndroidApplication.activityResultEvent, onActivityResultHandler);
                    if (data.requestCode === 0) {
                        if (that._isEnabled()) {
                            resolve();
                        } else {
                            reject('bluetooth_not_enabled');
                        }
                    }
                };
                application.android.on(application.AndroidApplication.activityResultEvent, onActivityResultHandler);
                currentContext.startActivityForResult(new android.content.Intent(android.provider.Settings.ACTION_BLUETOOTH_SETTINGS), 0);
            } else {
                resolve();
            }
        });
    }
    scanningReferTimer: {
        timer?: number;
        resolve?: Function;
    };

    private stopCurrentScan() {
        CLog(CLogTypes.info, 'stopCurrentScan:', !!this.scanningReferTimer);

        if (!this.adapter) {
            CLog(CLogTypes.error, 'stopCurrentScan: no adapter');
            return;
        }

        if (this.scanCallback) {
            const scanner = this.adapter.getBluetoothLeScanner();
            if (scanner) {
                scanner.stopScan(this.scanCallback);
            }
            this.scanCallback.onPeripheralDiscovered = null;
        }
        if (this.LeScanCallback) {
            this.adapter.stopLeScan(this.LeScanCallback);
            this.LeScanCallback.onPeripheralDiscovered = null;
        }
        if (this.scanningReferTimer) {
            clearTimeout(this.scanningReferTimer.timer);
            this.scanningReferTimer.resolve();
            this.scanningReferTimer = null;
        }
    }
    public startScanning(arg: StartScanningOptions) {
        if (!this.adapter) {
            CLog(CLogTypes.error, 'stopCurrentScan: no adapter');
            return Promise.reject('no_bluetooth');
        }
        return new Promise((resolve, reject) => {
            try {
                if (!this._isEnabled()) {
                    reject('bluetooth_not_enabled');
                    return;
                }

                const onPermissionGranted = () => {
                    for (const key in this.connections) {
                        if (this.connections[key] && this.connections[key].state === 'disconnected') {
                            delete this.connections[key];
                        }
                    }

                    const filters = arg.filters || [];

                    if (this.scanningReferTimer) {
                        this.stopCurrentScan();
                    }
                    // if less than Android21 (Lollipop)
                    if (this.LeScanCallback) {
                        const uuids = [];
                        filters.forEach(f => {
                            if (f.serviceUUID) {
                                uuids.push(stringToUuid(f.serviceUUID));
                            }
                        });
                        this.LeScanCallback.onPeripheralDiscovered = arg.onDiscovered;
                        const didStart = uuids.length === 0 ? this.adapter.startLeScan(this.LeScanCallback) : this.adapter.startLeScan(uuids, this.LeScanCallback);
                        CLog(CLogTypes.info, 'startScanning ---- PreLollipop ---- didStart scanning:', didStart, JSON.stringify(uuids));

                        if (!didStart) {
                            // TODO error msg, see https://github.com/randdusing/cordova-plugin-bluetoothle/blob/master/src/android/BluetoothLePlugin.java#L758
                            reject('couldnt_start_scanning');
                            return;
                        }
                    } else {
                        const scanner = this.adapter.getBluetoothLeScanner();
                        if (!scanner) {
                            reject('bluetooth_not_enabled');
                            return;
                        }
                        let scanFilters = null as java.util.ArrayList<any>;
                        if (filters.length > 0) {
                            scanFilters = new java.util.ArrayList();
                            filters.forEach(f => {
                                const scanFilterBuilder = new android.bluetooth.le.ScanFilter.Builder();
                                if (f.serviceUUID) {
                                    scanFilterBuilder.setServiceUuid(new android.os.ParcelUuid(stringToUuid(f.serviceUUID)));
                                }
                                if (f.deviceName) {
                                    scanFilterBuilder.setDeviceName(f.deviceName);
                                }
                                if (f.deviceAddress) {
                                    scanFilterBuilder.setDeviceAddress(f.deviceAddress);
                                }
                                if (f.manufacturerData) {
                                    const manufacturerId = new DataView(f.manufacturerData, 0).getUint16(0, true);
                                    scanFilterBuilder.setManufacturerData(manufacturerId, encodeValue(f.manufacturerData));
                                }
                                scanFilters.add(scanFilterBuilder.build());
                            });
                        }

                        // ga hier verder: https://github.com/randdusing/cordova-plugin-bluetoothle/blob/master/src/android/BluetoothLePlugin.java#L775
                        const scanSettings = new android.bluetooth.le.ScanSettings.Builder();
                        scanSettings.setReportDelay(0);

                        const scanMode = (arg.android && arg.android.scanMode) || ScanMode.LOW_LATENCY;
                        scanSettings.setScanMode(androidScanMode(scanMode));

                        // if >= Android23 (Marshmallow)
                        if (android.os.Build.VERSION.SDK_INT >= 23 /* android.os.Build.VERSION_CODES.M */) {
                            const matchMode = (arg.android && arg.android.matchMode) || MatchMode.AGGRESSIVE;
                            scanSettings.setMatchMode(androidMatchMode(matchMode));

                            const matchNum = (arg.android && arg.android.matchNum) || MatchNum.MAX_ADVERTISEMENT;
                            scanSettings.setNumOfMatches(androidMatchNum(matchNum));

                            const callbackType = (arg.android && arg.android.callbackType) || CallbackType.ALL_MATCHES;
                            scanSettings.setCallbackType(androidCallbackType(callbackType));
                        }

                        this.scanCallback.onPeripheralDiscovered = arg.onDiscovered;
                        this.adapter.getBluetoothLeScanner().startScan(scanFilters, scanSettings.build(), this.scanCallback);
                        CLog(CLogTypes.info, 'startScanning ---- PostLollipop ---- didStart scanning:', JSON.stringify(filters));
                    }

                    this.scanningReferTimer = { resolve };
                    if (arg.seconds) {
                        this.scanningReferTimer.timer = setTimeout(() => this.stopCurrentScan(), arg.seconds * 1000);
                    } else {
                        resolve();
                    }
                };

                if (arg.skipPermissionCheck !== true && !this.coarseLocationPermissionGranted()) {
                    CLog(CLogTypes.info, 'startScanning ---- Coarse Location Permission not granted on Android device, will request permission.');
                    this.requestCoarseLocationPermission(onPermissionGranted);
                } else {
                    onPermissionGranted();
                }
            } catch (ex) {
                CLog(CLogTypes.error, 'startScanning ---- error:', ex);
                reject(ex);
            }
        });
    }

    public stopScanning() {
        if (!this.adapter) {
            CLog(CLogTypes.error, 'stopCurrentScan: no adapter');
            return Promise.reject('no_bluetooth');
        }
        return new Promise((resolve, reject) => {
            try {
                if (!this._isEnabled()) {
                    reject('Bluetooth is not enabled');
                    return;
                }
                this.stopCurrentScan();
                resolve();
            } catch (ex) {
                CLog(CLogTypes.info, 'stopScanning:', ex);
                reject(ex);
            }
        });
    }

    // note that this doesn't make much sense without scanning first
    public connect(arg: ConnectOptions) {
        if (!this.adapter) {
            CLog(CLogTypes.error, 'stopCurrentScan: no adapter');
            return Promise.reject('no_bluetooth');
        }
        return new Promise((resolve, reject) => {
            try {
                // or macaddress..
                if (!arg.UUID) {
                    reject('No UUID was passed');
                    return;
                }
                const bluetoothDevice = this.adapter.getRemoteDevice(arg.UUID);
                if (bluetoothDevice === null) {
                    reject('Could not find peripheral with UUID ' + arg.UUID);
                } else {
                    CLog(CLogTypes.info, 'connect ---- Connecting to peripheral with UUID:', arg.UUID);

                    let gatt;

                    // if less than Android23(Marshmallow)
                    if (getAndroidSDK() < MARSHMALLOW) {
                        gatt = bluetoothDevice.connectGatt(
                            utils.ad.getApplicationContext(), // context
                            false, // autoconnect
                            this.bluetoothGattCallback
                        );
                    } else {
                        gatt = bluetoothDevice.connectGatt(
                            utils.ad.getApplicationContext(), // context
                            false, // autoconnect
                            this.bluetoothGattCallback,
                            android.bluetooth.BluetoothDevice.TRANSPORT_LE // 2
                        );
                    }

                    this.connections[arg.UUID] = {
                        state: 'connecting',
                        onConnected: arg.onConnected,
                        onDisconnected: arg.onDisconnected,
                        device: gatt // TODO rename device to gatt?
                    };
                    resolve();
                }
            } catch (ex) {
                CLog(CLogTypes.error, 'connect ---- error:', ex);
                reject(ex);
            }
        });
    }

    public disconnect(arg: DisconnectOptions) {
        return new Promise((resolve, reject) => {
            try {
                if (!arg.UUID) {
                    reject('No UUID was passed');
                    return;
                }
                const connection = this.connections[arg.UUID];
                CLog(CLogTypes.info, 'disconnect ---- connection:', arg.UUID);
                if (!connection) {
                    reject("Peripheral wasn't connected");
                    return;
                }

                this.gattDisconnect(connection.device);
                resolve();
            } catch (ex) {
                CLog(CLogTypes.error, 'disconnect ---- error:', ex);
                reject(ex);
            }
        });
    }

    public read(arg: ReadOptions) {
        return this.gattQueue.add(() => {
            return new Promise((resolve, reject) => {
                try {
                    const wrapper = this._getWrapper(arg, reject);
                    if (!wrapper) {
                        // no need to reject, this has already been done
                        return;
                    }

                    const gatt = wrapper.gatt;
                    // CLog(CLogTypes.info, 'read ---- gatt:', gatt);
                    const bluetoothGattService = wrapper.bluetoothGattService;
                    // CLog(CLogTypes.info, 'read ---- bluetoothGattService:', bluetoothGattService);
                    const characteristicUUID = stringToUuid(arg.characteristicUUID);
                    CLog(CLogTypes.info, `read ---- peripheralUUID:${arg.peripheralUUID} serviceUUID:${arg.serviceUUID} characteristicUUID:${arg.characteristicUUID}`);

                    const bluetoothGattCharacteristic = this._findCharacteristicOfType(bluetoothGattService, characteristicUUID, android.bluetooth.BluetoothGattCharacteristic.PROPERTY_READ);
                    // CLog(CLogTypes.info, 'read ---- bluetoothGattCharacteristic:', bluetoothGattCharacteristic);

                    if (!bluetoothGattCharacteristic) {
                        reject(`Could not find characteristic with UUID ${arg.characteristicUUID} on service with UUID ${arg.serviceUUID} on peripheral with UUID ${arg.peripheralUUID}`);
                        return;
                    }

                    const stateObject = this.connections[arg.peripheralUUID];
                    stateObject.onReadPromise = resolve;
                    if (!gatt.readCharacteristic(bluetoothGattCharacteristic)) {
                        reject('Failed to read client characteristic read for ' + characteristicUUID);
                    }
                } catch (ex) {
                    CLog(CLogTypes.error, 'read ---- error:', ex);
                    reject(ex);
                }
            });
        });
    }

    public write(arg: WriteOptions) {
        return this.gattQueue.add(() => {
            return new Promise((resolve, reject) => {
                try {
                    if (!arg.value) {
                        reject("You need to provide some data to write in the 'value' property");
                        return;
                    }
                    const wrapper = this._getWrapper(arg, reject);
                    if (wrapper === null) {
                        // no need to reject, this has already been done
                        return;
                    }

                    const characteristic = this._findCharacteristicOfType(
                        wrapper.bluetoothGattService,
                        stringToUuid(arg.characteristicUUID),
                        android.bluetooth.BluetoothGattCharacteristic.PROPERTY_WRITE
                    );

                    if (!characteristic) {
                        reject(`Could not find characteristic with UUID ${arg.characteristicUUID} on service with UUID ${arg.serviceUUID} on peripheral with UUID ${arg.peripheralUUID}`);
                        return;
                    }

                    const val = valueToByteArray(arg.value, arg.encoding);

                    if (val === null) {
                        reject('Invalid value: ' + arg.value);
                        return;
                    }

                    characteristic.setValue(val);
                    characteristic.setWriteType(android.bluetooth.BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT);

                    this.connections[arg.peripheralUUID].onWritePromise = resolve;
                    if (wrapper.gatt.writeCharacteristic(characteristic)) {
                        if (BluetoothUtil.debug) {
                            CLog(CLogTypes.info, 'write ---- characteristic:', arg.value, printValueToString(val));
                        }
                    } else {
                        reject(`Failed to write to characteristic ${arg.characteristicUUID}, ${val}`);
                    }
                } catch (ex) {
                    CLog(CLogTypes.error, 'write ---- error:', ex);
                    reject(ex);
                }
            });
        });
    }

    public writeWithoutResponse(arg: WriteOptions) {
        return this.gattQueue.add(() => {
            return new Promise((resolve, reject) => {
                try {
                    if (!arg.value) {
                        reject("You need to provide some data to write in the 'value' property");
                        return;
                    }
                    const wrapper = this._getWrapper(arg, reject);
                    if (!wrapper) {
                        // no need to reject, this has already been done
                        return;
                    }

                    const characteristic = this._findCharacteristicOfType(
                        wrapper.bluetoothGattService,
                        stringToUuid(arg.characteristicUUID),
                        android.bluetooth.BluetoothGattCharacteristic.PROPERTY_WRITE
                    );
                    if (!characteristic) {
                        reject(`Could not find characteristic with UUID ${arg.characteristicUUID} on service with UUID ${arg.serviceUUID} on peripheral with UUID ${arg.peripheralUUID}`);
                        return;
                    }

                    const val = valueToByteArray(arg.value, arg.encoding);

                    if (!val) {
                        reject(`Invalid value: ${arg.value}`);
                        return;
                    }

                    characteristic.setValue(val);
                    characteristic.setWriteType(android.bluetooth.BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE);


                    // using the WRITE_TYPE_NO_RESPONSE, we will get the onCharacteristicWrite callback as soon as the stack is ready and has space to accept a new request.
                    this.connections[arg.peripheralUUID].onWritePromise = resolve;
                    if (wrapper.gatt.writeCharacteristic(characteristic)) {
                        if (BluetoothUtil.debug) {
                            CLog(CLogTypes.info, 'writeWithoutResponse:', arg.value, JSON.stringify(printValueToString(val)));
                        }
                        // resolve();
                    } else {
                        reject(`Failed to write to characteristic ${arg.characteristicUUID}, ${val}`);
                    }
                } catch (ex) {
                    CLog(CLogTypes.error, 'writeWithoutResponse ---- error:', ex);
                    reject(ex);
                }
            });
        });
    }

    public startNotifying(arg: StartNotifyingOptions) {
        return this.gattQueue.add(() => {
            return new Promise((resolve, reject) => {
                try {
                    const wrapper = this._getWrapper(arg, reject);
                    if (!wrapper) {
                        // no need to reject, this has already been done
                        return;
                    }

                    const gatt = wrapper.gatt;
                    const bluetoothGattService = wrapper.bluetoothGattService;
                    const characteristicUUID = stringToUuid(arg.characteristicUUID);

                    const characteristic = this._findNotifyCharacteristic(bluetoothGattService, characteristicUUID);
                    CLog(CLogTypes.info, 'startNotifying ---- characteristic:', characteristic);
                    if (!characteristic) {
                        reject(`Could not find characteristic with UUID ${arg.characteristicUUID} on service with UUID ${arg.serviceUUID} on peripheral with UUID ${arg.peripheralUUID}`);
                        return;
                    }

                    if (!gatt.setCharacteristicNotification(characteristic, true)) {
                        reject(`Failed to register notification for characteristic ${arg.characteristicUUID}`);
                        return;
                    }

                    const clientCharacteristicConfigId = stringToUuid('2902');
                    let bluetoothGattDescriptor = characteristic.getDescriptor(clientCharacteristicConfigId) as android.bluetooth.BluetoothGattDescriptor;
                    if (!bluetoothGattDescriptor) {
                        bluetoothGattDescriptor = new android.bluetooth.BluetoothGattDescriptor(clientCharacteristicConfigId, android.bluetooth.BluetoothGattDescriptor.PERMISSION_WRITE);
                        characteristic.addDescriptor(bluetoothGattDescriptor);
                        CLog(CLogTypes.info, 'startNotifying ---- descriptor:', bluetoothGattDescriptor);
                        // Any creation error will trigger the global catch. Ok.
                    }

                    // prefer notify over indicate
                    if ((characteristic.getProperties() & android.bluetooth.BluetoothGattCharacteristic.PROPERTY_NOTIFY) !== 0) {
                        bluetoothGattDescriptor.setValue(android.bluetooth.BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE);
                    } else if ((characteristic.getProperties() & android.bluetooth.BluetoothGattCharacteristic.PROPERTY_INDICATE) !== 0) {
                        bluetoothGattDescriptor.setValue(android.bluetooth.BluetoothGattDescriptor.ENABLE_INDICATION_VALUE);
                    } else {
                        reject(`Characteristic ${characteristicUUID} does not have NOTIFY or INDICATE property set.`);
                        return;
                    }

                    if (gatt.writeDescriptor(bluetoothGattDescriptor)) {
                        const cb =
                            arg.onNotify ||
                            function(result) {
                                CLog(CLogTypes.warning, "No 'onNotify' callback function specified for 'startNotifying'");
                            };
                        const stateObject = this.connections[arg.peripheralUUID];
                        stateObject.onNotifyCallback = cb;
                        CLog(CLogTypes.info, '--- notifying');
                        resolve();
                    } else {
                        reject(`Failed to set client characteristic notification for ${characteristicUUID}`);
                    }
                } catch (ex) {
                    CLog(CLogTypes.error, 'startNotifying ---- error:', ex);
                    reject(ex);
                }
            });
        });
    }

    // TODO lot of reuse between this and .startNotifying
    public stopNotifying(arg: StopNotifyingOptions) {
        return this.gattQueue.add(() => {
            return new Promise((resolve, reject) => {
                try {
                    const wrapper = this._getWrapper(arg, reject);
                    if (!wrapper) {
                        // no need to reject, this has already been done
                        return;
                    }

                    const gatt = wrapper.gatt;
                    const gattService = wrapper.bluetoothGattService;
                    const characteristicUUID = stringToUuid(arg.characteristicUUID);

                    const characteristic = this._findNotifyCharacteristic(gattService, characteristicUUID);
                    CLog(CLogTypes.info, 'stopNotifying ---- service characteristic:', characteristic);

                    if (!characteristic) {
                        reject(`Could not find characteristic with UUID ${arg.characteristicUUID} on service with UUID ${arg.serviceUUID} on peripheral with UUID ${arg.peripheralUUID}`);
                        return;
                    }

                    const stateObject = this.connections[arg.peripheralUUID];
                    stateObject.onNotifyCallback = null;

                    if (gatt.setCharacteristicNotification(characteristic, false)) {
                        resolve();
                    } else {
                        reject('Failed to remove client characteristic notification for ' + characteristicUUID);
                    }
                } catch (ex) {
                    CLog(CLogTypes.error, 'stopNotifying:', ex);
                    reject(ex);
                }
            });
        });
    }

    public gattDisconnect(gatt: android.bluetooth.BluetoothGatt) {
        if (gatt !== null) {
            const device = gatt.getDevice();
            const address = device.getAddress();
            CLog(CLogTypes.info, 'gattDisconnect ---- device:', address);
            const stateObject = this.connections[address];
            if (stateObject && stateObject.onDisconnected) {
                stateObject.onDisconnected({
                    UUID: address,
                    name: device.getName()
                });
            } else {
                CLog(CLogTypes.info, 'gattDisconnect ---- no disconnect callback found');
            }
            this.connections[address] = null;
            // Close this Bluetooth GATT client.
            CLog(CLogTypes.info, 'gattDisconnect ---- Closing GATT client');
            gatt.close();
        }
    }

    // public extractManufacturerRawData(scanRecord) {
    //   let offset = 0;
    //   while (offset < scanRecord.length - 2) {
    //     const len = scanRecord[offset++] & 0xff;
    //     if (len === 0) {
    //       break;
    //     }

    //     const type = scanRecord[offset++] & 0xff;
    //     switch (type) {
    //       case 0xff: // Manufacturer Specific Data
    //         return this.decodeValue(java.util.Arrays.copyOfRange(scanRecord, offset, offset + len - 1));
    //       default:
    //         offset += len - 1;
    //         break;
    //     }
    //   }
    // }

    // This guards against peripherals reusing char UUID's. We prefer notify.
    private _findNotifyCharacteristic(bluetoothGattService, characteristicUUID) {
        // Check for Notify first
        const characteristics = bluetoothGattService.getCharacteristics();
        for (let i = 0; i < characteristics.size(); i++) {
            const c = characteristics.get(i);
            if ((c.getProperties() & android.bluetooth.BluetoothGattCharacteristic.PROPERTY_NOTIFY) !== 0 && characteristicUUID.equals(c.getUuid())) {
                return c;
            }
        }

        // If there wasn't a Notify Characteristic, check for Indicate
        for (let j = 0; j < characteristics.size(); j++) {
            const ch = characteristics.get(j);
            if ((ch.getProperties() & android.bluetooth.BluetoothGattCharacteristic.PROPERTY_INDICATE) !== 0 && characteristicUUID.equals(ch.getUuid())) {
                return ch;
            }
        }

        // As a last resort, try and find ANY characteristic with this UUID, even if it doesn't have the correct properties
        return bluetoothGattService.getCharacteristic(characteristicUUID);
    }

    // This guards against peripherals reusing char UUID's.
    private _findCharacteristicOfType(bluetoothGattService: android.bluetooth.BluetoothGattService, characteristicUUID, charType) {
        // Returns a list of characteristics included in this service.
        const characteristics = bluetoothGattService.getCharacteristics();
        for (let i = 0; i < characteristics.size(); i++) {
            const c = characteristics.get(i) as android.bluetooth.BluetoothGattCharacteristic;
            if ((c.getProperties() & charType) !== 0 && characteristicUUID.equals(c.getUuid())) {
                return c;
            }
        }
        // As a last resort, try and find ANY characteristic with this UUID, even if it doesn't have the correct properties
        return bluetoothGattService.getCharacteristic(characteristicUUID);
    }

    private _getWrapper(arg, reject) {
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

        const serviceUUID = stringToUuid(arg.serviceUUID);

        const stateObject = this.connections[arg.peripheralUUID];
        if (!stateObject) {
            reject('The peripheral is disconnected');
            return null;
        }

        const gatt = stateObject.device;
        const bluetoothGattService = gatt.getService(serviceUUID);

        if (!bluetoothGattService) {
            reject(`Could not find service with UUID ${arg.serviceUUID} on peripheral with UUID ${arg.peripheralUUID}`);
            return null;
        }

        // with that all being checked, let's return a wrapper object containing all the stuff we found here
        return {
            gatt,
            bluetoothGattService
        };
    }

    private _isEnabled() {
        const adapter = this.adapter;
        return adapter && adapter.isEnabled();
    }

    private _getContext() {
        //noinspection JSUnresolvedVariable,JSUnresolvedFunction
        const ctx = java.lang.Class.forName('android.app.AppGlobals')
            .getMethod('getInitialApplication', null)
            .invoke(null, null);
        if (ctx) {
            return ctx;
        }

        //noinspection JSUnresolvedVariable,JSUnresolvedFunction
        return java.lang.Class.forName('android.app.ActivityThread')
            .getMethod('currentApplication', null)
            .invoke(null, null);
    }

    private _getActivity() {
        const activity = application.android.foregroundActivity || application.android.startActivity;
        if (activity === null) {
            // Throw this off into the future since an activity is not available....
            setTimeout(() => {
                this._getActivity();
            }, 250);
            return;
        } else {
            return activity;
        }
    }
}
