import Observable from '@nativescript-community/observable';
import { Trace } from '@nativescript/core';
import { BaseError } from 'make-error';

export const BleTraceCategory = 'NativescriptBle';
export enum CLogTypes {
    log = Trace.messageType.log,
    info = Trace.messageType.info,
    warning = Trace.messageType.warn,
    error = Trace.messageType.error,
}

export const CLog = (type: CLogTypes, ...args) => {
    Trace.write(args.map(a=>(a && typeof a === 'object'? JSON.stringify(a) :a)).join(' '), BleTraceCategory, type);
};

export class BluetoothError extends BaseError {
    arguments?: any; // call argumrents
    method?: string; // call argumrents
    status?: number; // call argumrents
    constructor(message: string, properties?: { [k: string]: any }) {
        super(message);
        if (properties) {
            Object.assign(this, properties);
        }
    }
    toString() {
        return `[BluetoothError]:${this.message}, ${this.method}, ${this.status}, ${JSON.stringify(this.arguments)}`;
    }
}


export function bluetoothEnabled(target: Object, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) {
    const originalMethod = descriptor.value as Function; // save a reference to the original method

    // NOTE: Do not use arrow syntax here. Use a function expression in
    // order to use the correct value of `this` in this method (see notes below)
    descriptor.value = function (...args: any[]) {
        return this.isBluetoothEnabled()
            .then(function (isEnabled) {
                if (!isEnabled) {
                    if (Trace.isEnabled()) {
                        CLog(CLogTypes.info, `${originalMethod.name} ---- Bluetooth is not enabled.`);
                    }
                    return Promise.reject(new Error(BluetoothCommon.msg_not_enabled));
                }
                return null;
            })
            .then(() => originalMethod.apply(this, args));
    };

    return descriptor;
}

const pattern = /0000(.{4})-0000-1000-8000-00805f9b34fb/;
export function prepareArgs(target: Object, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) {
    const originalMethod = descriptor.value as Function; // save a reference to the original method

    // NOTE: Do not use arrow syntax here. Use a function expression in
    // order to use the correct value of `this` in this method (see notes below)
    descriptor.value = function (...args: any[]) {
        const paramsToCheck = args[0];
        if (paramsToCheck.hasOwnProperty) {
            ['serviceUUIDs', 'serviceUUID', 'characteristicUUID'].forEach(function (k) {
                const value = paramsToCheck[k];
                if (value) {
                    if (Array.isArray(value)) {
                        paramsToCheck[k] = paramsToCheck[k].map(v=>{
                            const matcher = (v as string).match(pattern);
                            return  (matcher && matcher.length > 0 ? matcher[1] : v).toLowerCase();
                        });
                    } else {
                        const matcher = (paramsToCheck[k] as string).match(pattern);
                        paramsToCheck[k] = (matcher && matcher.length > 0 ? matcher[1] : paramsToCheck[k]).toLowerCase();
                    }
                }
            });
        }
        return originalMethod.apply(this, args);
    };

    return descriptor;
}

export interface BluetoothOptions {
    restoreIdentifier: string | null;
    showPowerAlertPopup: boolean;
    disableAndroidQueue: boolean;
}

export abstract class BluetoothCommon extends Observable {
    /*
     * error messages
     */
    public static msg_not_enabled = 'bluetooth_not_enabled';
    public static msg_not_supported = 'bluetooth_not_supported';
    public static msg_cant_open_settings = 'cant_open_settings';
    public static msg_missing_parameter = 'missing_parameter';
    public static msg_no_peripheral = 'peripheral_not_found';
    public static msg_no_service = 'service_not_found';
    public static msg_no_characteristic = 'characteristic_not_found';
    public static msg_peripheral_not_connected = 'peripheral_not_connected';
    public static msg_peripheral_disconnected = 'peripheral_disconnected';
    public static msg_invalid_value = 'invalid_value';
    public static msg_error_function_call = 'error_function_call';
    public static msg_characteristic_cant_notify = 'characteristic_cant_notify';

    public static UUIDKey = 'UUID';
    public static serviceUUIDKey = 'serviceUUID';
    public static peripheralUUIDKey = 'peripheralUUID';
    public static characteristicUUIDKey = 'characteristicUUID';

    /*
     * String value for hooking into the bluetooth_status_event. This event fires when the bluetooth state changes.
     */
    public static bluetooth_status_event = 'bluetooth_status_event';

    /*
     * String value for hooking into the device_connected_event. This event fires when a device is connected.
     */
    public static device_connected_event = 'device_connected_event';
    /*
     * String value for hooking into the device_disconnected_event. This event fires when a device is disconnected.
     */
    public static device_disconnected_event = 'device_disconnected_event';
    /*
     * String value for hooking into the device_discovered_event. This event fires when a device is discovered.
     */
    public static device_discovered_event = 'device_discovered_event';

    public events: any /*IBluetoothEvents*/;

    public abstract isBluetoothEnabled(): Promise<boolean>;

    public isGPSEnabled() {
        return Promise.resolve(true); // we dont need to check for GPS in the bluetooth iOS module
    }
    public enableGPS(): Promise<void> {
        return Promise.resolve(); // we dont need to check for GPS in the bluetooth iOS module
    }
    requestLocationPermission() {
        return Promise.resolve(true);
    }

    hasLocationPermission() {
        return Promise.resolve(true);
    }

    /**
     * Notify events by name and optionally pass data
     */
    sendEvent(eventName: string, data?: any, msg?: string) {
        this.notify({
            eventName,
            object: this,
            data,
            message: msg,
        });
    }

    public abstract discoverServices(args: DiscoverServicesOptions);
    public abstract discoverCharacteristics(args: DiscoverCharacteristicsOptions);
    public discoverAll(args: DiscoverServicesOptions) {
        return this.discoverServices(args).then((resultS) =>
            Promise.all(resultS.services.map((s) => this.discoverCharacteristics({ serviceUUID: s.UUID, ...args }).then((resultC) => (s.characteristics = resultC.characteristics)))).then(() => ({
                services: resultS.services,
            }))
        ) as Promise<{ services: Service[] }>;
    }
    stop() {}
}

export enum ScanMode {
    LOW_LATENCY,
    BALANCED,
    LOW_POWER,
    OPPORTUNISTIC,
}
export enum MatchMode {
    AGGRESSIVE,
    STICKY,
}

export enum MatchNum {
    MAX_ADVERTISEMENT,
    FEW_ADVERTISEMENT,
    ONE_ADVERTISEMENT,
}
export enum CallbackType {
    ALL_MATCHES,
    FIRST_MATCH,
    MATCH_LOST,
}
export enum Phy {
    LE_1M,
    LE_CODED,
    LE_ALL_SUPPORTED,
}

export type ConnectionState = 'connected' | 'connecting' | 'disconnected';

/**
 * The options object passed into the startScanning function.
 */
export interface StartScanningOptions {
    /**
     * Zero or more services which the peripheral needs to broadcast.
     * Default: [], which matches any peripheral.
     */
    filters?: {
        serviceUUID?: string;
        deviceName?: string;
        deviceAddress?: string;
        manufacturerData?: ArrayBuffer;
    }[];

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

        /**
         * Set whether only legacy advertisements should be returned in scan results.
         * Legacy advertisements include advertisements as specified by the
         * Bluetooth core specification 4.2 and below. This is true by default
         * for compatibility with older apps.
         *
         * @param legacy true if only legacy advertisements will be returned
         */
        legacy?: boolean;

        /**
         * Several phones may have some issues when it comes to offloaded filtering.
         * Even if it should be supported, it may not work as expected.
         * It has been observed for example, that setting 2 filters with different devices
         * addresses on Nexus 6 with Lollipop gives no callbacks if one or both devices advertise.
         * See https://code.google.com/p/android/issues/detail?id=181561.
         *
         * @param use true to enable (default) hardware offload filtering.
         *                 If false a compat software filtering will be used
         *                 (uses much more resources).
         */
        useHardwareBatchingIfSupported?: boolean;

        /**
         * Set report delay timestamp for Bluetooth LE scan.
         *
         * @param reportDelayMillis Delay of report in milliseconds. Set to 0 to be notified of
         *            results immediately. Values &gt; 0 causes the scan results to be queued up and
         *            delivered after the requested delay or when the internal buffers fill up.
         * @throws IllegalArgumentException If {@code reportDelayMillis} &lt; 0.
         */
        reportDelay?: number;

        /**
         * *** Only available on Android 23+ ***
         * Set the Physical Layer to use during this scan.
         * This is used only if {@link ScanSettings.Builder#setLegacy}
         * is set to false and only on Android 0reo or newer.
         * {@link android.bluetooth.BluetoothAdapter#isLeCodedPhySupported}
         * may be used to check whether LE Coded phy is supported by calling
         * {@link android.bluetooth.BluetoothAdapter#isLeCodedPhySupported}.
         * Selecting an unsupported phy will result in failure to start scan.
         *
         * @param phy Can be one of
         *   {@link BluetoothDevice#PHY_LE_1M},
         *   {@link BluetoothDevice#PHY_LE_CODED} or
         *   {@link ScanSettings#PHY_LE_ALL_SUPPORTED}
         */
        phy?: Phy;
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
    onConnected?: (data: { UUID; name: string; state: ConnectionState; services?: Service[]; advertismentData: AdvertismentData }) => void;

    /**
     * Once the peripheral is disconnected this callback function is invoked.
     */
    onDisconnected?: (data: { UUID; name: string }) => void;

    /**
     * Discover all services on connection. Default is false for faster connection
     */
    autoDiscoverAll?: boolean;

    /**
     * Discover specified services on connection
     */
    serviceUUIDs?: string[];

    /**
     * Selects 2M PHY when available (Android only)
     */
    auto2MegPhy?: boolean;

    /**
     * Selects maximum BLE MTU (247) (Android only)
     */
    autoMaxMTU?: boolean;
    /**
     * transport selection (Android only)
     */
    transport?: number;
}

export interface AdvertismentData {
    localName?: string;
    manufacturerData?: ArrayBuffer;
    manufacturerId?: number;
    serviceUUIDs?: string[];
    serviceData?: { [k: string]: ArrayBuffer };
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

    /**
     * A friendly description of the peripheral as provided by the manufacturer.
     */
    localName?: string;

    // state: string; // TODO not sure we'll keep this, so not adding it here for now

    /**
     * The relative signal strength which more or less can be used to determine how far away the peripheral is.
     */
    RSSI?: number;

    /**
     * Once connected to the peripheral  and if autoDiscoverAll is not false, a list of services will be set.
     */
    services?: Service[];

    manufacturerId?: number;
    advertismentData?: AdvertismentData;

    mtu?: number;
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
    characteristics?: Characteristic[];
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
    properties?: {
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
    descriptors?: any;

    /**
     * ignored for now
     */
    permissions?: any;
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
export interface ReadOptions extends CRUDOptions {
    timeout?: number;
}

export interface WriteOptions extends CRUDOptions {
    value: any;
    encoding?: string;
    timeout?: number;
}

export interface MtuOptions {
    value: any;
    peripheralUUID: string;
}

export interface ReadRSSIOptions {
    peripheralUUID: string;
}

export interface DiscoverOptions {
    peripheralUUID: string;
}
export interface DiscoverServicesOptions extends DiscoverOptions {
    serviceUUIDs?: string[];
    clearCache?: boolean; // Android only
}
export interface DiscoverCharacteristicsOptions extends DiscoverOptions {
    serviceUUID: string;
    characteristicUUIDs?: string[];
}

// tslint:disable-next-line:no-empty-interface
export interface StopNotifyingOptions extends CRUDOptions {}

export interface StartNotifyingOptions extends CRUDOptions {
    onNotify: (data: ReadResult) => void;
}

/**
 * Response object for the read function
 */
export interface ReadResult extends CRUDOptions {
    value: ArrayBuffer;
    ios?: any;
    android?: any;
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
    bluetooth_status_event: string;
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
