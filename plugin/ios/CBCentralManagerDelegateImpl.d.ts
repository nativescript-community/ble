import { Bluetooth } from './ios_main';
export declare class CBCentralManagerDelegateImpl extends NSObject implements CBCentralManagerDelegate {
    static ObjCProtocols: {
        prototype: CBCentralManagerDelegate;
    }[];
    private _owner;
    private _callback;
    static new(): CBCentralManagerDelegateImpl;
    initWithCallback(owner: WeakRef<Bluetooth>, callback: (result?) => void): CBCentralManagerDelegateImpl;
    centralManagerDidConnectPeripheral(central: CBCentralManager, peripheral: CBPeripheral): void;
    centralManagerDidDisconnectPeripheralError(central: CBCentralManager, peripheral: CBPeripheral, error?: NSError): void;
    centralManagerDidFailToConnectPeripheralError(central: CBCentralManager, peripheral: CBPeripheral, error?: NSError): void;
    centralManagerDidDiscoverPeripheralAdvertisementDataRSSI(central: CBCentralManager, peripheral: CBPeripheral, advData: NSDictionary<string, any>, RSSI: number): void;
    centralManagerDidUpdateState(central: CBCentralManager): void;
    centralManagerWillRestoreState(central: CBCentralManager, dict: NSDictionary<string, any>): void;
}
export declare class AdvertismentData {
    private advData;
    constructor(advData: NSDictionary<string, any>);
    readonly manufacturerData: ArrayBuffer;
    readonly data: ArrayBuffer;
    readonly manufacturerId: number;
    readonly txPowerLevel: any;
    readonly localName: any;
    readonly flags: number;
    readonly uuids: any[];
    readonly overtflow: any[];
    readonly solicitedServices: any[];
    readonly connectable: any;
    readonly serviceData: {};
}
