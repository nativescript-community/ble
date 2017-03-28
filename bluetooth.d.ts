declare module "nativescript-bluetooth" {
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
       * This callback is invoked when a peripheral is found.
       */
      onDiscovered: (data: Peripheral) => void;
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
      services: Service[];
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
      characteristics: Characteristic[]
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
    interface CRUDOptions {
      peripheralUUID: string;
      serviceUUID: string;
      characteristicUUID: string;
    }

    export interface ReadOptions extends CRUDOptions {}
    export interface WriteOptions extends CRUDOptions {
        value : any;
    }
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

    export function isBluetoothEnabled(): Promise<boolean>;

    /**
     * Required for Android 6+ to be able to scan for peripherals in the background.
     */
    export function hasCoarseLocationPermission(): Promise<boolean>;

    /**
     * Required for Android 6+ to be able to scan for peripherals in the background.
     */
    export function requestCoarseLocationPermission(): Promise<any>;
    
    /**
     * Can be used to reduce the console.log messaging for characteristic read, write, change operations
     * @param enable Set to false to reduce console.log messages
     */
    export function setCharacteristicLogging(enable: boolean);

    export function startScanning(options: StartScanningOptions): Promise<any>;
    export function stopScanning(): Promise<any>;

    export function connect(options: ConnectOptions): Promise<any>;
    export function disconnect(options: DisconnectOptions): Promise<any>;

    export function read(options: ReadOptions): Promise<ReadResult>;
    export function write(options:WriteOptions): Promise<any>;
    export function writeWithoutResponse(options:WriteOptions): Promise<any>;

    export function startNotifying(options: StartNotifyingOptions): Promise<any>;
    export function stopNotifying(options: StopNotifyingOptions): Promise<any>;
}
