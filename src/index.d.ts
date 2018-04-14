import * as COMMON from './common';

export class Bluetooth extends COMMON.BluetoothCommon {
  /**
   * If true console logs will be output to help debug NativeScript-Bluetooth.
   */
  debug: boolean;

  isBluetoothEnabled(): Promise<boolean>;

  /**
   * Android only. Will return false if the user denied turning Bluetooth on.
   * @returns {Promise<boolean>}
   */
  enable(): Promise<boolean>;

  /**
   * Required for Android 6+ to be able to scan for peripherals in the background.
   */
  hasCoarseLocationPermission(): Promise<boolean>;

  /**
   * Required for Android 6+ to be able to scan for peripherals in the background.
   */
  requestCoarseLocationPermission(): Promise<any>;

  startScanning(options: COMMON.StartScanningOptions): Promise<any>;

  stopScanning(): Promise<any>;

  connect(options: COMMON.ConnectOptions): Promise<any>;

  disconnect(options: COMMON.DisconnectOptions): Promise<any>;

  read(options: COMMON.ReadOptions): Promise<COMMON.ReadResult>;

  write(options: COMMON.WriteOptions): Promise<any>;

  writeWithoutResponse(options: COMMON.WriteOptions): Promise<any>;

  startNotifying(options: COMMON.StartNotifyingOptions): Promise<any>;

  stopNotifying(options: COMMON.StopNotifyingOptions): Promise<any>;

  // PERIPHERAL MODE FUNCTIONS
  disable(): Promise<any>;
  isPeripheralModeSupported(): Promise<boolean>;
  stopAdvertising(): Promise<any>;
  startAdvertising(advertiseOptions: any): Promise<any>;
  getServerConnectedDevicesMatchingState(state: any): any;
  getServerConnectedDeviceState(device: any): any;
  getServerConnectedDevices(): any;
  cancelServerConnection(device: any);
  clearServices();
  offersService(uuidString: string): boolean;
  getServerService(uuidString: string): any;
  makeDescriptor(options: any): any;
  makeCharacteristic(options: any): any;
  makeService(options: any): any;
  getAdvertiser(): any;
  setDiscoverable(): Promise<any>;
  startGattServer();
  stopGattServer();
  setGattServerCallbacks(options: any);
  fetchUuidsWithSdp(device: any): boolean;
  removeBond(device: any): any;
  getAdapter(): any;
}
