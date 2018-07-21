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
export declare enum ScanMode {
  LOW_LATENCY = 0,
  BALANCED = 1,
  LOW_POWER = 2,
  OPPORTUNISTIC = 3
}
export declare enum MatchMode {
  AGGRESSIVE = 0,
  STICKY = 1
}
export declare enum MatchNum {
  MAX_ADVERTISEMENT = 0,
  FEW_ADVERTISEMENT = 1,
  ONE_ADVERTISEMENT = 2
}
export declare enum CallbackType {
  ALL_MATCHES = 0,
  FIRST_MATCH = 1,
  MATCH_LOST = 2
}
export declare class Bluetooth extends BluetoothCommon {
  bluetoothManager: android.bluetooth.BluetoothManager;
  adapter: android.bluetooth.BluetoothAdapter;
  gattServer: android.bluetooth.BluetoothGattServer;
  bluetoothGattCallback: TNS_BluetoothGattCallback;
  scanCallback: TNS_ScanCallback;
  LeScanCallback: TNS_LeScanCallback;
  private gattQueue;
  static readonly android: {
    ScanMode: typeof ScanMode;
    MatchMode: typeof MatchMode;
    MatchNum: typeof MatchNum;
    CallbackType: typeof CallbackType;
  };
  connections: {};
  private broadcastReceiver;
  constructor();
  readonly enabled: boolean;
  coarseLocationPermissionGranted(): boolean;
  hasCoarseLocationPermission(): Promise<{}>;
  requestCoarseLocationPermission(callback?: () => void): Promise<boolean>;
  getAndroidLocationManager(): android.location.LocationManager;
  isGPSEnabled(): boolean;
  enableGPS(): Promise<void>;
  enable(): Promise<{}>;
  isBluetoothEnabled(): Promise<{}>;
  scanningReferTimer: {
    timer?: number;
    resolve?: Function;
  };
  startScanning(arg: StartScanningOptions): Promise<{}>;
  stopScanning(): Promise<{}>;
  connect(arg: ConnectOptions): Promise<{}>;
  disconnect(arg: DisconnectOptions): Promise<{}>;
  read(arg: ReadOptions): any;
  write(arg: WriteOptions): any;
  writeWithoutResponse(arg: WriteOptions): any;
  startNotifying(arg: StartNotifyingOptions): any;
  stopNotifying(arg: StopNotifyingOptions): any;
  gattDisconnect(gatt: android.bluetooth.BluetoothGatt): void;
  uuidToString(uuid: any): any;
  encodeValue(val: any): any;
  decodeValue(value: any): ArrayBuffer;
  stringToUuid(uuidStr: any): javautilUUID;
  extractAdvertismentData(scanRecord: any): {};
  private _findNotifyCharacteristic(bluetoothGattService, characteristicUUID);
  private _findCharacteristicOfType(bluetoothGattService, characteristicUUID, charType);
  private _getWrapper(arg, reject);
  private _isEnabled();
  private _getContext();
  private _getActivity();
}
