import { Observable, EventData } from 'tns-core-modules/data/observable';

declare var require;

require('./base64');

export class BluetoothUtil {
  public static debug = false;
}

export enum CLogTypes {
  info,
  warning,
  error
}

export const CLog = (type: CLogTypes = 0, ...args) => {
  if (BluetoothUtil.debug) {
    if (type === 0) {
      // Info
      console.log('NativeScript-Bluetooth: INFO', args);
    } else if (type === 1) {
      // Warning
      console.log('NativeScript-Bluetooth: WARNING', args);
    } else if (type === 2) {
      console.log('NativeScript-Bluetooth: ERROR', args);
    }
  }
};

export class BluetoothCommon extends Observable {
  public set debug(value: boolean) {
    BluetoothUtil.debug = value;
  }

  /*
   * String value for hooking into the error_event. This event fires when an error is emitted from CameraPlus.
   */
  public static error_event = 'error_event';

  /*
   * String value for hooking into the peripheral_connected_event. This event fires when a peripheral is connected to Bluetooth.
   */
  public static peripheral_connected_event = 'peripheral_connected_event';

  /*
   * String value for hooking into the bluetooth_enabled_event. This event fires when the bluetooth is enabled.
   */
  public static bluetooth_enabled_event = 'bluetooth_enabled_event';

  /*
   * String value for hooking into the bluetooth_discoverable_event. This event fires when the bluetooth is discoverable.
   */
  public static bluetooth_discoverable_event = 'bluetooth_discoverable_event';

  /*
   * String value for hooking into the bluetooth_advertise_success_event. This event fires when the bluetooth advertising is successful.
   */
  public static bluetooth_advertise_success_event = 'bluetooth_advertise_success_event';

  /*
   * String value for hooking into the bluetooth_advertise_error. This event fires when the bluetooth advertising throws and error.
   */
  public static bluetooth_advertise_failure_event = 'bluetooth_advertise_failure_event';

  /*
   * String value for hooking into the server_connection_state_changed. This event fires when the server connection state changes.
   */
  public static server_connection_state_changed_event = 'server_connection_state_changed_event';

  /*
   * String value for hooking into the bond_status_change_event. This event fires when the bonding status changes.
   */
  public static bond_status_change_event = 'bond_status_change_event';

  /*
   * String value for hooking into the device_discovered_event. This event fires when a device is discovered when scanning.
   */
  public static device_discovered_event = 'device_discovered_event';

  /*
   * String value for hooking into the device_name_change_event. This event fires when the device name changes.
   */
  public static device_name_change_event = 'device_name_change_event';

  /*
   * String value for hooking into the device_uuid_change. This event fires when the device uuid changes.
   */
  public static device_uuid_change_event = 'device_uuid_change_event';

  /*
   * String value for hooking into the device_acl_disconnected. This event fires when the device acl disconnects.
   */
  public static device_acl_disconnected_event = 'device_acl_disconnected_event';

  /*
   * String value for hooking into the characteristic_write_request. This event fires when a characteristic requests to write.
   */
  public static characteristic_write_request_event = 'characteristic_write_request_event';

  /*
   * String value for hooking into the characteristic_read_request_event. This event fires when a characteristic requests to read.
   */
  public static characteristic_read_request_event = 'characteristic_read_request_event';

  /*
   * String value for hooking into the descriptor_write_request_event. This event fires when a descriptor requests to write.
   */
  public static descriptor_write_request_event = 'descriptor_write_request_event';

  /*
   * String value for hooking into the descriptor_read_request_event. This event fires when a descriptor requests to read.
   */
  public static descriptor_read_request_event = 'descriptor_read_request_event';

  /**
   * String value for hooking into the execute_write_event. This event fires when the Gatt Server executes a write command.
   */
  public static execute_write_event = 'execute_write_event';

  public events: any /*IBluetoothEvents*/;

  /**
   * Property to determine if bluetooth is enabled.
   */
  readonly enabled: boolean;

  /**
   * Takes a Base64 encoded string and decodes it and returns an ArrayBuffer.
   * @param b64 - Base64 Encoded string to be decoded.
   * @returns buffer [ArrayBuffer]
   */
  base64ToArrayBuffer(b64) {
    // decodes a string of data which has been encoded using base-64 encoding
    const decoded = atob(b64);
    const ret = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
      ret[i] = decoded.charCodeAt(i);
    }
    return ret.buffer;
  }

  requestCoarseLocationPermission() {
    return new Promise(resolve => {
      resolve(true);
    });
  }

  hasCoarseLocationPermission() {
    return new Promise(resolve => {
      resolve(true);
    });
  }

  /**
   * Notify events by name and optionally pass data
   */
  sendEvent(eventName: string, data?: any, msg?: string) {
    this.notify({
      eventName,
      object: this,
      data,
      message: msg
    });
  }
}

/**
 * The options object passed into the startScanning function.
 */
export interface StartScanningOptions {
  /**
   * Zero or more services which the peripheral needs to broadcast.
   * Default: [], which matches any peripheral.
   */
  serviceUUIDs?: string[];

  /**
   * The number of seconds to scan for services.
   * Default: unlimited, which is not really recommended. You should stop scanning manually by calling 'stopScanning'.
   */
  seconds?: number;

  /**
   * The number of milliseconds to to wait before discovering services.
   * Default: 0.
   */
  discoveryDelay?: number;

  /**
   * This callback is invoked when a peripheral is found.
   */
  onDiscovered?: (data: Peripheral) => void;

  /**
   * *** ANDROID ONLY ***
   * Set this to true if you don't want the plugin to check (and request) the required Bluetooth permissions.
   * Particularly useful if you're running this function on a non-UI thread (ie. a Worker).
   */
  skipPermissionCheck?: boolean;

  /**
   * Android scanning specific options. The defaults should cover majority of use cases. Be sure to check documentation for the various values for Android Bluetooth.
   */
  android?: {
    /**
     * *** Only available on Android 21+ ***
     * The scan mode can be one of android.bluetooth.le.ScanSettings.SCAN_MODE_LOW_POWER (0),
     * android.bluetooth.le.ScanSettings.SCAN_MODE_BALANCED (1) ,
     * or android.bluetooth.le.ScanSettings.SCAN_MODE_LOW_LATENCY (2).
     * DEFAULT: SCAN_MODE_LOW_LATENCY (2)
     */
    scanMode?: number;

    /**
     * *** Only available on Android 23+ ***
     * The match mode can be one of android.bluetooth.le.ScanSettings.MATCH_MODE_AGGRESSIVE (1)
     * or android.bluetooth.le.ScanSettings.MATCH_MODE_STICKY (2)
     * DEFAULT: MATCH_MODE_AGGRESSIVE (2).
     */
    matchMode?: number;

    /**
     * *** Only available on Android 23+ ***
     * The num of matches can be one of android.bluetooth.le.ScanSettings.MATCH_NUM_ONE_ADVERTISEMENT (1),
     *  android.bluetooth.le.ScanSettings.MATCH_NUM_FEW_ADVERTISEMENT (2),
     * or android.bluetooth.le.ScanSettings.MATCH_NUM_MAX_ADVERTISEMENT (3)
     * DEFAULT: MATCH_NUM_MAX_ADVERTISEMENT(3)
     */
    matchNum?: number;

    /**
     * *** Only available on Android 23+ ***
     * The callback type flags for the scan.
     * TODO: Add documentation on the valid values for callbackTypes.
     */
    callbackType?: number;
  };
}

/**
 * The options object passed into the disconnect function.
 */
export interface DisconnectOptions {
  /**
   * The UUID of the peripheral to disconnect from.
   */
  UUID: string;
}

/**
 * The options object passed into the connect function.
 */
export interface ConnectOptions {
  /**
   * The UUID of the peripheral to connect to.
   */
  UUID: string;

  /**
   * Once the peripheral is connected this callback function is invoked.
   */
  onConnected: (data: Peripheral) => void;

  /**
   * Once the peripheral is disconnected this callback function is invoked.
   */
  onDisconnected: (data: Peripheral) => void;
}

/**
 * The returned object in several callback functions.
 */
export interface Peripheral {
  /**
   * The UUID of the peripheral.
   */
  UUID: string;

  /**
   * A friendly description of the peripheral as provided by the manufacturer.
   */
  name: string;

  // state: string; // TODO not sure we'll keep this, so not adding it here for now

  /**
   * The relative signal strength which more or less can be used to determine how far away the peripheral is.
   */
  RSSI: number;

  /**
   * Once connected to the peripheral a list of services will be set.
   */
  services?: Service[];

  manufacturerId?: number;

  manufacturerData?: ArrayBuffer;
}

/**
 * A service provided by a periperhal.
 */
export interface Service {
  /**
   * The UUID of the service.
   */
  UUID: string;
  /**
   * Depending on the peripheral and platform this may be a more friendly description of the service.
   */
  name?: string;
  /**
   * A list of service characteristics a client can interact with by reading, writing, subscribing, etc.
   */
  characteristics: Characteristic[];
}

/**
 * A characteristic provided by a service.
 */
export interface Characteristic {
  /**
   * The UUID of the characteristic.
   */
  UUID: string;
  /**
   * Depending on the service and platform (iOS only) this may be a more friendly description of the characteristic.
   * On Android it's always the same as the UUID.
   */
  name: string;
  /**
   * An object containing characteristic properties like read, write and notify.
   */
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

  /**
   * ignored for now
   */
  descriptors: any;

  /**
   * ignored for now
   */
  permissions: any;
}

/**
 * Base properties for all CRUD actions
 */
export interface CRUDOptions {
  peripheralUUID: string;
  serviceUUID: string;
  characteristicUUID: string;
}

// tslint:disable-next-line:no-empty-interface
export interface ReadOptions extends CRUDOptions {}

export interface WriteOptions extends CRUDOptions {
  value: any;
}

// tslint:disable-next-line:no-empty-interface
export interface StopNotifyingOptions extends CRUDOptions {}

export interface StartNotifyingOptions extends CRUDOptions {
  onNotify: (data: ReadResult) => void;
}

/**
 * Response object for the read function
 */
export interface ReadResult {
  value: any;
  valueRaw: any;
  characteristicUUID: string;
}

export interface StartAdvertisingOptions {
  settings;
  UUID;
  data;
}

/**
 * All of the events for Bluetooth that can be emitted and listened to.
 */
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
