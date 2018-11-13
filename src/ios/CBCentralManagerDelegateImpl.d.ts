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
  centralManagerDidDiscoverPeripheralAdvertisementDataRSSI(
    central: CBCentralManager,
    peripheral: CBPeripheral,
    advData: NSDictionary<string, any>,
    RSSI: number
  ): void;
  centralManagerDidUpdateState(central: CBCentralManager): void;
  centralManagerWillRestoreState(central: CBCentralManager, dict: NSDictionary<string, any>): void;
}
