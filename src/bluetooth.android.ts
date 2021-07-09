/* eslint-disable no-caller */
import { ad } from '@nativescript/core/utils/utils';
import { AndroidActivityRequestPermissionsEventData, AndroidActivityResultEventData, AndroidApplication, android as andApp } from '@nativescript/core/application';
import {
    AdvertismentData,
    BluetoothCommon,
    BluetoothError,
    CLog,
    CLogTypes,
    ConnectOptions,
    ConnectionState,
    DisconnectOptions,
    DiscoverCharacteristicsOptions,
    DiscoverOptions,
    DiscoverServicesOptions,
    MtuOptions,
    Peripheral,
    ReadOptions,
    ReadResult,
    Service,
    StartNotifyingOptions,
    StartScanningOptions,
    StopNotifyingOptions,
    WriteOptions,
    bluetoothEnabled,
    prepareArgs,
} from './bluetooth.common';
import PQueue from 'p-queue';
import { Trace } from '@nativescript/core';
let _bluetoothInstance: Bluetooth;
export function getBluetoothInstance() {
    if (!_bluetoothInstance) {
        _bluetoothInstance = new Bluetooth();
    }
    return _bluetoothInstance;
}

export { AdvertismentData, Peripheral, ReadResult, Service };

const ACCESS_LOCATION_PERMISSION_REQUEST_CODE = 222;
const ACTION_REQUEST_ENABLE_BLUETOOTH_REQUEST_CODE = 223;
const GATT_SUCCESS = 0;
let ANDROID_SDK = -1;
function getAndroidSDK() {
    if (ANDROID_SDK === -1) {
        ANDROID_SDK = android.os.Build.VERSION.SDK_INT;
    }
    return ANDROID_SDK;
}

const JELLY_BEAN = 18;
const LOLLIPOP = 21;
const MARSHMALLOW = 23;
const OREO = 26;
const ANDROID10 = 29;

const MAX_MTU = 247;

export enum ScanMode {
    LOW_LATENCY, // = android.bluetooth.le.ScanSettings.SCAN_MODE_LOW_LATENCY,
    BALANCED, // = android.bluetooth.le.ScanSettings.SCAN_MODE_BALANCED,
    LOW_POWER, // = android.bluetooth.le.ScanSettings.SCAN_MODE_LOW_POWER,
    OPPORTUNISTIC, // = android.bluetooth.le.ScanSettings.SCAN_MODE_OPPORTUNISTIC
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
    STICKY, // = android.bluetooth.le.ScanSettings.MATCH_MODE_STICKY
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
    ONE_ADVERTISEMENT, // = android.bluetooth.le.ScanSettings.MATCH_NUM_ONE_ADVERTISEMENT
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
    MATCH_LOST, // = android.bluetooth.le.ScanSettings.CALLBACK_TYPE_MATCH_LOST
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
    LE_ALL_SUPPORTED, // = android.bluetooth.le.ScanSettings.PHY_LE_ALL_SUPPORTED
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
    // uuid is returned lowercase
    const uuidStr = uuid.toString();
    const pattern = java.util.regex.Pattern.compile('0000(.{4})-0000-1000-8000-00805f9b34fb', 2);
    const matcher = pattern.matcher(uuidStr);
    return matcher.matches() ? matcher.group(1) : uuidStr;
}

// val must be a Uint8Array or Uint16Array or a string like '0x01' or '0x007F' or '0x01,0x02', or '0x007F,'0x006F''
export function arrayToNativeByteArray(val) {
    const length = val.length;
    const result = Array.create('byte', length);
    for (let i = 0; i < length; i++) {
        result[i] = val[i];
    }
    return result;
}

function nativeEncoding(encoding: string) {
    const result = java.nio.charset.Charset.forName(encoding);
    return result;
}

export function stringToUint8Array(value, encoding = 'iso-8859-1') {
    const nativeArray = new java.lang.String(value).getBytes(nativeEncoding(encoding));
    const length = nativeArray.length;
    const ret = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        ret[i] = value[i];
    }
    return ret;
}

export function valueToByteArray(value, encoding = 'iso-8859-1') {
    if (value instanceof ArrayBuffer) {
        return arrayToNativeByteArray(new Uint8Array(value));
    } else if (value.buffer) {
        return arrayToNativeByteArray(value);
    } else if (Array.isArray(value)) {
        return arrayToNativeByteArray(value);
    }
    const type = typeof value;
    if (type === 'string') {
        return new java.lang.String(value).getBytes(nativeEncoding(encoding));
    } else if (type === 'number') {
        return arrayToNativeByteArray([value]);
    }
    return null;
}
export function byteArrayToBuffer(value) {
    if (!value) {
        return null;
    }
    const length = value.length;
    const ret = new Uint8Array(length);
    const isString = typeof value === 'string';
    for (let i = 0; i < length; i++) {
        ret[i] = isString ? value.charCodeAt(i) : value[i];
    }
    return ret.buffer;
}

export function printValueToString(value: number[]) {
    if (value instanceof java.lang.Object) {
        const array = [];
        const bytes = value;
        for (let i = 0; i < bytes.length; i++) {
            // array.push(new Number(bytes[i]).valueOf());
            array.push(bytes[i]);
        }
        return array;
    }
    return value;
}

// JS UUID -> Java
export function stringToUuid(uuidStr: string) {
    if (uuidStr.length === 4) {
        uuidStr = '0000' + uuidStr + '-0000-1000-8000-00805f9b34fb';
    }
    return java.util.UUID.fromString(uuidStr);
}

declare class LeScanCallback extends android.bluetooth.BluetoothAdapter.LeScanCallback {
    constructor(owner: WeakRef<Bluetooth>);
    onPeripheralDiscovered: (data: Peripheral) => void;
}

let LeScanCallbackVar: typeof LeScanCallback;

function initLeScanCallback() {
    if (LeScanCallbackVar) {
        return;
    }

    class ScanRecord {
        getManufacturerSpecificData() {
            return this.manufacturerData;
        }
        getBytes() {
            return this.bytes;
        }
        getAdvertiseFlags() {
            return this.advertiseFlags;
        }
        getServiceUuids() {
            return this.serviceUuids;
        }
        getServiceData() {
            return this.serviceData;
        }
        getDeviceName() {
            return this.localName;
        }
        getTxPowerLevel() {
            return this.txPowerLevel;
        }
        constructor(
            private serviceUuids: string[],
            private manufacturerData: android.util.SparseArray<any[]>,
            private serviceData: { [k: string]: native.Array<number> },
            private advertiseFlags: number,
            private txPowerLevel: number,
            private localName: string,
            private bytes: native.Array<number>
        ) {}
    }

    class ScanAdvertisment {
        constructor(private scanRecord: ScanRecord) {}
        get manufacturerData() {
            const data = this.scanRecord.getManufacturerSpecificData();
            const size = data.size();
            if (size > 0) {
                const mKey = data.keyAt(0);
                return byteArrayToBuffer(data.get(mKey));
            }
            return undefined;
        }
        get data() {
            return byteArrayToBuffer(this.scanRecord.getBytes());
        }
        get manufacturerId() {
            const data = this.scanRecord.getManufacturerSpecificData();
            const size = data.size();
            if (size > 0) {
                return data.keyAt(0);
            }
            return -1;
        }
        get txPowerLevel() {
            return this.scanRecord.getTxPowerLevel();
        }
        get localName() {
            return this.scanRecord.getDeviceName();
        }
        get flags() {
            return this.scanRecord.getAdvertiseFlags();
        }
        get serviceUUIDs() {
            const result = [];
            const serviceUuids = this.scanRecord.getServiceUuids();
            for (let i = 0; i < serviceUuids.length; i++) {
                result.push(uuidToString(serviceUuids[i]));
            }
            return result;
        }
        get serviceData() {
            const result = {};
            const serviceData = this.scanRecord.getServiceData();

            const keys = Object.keys(serviceData);
            let currentKey;
            for (let i = 0; i < keys.length; i++) {
                currentKey = keys[i];
                result[uuidToString(currentKey)] = byteArrayToBuffer(serviceData[currentKey]);
            }
            return result;
        }
    }

    // Helper method to extract bytes from byte array.
    function extractBytes(scanRecord, start: number, length: number) {
        // const  bytes = new byte[length];
        // System.arraycopy(scanRecord, start, bytes, 0, length);
        return java.util.Arrays.copyOfRange(scanRecord, start, start + length);
    }

    let BASE_UUID;
    function getBASE_UUID() {
        if (!BASE_UUID) {
            BASE_UUID = android.os.ParcelUuid.fromString('00000000-0000-1000-8000-00805F9B34FB');
        }
        return BASE_UUID;
    }

    /** Length of bytes for 16 bit UUID */
    const UUID_BYTES_16_BIT = 2;
    /** Length of bytes for 32 bit UUID */
    const UUID_BYTES_32_BIT = 4;
    /** Length of bytes for 128 bit UUID */
    const UUID_BYTES_128_BIT = 16;

    function parseUuidFrom(uuidBytes: any) {
        if (uuidBytes == null) {
            throw new Error('uuidBytes cannot be null');
        }
        const length = uuidBytes.length;
        if (length !== UUID_BYTES_16_BIT && length !== UUID_BYTES_32_BIT && length !== UUID_BYTES_128_BIT) {
            throw new Error('uuidBytes length invalid - ' + length);
        }

        // Construct a 128 bit UUID.
        if (length === UUID_BYTES_128_BIT) {
            const buf = java.nio.ByteBuffer.wrap(uuidBytes).order(java.nio.ByteOrder.LITTLE_ENDIAN);
            const msb = buf.getLong(8);
            const lsb = buf.getLong(0);
            return new java.util.UUID(msb, lsb).toString();
        }

        // For 16 bit and 32 bit UUID we need to convert them to 128 bit value.
        // 128_bit_value = uuid * 2^96 + BASE_UUID
        let shortUuid;
        if (length === UUID_BYTES_16_BIT) {
            shortUuid = uuidBytes[0] & 0xff;
            shortUuid += (uuidBytes[1] & 0xff) << 8;
        } else {
            shortUuid = uuidBytes[0] & 0xff;
            shortUuid += (uuidBytes[1] & 0xff) << 8;
            shortUuid += (uuidBytes[2] & 0xff) << 16;
            shortUuid += (uuidBytes[3] & 0xff) << 24;
        }
        const msb = getBASE_UUID().getUuid().getMostSignificantBits() + (shortUuid << 32);
        const lsb = getBASE_UUID().getUuid().getLeastSignificantBits();
        return new java.util.UUID(msb, lsb).toString();
    }
    function parseServiceUuid(scanRecord, currentPos: number, dataLength: number, uuidLength: number, serviceUuids: string[]) {
        while (dataLength > 0) {
            const uuidBytes = extractBytes(scanRecord, currentPos, uuidLength);
            serviceUuids.push(parseUuidFrom(uuidBytes));
            dataLength -= uuidLength;
            currentPos += uuidLength;
        }
        return currentPos;
    }

    const DATA_TYPE_FLAGS = 0x01;
    const DATA_TYPE_SERVICE_UUIDS_16_BIT_PARTIAL = 0x02;
    const DATA_TYPE_SERVICE_UUIDS_16_BIT_COMPLETE = 0x03;
    const DATA_TYPE_SERVICE_UUIDS_32_BIT_PARTIAL = 0x04;
    const DATA_TYPE_SERVICE_UUIDS_32_BIT_COMPLETE = 0x05;
    const DATA_TYPE_SERVICE_UUIDS_128_BIT_PARTIAL = 0x06;
    const DATA_TYPE_SERVICE_UUIDS_128_BIT_COMPLETE = 0x07;
    const DATA_TYPE_LOCAL_NAME_SHORT = 0x08;
    const DATA_TYPE_LOCAL_NAME_COMPLETE = 0x09;
    const DATA_TYPE_TX_POWER_LEVEL = 0x0a;
    const DATA_TYPE_SERVICE_DATA_16_BIT = 0x16;
    const DATA_TYPE_SERVICE_DATA_32_BIT = 0x20;
    const DATA_TYPE_SERVICE_DATA_128_BIT = 0x21;
    const DATA_TYPE_MANUFACTURER_SPECIFIC_DATA = 0xff;
    function parseFromBytes(scanRecord: number[]) {
        if (scanRecord == null) {
            return null;
        }

        let currentPos = 0;
        let advertiseFlag = -1;
        let serviceUuids: string[] = [];
        let localName: string = null;
        let txPowerLevel = Number.MIN_VALUE;
        const manufacturerData: android.util.SparseArray<any[]> = new android.util.SparseArray();

        // const manufacturerData = null;
        const serviceData = {};

        try {
            while (currentPos < scanRecord.length) {
                // length is unsigned int.
                const length = scanRecord[currentPos++] & 0xff;
                if (length === 0) {
                    break;
                }
                // Note the length includes the length of the field type itself.
                const dataLength = length - 1;
                // fieldType is unsigned int.
                const fieldType = scanRecord[currentPos++] & 0xff;
                switch (fieldType) {
                    case DATA_TYPE_FLAGS:
                        advertiseFlag = scanRecord[currentPos] & 0xff;
                        break;
                    case DATA_TYPE_SERVICE_UUIDS_16_BIT_PARTIAL:
                    case DATA_TYPE_SERVICE_UUIDS_16_BIT_COMPLETE:
                        parseServiceUuid(scanRecord, currentPos, dataLength, UUID_BYTES_16_BIT, serviceUuids);
                        break;
                    case DATA_TYPE_SERVICE_UUIDS_32_BIT_PARTIAL:
                    case DATA_TYPE_SERVICE_UUIDS_32_BIT_COMPLETE:
                        parseServiceUuid(scanRecord, currentPos, dataLength, UUID_BYTES_32_BIT, serviceUuids);
                        break;
                    case DATA_TYPE_SERVICE_UUIDS_128_BIT_PARTIAL:
                    case DATA_TYPE_SERVICE_UUIDS_128_BIT_COMPLETE:
                        parseServiceUuid(scanRecord, currentPos, dataLength, UUID_BYTES_128_BIT, serviceUuids);
                        break;
                    case DATA_TYPE_LOCAL_NAME_SHORT:
                    case DATA_TYPE_LOCAL_NAME_COMPLETE:
                        localName = String.fromCharCode.apply(String, extractBytes(scanRecord, currentPos, dataLength));
                        break;
                    case DATA_TYPE_TX_POWER_LEVEL:
                        txPowerLevel = scanRecord[currentPos];
                        break;
                    case DATA_TYPE_SERVICE_DATA_16_BIT:
                    case DATA_TYPE_SERVICE_DATA_32_BIT:
                    case DATA_TYPE_SERVICE_DATA_128_BIT:
                        let serviceUuidLength = UUID_BYTES_16_BIT;
                        if (fieldType === DATA_TYPE_SERVICE_DATA_32_BIT) {
                            serviceUuidLength = UUID_BYTES_32_BIT;
                        } else if (fieldType === DATA_TYPE_SERVICE_DATA_128_BIT) {
                            serviceUuidLength = UUID_BYTES_128_BIT;
                        }

                        const serviceDataUuidBytes = extractBytes(scanRecord, currentPos, serviceUuidLength);
                        const serviceDataUuid = parseUuidFrom(serviceDataUuidBytes);
                        const serviceDataArray = extractBytes(scanRecord, currentPos + serviceUuidLength, dataLength - serviceUuidLength);
                        serviceData[serviceDataUuid] = serviceDataArray;
                        break;
                    case DATA_TYPE_MANUFACTURER_SPECIFIC_DATA:
                        // The first two bytes of the manufacturer specific data are
                        // manufacturer ids in little endian.
                        const manufacturerId = ((scanRecord[currentPos + 1] & 0xff) << 8) + (scanRecord[currentPos] & 0xff);
                        const manufacturerDataBytes = extractBytes(scanRecord, currentPos + 2, dataLength - 2);
                        manufacturerData.put(manufacturerId, manufacturerDataBytes);
                        break;
                    default:
                        // Just ignore, we don't handle such data type.
                        break;
                }
                currentPos += dataLength;
            }

            if (serviceUuids.length === 0) {
                serviceUuids = null;
            }
            return new ScanRecord(serviceUuids, manufacturerData, serviceData, advertiseFlag, txPowerLevel, localName, scanRecord);
        } catch (e) {
            // Log.e(TAG, 'unable to parse scan record: ' + Arrays.toString(scanRecord));
            // As the record is invalid, ignore all the parsed results for this packet
            // and return an empty record with raw scanRecord bytes in results
            return new ScanRecord(null, null, null, -1, Number.MIN_VALUE, null, scanRecord);
        }
    }

    /**
     * Do not mark this one as a native class. Not doing so will allow this class to be compiled into a JavaScript pure class.
     * For a strange reason, LeScanCallback will throw errors if it's compiled into a function.
     * That is why we want it to remain a class after compile procedure.
     * Also, class will work properly if implementor is given as an argument to super class since method 'onLeScan' is originally abstract.
     */
    class LeScanCallbackImpl extends android.bluetooth.BluetoothAdapter.LeScanCallback {
        onPeripheralDiscovered: (data: Peripheral) => void;

        constructor(private owner: WeakRef<Bluetooth>) {
            super({
                onLeScan (device: android.bluetooth.BluetoothDevice, rssi: number, data: number[]) {
                    if (Trace.isEnabled()) {
                        CLog(CLogTypes.info, `TNS_LeScanCallback.onLeScan ---- device: ${device}, rssi: ${rssi}, scanRecord: ${data}`);
                    }
                    const owner = this.owner && this.owner.get();
                    if (!owner) {
                        return;
                    }
                    let stateObject = owner.connections[device.getAddress()];
                    if (!stateObject) {
                        stateObject = owner.connections[device.getAddress()] = {
                            state: 'disconnected',
                        };
                        const scanRecord = parseFromBytes(data);
                        const advertismentData = new ScanAdvertisment(scanRecord);
                        stateObject.advertismentData = advertismentData;
                        const payload = {
                            type: 'scanResult', // TODO or use different callback functions?
                            UUID: device.getAddress(), // TODO consider renaming to id (and iOS as well)
                            name: device.getName(),
                            localName: advertismentData.localName,
                            RSSI: rssi,
                            state: 'disconnected',
                            advertismentData,
                            nativeDevice: device,
                            manufacturerId: advertismentData.manufacturerId,
                        };
                        if (Trace.isEnabled()) {
                            CLog(CLogTypes.info, `TNS_LeScanCallback.onLeScan ---- payload: ${JSON.stringify(payload)}`);
                        }
                        this.onPeripheralDiscovered && this.onPeripheralDiscovered(payload);
                        owner.sendEvent(Bluetooth.device_discovered_event, payload);
                    }
                },
            });
            /**
             * Callback reporting an LE device found during a device scan initiated by the startLeScan(BluetoothAdapter.LeScanCallback) function.
             * @param device [android.bluetooth.BluetoothDevice] - Identifies the remote device
             * @param rssi [number] - The RSSI value for the remote device as reported by the Bluetooth hardware. 0 if no RSSI value is available.
             * @param scanRecord [byte[]] - The content of the advertisement record offered by the remote device.
             */
            return global.__native(this);
        }
    }
    LeScanCallbackVar = LeScanCallbackImpl;
}

declare class ScanCallback extends android.bluetooth.le.ScanCallback {
    constructor(owner: WeakRef<Bluetooth>);
    onPeripheralDiscovered?: (data: Peripheral) => void;
}

let ScanCallbackVar: typeof ScanCallback;

function initScanCallback() {
    if (ScanCallbackVar) {
        return;
    }
    @NativeClass
    class ScanCallBackImpl extends android.bluetooth.le.ScanCallback {
        onPeripheralDiscovered: (data: Peripheral) => void;

        constructor(private owner: WeakRef<Bluetooth>) {
            super();
            return global.__native(this);
        }

        /**
         * Callback when batch results are delivered.
         * @param results [List<android.bluetooth.le.ScanResult>] - List of scan results that are previously scanned.
         */
        onBatchScanResults(results) {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, `TNS_ScanCallback.onBatchScanResults ---- results: ${results}`);
            }
        }

        /**
         * Callback when scan could not be started.
         * @param errorCode [number] - Error code (one of SCAN_FAILED_*) for scan failure.
         */
        onScanFailed(errorCode: number) {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, `TNS_ScanCallback.onScanFailed ---- errorCode: ${errorCode}`);
            }
            let errorMessage;
            if (errorCode === android.bluetooth.le.ScanCallback.SCAN_FAILED_ALREADY_STARTED) {
                errorMessage = 'Scan already started';
            } else if (errorCode === android.bluetooth.le.ScanCallback.SCAN_FAILED_APPLICATION_REGISTRATION_FAILED) {
                errorMessage = 'Application registration failed';
            } else if (errorCode === android.bluetooth.le.ScanCallback.SCAN_FAILED_FEATURE_UNSUPPORTED) {
                errorMessage = 'Feature unsupported';
            } else if (errorCode === android.bluetooth.le.ScanCallback.SCAN_FAILED_INTERNAL_ERROR) {
                errorMessage = 'Internal error';
            } else {
                errorMessage = 'Scan failed to start';
            }
            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, `TNS_ScanCallback.onScanFailed errorMessage: ${errorMessage}`);
            }
        }

        /**
         * Callback when a BLE advertisement has been found.
         * @param callbackType [number] - Determines how this callback was triggered. Could be one of CALLBACK_TYPE_ALL_MATCHES, CALLBACK_TYPE_FIRST_MATCH or CALLBACK_TYPE_MATCH_LOST
         * @param result  [android.bluetooth.le.ScanResult] - A Bluetooth LE scan result.
         */
        onScanResult(callbackType: number, result: android.bluetooth.le.ScanResult) {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, `TNS_ScanCallback.onScanResult ---- callbackType: ${callbackType}, result: ${result}`);
            }
            const owner = this.owner && this.owner.get();
            if (!owner) {
                return;
            }
            let stateObject = owner.connections[result.getDevice().getAddress()];
            if (!stateObject) {
                stateObject = owner.connections[result.getDevice().getAddress()] = {
                    state: 'disconnected',
                };
            }
            const advertismentData = new ScanAdvertisment(result.getScanRecord());
            stateObject.advertismentData = advertismentData;

            const payload = {
                type: 'scanResult', // TODO or use different callback functions?
                UUID: result.getDevice().getAddress(),
                name: result.getDevice().getName(),
                RSSI: result.getRssi(),
                localName: advertismentData.localName,
                state: 'disconnected',
                manufacturerId: advertismentData.manufacturerId,
                advertismentData,
            };
            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, `TNS_ScanCallback.onScanResult ---- payload: ${JSON.stringify(payload)}`);
            }
            this.onPeripheralDiscovered && this.onPeripheralDiscovered(payload);
            owner.sendEvent(Bluetooth.device_discovered_event, payload);
        }
    }

    class ScanAdvertisment {
        constructor(private scanRecord: android.bluetooth.le.ScanRecord) {}
        get manufacturerData() {
            const data = this.scanRecord.getManufacturerSpecificData();
            const size = data ? data.size() : 0;
            if (size > 0) {
                const mKey = data.keyAt(0);
                return byteArrayToBuffer(data.get(mKey));
            }
            return undefined;
        }
        get data() {
            return byteArrayToBuffer(this.scanRecord.getBytes());
        }
        get manufacturerId() {
            const data = this.scanRecord.getManufacturerSpecificData();
            const size = data ? data.size() : 0;
            if (size > 0) {
                return data.keyAt(0);
            }
            return -1;
        }
        get txPowerLevel() {
            return this.scanRecord.getTxPowerLevel();
        }
        get localName() {
            let deviceName = this.scanRecord.getDeviceName();
            if (deviceName) {
                deviceName = deviceName.replace('\0', '').replace('�', '');
            }
            return deviceName;
        }
        get flags() {
            return this.scanRecord.getAdvertiseFlags();
        }
        get serviceUUIDs() {
            const result = [];
            const serviceUuids = this.scanRecord.getServiceUuids();
            if (serviceUuids) {
                for (let i = 0; i < serviceUuids.size(); i++) {
                    result.push(uuidToString(serviceUuids.get(i)));
                }
            }

            return result;
        }
        get serviceData() {
            const result = {};
            const serviceData = this.scanRecord.getServiceData();
            if (serviceData && serviceData.size() > 0) {
                const entries = serviceData.entrySet().iterator();
                while (entries.hasNext()) {
                    const entry = entries.next();
                    result[uuidToString(entry.getKey())] = byteArrayToBuffer(entry.getValue());
                }
            }
            return result;
        }
    }
    ScanCallbackVar = ScanCallBackImpl;
}

let BluetoothGattCallback: BluetoothGattCallback;
// eslint-disable-next-line no-redeclare
export type BluetoothGattCallback = new (owner: WeakRef<Bluetooth>) => android.bluetooth.BluetoothGattCallback;

export type SubBluetoothGattCallback = Partial<android.bluetooth.BluetoothGattCallback>;
export interface BluetoothGattCallbackWithSubCallback extends android.bluetooth.BluetoothGattCallback {
    addSubDelegate(delegate: SubBluetoothGattCallback);
    removeSubDelegate(delegate: SubBluetoothGattCallback);
}
export type DisconnectListener = (address) => void;
function initBluetoothGattCallback() {
    if (BluetoothGattCallback) {
        return;
    }
    @NativeClass
    class BluetoothGattCallbackImpl extends android.bluetooth.BluetoothGattCallback {
        // private owner: WeakRef<Bluetooth>;
        constructor(private owner: WeakRef<Bluetooth>) {
            super();
            return global.__native(this);
        }

        private subDelegates: SubBluetoothGattCallback[] = [];

        public addSubDelegate(delegate: SubBluetoothGattCallback) {
            const index = this.subDelegates.indexOf(delegate);
            if (index === -1) {
                this.subDelegates.push(delegate);
            }
        }

        public removeSubDelegate(delegate: SubBluetoothGattCallback) {
            const index = this.subDelegates.indexOf(delegate);
            if (index !== -1) {
                this.subDelegates.splice(index, 1);
            }
        }
        /**
         * Callback indicating when GATT client has connected/disconnected to/from a remote GATT server.
         * @param bluetoothGatt [android.bluetooth.BluetoothGatt] - GATT client
         * @param status [number] - Status of the connect or disconnect operation. GATT_SUCCESS if the operation succeeds.
         * @param newState [number] - Returns the new connection state. Can be one of STATE_DISCONNECTED or STATE_CONNECTED
         */
        onConnectionStateChange(gatt: android.bluetooth.BluetoothGatt, status: number, newState: number) {
            if (Trace.isEnabled()) {
                CLog(
                    CLogTypes.info,
                    `TNS_BluetoothGattCallback.onConnectionStateChange ---- gatt: ${gatt}, device:${
                        gatt.getDevice() && gatt.getDevice().getAddress()
                    } status: ${status}, newState: ${newState}, subdelegates:${this.subDelegates.length}`
                );
            }
            this.subDelegates.forEach((d) => {
                if (d.onConnectionStateChange) {
                    d.onConnectionStateChange(gatt, status, newState);
                }
            });
            const owner = this.owner && this.owner.get();
            if (owner && newState === android.bluetooth.BluetoothProfile.STATE_CONNECTED && status === GATT_SUCCESS) {
                const device = gatt.getDevice();
                let address: string = null;
                if (device == null) {
                    // happens some time, why ... ?
                } else {
                    address = device.getAddress();
                }
                const stateObject = owner.connections[address];
                if (!stateObject) {
                    owner.gattDisconnect(gatt);
                }
            } else {
                // perhaps the device was manually disconnected, or in use by another device
                owner.gattDisconnect(gatt);
            }
        }

        /**
         * Callback invoked when the list of remote services, characteristics and descriptors for the remote device have been updated, ie new services have been discovered.
         * @param gatt [android.bluetooth.BluetoothGatt] - GATT client invoked discoverServices()
         * @param status [number] - GATT_SUCCESS if the remote device has been explored successfully.
         */
        onServicesDiscovered(gatt: android.bluetooth.BluetoothGatt, status: number) {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, `TNS_BluetoothGattCallback.onServicesDiscovered ---- gatt: ${gatt}, status (0=success): ${status} ${this.subDelegates}`);
            }

            this.subDelegates.forEach((d) => {
                if (d.onServicesDiscovered) {
                    d.onServicesDiscovered(gatt, status);
                }
            });
        }

        /**
         * Callback reporting the result of a characteristic read operation.
         * @param gatt [android.bluetooth.BluetoothGatt] - GATT client invoked readCharacteristic(BluetoothGattCharacteristic)
         * @param characteristic - Characteristic that was read from the associated remote device.
         * @param status [number] - GATT_SUCCESS if the read operation was completed successfully.
         */
        onCharacteristicRead(gatt: android.bluetooth.BluetoothGatt, characteristic: android.bluetooth.BluetoothGattCharacteristic, status: number) {
            this.subDelegates.forEach((d) => {
                if (d.onCharacteristicRead) {
                    d.onCharacteristicRead(gatt, characteristic, status);
                }
            });
        }

        /**
         * Callback triggered as a result of a remote characteristic notification.
         * @param gatt [android.bluetooth.BluetoothGatt] - GATT client the characteristic is associated with.
         * @param characteristic [android.bluetooth.BluetoothGattCharacteristic] - Characteristic that has been updated as a result of a remote notification event.
         */
        onCharacteristicChanged(gatt: android.bluetooth.BluetoothGatt, characteristic: android.bluetooth.BluetoothGattCharacteristic) {
            const device = gatt.getDevice();
            let pUUID: string = null;
            if (device == null) {
                // happens some time, why ... ?
            } else {
                pUUID = device.getAddress();
            }
            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, `TNS_BluetoothGattCallback.onCharacteristicChanged ---- gatt: ${gatt}, characteristic: ${characteristic}, device: ${pUUID}`);
            }

            this.subDelegates.forEach((d) => {
                if (d.onCharacteristicChanged) {
                    d.onCharacteristicChanged(gatt, characteristic);
                }
            });

            const stateObject = this.owner.get().connections[pUUID];
            if (stateObject) {
                const cUUID = uuidToString(characteristic.getUuid());
                const sUUID = uuidToString(characteristic.getService().getUuid());
                const key = sUUID + '/' + cUUID;
                if (stateObject.onNotifyCallbacks && stateObject.onNotifyCallbacks[key]) {
                    const value = characteristic.getValue();
                    stateObject.onNotifyCallbacks[key]({
                        android: value,
                        value: byteArrayToBuffer(value),
                        peripheralUUID: pUUID,
                        serviceUUID: sUUID,
                        characteristicUUID: cUUID,
                    });
                }
            }
        }

        /**
         * Callback indicating the result of a characteristic write operation.
         * If this callback is invoked while a reliable write transaction is in progress, the value of the characteristic represents the value reported by the remote device.
         * An application should compare this value to the desired value to be written.
         * If the values don't match, the application must abort the reliable write transaction.
         * @param gatt - GATT client invoked writeCharacteristic(BluetoothGattCharacteristic)
         * @param characteristic - Characteristic that was written to the associated remote device.
         * @param status - The result of the write operation GATT_SUCCESS if the operation succeeds.
         */
        onCharacteristicWrite(gatt: android.bluetooth.BluetoothGatt, characteristic: android.bluetooth.BluetoothGattCharacteristic, status: number) {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, `TNS_BluetoothGattCallback.onCharacteristicWrite ---- gatt: ${gatt}, characteristic: ${characteristic}`, this.subDelegates.length);
            }
            this.subDelegates.forEach((d) => {
                if (d.onCharacteristicWrite) {
                    d.onCharacteristicWrite(gatt, characteristic, status);
                }
            });
        }

        /**
         * Callback reporting the result of a descriptor read operation.
         * @param gatt - GATT client invoked readDescriptor(BluetoothGattDescriptor)
         * @param descriptor - Descriptor that was read from the associated remote device.
         * @param status - GATT_SUCCESS if the read operation was completed successfully
         */
        onDescriptorRead(gatt: android.bluetooth.BluetoothGatt, descriptor: android.bluetooth.BluetoothGattDescriptor, status: number) {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, `TNS_BluetoothGattCallback.onDescriptorRead ---- gatt: ${gatt}, descriptor: ${descriptor}, status: ${status}`);
            }
            this.subDelegates.forEach((d) => {
                if (d.onDescriptorRead) {
                    d.onDescriptorRead(gatt, descriptor, status);
                }
            });
        }

        /**
         * Callback indicating the result of a descriptor write operation.
         * @param gatt - GATT client invoked writeDescriptor(BluetoothGattDescriptor).
         * @param descriptor - Descriptor that was written to the associated remote device.
         * @param status - The result of the write operation GATT_SUCCESS if the operation succeeds.
         */
        onDescriptorWrite(gatt: android.bluetooth.BluetoothGatt, descriptor: android.bluetooth.BluetoothGattDescriptor, status: number) {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, `TNS_BluetoothGattCallback.onDescriptorWrite ---- gatt: ${gatt}, descriptor: ${descriptor}, status: ${status}`);
            }
            this.subDelegates.forEach((d) => {
                if (d.onDescriptorWrite) {
                    d.onDescriptorWrite(gatt, descriptor, status);
                }
            });
        }

        /**
         * Callback reporting the RSSI for a remote device connection. This callback is triggered in response to the readRemoteRssi() function.
         * @param gatt - GATT client invoked readRemoteRssi().
         * @param rssi - The RSSI value for the remote device.
         * @param status - GATT_SUCCESS if the RSSI was read successfully.
         */
        onReadRemoteRssi(gatt: android.bluetooth.BluetoothGatt, rssi: number, status: number) {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, `TNS_BluetoothGattCallback.onReadRemoteRssi ---- gatt: ${gatt} rssi: ${rssi}, status: ${status}`);
            }
        }

        /**
         * Callback indicating the MTU for a given device connection has changed. This callback is triggered in response to the requestMtu(int) function, or in response to a connection event.
         * @param gatt - GATT client invoked requestMtu(int).
         * @param mtu - The new MTU size.
         * @param status - GATT_SUCCESS if the MTU has been changed successfully.
         */
        onMtuChanged(gatt: android.bluetooth.BluetoothGatt, mtu: number, status: number) {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, `TNS_BluetoothGattCallback.onMtuChanged ---- gatt: ${gatt} mtu: ${mtu}, status: ${status}`);
            }
            const owner = this.owner.get();
            if (owner) {
                owner.notify({
                    eventName: 'mtu',
                    object: owner,
                    data: mtu,
                });
            }
            this.subDelegates.forEach((d) => {
                if (d.onMtuChanged) {
                    d.onMtuChanged(gatt, mtu, status);
                }
            });
        }
        /**
         * Callback indicating the MTU for a given device connection has changed. This callback is triggered in response to the requestMtu(int) function, or in response to a connection event.
         * @param gatt - GATT client invoked requestMtu(int).
         * @param txPhy - The new tx PHY.
         * @param rxPhy - The new rx PHY.
         * @param status - GATT_SUCCESS if the PHY has been changed successfully.
         */
        onPhyUpdate(gatt: android.bluetooth.BluetoothGatt, txPhy: number, rxPhy: number, status: number) {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, 'TNS_BluetoothGattCallback.onPhyUpdate ---- gatt: ' + gatt + ' txPhy: ' + txPhy + ' rxPhy: ' + rxPhy + ', status: ' + status);
            }
            const owner = this.owner.get();
            if (owner) {
                owner.notify({
                    eventName: 'phy',
                    object: owner,
                    data: {txPhy, rxPhy},
                });
            }
            this.subDelegates.forEach(function (d) {
                if (d.onPhyUpdate) {
                    d.onPhyUpdate(gatt, txPhy, rxPhy, status);
                }
            });
        };
    }
    BluetoothGattCallback = BluetoothGattCallbackImpl;
}

declare interface WrapperOptions {
    peripheralUUID: string;
    serviceUUID: string;
    characteristicUUID: string;
}

declare interface WrapperResult {
    gatt: android.bluetooth.BluetoothGatt;
    bluetoothGattService: android.bluetooth.BluetoothGattService;
}

function getGattDeviceServiceInfo(gatt: android.bluetooth.BluetoothGatt) {
    const services = gatt.getServices();
    const servicesJs = [];
    const BluetoothGattCharacteristic = android.bluetooth.BluetoothGattCharacteristic;
    for (let i = 0; i < services.size(); i++) {
        const service = services.get(i);
        const characteristics = service.getCharacteristics();
        const characteristicsJs = [];
        for (let j = 0; j < characteristics.size(); j++) {
            const characteristic = characteristics.get(j);
            const props = characteristic.getProperties();
            const descriptors = characteristic.getDescriptors();
            const descriptorsJs = [];
            for (let k = 0; k < descriptors.size(); k++) {
                const descriptor = descriptors.get(k);
                const descriptorJs = {
                    UUID: uuidToString(descriptor.getUuid()),
                    value: descriptor.getValue(), // always empty btw
                    permissions: null,
                };
                const descPerms = descriptor.getPermissions();
                if (descPerms > 0) {
                    descriptorJs.permissions = {
                        read: (descPerms & BluetoothGattCharacteristic.PERMISSION_READ) !== 0,
                        readEncrypted: (descPerms & BluetoothGattCharacteristic.PERMISSION_READ_ENCRYPTED) !== 0,
                        readEncryptedMitm: (descPerms & BluetoothGattCharacteristic.PERMISSION_READ_ENCRYPTED_MITM) !== 0,
                        write: (descPerms & BluetoothGattCharacteristic.PERMISSION_WRITE) !== 0,
                        writeEncrypted: (descPerms & BluetoothGattCharacteristic.PERMISSION_WRITE_ENCRYPTED) !== 0,
                        writeEncryptedMitm: (descPerms & BluetoothGattCharacteristic.PERMISSION_WRITE_ENCRYPTED_MITM) !== 0,
                        writeSigned: (descPerms & BluetoothGattCharacteristic.PERMISSION_WRITE_SIGNED) !== 0,
                        writeSignedMitm: (descPerms & BluetoothGattCharacteristic.PERMISSION_WRITE_SIGNED_MITM) !== 0,
                    };
                }

                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, `TNS_BluetoothGattCallback.onServicesDiscovered ---- pushing descriptor: ${descriptor}`);
                }
                descriptorsJs.push(descriptorJs);
            }

            const characteristicJs = {
                serviceUUID: uuidToString(service.getUuid()),
                UUID: uuidToString(characteristic.getUuid()),
                name: uuidToString(characteristic.getUuid()), // there's no sep field on Android
                properties: {
                    read: (props & BluetoothGattCharacteristic.PROPERTY_READ) !== 0,
                    write: (props & BluetoothGattCharacteristic.PROPERTY_WRITE) !== 0,
                    writeWithoutResponse: (props & BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE) !== 0,
                    notify: (props & BluetoothGattCharacteristic.PROPERTY_NOTIFY) !== 0,
                    indicate: (props & BluetoothGattCharacteristic.PROPERTY_INDICATE) !== 0,
                    broadcast: (props & BluetoothGattCharacteristic.PROPERTY_BROADCAST) !== 0,
                    authenticatedSignedWrites: (props & BluetoothGattCharacteristic.PROPERTY_SIGNED_WRITE) !== 0,
                    extendedProperties: (props & BluetoothGattCharacteristic.PROPERTY_EXTENDED_PROPS) !== 0,
                },
                descriptors: descriptorsJs,
                permissions: null,
            };

            // permissions are usually not provided, so let's not return them in that case
            const charPerms = characteristic.getPermissions();
            if (charPerms > 0) {
                characteristicJs.permissions = {
                    read: (charPerms & BluetoothGattCharacteristic.PERMISSION_READ) !== 0,
                    readEncrypted: (charPerms & BluetoothGattCharacteristic.PERMISSION_READ_ENCRYPTED) !== 0,
                    readEncryptedMitm: (charPerms & BluetoothGattCharacteristic.PERMISSION_READ_ENCRYPTED_MITM) !== 0,
                    write: (charPerms & BluetoothGattCharacteristic.PERMISSION_WRITE) !== 0,
                    writeEncrypted: (charPerms & BluetoothGattCharacteristic.PERMISSION_WRITE_ENCRYPTED) !== 0,
                    writeEncryptedMitm: (charPerms & BluetoothGattCharacteristic.PERMISSION_WRITE_ENCRYPTED_MITM) !== 0,
                    writeSigned: (charPerms & BluetoothGattCharacteristic.PERMISSION_WRITE_SIGNED) !== 0,
                    writeSignedMitm: (charPerms & BluetoothGattCharacteristic.PERMISSION_WRITE_SIGNED_MITM) !== 0,
                };
            }

            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, `TNS_BluetoothGattCallback.onServicesDiscovered ---- pushing characteristic: ${JSON.stringify(characteristicJs)}`);
            }
            characteristicsJs.push(characteristicJs);
        }

        servicesJs.push({
            UUID: uuidToString(service.getUuid()),
            characteristics: characteristicsJs,
        });
    }
    return { services: servicesJs };
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
            this._bluetoothManager = ad.getApplicationContext().getSystemService(android.content.Context.BLUETOOTH_SERVICE);
        }
        return this._bluetoothManager;
    }
    public _bluetoothGattCallback: BluetoothGattCallbackWithSubCallback;

    get bluetoothGattCallback() {
        if (!this._bluetoothGattCallback) {
            initBluetoothGattCallback();
            this._bluetoothGattCallback = new BluetoothGattCallback(new WeakRef(this)) as any;
        }
        return this._bluetoothGattCallback;
    }
    // not initializing here, if the Android API is < 21  use LeScanCallback
    private scanCallback: ScanCallback;
    private LeScanCallback: LeScanCallback;

    // with gatt all operations must be queued. Parallel operations will fail
    gattQueue: PQueue;

    static readonly android = {
        ScanMode,
        MatchMode,
        MatchNum,
        CallbackType,
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
            onConnected?: (e: { UUID: string; name: string; state: string; services?: Service[]; advertismentData: AdvertismentData; mtu?: number }) => void;
            onDisconnected?: (e: { UUID: string; name: string }) => void;
            device?: android.bluetooth.BluetoothGatt;
            onNotifyCallbacks?: {
                [k: string]: (result: ReadResult) => void;
            };
            advertismentData?: AdvertismentData;
        };
    } = {};
    constructor() {
        super();
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, '*** Android Bluetooth Constructor ***');
        }

        // if >= Android21 (Lollipop)
        if (android.os.Build.VERSION.SDK_INT >= LOLLIPOP) {
            initScanCallback();
            this.scanCallback = new ScanCallbackVar(new WeakRef(this));
        } else if (android.os.Build.VERSION.SDK_INT >= JELLY_BEAN) {
            initLeScanCallback();
            this.LeScanCallback = new LeScanCallbackVar(new WeakRef(this));
        }
        this.gattQueue = new PQueue({ concurrency: 1 });
    }

    clear() {
        this.gattQueue.clear();
    }
    broadcastRegistered = false;
    registerBroadcast() {
        if (this.broadcastRegistered) {
            return;
        }
        this.broadcastRegistered = true;
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, 'Android Bluetooth  registering for state change');
        }
        andApp.registerBroadcastReceiver(android.bluetooth.BluetoothAdapter.ACTION_STATE_CHANGED, (context: android.content.Context, intent: android.content.Intent) => {
            const state = intent.getIntExtra(android.bluetooth.BluetoothAdapter.EXTRA_STATE, android.bluetooth.BluetoothAdapter.ERROR);
            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, 'Android Bluetooth  ACTION_STATE_CHANGED', state, android.bluetooth.BluetoothAdapter.STATE_ON, android.bluetooth.BluetoothAdapter.STATE_OFF);
            }
            if (state === android.bluetooth.BluetoothAdapter.STATE_TURNING_OFF) {
                // ensure all connections are closed correctly on bluetooth closing
                Object.keys(this.connections).forEach((k) => {
                    const stateObject = this.connections[k];
                    if (stateObject.device) {
                        this.gattDisconnect(stateObject.device);
                    }
                });
            }
            if (state === android.bluetooth.BluetoothAdapter.STATE_ON || state === android.bluetooth.BluetoothAdapter.STATE_OFF) {
                this.sendEvent(Bluetooth.bluetooth_status_event, {
                    state: state === android.bluetooth.BluetoothAdapter.STATE_ON ? 'on' : 'off',
                });
            }
        });
    }
    unregisterBroadcast() {
        if (!this.broadcastRegistered) {
            return;
        }
        this.broadcastRegistered = false;
        andApp.unregisterBroadcastReceiver(android.bluetooth.BluetoothAdapter.ACTION_STATE_CHANGED);
    }
    onListenerAdded(eventName: string, count: number) {
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, 'onListenerAdded', eventName, count);
        }
        if (eventName === Bluetooth.bluetooth_status_event) {
            this.registerBroadcast();
        }
    }
    onListenerRemoved(eventName: string, count: number) {
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, 'onListenerRemoved', eventName, count);
        }
        if (eventName === Bluetooth.bluetooth_status_event && count === 0) {
            this.unregisterBroadcast();
        }
    }
    stop() {
        this.unregisterBroadcast();
    }

    public locationPermissionGranted() {
        let hasPermission = getAndroidSDK() < MARSHMALLOW;
        if (!hasPermission) {
            const ctx = this._getContext();
            // CLog(CLogTypes.info, 'app context', ctx);
            const neededPermission = getAndroidSDK() < ANDROID10 ? android.Manifest.permission.ACCESS_COARSE_LOCATION : android.Manifest.permission.ACCESS_FINE_LOCATION;

            hasPermission = android.content.pm.PackageManager.PERMISSION_GRANTED === androidx.core.content.ContextCompat.checkSelfPermission(ctx, neededPermission);
            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, `coarseLocationPermissionGranted ---- ${neededPermission} permission granted?`, hasPermission);
            }
        }
        return hasPermission;
    }

    public hasLocationPermission() {
        return Promise.resolve(this.locationPermissionGranted());
    }

    public requestLocationPermission(callback?: () => void): Promise<boolean> {
        return new Promise((resolve, reject) => {
            let permissionCb = (args: AndroidActivityRequestPermissionsEventData) => {
                if (args.requestCode === ACCESS_LOCATION_PERMISSION_REQUEST_CODE) {
                    andApp.off(AndroidApplication.activityRequestPermissionsEvent, permissionCb);
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
                    resolve(true);
                }
            };

            // grab the permission dialog result
            andApp.on(AndroidApplication.activityRequestPermissionsEvent, permissionCb);
            const neededPermission = getAndroidSDK() < ANDROID10 ? android.Manifest.permission.ACCESS_COARSE_LOCATION : android.Manifest.permission.ACCESS_FINE_LOCATION;
            // invoke the permission dialog
            androidx.core.app.ActivityCompat.requestPermissions(this._getActivity(), [neededPermission], ACCESS_LOCATION_PERMISSION_REQUEST_CODE);
        });
    }
    getAndroidLocationManager(): android.location.LocationManager {
        return (andApp.context as android.content.Context).getSystemService(android.content.Context.LOCATION_SERVICE);
    }
    public isGPSEnabled() {
        if (!this.hasLocationPermission()) {
            return this.requestLocationPermission().then(() => this.isGPSEnabled());
        }
        const result = this.getAndroidLocationManager().isProviderEnabled(android.location.LocationManager.GPS_PROVIDER);
        const providers = this.getAndroidLocationManager().getProviders(false);
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, 'isGPSEnabled providers', providers);
            CLog(CLogTypes.info, 'isGPSEnabled: ', result);
        }
        return Promise.resolve(result);
    }
    public enableGPS(): Promise<void> {
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, 'Bluetooth.enableGPS');
        }
        return new Promise((resolve, reject) => {
            const activity = andApp.foregroundActivity || andApp.startActivity;
            if (!this.isGPSEnabled()) {
                const onActivityResultHandler = (data: AndroidActivityResultEventData) => {
                    andApp.off(AndroidApplication.activityResultEvent, onActivityResultHandler);
                    if (data.requestCode === 0) {
                        if (this.isGPSEnabled()) {
                            resolve();
                        } else {
                            reject('GPS not enabled');
                        }
                    }
                };
                andApp.on(AndroidApplication.activityResultEvent, onActivityResultHandler);
                activity.startActivityForResult(new android.content.Intent(android.provider.Settings.ACTION_LOCATION_SOURCE_SETTINGS), 0);
            } else {
                resolve();
            }
        });
    }

    public enable() {
        const methodName = 'enable';
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, methodName, this._isEnabled());
        }
        return new Promise((resolve, reject) => {
            if (this._isEnabled()) {
                return resolve(true);
            }
            try {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, methodName, 'asking to enable bluetooth');
                }
                // activityResult event
                const onBluetoothEnableResult = (args: AndroidActivityResultEventData) => {
                    if (Trace.isEnabled()) {
                        CLog(CLogTypes.info, 'Bluetooth.onBluetoothEnableResult ---', `requestCode: ${args.requestCode}, result: ${args.resultCode}`);
                    }

                    if (args.requestCode === ACTION_REQUEST_ENABLE_BLUETOOTH_REQUEST_CODE) {
                        try {
                            // remove the event listener
                            andApp.off(AndroidApplication.activityResultEvent, onBluetoothEnableResult);

                            // RESULT_OK = -1
                            if (args.resultCode === android.app.Activity.RESULT_OK) {
                                resolve(true);
                            } else {
                                resolve(false);
                            }
                        } catch (ex) {
                            if (Trace.isEnabled()) {
                                CLog(CLogTypes.error, ex);
                            }
                            andApp.off(AndroidApplication.activityResultEvent, onBluetoothEnableResult);
                            reject(ex);
                            return;
                        }
                    } else {
                        andApp.off(AndroidApplication.activityResultEvent, onBluetoothEnableResult);
                        resolve(false);
                        return;
                    }
                };

                // set the onBluetoothEnableResult for the intent
                andApp.on(AndroidApplication.activityResultEvent, onBluetoothEnableResult);

                // create the intent to start the bluetooth enable request
                const intent = new android.content.Intent(android.bluetooth.BluetoothAdapter.ACTION_REQUEST_ENABLE);
                const activity = andApp.foregroundActivity || andApp.startActivity;
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, methodName, 'startActivityForResult');
                }
                activity.startActivityForResult(intent, ACTION_REQUEST_ENABLE_BLUETOOTH_REQUEST_CODE);
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.error, methodName, ex);
                }
                reject(ex);
            }
        });
    }
    public isBluetoothEnabled() {
        const methodName = 'isBluetoothEnabled';
        if (!this.adapter) {
            return Promise.reject(BluetoothCommon.msg_not_supported);
        }
        return new Promise<boolean>((resolve, reject) => {
            try {
                resolve(this._isEnabled());
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.error, methodName, '---- error:', ex);
                }
                reject(
                    new BluetoothError(ex.message, {
                        stack: ex.stackTrace || ex.stack,
                        nativeException: ex.nativeException,
                        method: methodName,
                    })
                );
            }
        });
    }

    @bluetoothEnabled
    @prepareArgs
    public isConnected(args) {
        const methodName = 'isConnected';
        // TODO: no try catch for now as we rely on our own connections state object.
        // try {
        if (!args.UUID) {
            return Promise.reject(new BluetoothError(BluetoothCommon.msg_missing_parameter, { type: BluetoothCommon.UUIDKey, method: methodName }));
        }
        const stateObject = this.connections[args.UUID];
        if (!stateObject) {
            return Promise.reject(
                new BluetoothError(BluetoothCommon.msg_peripheral_not_connected, {
                    method: methodName,
                    arguments: args,
                })
            );
        }
        return Promise.resolve(true);
    }

    public openBluetoothSettings() {
        const methodName = 'openBluetoothSettings';
        return new Promise<void>((resolve, reject) => {
            const activity = andApp.foregroundActivity || andApp.startActivity;
            if (!this._isEnabled()) {
                const that = this;
                const onActivityResultHandler = function (data: AndroidActivityResultEventData) {
                    andApp.off(AndroidApplication.activityResultEvent, onActivityResultHandler);
                    if (data.requestCode === 0) {
                        if (that._isEnabled()) {
                            resolve();
                        } else {
                            reject(new BluetoothError(BluetoothCommon.msg_not_enabled, { method: methodName }));
                        }
                    }
                };
                andApp.on(AndroidApplication.activityResultEvent, onActivityResultHandler);
                activity.startActivityForResult(new android.content.Intent(android.provider.Settings.ACTION_BLUETOOTH_SETTINGS), 0);
            } else {
                resolve();
            }
        });
    }
    scanningReferTimer: {
        timer?: NodeJS.Timeout;
        resolve?: Function;
    };

    private stopCurrentScan() {
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, 'stopCurrentScan:', !!this.scanningReferTimer);
        }

        if (!this.adapter) {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.error, 'stopCurrentScan: no adapter');
            }
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

    public clearAdvertismentCache() {
        for (const key in this.connections) {
            if (!!this.connections[key] && this.connections[key].state === 'disconnected') {
                delete this.connections[key];
            }
        }
    }

    @bluetoothEnabled
    public startScanning(args: StartScanningOptions) {
        const methodName = 'startScanning';
        return new Promise<void>((resolve, reject) => {
            try {
                const onPermissionGranted = () => {
                    // for (const key in this.connections) {
                    //     if (!!this.connections[key] && this.connections[key].state === 'disconnected') {
                    //         delete this.connections[key];
                    //     }
                    // }

                    const filters = args.filters || [];

                    if (this.scanningReferTimer) {
                        this.stopCurrentScan();
                    }
                    // if less than Android21 (Lollipop)
                    if (this.LeScanCallback) {
                        const uuids = [];
                        filters.forEach((f) => {
                            if (f.serviceUUID) {
                                uuids.push(stringToUuid(f.serviceUUID));
                            }
                        });
                        this.LeScanCallback.onPeripheralDiscovered = args.onDiscovered;
                        const didStart = uuids.length === 0 ? this.adapter.startLeScan(this.LeScanCallback) : this.adapter.startLeScan(uuids, this.LeScanCallback);
                        if (Trace.isEnabled()) {
                            CLog(CLogTypes.info, methodName, '---- PreLollipop ---- didStart scanning:', didStart, JSON.stringify(uuids));
                        }

                        if (!didStart) {
                            // TODO error msg, see https://github.com/randdusing/cordova-plugin-bluetoothle/blob/master/src/android/BluetoothLePlugin.java#L758
                            reject(new BluetoothError(BluetoothCommon.msg_error_function_call, { method: methodName }));
                            return;
                        }
                    } else if (this.scanCallback) {
                        const scanner = this.adapter.getBluetoothLeScanner();
                        if (!scanner) {
                            reject(new BluetoothError(BluetoothCommon.msg_not_enabled, { method: methodName }));
                            return;
                        }
                        let scanFilters = null as java.util.ArrayList<any>;
                        if (filters.length > 0) {
                            scanFilters = new java.util.ArrayList();
                            filters.forEach((f) => {
                                const scanFilterBuilder = new android.bluetooth.le.ScanFilter.Builder();
                                if (f.serviceUUID) {
                                    scanFilterBuilder.setServiceUuid(new android.os.ParcelUuid(stringToUuid(f.serviceUUID.toUpperCase())));
                                }
                                if (f.deviceName) {
                                    scanFilterBuilder.setDeviceName(f.deviceName);
                                }
                                if (f.deviceAddress) {
                                    scanFilterBuilder.setDeviceAddress(f.deviceAddress);
                                }
                                if (f.manufacturerData) {
                                    const manufacturerId = new DataView(f.manufacturerData, 0).getUint16(0, true);
                                    scanFilterBuilder.setManufacturerData(manufacturerId, arrayToNativeByteArray(f.manufacturerData));
                                }
                                scanFilters.add(scanFilterBuilder.build());
                            });
                        }

                        // ga hier verder: https://github.com/randdusing/cordova-plugin-bluetoothle/blob/master/src/android/BluetoothLePlugin.java#L775
                        const scanSettings = new android.bluetooth.le.ScanSettings.Builder();
                        scanSettings.setReportDelay(0);

                        const scanMode = ((args.android && args.android.scanMode) || ScanMode.LOW_LATENCY) as ScanMode;
                        scanSettings.setScanMode(androidScanMode(scanMode));

                        // if >= Android23 (Marshmallow)
                        if (android.os.Build.VERSION.SDK_INT >= 23 /* android.os.Build.VERSION_CODES.M */) {
                            const matchMode = ((args.android && args.android.matchMode) || MatchMode.AGGRESSIVE) as MatchMode;
                            scanSettings.setMatchMode(androidMatchMode(matchMode));

                            const matchNum = ((args.android && args.android.matchNum) || MatchNum.MAX_ADVERTISEMENT) as MatchNum;
                            scanSettings.setNumOfMatches(androidMatchNum(matchNum));

                            const callbackType = ((args.android && args.android.callbackType) || CallbackType.ALL_MATCHES) as CallbackType;
                            scanSettings.setCallbackType(androidCallbackType(callbackType));
                        }

                        this.scanCallback.onPeripheralDiscovered = args.onDiscovered;
                        this.adapter.getBluetoothLeScanner().startScan(scanFilters, scanSettings.build(), this.scanCallback);
                        if (Trace.isEnabled()) {
                            CLog(CLogTypes.info, methodName, ' ---- PostLollipop ---- didStart scanning:', JSON.stringify(filters));
                        }
                    } else {
                        return reject(
                            new BluetoothError(BluetoothCommon.msg_not_supported, {
                                method: methodName,
                            })
                        );
                    }

                    this.scanningReferTimer = { resolve };
                    if (args.seconds) {
                        this.scanningReferTimer.timer = setTimeout(() => this.stopCurrentScan(), args.seconds * 1000);
                    } else {
                        resolve();
                    }
                };

                if (args.skipPermissionCheck !== true && !this.locationPermissionGranted()) {
                    if (Trace.isEnabled()) {
                        CLog(CLogTypes.info, methodName, '---- Coarse Location Permission not granted on Android device, will request permission.');
                    }
                    this.requestLocationPermission(onPermissionGranted);
                } else {
                    onPermissionGranted();
                }
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.error, methodName, '---- error:', ex);
                }
                reject(
                    new BluetoothError(ex.message, {
                        stack: ex.stackTrace || ex.stack,
                        arguments: args,
                        nativeException: ex.nativeException,
                        method: methodName,
                    })
                );
            }
        });
    }

    @bluetoothEnabled
    public stopScanning() {
        this.stopCurrentScan();
    }

    @bluetoothEnabled
    @prepareArgs
    public async getDevice(args: DisconnectOptions) {
        const methodName = 'getDevice';
        if (!args.UUID) {
            return Promise.reject(
                new BluetoothError(BluetoothCommon.msg_missing_parameter, {
                    method: methodName,
                    type: BluetoothCommon.UUIDKey,
                    arguments: args,
                })
            );
        }
        const pUUID = args.UUID;
        return this.adapter.getRemoteDevice(pUUID);
    }

    @bluetoothEnabled
    @prepareArgs
    public async connect(args: ConnectOptions) {
        // or macaddress..
        const methodName = 'connect';
        if (!args.UUID) {
            return Promise.reject(
                new BluetoothError(BluetoothCommon.msg_missing_parameter, {
                    method: methodName,
                    type: BluetoothCommon.UUIDKey,
                    arguments: args,
                })
            );
        }
        const pUUID = args.UUID;
        const bluetoothDevice = this.adapter.getRemoteDevice(pUUID);
        if (bluetoothDevice === null) {
            return Promise.reject(
                new BluetoothError(BluetoothCommon.msg_no_peripheral, {
                    method: methodName,
                    arguments: args,
                })
            );
        } else {
            let stateObject = this.connections[pUUID];
            if (!stateObject) {
                // if device was not "scanned" there is no connections data
                stateObject = this.connections[pUUID] = {
                    state: 'disconnected',
                };
            }
            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, methodName, '---- Connecting to peripheral with UUID:', pUUID);
            }
            Object.assign(stateObject, {
                state: 'connecting',
                onConnected: args.onConnected,
                onDisconnected: args.onDisconnected,
                // device: gatt // TODO rename device to gatt?
            });
            await new Promise<void>((resolve, reject) => {
                const clearListeners = () => {
                    this.bluetoothGattCallback.removeSubDelegate(subD);
                    this.removeDisconnectListener(onDisconnect);
                };
                const onError = (err) => {
                    reject(err);
                    clearListeners();
                };
                const onDisconnect = (address) => {
                    if (address === pUUID) {
                        onError(
                            new BluetoothError(BluetoothCommon.msg_peripheral_disconnected, {
                                method: methodName,
                                arguments: args,
                            })
                        );
                    }
                };
                const subD = {
                    onConnectionStateChange: (gatt: android.bluetooth.BluetoothGatt, status: number, newState: number) => {
                        const device = gatt.getDevice();
                        let UUID: string = null;
                        if (device == null) {
                            // happens some time, why ... ?
                        } else {
                            UUID = device.getAddress();
                        }
                        if (Trace.isEnabled()) {
                            CLog(CLogTypes.info, methodName, '---- onConnectionStateChange:', UUID, pUUID, newState, status);
                        }
                        if (UUID === pUUID) {
                            if (newState === android.bluetooth.BluetoothProfile.STATE_CONNECTED && status === GATT_SUCCESS) {
                                resolve();
                            } else {
                                reject();
                            }
                            clearListeners();
                        }
                    },
                };
                this.bluetoothGattCallback.addSubDelegate(subD);
                this.addDisconnectListener(onDisconnect);
                let gatt;

                // if less than Android23(Marshmallow)
                if (getAndroidSDK() < MARSHMALLOW) {
                    gatt = bluetoothDevice.connectGatt(
                        ad.getApplicationContext(), // context
                        false, // autoconnect
                        this.bluetoothGattCallback
                    );
                } else {
                    gatt = bluetoothDevice.connectGatt(
                        ad.getApplicationContext(), // context
                        false, // autoconnect
                        this.bluetoothGattCallback,
                        android.bluetooth.BluetoothDevice.TRANSPORT_LE // 2
                    );
                }
                Object.assign(this.connections[pUUID], {
                    // state: 'connecting',
                    // onConnected: args.onConnected,
                    // onDisconnected: args.onDisconnected,
                    device: gatt, // TODO rename device to gatt?
                });
            });
            let services, mtu;
            if(args.autoDiscoverAll !== false) {
                services = (await this.discoverAll({ peripheralUUID: pUUID }))?.services;
            }
            if (!!args.auto2MegPhy) {
                await this.select2MegPhy({ peripheralUUID: pUUID }) ;
            }
            if (!!args.autoMaxMTU) {
                mtu = await this.requestMtu({ peripheralUUID: pUUID, value: MAX_MTU }) ;
            }
            // get the stateObject again to see if we got disconnected
            stateObject = this.connections[pUUID];
            if (!stateObject) {
                return Promise.reject(
                    new BluetoothError(BluetoothCommon.msg_peripheral_not_connected, {
                        method: methodName,
                        arguments: args,
                    })
                ) as any;
            }
            stateObject.state = 'connected';
            const adv = stateObject.advertismentData;
            const dataToSend = {
                UUID: pUUID, // TODO consider renaming to id (and iOS as well)
                name: bluetoothDevice && bluetoothDevice.getName(),
                state: stateObject.state,
                services,
                mtu,
                nativeDevice: bluetoothDevice,
                localName: adv?.localName,
                manufacturerId: adv?.manufacturerId,
                advertismentData: adv,
            };
            if (stateObject.onConnected) {
                stateObject.onConnected(dataToSend);
                delete stateObject.onConnected;
            }
            this.sendEvent(Bluetooth.device_connected_event, dataToSend);
            return dataToSend;
        }
    }

    @prepareArgs
    public disconnect(args: DisconnectOptions) {
        const methodName = 'disconnect';
        if (!args.UUID) {
            return Promise.reject(
                new BluetoothError(BluetoothCommon.msg_missing_parameter, {
                    method: methodName,
                    type: BluetoothCommon.UUIDKey,
                    arguments: args,
                })
            );
        }
        const pUUID = args.UUID;
        const connection = this.connections[pUUID];
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, methodName, '---- connection:', pUUID);
        }
        if (!connection) {
            return Promise.reject(
                new BluetoothError(BluetoothCommon.msg_peripheral_not_connected, {
                    method: methodName,
                    arguments: args,
                })
            );
        }
        return Promise.resolve().then(() => {
            connection.device.disconnect();
        });
    }

    private addToGatQueue(p: () => Promise<any>) {
        return this.gattQueue.add(p);
    }

    private addToQueue(args: WrapperOptions, runner: (wrapper: WrapperResult) => any) {
        return this.addToGatQueue(() => this._getWrapper(args).then((wrapper) => runner(wrapper)));
    }

    @prepareArgs
    public read(args: ReadOptions) {
        const methodName = 'read';
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, methodName, args);
        }

        return this.addToQueue(
            args,
            (wrapper) =>
                new Promise((resolve, reject) => {
                    if (Trace.isEnabled()) {
                        CLog(CLogTypes.info, `${methodName} ---- peripheralUUID:${args.peripheralUUID} serviceUUID:${args.serviceUUID} characteristicUUID:${args.characteristicUUID}`);
                    }

                    const characteristic = this._findCharacteristicOfType(
                        wrapper.bluetoothGattService,
                        stringToUuid(args.characteristicUUID),
                        android.bluetooth.BluetoothGattCharacteristic.PROPERTY_READ
                    );

                    if (!characteristic) {
                        return reject(
                            new BluetoothError(BluetoothCommon.msg_no_characteristic, {
                                method: methodName,
                                arguments: args,
                            })
                        );
                    }
                    let timeoutTimer;
                    if (args.timeout > 0) {
                        timeoutTimer = setTimeout(() => {
                            // we need to try catch because the simple fact of creating a new Error actually throws.
                            // so we will get an uncaughtException
                            try {
                                reject(new Error('timeout'));
                            } catch {}
                        }, args.timeout);
                    }
                    const pUUID = args.peripheralUUID;
                    this.attachSubDelegate(
                        {methodName, args, resolve, reject},
                        (clearListeners, onError) => ({
                            onCharacteristicRead: (gatt: android.bluetooth.BluetoothGatt, characteristic: android.bluetooth.BluetoothGattCharacteristic, status: number) => {
                                const device = gatt.getDevice();
                                let UUID: string = null;
                                if (device == null) {
                                    // happens some time, why ... ?
                                } else {
                                    UUID = device.getAddress();
                                }
                                const cUUID = uuidToString(characteristic.getUuid());
                                const sUUID = uuidToString(characteristic.getService().getUuid());
                                if (Trace.isEnabled()) {
                                    CLog(
                                        CLogTypes.info,
                                        `${methodName} ---- got result peripheralUUID:${args.peripheralUUID} serviceUUID:${args.serviceUUID} characteristicUUID:${args.characteristicUUID} status:${status}`
                                    );
                                }
                                if (UUID === pUUID && cUUID === args.characteristicUUID && sUUID === args.serviceUUID) {
                                    timeoutTimer && clearTimeout(timeoutTimer);
                                    if (status === GATT_SUCCESS) {
                                        const value = characteristic.getValue();
                                        resolve({
                                            android: value,
                                            value: byteArrayToBuffer(value),
                                            peripheralUUID: pUUID,
                                            serviceUUID: sUUID,
                                            characteristicUUID: cUUID,
                                        });
                                        clearListeners();
                                    } else {
                                        onError(
                                            new BluetoothError(BluetoothCommon.msg_error_function_call, {
                                                method: 'readCharacteristic',
                                                status,
                                                arguments: args,
                                            })
                                        );
                                    }
                                }
                            },
                        }),
                        (onError) => {
                            if (!wrapper.gatt.readCharacteristic(characteristic)) {
                                if (Trace.isEnabled()) {
                                    CLog(
                                        CLogTypes.error,
                                        `${methodName} ---- error: readCharacteristic returned false peripheralUUID:${args.peripheralUUID} serviceUUID:${args.serviceUUID} characteristicUUID:${args.characteristicUUID}`
                                    );
                                }
                                timeoutTimer && clearTimeout(timeoutTimer);

                                onError(
                                    new BluetoothError(BluetoothCommon.msg_error_function_call, {
                                        method: 'readCharacteristic',
                                        arguments: args,
                                    })
                                );
                            }
                        },
                    );
                })
        );
    }

    @prepareArgs
    public requestMtu(args: MtuOptions) {
        const methodName = 'requestMtu';
        if (!args.value) {
            return Promise.reject(
                new BluetoothError(BluetoothCommon.msg_missing_parameter, {
                    method: methodName,
                    type: 'value',
                    arguments: args,
                })
            );
        }
        if (!args.peripheralUUID) {
            return Promise.reject(
                new BluetoothError(BluetoothCommon.msg_missing_parameter, {
                    method: methodName,
                    type: BluetoothCommon.peripheralUUIDKey,
                    arguments: args,
                })
            );
        }
        const pUUID = args.peripheralUUID;
        const stateObject = this.connections[pUUID];
        if (!stateObject) {
            return Promise.reject(
                new BluetoothError(BluetoothCommon.msg_peripheral_not_connected, {
                    method: methodName,
                    arguments: args,
                })
            );
        }

        const gatt = stateObject.device;

        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, methodName, args);
        }
        return this.addToGatQueue(
            () =>
                new Promise((resolve, reject) => {
                    if (Trace.isEnabled()) {
                        CLog(CLogTypes.info, methodName, '---- peripheral:', pUUID);
                    }
                    this.attachSubDelegate(
                        {methodName, args, resolve, reject},
                        (clearListeners, onError) => ({
                            onMtuChanged: (gatt: android.bluetooth.BluetoothGatt, mtu: number, status: number) => {
                                const device = gatt.getDevice();
                                let UUID: string = null;
                                if (device == null) {
                                    // happens some time, why ... ?
                                } else {
                                    UUID = device.getAddress();
                                }
                                if (UUID === pUUID) {
                                    if (status === GATT_SUCCESS) {
                                        resolve(mtu);
                                        clearListeners();
                                    } else {
                                        const error = new BluetoothError(BluetoothCommon.msg_error_function_call, {
                                            method: methodName,
                                            arguments: args,
                                            status,
                                        });
                                        onError(error);
                                    }
                                }
                            },
                        }),
                        (onError) => {
                            if (!gatt.requestMtu(args.value)) {
                                onError(
                                    new BluetoothError(BluetoothCommon.msg_error_function_call, {
                                        method: methodName,
                                        arguments: args,
                                    })
                                );
                            }
                        },
                    );
                })
        );
    }

    @prepareArgs
    public write(args: WriteOptions) {
        const methodName = 'write';
        if (!args.value) {
            return Promise.reject({ msg: BluetoothCommon.msg_missing_parameter, type: 'value', method: methodName });
        }
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, methodName, args);
        }
        return this.addToQueue(
            args,
            (wrapper) =>
                new Promise<void>((resolve, reject) => {
                    if (Trace.isEnabled()) {
                        CLog(CLogTypes.info, `actual ${methodName} ---- peripheralUUID:${args.peripheralUUID} serviceUUID:${args.serviceUUID} characteristicUUID:${args.characteristicUUID} `);
                    }
                    const characteristic = this._findCharacteristicOfType(
                        wrapper.bluetoothGattService,
                        stringToUuid(args.characteristicUUID),
                        android.bluetooth.BluetoothGattCharacteristic.PROPERTY_WRITE
                    );

                    if (!characteristic) {
                        return reject(
                            new BluetoothError(BluetoothCommon.msg_no_characteristic, {
                                method: methodName,
                                arguments: args,
                            })
                        );
                    }

                    const val = valueToByteArray(args.value, args.encoding);

                    if (val === null) {
                        return reject(
                            new BluetoothError(BluetoothCommon.msg_invalid_value, {
                                method: methodName,
                                arguments: args,
                            })
                        );
                    }

                    const pUUID = args.peripheralUUID;
                    let timeoutTimer;
                    if (args.timeout > 0) {
                        timeoutTimer = setTimeout(() => {
                            // we need to try catch because the simple fact of creating a new Error actually throws.
                            // so we will get an uncaughtException
                            try {
                                reject(new Error('timeout'));
                            } catch {}
                        }, args.timeout);
                    }
                    this.attachSubDelegate(
                        {methodName, args, resolve, reject},
                        (clearListeners, onError) => ({
                            onCharacteristicWrite: (gatt: android.bluetooth.BluetoothGatt, characteristic: android.bluetooth.BluetoothGattCharacteristic, status: number) => {
                                const device = gatt.getDevice();
                                let UUID: string = null;
                                if (device == null) {
                                    // happens some time, why ... ?
                                } else {
                                    UUID = device.getAddress();
                                }
                                const cUUID = uuidToString(characteristic.getUuid());
                                const sUUID = uuidToString(characteristic.getService().getUuid());
                                if (UUID === pUUID && cUUID === args.characteristicUUID && sUUID === args.serviceUUID) {
                                    timeoutTimer && clearTimeout(timeoutTimer);
                                    if (status === GATT_SUCCESS) {
                                        resolve();
                                        clearListeners();
                                    } else {
                                        onError(new BluetoothError(BluetoothCommon.msg_error_function_call, { method: methodName, status, args }));
                                    }
                                }
                            },
                        }), (onError) => {
                            characteristic.setValue(val);
                            characteristic.setWriteType(android.bluetooth.BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT);
                            if (wrapper.gatt.writeCharacteristic(characteristic)) {
                                if (Trace.isEnabled()) {
                                    CLog(CLogTypes.info, methodName, '---- writeCharacteristic success:', JSON.stringify(printValueToString(val)));
                                }
                            } else {
                                if (Trace.isEnabled()) {
                                    CLog(CLogTypes.error, methodName, '---- error: writeCharacteristic returned false');
                                }
                                timeoutTimer && clearTimeout(timeoutTimer);
                                onError(
                                    new BluetoothError(BluetoothCommon.msg_error_function_call, {
                                        method: 'writeCharacteristic',
                                        arguments: args,
                                    })
                                );
                            }
                        },
                    );
                })
        );
    }

    @prepareArgs
    public writeWithoutResponse(args: WriteOptions) {
        const methodName = 'writeWithoutResponse';
        if (!args.value) {
            return Promise.reject({ msg: BluetoothCommon.msg_missing_parameter, type: 'value', method: methodName });
        }
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, methodName, args);
        }
        return this.addToQueue(
            args,
            (wrapper) =>
                new Promise<void>((resolve, reject) => {
                    if (Trace.isEnabled()) {
                        CLog(CLogTypes.info, `actual ${methodName} ---- peripheralUUID:${args.peripheralUUID} serviceUUID:${args.serviceUUID} characteristicUUID:${args.characteristicUUID}`);
                    }
                    const characteristic = this._findCharacteristicOfType(
                        wrapper.bluetoothGattService,
                        stringToUuid(args.characteristicUUID),
                        android.bluetooth.BluetoothGattCharacteristic.PROPERTY_WRITE
                    );
                    if (!characteristic) {
                        return reject(
                            new BluetoothError(BluetoothCommon.msg_no_characteristic, {
                                method: methodName,
                                arguments: args,
                                status,
                            })
                        );
                    }

                    const val = valueToByteArray(args.value, args.encoding);

                    if (!val) {
                        return reject(
                            new BluetoothError(BluetoothCommon.msg_invalid_value, {
                                method: methodName,
                                arguments: args,
                            })
                        );
                    }

                    const pUUID = args.peripheralUUID;
                    this.attachSubDelegate(
                        {methodName, args, resolve, reject},
                        (clearListeners, onError) => ({
                            onCharacteristicWrite: (gatt: android.bluetooth.BluetoothGatt, characteristic: android.bluetooth.BluetoothGattCharacteristic, status: number) => {
                                const device = gatt.getDevice();
                                let UUID: string = null;
                                if (device == null) {
                                    // happens some time, why ... ?
                                } else {
                                    UUID = device.getAddress();
                                }

                                const cUUID = uuidToString(characteristic.getUuid());
                                const sUUID = uuidToString(characteristic.getService().getUuid());
                                if (Trace.isEnabled()) {
                                    CLog(
                                        CLogTypes.info,
                                        `${methodName} ---- onCharacteristicWrite peripheralUUID:${args.peripheralUUID} serviceUUID:${args.serviceUUID} characteristicUUID:${args.characteristicUUID} UUID:${UUID} pUUID:${pUUID} cUUID:${cUUID} sUUID:${sUUID} status:${status}`
                                    );
                                }
                                if (UUID === pUUID && cUUID === args.characteristicUUID && sUUID === args.serviceUUID) {
                                    if (status === GATT_SUCCESS) {
                                        // sometimes the callback is received too fast and somehow it blocks the promise.
                                        resolve();
                                        clearListeners();
                                    } else {
                                        onError(
                                            new BluetoothError(BluetoothCommon.msg_error_function_call, {
                                                method: methodName,
                                                arguments: args,
                                                status,
                                            })
                                        );
                                    }
                                }
                            },
                        }),
                        (onError) => {
                            // using the WRITE_TYPE_NO_RESPONSE, we will get the onCharacteristicWrite callback as soon as the stack is ready and has space to accept a new request.
                            characteristic.setValue(val);
                            characteristic.setWriteType(android.bluetooth.BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE);
                            if (wrapper.gatt.writeCharacteristic(characteristic)) {
                                if (Trace.isEnabled()) {
                                    CLog(CLogTypes.info, methodName, '---- writeCharacteristic success:', JSON.stringify(printValueToString(val)));
                                }
                            } else {
                                if (Trace.isEnabled()) {
                                    CLog(CLogTypes.error, methodName, '---- error: writeCharacteristic returned false');
                                }
                                onError(
                                    new BluetoothError(BluetoothCommon.msg_error_function_call, {
                                        method: methodName,
                                        arguments: args,
                                    })
                                );
                            }
                        },
                    );
                })
        );
    }
    @prepareArgs
    public startNotifying(args: StartNotifyingOptions) {
        const methodName = 'startNotifying';
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, methodName, args);
        }
        return this.addToQueue(
            args,
            (wrapper) =>
                new Promise<void>((resolve, reject) => {
                    const gatt = wrapper.gatt;
                    const bluetoothGattService = wrapper.bluetoothGattService;
                    const characteristicUUID = stringToUuid(args.characteristicUUID);

                    const characteristic = this._findNotifyCharacteristic(bluetoothGattService, characteristicUUID);
                    if (Trace.isEnabled()) {
                        CLog(CLogTypes.info, `${methodName} ---- peripheralUUID:${args.peripheralUUID} serviceUUID:${args.serviceUUID} characteristicUUID:${args.characteristicUUID}`);
                    }
                    if (!characteristic) {
                        return reject(
                            new BluetoothError(BluetoothCommon.msg_no_characteristic, {
                                method: methodName,
                                arguments: args,
                            })
                        );
                    }

                    if (!gatt.setCharacteristicNotification(characteristic, true)) {
                        return reject(
                            new BluetoothError(BluetoothCommon.msg_error_function_call, {
                                method: 'setCharacteristicNotification',
                                arguments: args,
                            })
                        );
                    }

                    const clientCharacteristicConfigId = stringToUuid('2902');
                    let bluetoothGattDescriptor = characteristic.getDescriptor(clientCharacteristicConfigId) as android.bluetooth.BluetoothGattDescriptor;
                    if (!bluetoothGattDescriptor) {
                        bluetoothGattDescriptor = new android.bluetooth.BluetoothGattDescriptor(clientCharacteristicConfigId, android.bluetooth.BluetoothGattDescriptor.PERMISSION_WRITE);
                        bluetoothGattDescriptor.setValue(android.bluetooth.BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE);
                        characteristic.addDescriptor(bluetoothGattDescriptor);
                        if (Trace.isEnabled()) {
                            CLog(CLogTypes.info, methodName, '---- descriptor:', bluetoothGattDescriptor);
                        }
                        // Any creation error will trigger the global catch. Ok.
                    }

                    // prefer notify over indicate
                    if ((characteristic.getProperties() & android.bluetooth.BluetoothGattCharacteristic.PROPERTY_NOTIFY) !== 0) {
                        bluetoothGattDescriptor.setValue(android.bluetooth.BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE);
                    } else if ((characteristic.getProperties() & android.bluetooth.BluetoothGattCharacteristic.PROPERTY_INDICATE) !== 0) {
                        bluetoothGattDescriptor.setValue(android.bluetooth.BluetoothGattDescriptor.ENABLE_INDICATION_VALUE);
                    } else {
                        return reject(
                            new BluetoothError(BluetoothCommon.msg_characteristic_cant_notify, {
                                method: methodName,
                                arguments: args,
                            })
                        );
                    }

                    const pUUID = args.peripheralUUID;
                    const cUUID = uuidToString(characteristic.getUuid());
                    const sUUID = uuidToString(characteristic.getService().getUuid());

                    const stateObject = this.connections[pUUID];
                    stateObject.onNotifyCallbacks = stateObject.onNotifyCallbacks || {};
                    const key = sUUID + '/' + cUUID;
                    const onNotify = args.onNotify;
                    stateObject.onNotifyCallbacks[key] = function (result) {
                        // CLog(
                        //     CLogTypes.warning,
                        //     `onNotifyCallback ---- UUID: ${UUID}, pUUID: ${pUUID}, cUUID: ${cUUID}, args.characteristicUUID: ${
                        //         args.characteristicUUID
                        //     }, sUUID: ${sUUID}, args.serviceUUID: ${args.serviceUUID}, result: ${result}`
                        // );
                        onNotify(result);
                    };

                    this.attachSubDelegate(
                        {methodName, args, resolve, reject},
                        (clearListeners, onError) => ({
                            onDescriptorWrite: (gatt: android.bluetooth.BluetoothGatt, descriptor: android.bluetooth.BluetoothGattDescriptor, status: number) => {
                                const device = gatt.getDevice();
                                let UUID: string = null;
                                if (device == null) {
                                    // happens some time, why ... ?
                                } else {
                                    UUID = device.getAddress();
                                }

                                if (UUID === pUUID && cUUID === args.characteristicUUID && sUUID === args.serviceUUID) {
                                    if (status === GATT_SUCCESS) {
                                        resolve();
                                        clearListeners();
                                    } else {
                                        delete stateObject.onNotifyCallbacks[key];
                                        onError(
                                            new BluetoothError(BluetoothCommon.msg_error_function_call, {
                                                arguments: args,
                                                method: 'writeDescriptor',
                                                status,
                                            })
                                        );
                                    }
                                } else {
                                    delete stateObject.onNotifyCallbacks[key];
                                }
                            },
                        }),
                        (onError) => {
                            if (!gatt.writeDescriptor(bluetoothGattDescriptor)) {
                                onError(
                                    new BluetoothError(BluetoothCommon.msg_error_function_call, {
                                        method: 'writeDescriptor',
                                        arguments: args,
                                    })
                                );
                            }
                        },
                    );
                })
        );
    }

    @prepareArgs
    public stopNotifying(args: StopNotifyingOptions) {
        const methodName = 'stopNotifying';
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, methodName, args);
        }
        return this.addToQueue(
            args,
            (wrapper) =>
                new Promise<void>((resolve, reject) => {
                    const gatt = wrapper.gatt;
                    const gattService = wrapper.bluetoothGattService;
                    const characteristicUUID = stringToUuid(args.characteristicUUID);

                    const characteristic = this._findNotifyCharacteristic(gattService, characteristicUUID);
                    if (Trace.isEnabled()) {
                        CLog(CLogTypes.info, `${methodName} ---- peripheralUUID:${args.peripheralUUID} serviceUUID:${args.serviceUUID} characteristicUUID:${args.characteristicUUID}`);
                    }

                    if (!characteristic) {
                        return reject(
                            new BluetoothError(BluetoothCommon.msg_no_characteristic, {
                                method: methodName,
                                arguments: args,
                            })
                        );
                    }

                    const stateObject = this.connections[args.peripheralUUID];
                    if (stateObject && stateObject.onNotifyCallbacks) {
                        const key = args.serviceUUID + '/' + args.characteristicUUID;
                        delete stateObject.onNotifyCallbacks[key];
                    }
                    const clearListeners = () => {
                        this.removeDisconnectListener(onDisconnect);
                    };
                    const onError = (err) => {
                        reject(err);
                        clearListeners();
                    };
                    const onDisconnect = (address) => {
                        if (address === args.peripheralUUID) {
                            onError(
                                new BluetoothError(BluetoothCommon.msg_peripheral_disconnected, {
                                    method: methodName,
                                    arguments: args,
                                })
                            );
                        }
                    };
                    this.addDisconnectListener(onDisconnect);
                    try {
                        if (gatt.setCharacteristicNotification(characteristic, false)) {
                            resolve();
                            clearListeners();
                        } else {
                            onError(
                                new BluetoothError(BluetoothCommon.msg_error_function_call, {
                                    method: 'setCharacteristicNotification',
                                    arguments: args,
                                })
                            );
                        }
                    } catch (ex) {
                        if (Trace.isEnabled()) {
                            CLog(CLogTypes.error, methodName, ex);
                        }
                        onError(
                            new BluetoothError(ex.message, {
                                stack: ex.stackTrace || ex.stack,
                                nativeException: ex.nativeException,
                                arguments: args,
                                method: methodName,
                            })
                        );
                    }
                })
        );
    }

    private refreshDeviceCache( gatt: android.bluetooth.BluetoothGatt){
        try {
            const localMethod = gatt.getClass().getMethod('refresh', Array.create( java.lang.Class, 0));
            if (localMethod != null) {
                return localMethod.invoke(gatt, Array.create( java.lang.Object, 0));
            }
        }
        catch (ex) {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.error, 'refreshDeviceCache', '---- error:', ex);
            }
        }
        return false;
    }

    @prepareArgs
    public discoverServices(args: DiscoverServicesOptions): Promise<{ services: Service[] }> {
        const methodName = 'discoverServices';
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, methodName, args);
        }
        if (!args.peripheralUUID) {
            return Promise.reject({ msg: BluetoothCommon.msg_missing_parameter, type: BluetoothCommon.peripheralUUIDKey });
        }
        const pUUID = args.peripheralUUID;
        const stateObject = this.connections[pUUID];
        if (!stateObject) {
            return Promise.reject(
                new BluetoothError(BluetoothCommon.msg_peripheral_not_connected, {
                    method: methodName,
                    arguments: args,
                })
            );
        }

        const gatt = stateObject.device;
        if (args.clearCache === true) {
            this.refreshDeviceCache(gatt);
        }

        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, methodName, pUUID, stateObject);
        }
        return this.addToGatQueue(
            () =>
                new Promise((resolve, reject) => {
                    if (Trace.isEnabled()) {
                        CLog(CLogTypes.info, methodName, '---- peripheral:', pUUID);
                    }
                    this.attachSubDelegate(
                        {methodName, args, resolve, reject},
                        (clearListeners, onError) => ({
                            onServicesDiscovered: (gatt: android.bluetooth.BluetoothGatt, status: number) => {
                                const device = gatt.getDevice();
                                let UUID: string = null;
                                if (device == null) {
                                    // happens some time, why ... ?
                                } else {
                                    UUID = device.getAddress();
                                }
                                if (UUID === pUUID) {
                                    if (status === GATT_SUCCESS) {
                                        resolve(getGattDeviceServiceInfo(gatt));
                                        clearListeners();
                                    } else {
                                        onError(
                                            new BluetoothError(BluetoothCommon.msg_error_function_call, {
                                                method: methodName,
                                                status,
                                                arguments: args,
                                            })
                                        );
                                    }
                                }
                            },
                        }),
                        (onError) => {
                            if (!gatt.discoverServices()) {
                                reject(
                                    new BluetoothError(BluetoothCommon.msg_error_function_call, {
                                        method: methodName,
                                        arguments: args,
                                    })
                                );
                            }
                        },
                    );
                })
        );
    }

    @prepareArgs
    public discoverCharacteristics(args: DiscoverCharacteristicsOptions) {
        const methodName = arguments.callee.name;
        if (!args.peripheralUUID) {
            return Promise.reject(
                new BluetoothError(BluetoothCommon.msg_missing_parameter, {
                    method: methodName,
                    arguments: args,
                    type: BluetoothCommon.peripheralUUIDKey,
                })
            );
        }
        if (!args.serviceUUID) {
            return Promise.reject(
                new BluetoothError(BluetoothCommon.msg_missing_parameter, {
                    method: methodName,
                    arguments: args,
                    type: BluetoothCommon.serviceUUIDKey,
                })
            );
        }
        const pUUID = args.peripheralUUID;
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, methodName, '---- peripheral:', pUUID);
        }
        const stateObject = this.connections[pUUID];
        if (!stateObject) {
            return Promise.reject(
                new BluetoothError(BluetoothCommon.msg_peripheral_not_connected, {
                    method: methodName,
                    arguments: args,
                })
            );
        }

        const gatt = stateObject.device;
        const serviceUUID = stringToUuid(args.serviceUUID);
        const bluetoothGattService = gatt.getService(serviceUUID);
        if (bluetoothGattService) {
            return Promise.resolve();
        } else {
            return Promise.reject(
                new BluetoothError(BluetoothCommon.msg_no_service, {
                    method: methodName,
                    arguments: args,
                })
            );
        }
    }

    public discoverAll(args: DiscoverOptions) {
        return this.discoverServices(args);
    }

    private disconnectListeners: DisconnectListener[] = [];

    public addDisconnectListener(delegate: DisconnectListener) {
        const index = this.disconnectListeners.indexOf(delegate);
        if (index === -1) {
            this.disconnectListeners.push(delegate);
        }
    }

    public removeDisconnectListener(delegate: DisconnectListener) {
        const index = this.disconnectListeners.indexOf(delegate);
        if (index !== -1) {
            this.disconnectListeners.splice(index, 1);
        }
    }
    public gattDisconnect(gatt: android.bluetooth.BluetoothGatt) {
        // gatt close wont trigger onConnectionStateChange
        if (gatt !== null) {
            const device = gatt.getDevice();
            const address = device.getAddress();

            // Close this Bluetooth GATT client.
            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, 'gattDisconnect ---- Closing GATT client', address, device, this.disconnectListeners.length);
            }
            if (this.disconnectListeners.length > 0) {
                const error = new BluetoothError(BluetoothCommon.msg_peripheral_disconnected, {});
                this.disconnectListeners = this.disconnectListeners.filter((d) => d(address));
            }

            gatt.close();

            this.sendEvent(Bluetooth.device_disconnected_event, {
                UUID: address,
                name: device.getName(),
            });

            const stateObject = this.connections[address];
            if (stateObject && stateObject.onDisconnected) {
                stateObject.onDisconnected({
                    UUID: address,
                    name: device.getName(),
                });
            }
            // delete this.connections[address];
        }
    }

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

    private select2MegPhy(args: { peripheralUUID: string }): Promise<void> {
        if (getAndroidSDK() < OREO || !this.adapter.isLe2MPhySupported()) {
            return Promise.resolve();
        }

        const methodName = 'select2MegPhy';
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, methodName, args);
        }
        if (!args.peripheralUUID) {
            return Promise.reject({ msg: BluetoothCommon.msg_missing_parameter, type: BluetoothCommon.peripheralUUIDKey });
        }
        const pUUID = args.peripheralUUID;
        const stateObject = this.connections[pUUID];
        if (!stateObject) {
            return Promise.reject(
                new BluetoothError(BluetoothCommon.msg_peripheral_not_connected, {
                    method: methodName,
                    arguments: args,
                })
            );
        }

        const gatt = stateObject.device;

        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, methodName, pUUID, stateObject);
        }
        return this.addToGatQueue(
            () =>
                new Promise<void>((resolve, reject) => {
                    if (Trace.isEnabled()) {
                        CLog(CLogTypes.info, methodName, '---- peripheral:', pUUID);
                    }
                    this.attachSubDelegate(
                        {methodName, args, resolve, reject},
                        (clearListeners) => ({
                            onPhyUpdate: (gatt: android.bluetooth.BluetoothGatt) => {
                                const device = gatt.getDevice();
                                let UUID: string = null;
                                if (device == null) {
                                    // happens some time, why ... ?
                                } else {
                                    UUID = device.getAddress();
                                }
                                if (UUID === pUUID) {
                                    resolve();
                                    clearListeners();
                                }
                            },
                        }),
                        () => {
                            gatt.setPreferredPhy(
                                android.bluetooth.BluetoothDevice.PHY_LE_2M_MASK,
                                android.bluetooth.BluetoothDevice.PHY_LE_2M_MASK,
                                android.bluetooth.BluetoothDevice.PHY_OPTION_NO_PREFERRED
                            );
                        }
                    );
                })
        );
    }

    private attachSubDelegate(
        ctx: {methodName: string; args: any; resolve; reject},
        createSubDelegate: (clearListeners: () => void, onError: (err) => void) => SubBluetoothGattCallback,
        executeTask: (onError: (err) => void) => void,
    ): void {
        const clearListeners = () => {
            this.bluetoothGattCallback.removeSubDelegate(subD);
            this.removeDisconnectListener(onDisconnect);
        };
        const onError = (err) => {
            ctx.reject(err);
            clearListeners();
        };
        const onDisconnect = (address) => {
            if (address === ctx.args.peripheralUUID) {
                onError(
                    new BluetoothError(BluetoothCommon.msg_peripheral_disconnected, {
                        method: ctx.methodName,
                        arguments: ctx.args,
                    })
                );
            }
        };
        const subD = createSubDelegate(clearListeners, onError);
        this.bluetoothGattCallback.addSubDelegate(subD);
        this.addDisconnectListener(onDisconnect);

        try {
            executeTask(onError);
        } catch (ex) {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.error, ctx.methodName, '---- error:', ex);
            }
            onError(
                new BluetoothError(ex.message, {
                    stack: ex.stackTrace || ex.stack,
                    nativeException: ex.nativeException,
                    arguments: ctx.args,
                    method: ctx.methodName,
                })
            );
        }
    }

    // This guards against peripherals reusing char UUID's.
    private _findCharacteristicOfType(bluetoothGattService: android.bluetooth.BluetoothGattService, characteristicUUID, charType) {
        // Returns a list of characteristics included in this service.
        const characteristics = bluetoothGattService.getCharacteristics();
        for (let i = 0; i < characteristics.size(); i++) {
            const c = characteristics.get(i) as globalAndroid.bluetooth.BluetoothGattCharacteristic;
            if ((c.getProperties() & charType) !== 0 && characteristicUUID.equals(c.getUuid())) {
                return c;
            }
        }
        // As a last resort, try and find ANY characteristic with this UUID, even if it doesn't have the correct properties
        return bluetoothGattService.getCharacteristic(characteristicUUID);
    }
    @bluetoothEnabled
    private _getWrapper(args: WrapperOptions) {
        // prepareArgs should be called before hand
        if (!args.peripheralUUID) {
            return Promise.reject(
                new BluetoothError(BluetoothCommon.msg_missing_parameter, {
                    type: BluetoothCommon.peripheralUUIDKey,
                    arguments: args,
                })
            );
        }
        if (!args.serviceUUID) {
            return Promise.reject(
                new BluetoothError(BluetoothCommon.msg_missing_parameter, {
                    type: BluetoothCommon.serviceUUIDKey,
                    arguments: args,
                })
            );
        }
        if (!args.characteristicUUID) {
            return Promise.reject(
                new BluetoothError(BluetoothCommon.msg_missing_parameter, {
                    type: BluetoothCommon.characteristicUUIDKey,
                    arguments: args,
                })
            );
        }

        const serviceUUID = stringToUuid(args.serviceUUID);

        const stateObject = this.connections[args.peripheralUUID];
        if (!stateObject) {
            return Promise.reject(
                new BluetoothError(BluetoothCommon.msg_peripheral_not_connected, {
                    arguments: args,
                })
            );
        }

        const gatt = stateObject.device;
        const bluetoothGattService = gatt.getService(serviceUUID);

        if (!bluetoothGattService) {
            return Promise.reject(
                new BluetoothError(BluetoothCommon.msg_no_service, {
                    arguments: args,
                })
            );
        }

        // with that all being checked, let's return a wrapper object containing all the stuff we found here
        return Promise.resolve({
            gatt,
            bluetoothGattService,
        } as WrapperResult);
    }

    private _isEnabled() {
        const adapter = this.adapter;
        return adapter && adapter.isEnabled();
    }

    private _getContext() {
        //noinspection JSUnresolvedVariable,JSUnresolvedFunction
        const ctx = java.lang.Class.forName('android.app.AppGlobals').getMethod('getInitialApplication', null).invoke(null, null);
        if (ctx) {
            return ctx;
        }

        //noinspection JSUnresolvedVariable,JSUnresolvedFunction
        return java.lang.Class.forName('android.app.ActivityThread').getMethod('currentApplication', null).invoke(null, null);
    }

    private _getActivity() {
        const activity = andApp.foregroundActivity || andApp.startActivity;
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
