import { Observable } from 'tns-core-modules/data/observable/observable';

// declare var require;
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
            console.log(...args);
        } else if (type === 1) {
            // Warning
            console.warn(...args);
        } else if (type === 2) {
            console.error(...args);
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
     * String value for hooking into the bluetooth_status_event. This event fires when the bluetooth state changes.
     */
    public static bluetooth_status_event = 'bluetooth_status_event';

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
