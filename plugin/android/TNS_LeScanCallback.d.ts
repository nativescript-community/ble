import { Bluetooth } from '../bluetooth.android';
import { Peripheral } from '../bluetooth.common';
export declare class ScanRecord {
    private serviceUuids;
    private manufacturerData;
    private serviceData;
    private advertiseFlags;
    private txPowerLevel;
    private localName;
    private bytes;
    getManufacturerSpecificData(): globalAndroid.util.SparseArray<any[]>;
    getBytes(): native.Array<number>;
    getAdvertiseFlags(): number;
    getServiceUuids(): native.Array<number>[];
    getServiceData(): {
        [k: string]: native.Array<number>;
    };
    getDeviceName(): string;
    getTxPowerLevel(): number;
    constructor(serviceUuids: Array<native.Array<number>>, manufacturerData: android.util.SparseArray<any[]>, serviceData: {
        [k: string]: native.Array<number>;
    }, advertiseFlags: number, txPowerLevel: number, localName: string, bytes: native.Array<number>);
}
export declare class TNS_LeScanCallback extends android.bluetooth.BluetoothAdapter.LeScanCallback {
    private owner;
    onPeripheralDiscovered: (data: Peripheral) => void;
    constructor();
    onLeScan(device: android.bluetooth.BluetoothDevice, rssi: number, data: number[]): void;
    onInit(owner: WeakRef<Bluetooth>): void;
}
export declare class ScanAdvertisment {
    private scanRecord;
    constructor(scanRecord: ScanRecord);
    readonly manufacturerData: ArrayBuffer;
    readonly data: ArrayBuffer;
    readonly manufacturerId: number;
    readonly txPowerLevel: number;
    readonly localName: string;
    readonly flags: number;
    readonly uuids: any[];
    readonly serviceData: {};
}
