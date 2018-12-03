import { CLog, CLogTypes } from '../common';
import { Bluetooth, toArrayBuffer } from './ios_main';

/**
 * @link - https://developer.apple.com/documentation/corebluetooth/cbperipheraldelegate
 * The delegate of a CBPeripheral object must adopt the CBPeripheralDelegate protocol.
 * The delegate uses this protocol’s methods to monitor the discovery, exploration, and interaction of a remote peripheral’s services and properties.
 * There are no required methods in this protocol.
 */
export class CBPeripheralDelegateImpl extends NSObject implements CBPeripheralDelegate {
    public static ObjCProtocols = [CBPeripheralDelegate];
    public _onWritePromise;
    public _onReadPromise;
    public _onNotifyCallback;
    private _servicesWithCharacteristics;
    private _services;
    private _owner: WeakRef<Bluetooth>;
    private _callback: (result?) => void;

    static new(): CBPeripheralDelegateImpl {
        return super.new() as CBPeripheralDelegateImpl;
    }

    public initWithCallback(owner: WeakRef<Bluetooth>, callback: (result?) => void): CBPeripheralDelegateImpl {
        this._owner = owner;
        CLog(CLogTypes.info, `CBPeripheralDelegateImpl.initWithCallback ---- this._owner: ${this._owner}`);
        this._callback = callback;
        this._servicesWithCharacteristics = [];
        return this;
    }

    /**
     * Invoked when you discover the peripheral’s available services.
     * This method is invoked when your app calls the discoverServices(_:) method.
     * If the services of the peripheral are successfully discovered, you can access them through the peripheral’s services property.
     * If successful, the error parameter is nil.
     * If unsuccessful, the error parameter returns the cause of the failure.
     * @param peripheral [CBPeripheral] - The peripheral that the services belong to.
     * @param error [NSError] - If an error occurred, the cause of the failure.
     */
    public peripheralDidDiscoverServices(peripheral: CBPeripheral, error?: NSError) {
        CLog(CLogTypes.info, `CBPeripheralDelegateImpl.peripheralDidDiscoverServices ---- peripheral: ${peripheral}, ${error}`);
        // map native services to a JS object
        this._services = [];
        for (let i = 0; i < peripheral.services.count; i++) {
            const service = peripheral.services.objectAtIndex(i);
            this._services.push({
                UUID: service.UUID.UUIDString
            });
            // NOTE: discover all is slow
            peripheral.discoverCharacteristicsForService(null, service);
        }
    }

    /**
     * Invoked when you discover the included services of a specified service.
     * @param peripheral [CBPeripheral] - The peripheral providing this information.
     * @param service [CBService] - The CBService object containing the included service.
     * @param error [NSError] - If an error occurred, the cause of the failure.
     */
    public peripheralDidDiscoverIncludedServicesForServiceError(peripheral: CBPeripheral, service: CBService, error?: NSError) {
        CLog(CLogTypes.info, `CBPeripheralDelegateImpl.peripheralDidDiscoverIncludedServicesForServiceError ---- peripheral: ${peripheral}, service: ${service}, error: ${error}`);
    }

    /**
     * Invoked when you discover the characteristics of a specified service.
     * @param peripheral [CBPeripheral] - The peripheral providing this information.
     * @param service [CBService] - The CBService object containing the included service.
     * @param error [NSError] - If an error occurred, the cause of the failure.
     */
    public peripheralDidDiscoverCharacteristicsForServiceError(peripheral: CBPeripheral, service: CBService, error?: NSError) {
        CLog(CLogTypes.info, `CBPeripheralDelegateImpl.peripheralDidDiscoverCharacteristicsForServiceError ---- peripheral: ${peripheral}, service: ${service}, error: ${error}`);

        if (error) {
            // TODO invoke reject and stop processing
            return;
        }
        const characteristics = [];
        for (let i = 0; i < service.characteristics.count; i++) {
            const characteristic = service.characteristics.objectAtIndex(i);
            const result = {
                serviceUUID: service.UUID.UUIDString,
                UUID: characteristic.UUID.UUIDString,
                name: characteristic.UUID,
                // see serviceAndCharacteristicInfo in CBPer+Ext of Cordova plugin
                value: characteristic.value ? characteristic.value.base64EncodedStringWithOptions(0) : null,
                properties: this._getProperties(characteristic),
                // descriptors: this._getDescriptors(characteristic), // TODO we're not currently discovering these
                isNotifying: characteristic.isNotifying
                // permissions: characteristic.permissions // prolly not too useful - don't think we need this for iOS (BradMartin)
            };
            characteristics.push(result);

            for (let j = 0; j < this._services.length; j++) {
                const s = this._services[j];
                if (s.UUID === service.UUID.UUIDString) {
                    s.characteristics = characteristics;
                    this._servicesWithCharacteristics.push(s);
                    // the same service may be found multiple times, so make sure it's not added yet
                    this._services.splice(j, 1);
                    break;
                }
            }

            // Could add this one day: get details about the characteristic
            // peripheral.discoverDescriptorsForCharacteristic(characteristic);
        }

        if (this._services.length === 0) {
            if (this._callback) {
                const UUID = peripheral.identifier.UUIDString;
                this._callback({
                    UUID,
                    name: peripheral.name,
                    state: this._owner.get()._getState(peripheral.state),
                    services: this._servicesWithCharacteristics,
                    advertismentData: this._owner.get()._advData[UUID]
                });
                this._callback = null;
                delete this._owner.get()._advData[UUID];
            }
        }
    }

    /**
     * Invoked when you discover the descriptors of a specified characteristic.
     * @param peripheral [CBPeripheral] - The peripheral providing this information.
     * @param characteristic [CBCharacteristic] - The characteristic that the characteristic descriptors belong to.
     * @param error [NSError] - If an error occurred, the cause of the failure.
     */
    public peripheralDidDiscoverDescriptorsForCharacteristicError(peripheral: CBPeripheral, characteristic: CBCharacteristic, error?: NSError) {
        // NOTE that this cb won't be invoked bc we currently don't discover descriptors
        CLog(CLogTypes.info, `CBPeripheralDelegateImpl.peripheralDidDiscoverDescriptorsForCharacteristicError ---- peripheral: ${peripheral}, characteristic: ${characteristic}, error: ${error}`);

        // TODO extract details, see https://github.com/randdusing/cordova-plugin-bluetoothle/blob/master/src/ios/BluetoothLePlugin.m#L1844
        CLog(CLogTypes.info, `CBPeripheralDelegateImpl.peripheralDidDiscoverDescriptorsForCharacteristicError ---- characteristic.descriptors: ${characteristic.descriptors}`);
        for (let i = 0; i < characteristic.descriptors.count; i++) {
            const descriptor = characteristic.descriptors.objectAtIndex(i);
            CLog(CLogTypes.info, `CBPeripheralDelegateImpl.peripheralDidDiscoverDescriptorsForCharacteristicError ---- char desc UUID: ${descriptor.UUID.UUIDString}`);
        }

        // now let's see if we're ready to invoke the callback
        if (this._services.length === this._servicesWithCharacteristics.length) {
            if (this._callback) {
                this._callback({
                    UUID: peripheral.identifier.UUIDString,
                    name: peripheral.name,
                    state: this._owner.get()._getState(peripheral.state),
                    services: this._services
                });
                this._callback = null;
            }
        }
    }

    /**
     * Invoked when you retrieve a specified characteristic’s value, or when
     * the peripheral device notifies your app that the characteristic’s
     * value has changed.
     */
    public peripheralDidUpdateValueForCharacteristicError(peripheral: CBPeripheral, characteristic: CBCharacteristic, error?: NSError) {
        if (!characteristic) {
            CLog(CLogTypes.warning, `CBPeripheralDelegateImpl.peripheralDidUpdateValueForCharacteristicError ---- No CBCharacteristic.`);
            return;
        }

        if (error !== null) {
            // TODO handle.. pass in sep callback?
            CLog(CLogTypes.error, `CBPeripheralDelegateImpl.peripheralDidUpdateValueForCharacteristicError ---- ${error}`);
            return;
        }

        const result = {
            type: characteristic.isNotifying ? 'notification' : 'read',
            characteristicUUID: characteristic.UUID.UUIDString,
            valueRaw: characteristic.value,
            value: toArrayBuffer(characteristic.value)
        };

        if (result.type === 'read') {
            if (this._onReadPromise) {
                this._onReadPromise(result);
            } else {
                CLog(CLogTypes.info, 'No _onReadPromise found!');
            }
        } else {
            if (this._onNotifyCallback) {
                this._onNotifyCallback(result);
            } else {
                CLog(CLogTypes.info, '----- CALLBACK IS GONE -----');
            }
        }
    }

    /**
     * Invoked when you retrieve a specified characteristic descriptor’s value.
     */
    public peripheralDidUpdateValueForDescriptorError(peripheral: CBPeripheral, descriptor: CBDescriptor, error?: NSError) {
        CLog(CLogTypes.info, `CBPeripheralDelegateImpl.peripheralDidUpdateValueForDescriptorError ---- peripheral: ${peripheral}, descriptor: ${descriptor}, error: ${error}`);
    }

    /**
     * Invoked when you write data to a characteristic’s value.
     */
    public peripheralDidWriteValueForCharacteristicError(peripheral: CBPeripheral, characteristic: CBCharacteristic, error?: NSError) {
        CLog(CLogTypes.info, `CBPeripheralDelegateImpl.peripheralDidWriteValueForCharacteristicError ---- peripheral: ${peripheral}, characteristic: ${characteristic}, error: ${error}`);
        if (this._onWritePromise) {
            this._onWritePromise({
                characteristicUUID: characteristic.UUID.UUIDString
            });
        } else {
            CLog(CLogTypes.warning, 'CBPeripheralDelegateImpl.peripheralDidWriteValueForCharacteristicError ---- No _onWritePromise found!');
        }
    }

    /**
     * Invoked when the peripheral receives a request to start or stop
     * providing notifications for a specified characteristic’s value.
     */
    public peripheralDidUpdateNotificationStateForCharacteristicError(peripheral: CBPeripheral, characteristic: CBCharacteristic, error?: NSError) {
        CLog(CLogTypes.info, `CBPeripheralDelegateImpl.peripheralDidUpdateNotificationStateForCharacteristicError ---- peripheral: ${peripheral}, characteristic: ${characteristic}, error: ${error}`);
        if (error) {
            CLog(CLogTypes.error, `CBPeripheralDelegateImpl.peripheralDidUpdateNotificationStateForCharacteristicError ---- ${error}`);
        } else {
            if (characteristic.isNotifying) {
                CLog(CLogTypes.info, `CBPeripheralDelegateImpl.peripheralDidUpdateNotificationStateForCharacteristicError ---- Notification began on ${characteristic}`);
            } else {
                CLog(CLogTypes.info, `CBPeripheralDelegateImpl.peripheralDidUpdateNotificationStateForCharacteristicError ---- Notification stopped on  ${characteristic}, consider disconnecting`);
                // Bluetooth._manager.cancelPeripheralConnection(peripheral);
            }
        }
    }

    /**
     * IInvoked when you write data to a characteristic descriptor’s value.
     */
    public peripheralDidWriteValueForDescriptorError(peripheral: CBPeripheral, descriptor: CBDescriptor, error?: NSError) {
        CLog(CLogTypes.info, `CBPeripheralDelegateImpl.peripheralDidWriteValueForDescriptorError ---- peripheral: ${peripheral}, descriptor: ${descriptor}, error: ${error}`);
    }

    private _getProperties(characteristic: CBCharacteristic) {
        const props = characteristic.properties;
        return {
            // broadcast: (props & CBCharacteristicPropertyBroadcast) === CBCharacteristicPropertyBroadcast,
            broadcast: (props & CBCharacteristicProperties.PropertyBroadcast) === CBCharacteristicProperties.PropertyBroadcast,
            read: (props & CBCharacteristicProperties.PropertyRead) === CBCharacteristicProperties.PropertyRead,
            broadcast2: (props & CBCharacteristicProperties.PropertyBroadcast) === CBCharacteristicProperties.PropertyBroadcast,
            read2: (props & CBCharacteristicProperties.PropertyRead) === CBCharacteristicProperties.PropertyRead,
            write: (props & CBCharacteristicProperties.PropertyWrite) === CBCharacteristicProperties.PropertyWrite,
            writeWithoutResponse: (props & CBCharacteristicProperties.PropertyWriteWithoutResponse) === CBCharacteristicProperties.PropertyWriteWithoutResponse,
            notify: (props & CBCharacteristicProperties.PropertyNotify) === CBCharacteristicProperties.PropertyNotify,
            indicate: (props & CBCharacteristicProperties.PropertyIndicate) === CBCharacteristicProperties.PropertyIndicate,
            authenticatedSignedWrites: (props & CBCharacteristicProperties.PropertyAuthenticatedSignedWrites) === CBCharacteristicProperties.PropertyAuthenticatedSignedWrites,
            extendedProperties: (props & CBCharacteristicProperties.PropertyExtendedProperties) === CBCharacteristicProperties.PropertyExtendedProperties,
            notifyEncryptionRequired: (props & CBCharacteristicProperties.PropertyNotifyEncryptionRequired) === CBCharacteristicProperties.PropertyNotifyEncryptionRequired,
            indicateEncryptionRequired: (props & CBCharacteristicProperties.PropertyIndicateEncryptionRequired) === CBCharacteristicProperties.PropertyIndicateEncryptionRequired
        };
    }

    private _getDescriptors(characteristic) {
        const descs = characteristic.descriptors;
        const descsJs = [];
        for (let i = 0; i < descs.count; i++) {
            const desc = descs.objectAtIndex(i);
            CLog(CLogTypes.info, `CBPeripheralDelegateImpl._getDescriptors ---- descriptor value: ${desc.value}`);
            descsJs.push({
                UUID: desc.UUID.UUIDString,
                value: desc.value
            });
        }
        return descsJs;
    }
}
