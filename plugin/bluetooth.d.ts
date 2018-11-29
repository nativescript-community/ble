import * as COMMON from './common';

declare enum ScanMode {
    LOW_LATENCY,
    BALANCED,
    LOW_POWER,
    OPPORTUNISTIC
}
declare enum MatchMode {
    AGGRESSIVE,
    STICKY
}

declare enum MatchNum {
    MAX_ADVERTISEMENT,
    FEW_ADVERTISEMENT,
    ONE_ADVERTISEMENT
}
declare enum CallbackType {
    ALL_MATCHES,
    FIRST_MATCH,
    MATCH_LOST
}

export type ConnectionState = 'connected' | 'connecting' | 'disconnected';

export class Bluetooth extends COMMON.BluetoothCommon {
    static readonly android?: {
        ScanMode: typeof ScanMode;
        MatchMode: typeof MatchMode;
        MatchNum: typeof MatchNum;
        CallbackType: typeof CallbackType;
    };

    /**
     * restoreIdentifier is optional and only used on iOS
     */
    constructor(restoreIndentifier?: string);
    /**
     * If true console logs will be output to help debug NativeScript-Bluetooth.
     */
    debug: boolean;

    /**
     * Property to determine if bluetooth is enabled.
     */
    readonly enabled: boolean;

    isBluetoothEnabled(): Promise<boolean>;

    /**
     * Android only. Will return false if the user denied turning Bluetooth on.
     * @returns {Promise<boolean>}
     */
    enable(): Promise<boolean>;

    /**
     * Android only. check if GPS is enabled.
     * @returns {boolean}
     */
    isGPSEnabled(): Promise<boolean>;

    /**
     * Android only. Will reject if the user denied turning GPS on.
     * @returns {Promise<void>}
     */
    enableGPS(): Promise<void>;


    /**
     * open device bluetooth settings
     * @returns {Promise<void>}
     */
    openBluetoothSettings(url?: string);

    /**
     * Required for Android 6+ to be able to scan for peripherals in the background.
     */
    hasCoarseLocationPermission(): Promise<boolean>;

    /**
     * Required for Android 6+ to be able to scan for peripherals in the background.
     */
    requestCoarseLocationPermission(): Promise<any>;

    startScanning(options: COMMON.StartScanningOptions): Promise<void>;

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

/**
 * The options object passed into the startScanning function.
 */
export interface StartScanningOptions {
    /**
     * Zero or more services which the peripheral needs to broadcast.
     * Default: [], which matches any peripheral.
     */
    filters?: Array<{
        serviceUUID?: string;
        deviceName?: string;
        deviceAddress?: string;
        manufacturerData?: ArrayBuffer;
    }>;

    /**
     * The number of seconds to scan for services.
     * Default: unlimited, which is not really recommended. You should stop scanning manually by calling 'stopScanning'.
     */
    seconds?: number;

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
        scanMode?: ScanMode;

        /**
         * *** Only available on Android 23+ ***
         * The match mode can be one of android.bluetooth.le.ScanSettings.MATCH_MODE_AGGRESSIVE (1)
         * or android.bluetooth.le.ScanSettings.MATCH_MODE_STICKY (2)
         * DEFAULT: MATCH_MODE_AGGRESSIVE (2).
         */
        matchMode?: MatchMode;

        /**
         * *** Only available on Android 23+ ***
         * The num of matches can be one of android.bluetooth.le.ScanSettings.MATCH_NUM_ONE_ADVERTISEMENT (1),
         *  android.bluetooth.le.ScanSettings.MATCH_NUM_FEW_ADVERTISEMENT (2),
         * or android.bluetooth.le.ScanSettings.MATCH_NUM_MAX_ADVERTISEMENT (3)
         * DEFAULT: MATCH_NUM_MAX_ADVERTISEMENT(3)
         */
        matchNum?: MatchNum;

        /**
         * *** Only available on Android 23+ ***
         * The callback type flags for the scan.
         * TODO: Add documentation on the valid values for callbackTypes.
         */
        callbackType?: CallbackType;
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

export interface AdvertismentData {
    localName?: string;
    manufacturerData?: ArrayBuffer;
    manufacturerId?: number;
    serviceUUIDs?: string[];
    txPowerLevel?: number;
    flags?: number;
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
    advertismentData?: AdvertismentData;
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
