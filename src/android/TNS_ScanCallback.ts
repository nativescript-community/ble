import { Bluetooth, byteArrayToBuffer, uuidToString } from '../bluetooth.android';
import { CLog, CLogTypes } from '../bluetooth.common';
import { Peripheral } from '../bluetooth';

/**
 * Bluetooth LE scan callbacks. Scan results are reported using these callbacks.
 * https://developer.android.com/reference/android/bluetooth/le/ScanCallback.html
 */
@JavaProxy('com.nativescript.TNS_ScanCallback')
// tslint:disable-next-line:class-name
export class TNS_ScanCallback extends android.bluetooth.le.ScanCallback {
    private owner: WeakRef<Bluetooth>;
    onPeripheralDiscovered: (data: Peripheral) => void;

    constructor() {
        super();
        return global.__native(this);
    }

    onInit(owner: WeakRef<Bluetooth>) {
        this.owner = owner;
        CLog(CLogTypes.info, `TNS_ScanCallback.onInit ---- this.owner: ${this.owner}`);
    }

    /**
     * Callback when batch results are delivered.
     * @param results [List<android.bluetooth.le.ScanResult>] - List of scan results that are previously scanned.
     */
    onBatchScanResults(results) {
        CLog(CLogTypes.info, `TNS_ScanCallback.onBatchScanResults ---- results: ${results}`);
    }

    /**
     * Callback when scan could not be started.
     * @param errorCode [number] - Error code (one of SCAN_FAILED_*) for scan failure.
     */
    onScanFailed(errorCode: number) {
        CLog(CLogTypes.info, `TNS_ScanCallback.onScanFailed ---- errorCode: ${errorCode}`);
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
        CLog(CLogTypes.info, `TNS_ScanCallback.onScanFailed errorMessage: ${errorMessage}`);
    }

    /**
     * Callback when a BLE advertisement has been found.
     * @param callbackType [number] - Determines how this callback was triggered. Could be one of CALLBACK_TYPE_ALL_MATCHES, CALLBACK_TYPE_FIRST_MATCH or CALLBACK_TYPE_MATCH_LOST
     * @param result  [android.bluetooth.le.ScanResult] - A Bluetooth LE scan result.
     */
    onScanResult(callbackType: number, result: android.bluetooth.le.ScanResult) {
        CLog(CLogTypes.info, `TNS_ScanCallback.onScanResult ---- callbackType: ${callbackType}, result: ${result}`);
        let stateObject = this.owner.get().connections[result.getDevice().getAddress()];
        if (!stateObject) {
            stateObject = this.owner.get().connections[result.getDevice().getAddress()] = {
                state: 'disconnected'
            };
        }
        const advertismentData = new ScanAdvertisment(result.getScanRecord());

        const payload = {
            type: 'scanResult', // TODO or use different callback functions?
            UUID: result.getDevice().getAddress(),
            name: result.getDevice().getName(),
            RSSI: result.getRssi(),
            localName: advertismentData.localName,
            state: 'disconnected',
            manufacturerId: advertismentData.manufacturerId,
            advertismentData
        };
        CLog(CLogTypes.info, `TNS_ScanCallback.onScanResult ---- payload: ${JSON.stringify(payload)}`);
        this.onPeripheralDiscovered && this.onPeripheralDiscovered(payload);
        this.owner.get().sendEvent(Bluetooth.device_discovered_event, payload);
    }
}

export class ScanAdvertisment {
    constructor(private scanRecord: android.bluetooth.le.ScanRecord) {}
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
        for (let i = 0; i < serviceUuids.size(); i++) {
            result.push(uuidToString(serviceUuids[i]));
        }
        return result;
    }
    get serviceData() {
        const result = {};
        const serviceData = this.scanRecord.getServiceData();
        if (serviceData.size() > 0) {
            const entries = serviceData.entrySet().iterator();
            while (entries.hasNext()) {
                const entry = entries.next();
                result[uuidToString(entry.getKey())] = byteArrayToBuffer(entry.getValue());
            }
        }
        return result;
    }
}
