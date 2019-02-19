import {
    BluetoothCommon,
    CallbackType,
    Characteristic,
    ConnectOptions,
    DisconnectOptions,
    DiscoverCharacteristicsOptions,
    DiscoverOptions,
    DiscoverServicesOptions,
    MatchMode,
    MatchNum,
    MtuOptions,
    Peripheral,
    ReadOptions,
    ReadResult,
    ScanMode,
    Service,
    StartNotifyingOptions,
    StartScanningOptions,
    StopNotifyingOptions,
    WriteOptions
} from './bluetooth.common';

export {
    CallbackType,
    ConnectOptions,
    DisconnectOptions,
    MatchMode,
    MatchNum,
    Peripheral,
    ReadOptions,
    ReadResult,
    ScanMode,
    StartNotifyingOptions,
    StartScanningOptions,
    StopNotifyingOptions,
    WriteOptions,
    DiscoverServicesOptions,
    DiscoverCharacteristicsOptions,
    DiscoverOptions
};

export class Bluetooth extends BluetoothCommon {
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

    startScanning(options: StartScanningOptions): Promise<void>;

    stopScanning(): Promise<any>;

    connect(options: ConnectOptions): Promise<any>;

    disconnect(options: DisconnectOptions): Promise<any>;

    read(options: ReadOptions): Promise<ReadResult>;

    write(options: WriteOptions): Promise<any>;

    writeWithoutResponse(options: WriteOptions): Promise<any>;

    startNotifying(options: StartNotifyingOptions): Promise<any>;

    stopNotifying(options: StopNotifyingOptions): Promise<any>;

    requestMtu(options: MtuOptions): Promise<number>;

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
    // startGattServer();
    // stopGattServer();
    // setGattServerCallbacks(options: any);
    fetchUuidsWithSdp(device: any): boolean;
    removeBond(device: any): any;
    adapter: any;

    public discoverServices(args: DiscoverServicesOptions): Promise<{ services: Service[] }>;
    public discoverCharacteristics(args: DiscoverCharacteristicsOptions): Promise<{ characteristics: Characteristic[] }>;

    public discoverAll(args: DiscoverOptions): Promise<{ services: Service[]; characteristics: Characteristic[] }>;
}
export function getBluetoothInstance(): Bluetooth;

export function stringToUint8Array(value: any, encoding?: string): Uint8Array;
