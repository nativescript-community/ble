import {
  BluetoothCommon,
  StopNotifyingOptions,
  StartNotifyingOptions,
  ConnectOptions,
  StartScanningOptions,
  DisconnectOptions,
  WriteOptions,
  ReadOptions
} from '../common';
import { TNS_BluetoothGattCallback } from './TNS_BluetoothGattCallback';
import { TNS_LeScanCallback } from './TNS_LeScanCallback';
import { TNS_ScanCallback } from './TNS_ScanCallback';
export declare class Bluetooth extends BluetoothCommon {
  bluetoothManager: android.bluetooth.BluetoothManager;
  adapter: android.bluetooth.BluetoothAdapter;
  gattServer: android.bluetooth.BluetoothGattServer;
  bluetoothGattCallback: TNS_BluetoothGattCallback;
  scanCallback: TNS_ScanCallback;
  LeScanCallback: TNS_LeScanCallback;
  connections: {};
  constructor();
  readonly enabled: boolean;
  coarseLocationPermissionGranted(): boolean;
  requestCoarseLocationPermission(callback?: () => void): Promise<boolean>;
  enable(): Promise<{}>;
  isBluetoothEnabled(): Promise<{}>;
  startScanning(arg: StartScanningOptions): Promise<{}>;
  stopScanning(): Promise<{}>;
  connect(arg: ConnectOptions): Promise<{}>;
  disconnect(arg: DisconnectOptions): Promise<{}>;
  read(arg: ReadOptions): Promise<{}>;
  write(arg: WriteOptions): Promise<{}>;
  writeWithoutResponse(arg: WriteOptions): Promise<{}>;
  startNotifying(arg: StartNotifyingOptions): Promise<{}>;
  stopNotifying(arg: StopNotifyingOptions): Promise<{}>;
  gattDisconnect(gatt: android.bluetooth.BluetoothGatt): void;
  uuidToString(uuid: any): any;
  encodeValue(val: any): any;
  decodeValue(value: any): ArrayBuffer;
  stringToUuid(uuidStr: any): javautilUUID;
  extractManufacturerRawData(scanRecord: any): ArrayBuffer;
  private _findNotifyCharacteristic(bluetoothGattService, characteristicUUID);
  private _findCharacteristicOfType(bluetoothGattService, characteristicUUID, charType);
  private _getWrapper(arg, reject);
  private _isEnabled();
  private _getContext();
  private _getActivity();
}
