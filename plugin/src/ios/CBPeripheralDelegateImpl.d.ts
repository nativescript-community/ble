import { Bluetooth } from './ios_main';
export declare class CBPeripheralDelegateImpl extends NSObject implements CBPeripheralDelegate {
  static ObjCProtocols: {
    prototype: CBPeripheralDelegate;
  }[];
  _onWritePromise: any;
  _onReadPromise: any;
  _onNotifyCallback: any;
  private _servicesWithCharacteristics;
  private _services;
  private _owner;
  private _callback;
  static new(): CBPeripheralDelegateImpl;
  initWithCallback(owner: WeakRef<Bluetooth>, callback: (result?) => void): CBPeripheralDelegateImpl;
  peripheralDidDiscoverServices(peripheral: CBPeripheral, error?: NSError): void;
  peripheralDidDiscoverIncludedServicesForServiceError(peripheral: CBPeripheral, service: CBService, error?: NSError): void;
  peripheralDidDiscoverCharacteristicsForServiceError(peripheral: CBPeripheral, service: CBService, error?: NSError): void;
  peripheralDidDiscoverDescriptorsForCharacteristicError(peripheral: CBPeripheral, characteristic: CBCharacteristic, error?: NSError): void;
  peripheralDidUpdateValueForCharacteristicError(peripheral: CBPeripheral, characteristic: CBCharacteristic, error?: NSError): void;
  peripheralDidUpdateValueForDescriptorError(peripheral: CBPeripheral, descriptor: CBDescriptor, error?: NSError): void;
  peripheralDidWriteValueForCharacteristicError(peripheral: CBPeripheral, characteristic: CBCharacteristic, error?: NSError): void;
  peripheralDidUpdateNotificationStateForCharacteristicError(
    peripheral: CBPeripheral,
    characteristic: CBCharacteristic,
    error?: NSError
  ): void;
  peripheralDidWriteValueForDescriptorError(peripheral: CBPeripheral, descriptor: CBDescriptor, error?: NSError): void;
  private _getProperties(characteristic);
  private _getDescriptors(characteristic);
}
