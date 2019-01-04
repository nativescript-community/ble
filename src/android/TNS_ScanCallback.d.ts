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
