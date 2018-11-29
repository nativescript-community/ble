import { Bluetooth } from './android_main';
import { Peripheral } from '../common';
export declare class TNS_LeScanCallback extends android.bluetooth.BluetoothAdapter.LeScanCallback {
    private owner;
    onPeripheralDiscovered: (data: Peripheral) => void;
    constructor();
    onLeScan(device: android.bluetooth.BluetoothDevice, rssi: number, scanRecord: number[]): void;
    onInit(owner: WeakRef<Bluetooth>): void;
}
