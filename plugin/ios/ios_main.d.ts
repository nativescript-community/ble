import { BluetoothCommon, ConnectOptions, StartNotifyingOptions, StartScanningOptions, StopNotifyingOptions } from '../common';
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
    toArrayBuffer(value: any): ArrayBuffer;
    enable(): Promise<{}>;
    isGPSEnabled(): Promise<boolean>;
    enableGPS(): Promise<void>;
    stopScanning(arg: any): Promise<{}>;
    connect(args: ConnectOptions): Promise<{}>;
    disconnect(arg: any): Promise<{}>;
    isConnected(arg: any): Promise<{}>;
    findPeripheral(UUID: any): CBPeripheral;
    read(arg: any): Promise<{}>;
    write(arg: any): Promise<{}>;
    writeWithoutResponse(arg: any): Promise<{}>;
    startNotifying(args: StartNotifyingOptions): Promise<{}>;
    stopNotifying(args: StopNotifyingOptions): Promise<{}>;
    private _isEnabled();
    private _stringToUuid(uuidStr);
    private _findService(UUID, peripheral);
    private _findCharacteristic(UUID, service, property);
    private _getWrapper(arg, property, reject);
    private _encodeValue(value);
    private valueToNSData(value);
}
