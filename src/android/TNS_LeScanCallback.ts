import { Bluetooth, byteArrayToBuffer, uuidToString } from '../bluetooth.android';
import { CLog, CLogTypes } from '../bluetooth.common';
import { Peripheral } from '../bluetooth';

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
    const msb =
        getBASE_UUID()
            .getUuid()
            .getMostSignificantBits() +
        (shortUuid << 32);
    const lsb = getBASE_UUID()
        .getUuid()
        .getLeastSignificantBits();
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

// Helper method to extract bytes from byte array.
function extractBytes(scanRecord, start: number, length: number) {
    // const  bytes = new byte[length];
    // System.arraycopy(scanRecord, start, bytes, 0, length);
    return java.util.Arrays.copyOfRange(scanRecord, start, start + length);
}

export class ScanRecord {
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
        private serviceUuids: Array<native.Array<number>>,
        private manufacturerData: android.util.SparseArray<any[]>,
        private serviceData: { [k: string]: native.Array<number> },
        private advertiseFlags: number,
        private txPowerLevel: number,
        private localName: string,
        private bytes: native.Array<number>
    ) {}
}

function parseFromBytes(scanRecord: number[]) {
    if (scanRecord == null) {
        return null;
    }

    let currentPos = 0;
    let advertiseFlag = -1;
    let serviceUuids = [];
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
 * Callback interface used to deliver LE scan results.
 * https://developer.android.com/reference/android/bluetooth/BluetoothAdapter.LeScanCallback.html
 */
@JavaProxy('com.nativescript.TNS_LeScanCallback')
// tslint:disable-next-line:class-name
export class TNS_LeScanCallback extends android.bluetooth.BluetoothAdapter.LeScanCallback {
    private owner: WeakRef<Bluetooth>;
    onPeripheralDiscovered: (data: Peripheral) => void;

    constructor() {
        super();
        /**
         * Callback reporting an LE device found during a device scan initiated by the startLeScan(BluetoothAdapter.LeScanCallback) function.
         * @param device [android.bluetooth.BluetoothDevice] - Identifies the remote device
         * @param rssi [number] - The RSSI value for the remote device as reported by the Bluetooth hardware. 0 if no RSSI value is available.
         * @param scanRecord [byte[]] - The content of the advertisement record offered by the remote device.
         */
        return global.__native(this);
    }

    onLeScan(device: android.bluetooth.BluetoothDevice, rssi: number, data: number[]) {
        CLog(CLogTypes.info, `TNS_LeScanCallback.onLeScan ---- device: ${device}, rssi: ${rssi}, scanRecord: ${data}`);

        let stateObject = this.owner.get().connections[device.getAddress()];
        if (!stateObject) {
            stateObject = this.owner.get().connections[device.getAddress()] = {
                state: 'disconnected'
            };
            const scanRecord = parseFromBytes(data);
            const advertismentData = new ScanAdvertisment(scanRecord);

            const payload = {
                type: 'scanResult', // TODO or use different callback functions?
                UUID: device.getAddress(), // TODO consider renaming to id (and iOS as well)
                name: device.getName(),
                localName: advertismentData.localName,
                RSSI: rssi,
                state: 'disconnected',
                advertismentData,
                manufacturerId: advertismentData.manufacturerId
            };
            CLog(CLogTypes.info, `TNS_LeScanCallback.onLeScan ---- payload: ${JSON.stringify(payload)}`);
            this.onPeripheralDiscovered && this.onPeripheralDiscovered(payload);
            this.owner.get().sendEvent(Bluetooth.device_discovered_event, payload);
        }
    }

    onInit(owner: WeakRef<Bluetooth>) {
        this.owner = owner;
        CLog(CLogTypes.info, `TNS_LeScanCallback.onInit ---- this.owner: ${this.owner}`);
    }
}

export class ScanAdvertisment {
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
    get uuids() {
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
