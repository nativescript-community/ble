import { BluetoothCommon, ConnectOptions, DisconnectOptions, ReadOptions, StartNotifyingOptions, StartScanningOptions, StopNotifyingOptions, WriteOptions } from '../common';
import { TNS_BluetoothGattCallback } from './TNS_BluetoothGattCallback';
import { TNS_LeScanCallback } from './TNS_LeScanCallback';
import { TNS_ScanCallback } from './TNS_ScanCallback';
import { AdvertismentData, ConnectionState } from '../bluetooth';
export declare enum ScanMode {
    LOW_LATENCY = 0,
    BALANCED = 1,
    LOW_POWER = 2,
    OPPORTUNISTIC = 3,
}
export declare enum MatchMode {
    AGGRESSIVE = 0,
    STICKY = 1,
}
export declare enum MatchNum {
    MAX_ADVERTISEMENT = 0,
    FEW_ADVERTISEMENT = 1,
    ONE_ADVERTISEMENT = 2,
}
export declare enum CallbackType {
    ALL_MATCHES = 0,
    FIRST_MATCH = 1,
    MATCH_LOST = 2,
}
export declare enum Phy {
    LE_1M = 0,
    LE_CODED = 1,
    LE_ALL_SUPPORTED = 2,
}
export declare function uuidToString(uuid: any): any;
export declare function encodeValue(val: any): any;
export declare function valueToByteArray(value: any, encoding?: string): any[] | native.Array<number>;
export declare function byteArrayToBuffer(value: any): ArrayBuffer;
export declare function printValueToString(value: any): any;
export declare function stringToUuid(uuidStr: any): java.util.UUID;
export declare class Bluetooth extends BluetoothCommon {
    private _adapter;
    readonly adapter: globalAndroid.bluetooth.BluetoothAdapter;
    private _bluetoothManager;
    readonly bluetoothManager: globalAndroid.bluetooth.BluetoothManager;
    bluetoothGattCallback: TNS_BluetoothGattCallback;
    scanCallback: TNS_ScanCallback;
    LeScanCallback: TNS_LeScanCallback;
    private gattQueue;
    static readonly android: {
        ScanMode: typeof ScanMode;
        MatchMode: typeof MatchMode;
        MatchNum: typeof MatchNum;
        CallbackType: typeof CallbackType;
    };
    connections: {
        [k: string]: {
            state: ConnectionState;
            onConnected?: (e: {
                UUID: string;
                name: string;
                state: string;
                services: any[];
                advertismentData: AdvertismentData;
            }) => void;
            onDisconnected?: (e: {
                UUID: string;
                name: string;
            }) => void;
            device?: android.bluetooth.BluetoothGatt;
            onReadPromise?;
            onWritePromise?;
            onNotifyCallback?;
            advertismentData?: AdvertismentData;
        };
    };
    private broadcastReceiver;
    constructor();
    readonly enabled: boolean;
    coarseLocationPermissionGranted(): boolean;
    hasCoarseLocationPermission(): Promise<{}>;
    requestCoarseLocationPermission(callback?: () => void): Promise<boolean>;
    getAndroidLocationManager(): android.location.LocationManager;
    isGPSEnabled(): any;
    enableGPS(): Promise<void>;
    enable(): Promise<{}>;
    isBluetoothEnabled(): Promise<{}>;
    openBluetoothSettings(): Promise<{}>;
    scanningReferTimer: {
        timer?: number;
        resolve?: Function;
    };
    private stopCurrentScan();
    startScanning(arg: StartScanningOptions): Promise<{}>;
    stopScanning(): Promise<{}>;
    connect(arg: ConnectOptions): Promise<{}>;
    disconnect(arg: DisconnectOptions): Promise<{}>;
    read(arg: ReadOptions): any;
    write(arg: WriteOptions): any;
    writeWithoutResponse(arg: WriteOptions): any;
    startNotifying(arg: StartNotifyingOptions): any;
    stopNotifying(arg: StopNotifyingOptions): any;
    gattDisconnect(gatt: android.bluetooth.BluetoothGatt): void;
    private _findNotifyCharacteristic(bluetoothGattService, characteristicUUID);
    private _findCharacteristicOfType(bluetoothGattService, characteristicUUID, charType);
    private _getWrapper(arg, reject);
    private _isEnabled();
    private _getContext();
    private _getActivity();
}
