import { Bluetooth } from './android_main';
import { Peripheral } from '../common';
export declare class TNS_ScanCallback extends android.bluetooth.le.ScanCallback {
    private owner;
    onPeripheralDiscovered: (data: Peripheral) => void;
    constructor();
    onInit(owner: WeakRef<Bluetooth>): void;
    onBatchScanResults(results: any): void;
    onScanFailed(errorCode: number): void;
    onScanResult(callbackType: number, result: android.bluetooth.le.ScanResult): void;
}
export declare class ScanAdvertisment {
    private scanRecord;
    constructor(scanRecord: android.bluetooth.le.ScanRecord);
    readonly manufacturerData: ArrayBuffer;
    readonly data: ArrayBuffer;
    readonly manufacturerId: number;
    readonly txPowerLevel: number;
    readonly localName: string;
    readonly flags: number;
    readonly uuids: any[];
    readonly serviceData: {};
}
