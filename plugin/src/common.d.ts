import { Observable } from 'tns-core-modules/data/observable';
export declare class BluetoothUtil {
  static debug: boolean;
}
export declare enum CLogTypes {
  info = 0,
  warning = 1,
  error = 2
}
export declare const CLog: (type?: CLogTypes, ...args: any[]) => void;
export declare class BluetoothCommon extends Observable {
  debug: boolean;
  static error_event: string;
  static peripheral_connected_event: string;
  static bluetooth_enabled_event: string;
  static bluetooth_discoverable_event: string;
  static bluetooth_advertise_success_event: string;
  static bluetooth_advertise_failure_event: string;
  static server_connection_state_changed_event: string;
  static bond_status_change_event: string;
  static device_discovered_event: string;
  static device_name_change_event: string;
  static device_uuid_change_event: string;
  static device_acl_disconnected_event: string;
  static characteristic_write_request_event: string;
  static characteristic_read_request_event: string;
  static descriptor_write_request_event: string;
  static descriptor_read_request_event: string;
  static execute_write_event: string;
  events: any;
  readonly enabled: boolean;
  base64ToArrayBuffer(b64: any): ArrayBuffer;
  requestCoarseLocationPermission(): Promise<{}>;
  hasCoarseLocationPermission(): Promise<{}>;
  sendEvent(eventName: string, data?: any, msg?: string): void;
}
export interface StartScanningOptions {
  serviceUUIDs?: string[];
  seconds?: number;
  onDiscovered?: (data: Peripheral) => void;
  skipPermissionCheck?: boolean;
  android?: {
    scanMode?: number;
    matchMode?: number;
    matchNum?: number;
    callbackType?: number;
  };
}
export interface DisconnectOptions {
  UUID: string;
}
export interface ConnectOptions {
  UUID: string;
  onConnected: (data: Peripheral) => void;
  onDisconnected: (data: Peripheral) => void;
}
export interface Peripheral {
  UUID: string;
  name: string;
  RSSI: number;
  services?: Service[];
  manufacturerId?: number;
  manufacturerData?: ArrayBuffer;
}
export interface Service {
  UUID: string;
  name?: string;
  characteristics: Characteristic[];
}
export interface Characteristic {
  UUID: string;
  name: string;
  properties: {
    read: boolean;
    write: boolean;
    writeWithoutResponse: boolean;
    notify: boolean;
    indicate: boolean;
    broadcast: boolean;
    authenticatedSignedWrites: boolean;
    extendedProperties: boolean;
  };
  descriptors: any;
  permissions: any;
}
export interface CRUDOptions {
  peripheralUUID: string;
  serviceUUID: string;
  characteristicUUID: string;
}
export interface ReadOptions extends CRUDOptions {}
export interface WriteOptions extends CRUDOptions {
  value: any;
}
export interface StopNotifyingOptions extends CRUDOptions {}
export interface StartNotifyingOptions extends CRUDOptions {
  onNotify: (data: ReadResult) => void;
}
export interface ReadResult {
  value: any;
  valueRaw: any;
  characteristicUUID: string;
}
export interface StartAdvertisingOptions {
  settings: any;
  UUID: any;
  data: any;
}
export interface IBluetoothEvents {
  error_event: string;
  bluetooth_enabled_event: string;
  peripheral_connected_event: string;
  bluetooth_advertise_success_event: string;
  bluetooth_advertise_failure_event: string;
  server_connection_state_changed_event: string;
  bond_status_change_event: string;
  device_discovered_event: string;
  device_name_change_event: string;
  device_uuid_change_event: string;
  device_acl_disconnected_event: string;
  characteristic_write_request_event: string;
  characteristic_read_request_event: string;
  descriptor_write_request_event: string;
  descriptor_read_request_event: string;
  execute_write_event: string;
}
