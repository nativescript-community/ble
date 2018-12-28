import { BluetoothCommon, ConnectOptions, StartNotifyingOptions, StartScanningOptions, StopNotifyingOptions, WriteOptions } from '../common';
export declare function toArrayBuffer(value: any): ArrayBuffer;
export declare function CBUUIDToString(uuid: CBUUID): string;
export declare class Bluetooth extends BluetoothCommon {
    private _centralDelegate;
    private _centralManager;
    private _data_service;
    _discoverPeripherals: {
        [k: string]: CBPeripheral;
    };
    _connectedPeripherals: {
        [k: string]: CBPeripheral;
    };
    _connectCallbacks: {};
    _advData: {};
    _disconnectCallbacks: {};
    _onDiscovered: any;
    constructor(restoreIdentifier?: string);
    readonly enabled: boolean;
    _getState(state: CBPeripheralState): "connecting" | "connected" | "disconnected";
    onPeripheralDisconnected(peripheral: CBPeripheral): void;
    onPeripheralConnected(peripheral: CBPeripheral): void;
    isBluetoothEnabled(): Promise<{}>;
    scanningReferTimer: {
        timer?: number;
        resolve?: Function;
    };
    startScanning(arg: StartScanningOptions): Promise<{}>;
    enable(): Promise<{}>;
    isGPSEnabled(): Promise<boolean>;
    enableGPS(): Promise<void>;
    openBluetoothSettings(url?: string): Promise<void>;
    stopScanning(arg: any): Promise<{}>;
    connect(args: ConnectOptions): Promise<{}>;
    disconnect(arg: any): Promise<{}>;
    isConnected(arg: any): Promise<{}>;
    findPeripheral: (UUID: any) => CBPeripheral;
    adddDiscoverPeripheral: (peripheral: any) => void;
    findDiscoverPeripheral: (UUID: any) => CBPeripheral;
    read(arg: any): Promise<{}>;
    write(arg: WriteOptions): Promise<{}>;
    writeWithoutResponse(arg: WriteOptions): Promise<{}>;
    startNotifying(args: StartNotifyingOptions): Promise<{}>;
    stopNotifying(args: StopNotifyingOptions): Promise<{}>;
    private _isEnabled();
    private _stringToUuid(uuidStr);
    private _findService(UUID, peripheral);
    private _findCharacteristic(UUID, service, property?);
    private _getWrapper(arg, property, reject);
    private _encodeValue(value);
    private nativeEncoding(encoding);
    private valueToNSData(value, encoding?);
    private valueToString(value);
}
