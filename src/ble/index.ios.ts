import { Trace } from '@nativescript/core';
import {
    BluetoothCommon,
    BluetoothError,
    BluetoothOptions,
    CLog,
    CLogTypes,
    ConnectOptions,
    DiscoverCharacteristicsOptions,
    DiscoverServicesOptions,
    MtuOptions,
    Peripheral,
    ReadOptions,
    ReadRSSIOptions,
    ReadResult,
    Service,
    StartNotifyingOptions,
    StartScanningOptions,
    StopNotifyingOptions,
    WriteOptions,
    bluetoothEnabled,
    prepareArgs,
    shortenUuidIfAssignedNumber
} from './index.common';

export {
    BluetoothError,
    BleTraceCategory,
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
} from './index.common';

function nativeEncoding(encoding: string) {
    switch (encoding) {
        case 'utf-8':
            return NSUTF8StringEncoding;
        case 'latin2':
        case 'iso-8859-2':
            return NSISOLatin2StringEncoding;
        case 'shift-jis':
            return NSShiftJISStringEncoding;
        case 'iso-2022-jp':
            return NSISO2022JPStringEncoding;
        case 'euc-jp':
            return NSJapaneseEUCStringEncoding;
        case 'windows-1250':
            return NSWindowsCP1250StringEncoding;
        case 'windows-1251':
            return NSWindowsCP1251StringEncoding;
        case 'windows-1252':
            return NSWindowsCP1252StringEncoding;
        case 'windows-1253':
            return NSWindowsCP1253StringEncoding;
        case 'windows-1254':
            return NSWindowsCP1254StringEncoding;
        case 'utf-16be':
            return NSUTF16BigEndianStringEncoding;
        case 'utf-16le':
            return NSUTF16LittleEndianStringEncoding;
        default:
        case 'iso-8859-1':
        case 'latin1':
            return NSISOLatin1StringEncoding;
    }
}

function valueToNSData(value: any, encoding = 'iso-8859-1') {
    if (value instanceof NSData) {
        return value;
    } else if (value instanceof ArrayBuffer) {
        // for ArrayBuffer to NSData
        return NSData.dataWithData(value as any);
    } else if (value.buffer) {
        // typed array
        return NSData.dataWithData(value.buffer);
    } else if (Array.isArray(value)) {
        return NSData.dataWithData(new Uint8Array(value).buffer as any);
    }
    const type = typeof value;
    if (type === 'string') {
        return NSString.stringWithString(value).dataUsingEncoding(nativeEncoding(encoding));
    } else if (type === 'number') {
        return NSData.dataWithData(new Uint8Array([value]).buffer as any);
    }
    return null;
}

function valueToString(value) {
    if (value instanceof NSData) {
        const data = new Uint8Array(interop.bufferFromData(value));
        const result = [];
        data.forEach((v, i) => (result[i] = v));
        return result;
    }
    return value;
}

import { iOSNativeHelper } from '@nativescript/core/utils/native-helper';
import { DisconnectOptions } from '.';

export type SubPeripheralDelegate = Partial<CBPeripheralDelegate>;
export type SubCentralManagerDelegate = Partial<CBCentralManagerDelegate>;

const FIXED_IOS_MTU = 185;

export interface CBPeripheralWithDelegate extends CBPeripheral {
    delegate: CBPeripheralDelegateImpl;
}
/**
 * @link - https://developer.apple.com/documentation/corebluetooth/cbperipheraldelegate
 * The delegate of a CBPeripheral object must adopt the CBPeripheralDelegate protocol.
 * The delegate uses this protocol’s methods to monitor the discovery, exploration, and interaction of a remote peripheral’s services and properties.
 * There are no required methods in this protocol.
 */
@NativeClass
class CBPeripheralDelegateImpl extends NSObject implements CBPeripheralDelegate {
    public static ObjCProtocols = [CBPeripheralDelegate];

    public onNotifyCallbacks: {
        [k: string]: (result: ReadResult) => void;
    };
    private _owner: WeakRef<Bluetooth>;
    private subDelegates: SubPeripheralDelegate[];

    public addSubDelegate(delegate: SubPeripheralDelegate) {
        const index = this.subDelegates.indexOf(delegate);
        if (index === -1) {
            this.subDelegates.push(delegate);
        }
    }

    public removeSubDelegate(delegate: SubPeripheralDelegate) {
        const index = this.subDelegates.indexOf(delegate);
        if (index !== -1) {
            this.subDelegates.splice(index, 1);
        }
    }

    static new(): CBPeripheralDelegateImpl {
        return super.new() as CBPeripheralDelegateImpl;
    }

    public initWithOwner(owner: WeakRef<Bluetooth>): CBPeripheralDelegateImpl {
        this._owner = owner;
        this.subDelegates = [];
        this.onNotifyCallbacks = {};
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, `CBPeripheralDelegateImpl.initWithOwner: ${owner.get()}`);
        }
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
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, `CBPeripheralDelegateImpl.peripheralDidDiscoverServices ---- peripheral: ${peripheral}, ${error}, ${this}`);
        }
        this.subDelegates.forEach((d) => {
            if (d.peripheralDidDiscoverServices) {
                d.peripheralDidDiscoverServices(peripheral, error);
            }
        });
    }

    /**
     * Invoked when you discover the included services of a specified service.
     * @param peripheral [CBPeripheral] - The peripheral providing this information.
     * @param service [CBService] - The CBService object containing the included service.
     * @param error [NSError] - If an error occurred, the cause of the failure.
     */
    public peripheralDidDiscoverIncludedServicesForServiceError(peripheral: CBPeripheral, service: CBService, error?: NSError) {
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, `CBPeripheralDelegateImpl.peripheralDidDiscoverIncludedServicesForServiceError ---- peripheral: ${peripheral}, service: ${service}, error: ${error}`);
        }
        this.subDelegates.forEach((d) => {
            if (d.peripheralDidDiscoverIncludedServicesForServiceError) {
                d.peripheralDidDiscoverIncludedServicesForServiceError(peripheral, service, error);
            }
        });
    }

    /**
     * Invoked when you discover the characteristics of a specified service.
     * @param peripheral [CBPeripheral] - The peripheral providing this information.
     * @param service [CBService] - The CBService object containing the included service.
     * @param error [NSError] - If an error occurred, the cause of the failure.
     */
    public peripheralDidDiscoverCharacteristicsForServiceError(peripheral: CBPeripheral, service: CBService, error?: NSError) {
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, `CBPeripheralDelegateImpl.peripheralDidDiscoverCharacteristicsForServiceError ---- peripheral: ${peripheral}, service: ${service}, error: ${error}`);
        }

        this.subDelegates.forEach((d) => {
            if (d.peripheralDidDiscoverCharacteristicsForServiceError) {
                d.peripheralDidDiscoverCharacteristicsForServiceError(peripheral, service, error);
            }
        });
    }

    /**
     * Invoked when you discover the descriptors of a specified characteristic.
     * @param peripheral [CBPeripheral] - The peripheral providing this information.
     * @param characteristic [CBCharacteristic] - The characteristic that the characteristic descriptors belong to.
     * @param error [NSError] - If an error occurred, the cause of the failure.
     */
    public peripheralDidDiscoverDescriptorsForCharacteristicError(peripheral: CBPeripheral, characteristic: CBCharacteristic, error?: NSError) {
        // NOTE that this cb won't be invoked bc we currently don't discover descriptors
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, `CBPeripheralDelegateImpl.peripheralDidDiscoverDescriptorsForCharacteristicError ---- peripheral: ${peripheral}, characteristic: ${characteristic}, error: ${error}`);
        }

        this.subDelegates.forEach((d) => {
            if (d.peripheralDidDiscoverDescriptorsForCharacteristicError) {
                d.peripheralDidDiscoverDescriptorsForCharacteristicError(peripheral, characteristic, error);
            }
        });
    }

    /**
     * Invoked when you retrieve a specified characteristic’s value, or when
     * the peripheral device notifies your app that the characteristic’s
     * value has changed.
     */
    public peripheralDidUpdateValueForCharacteristicError(peripheral: CBPeripheral, characteristic: CBCharacteristic, error?: NSError) {
        if (!characteristic) {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.warning, 'CBPeripheralDelegateImpl.peripheralDidUpdateValueForCharacteristicError ---- No CBCharacteristic.');
            }
            return;
        }

        this.subDelegates.forEach((d) => {
            if (d.peripheralDidUpdateValueForCharacteristicError) {
                d.peripheralDidUpdateValueForCharacteristicError(peripheral, characteristic, error);
            }
        });

        if (error !== null) {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.error, `CBPeripheralDelegateImpl.peripheralDidUpdateValueForCharacteristicError ---- ${error}`);
            }
            return;
        }

        if (characteristic.isNotifying) {
            const pUUID = NSUUIDToString(peripheral.identifier);
            const cUUID = CBUUIDToString(characteristic.UUID);
            const sUUID = CBUUIDToString(characteristic.service.UUID);
            const key = sUUID + '/' + cUUID;
            if (this.onNotifyCallbacks[key]) {
                this.onNotifyCallbacks[key]({
                    // type: 'notification',
                    peripheralUUID: pUUID,
                    serviceUUID: sUUID,
                    characteristicUUID: cUUID,
                    ios: characteristic.value,
                    value: toArrayBuffer(characteristic.value)
                });
            } else {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, '----- CALLBACK IS GONE -----');
                }
            }
        }
    }

    /**
     * Invoked when you retrieve a specified characteristic descriptor’s value.
     */
    public peripheralDidUpdateValueForDescriptorError(peripheral: CBPeripheral, descriptor: CBDescriptor, error?: NSError) {
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, `CBPeripheralDelegateImpl.peripheralDidUpdateValueForDescriptorError ---- peripheral: ${peripheral}, descriptor: ${descriptor}, error: ${error}`);
        }
        this.subDelegates.forEach((d) => {
            if (d.peripheralDidUpdateValueForDescriptorError) {
                d.peripheralDidUpdateValueForDescriptorError(peripheral, descriptor, error);
            }
        });
    }

    /**
     * Invoked when you write data to a characteristic’s value.
     */
    public peripheralDidWriteValueForCharacteristicError(peripheral: CBPeripheral, characteristic: CBCharacteristic, error?: NSError) {
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, `CBPeripheralDelegateImpl.peripheralDidWriteValueForCharacteristicError ---- peripheral: ${peripheral}, characteristic: ${characteristic}, error: ${error}`);
        }

        this.subDelegates.forEach((d) => {
            if (d.peripheralDidWriteValueForCharacteristicError) {
                d.peripheralDidWriteValueForCharacteristicError(peripheral, characteristic, error);
            }
        });
    }

    /**
     * Invoked when the peripheral receives a request to start or stop
     * providing notifications for a specified characteristic’s value.
     */
    public peripheralDidUpdateNotificationStateForCharacteristicError(peripheral: CBPeripheral, characteristic: CBCharacteristic, error?: NSError) {
        if (Trace.isEnabled()) {
            CLog(
                CLogTypes.info,
                `CBPeripheralDelegateImpl.peripheralDidUpdateNotificationStateForCharacteristicError ---- peripheral: ${peripheral}, characteristic: ${characteristic}, error: ${error}`
            );
        }

        this.subDelegates.forEach((d) => {
            if (d.peripheralDidUpdateNotificationStateForCharacteristicError) {
                d.peripheralDidUpdateNotificationStateForCharacteristicError(peripheral, characteristic, error);
            }
        });
        if (error) {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.error, `CBPeripheralDelegateImpl.peripheralDidUpdateNotificationStateForCharacteristicError ---- ${error}`);
            }
        } else {
            if (characteristic.isNotifying) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, `CBPeripheralDelegateImpl.peripheralDidUpdateNotificationStateForCharacteristicError ---- Notification began on ${characteristic}`);
                }
            } else {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, `CBPeripheralDelegateImpl.peripheralDidUpdateNotificationStateForCharacteristicError ---- Notification stopped on  ${characteristic}`);
                }
                // Bluetooth._manager.cancelPeripheralConnection(peripheral);
            }
        }
    }

    /**
     * IInvoked when you write data to a characteristic descriptor’s value.
     */
    public peripheralDidWriteValueForDescriptorError(peripheral: CBPeripheral, descriptor: CBDescriptor, error?: NSError) {
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, `CBPeripheralDelegateImpl.peripheralDidWriteValueForDescriptorError ---- peripheral: ${peripheral}, descriptor: ${descriptor}, error: ${error}`);
        }
        this.subDelegates.forEach((d) => {
            if (d.peripheralDidWriteValueForDescriptorError) {
                d.peripheralDidWriteValueForDescriptorError(peripheral, descriptor, error);
            }
        });
    }
}

/**
 * @link - https://developer.apple.com/documentation/corebluetooth/cbcentralmanagerdelegate
 * The CBCentralManagerDelegate protocol defines the methods that a delegate of a CBCentralManager object must adopt.
 * The optional methods of the protocol allow the delegate to monitor the discovery, connectivity, and retrieval of peripheral devices.
 * The only required method of the protocol indicates the availability of the central manager, and is called when the central manager’s state is updated.
 */
@NativeClass
class CBCentralManagerDelegateImpl extends NSObject implements CBCentralManagerDelegate {
    static ObjCProtocols = [CBCentralManagerDelegate];

    private _owner: WeakRef<Bluetooth>;
    private subDelegates: SubCentralManagerDelegate[];

    public addSubDelegate(delegate: SubCentralManagerDelegate) {
        const index = this.subDelegates.indexOf(delegate);
        if (index === -1) {
            this.subDelegates.push(delegate);
        }
    }

    public removeSubDelegate(delegate: SubCentralManagerDelegate) {
        const index = this.subDelegates.indexOf(delegate);
        if (index !== -1) {
            this.subDelegates.splice(index, 1);
        }
    }

    static new(): CBCentralManagerDelegateImpl {
        return super.new() as CBCentralManagerDelegateImpl;
    }

    public initWithOwner(owner: WeakRef<Bluetooth>): CBCentralManagerDelegateImpl {
        this._owner = owner;
        this.subDelegates = [];
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, `CBCentralManagerDelegateImpl.initWithOwner: ${this._owner}`);
        }
        // this._callback = callback;
        return this;
    }

    /**
     * Invoked when a connection is successfully created with a peripheral.
     * This method is invoked when a call to connect(_:options:) is successful.
     * You typically implement this method to set the peripheral’s delegate and to discover its services.
     * @param central [CBCentralManager] - The central manager providing this information.
     * @param peripheral [CBPeripheral] - The peripheral that has been connected to the system.
     */
    public centralManagerDidConnectPeripheral(central: CBCentralManager, peripheral: CBPeripheral) {
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, `----- CBCentralManagerDelegateImpl centralManager:didConnectPeripheral: ${peripheral}`);
        }

        this._owner.get().onPeripheralConnected(peripheral);
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, "----- CBCentralManagerDelegateImpl centralManager:didConnectPeripheral, let's discover service");
        }
        this.subDelegates.forEach((d) => {
            if (d.centralManagerDidConnectPeripheral) {
                d.centralManagerDidConnectPeripheral(central, peripheral);
            }
        });
    }

    /**
     * Invoked when an existing connection with a peripheral is torn down.
     * This method is invoked when a peripheral connected via the connect(_:options:) method is disconnected.
     * If the disconnection was not initiated by cancelPeripheralConnection(_:), the cause is detailed in error.
     * After this method is called, no more methods are invoked on the peripheral device’s CBPeripheralDelegate object.
     * Note that when a peripheral is disconnected, all of its services, characteristics, and characteristic descriptors are invalidated.
     * @param central [CBCentralManager] - The central manager providing this information.
     * @param peripheral [CBPeripheral] - The peripheral that has been disconnected.
     * @param error? [NSError] - If an error occurred, the cause of the failure.
     */
    public centralManagerDidDisconnectPeripheralError(central: CBCentralManager, peripheral: CBPeripheral, error?: NSError) {
        // this event needs to be honored by the client as any action afterwards crashes the app
        const UUID = NSUUIDToString(peripheral.identifier);
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, 'CBCentralManagerDelegate.centralManagerDidDisconnectPeripheralError ----', central, peripheral, error);
        }

        this._owner.get().onPeripheralDisconnected(peripheral);
        this.subDelegates.forEach((d) => {
            if (d.centralManagerDidDisconnectPeripheralError) {
                d.centralManagerDidDisconnectPeripheralError(central, peripheral, error);
            }
        });
    }

    /**
     * Invoked when the central manager fails to create a connection with a peripheral.
     * This method is invoked when a connection initiated via the connect(_:options:) method fails to complete.
     * Because connection attempts do not time out, a failed connection usually indicates a transient issue, in which case you may attempt to connect to the peripheral again.
     * @param central [CBCentralManager] - The central manager providing this information.
     * @param peripheral [CBPeripheral] - The peripheral that failed to connect.
     * @param error? [NSError] - The cause of the failure.
     */
    public centralManagerDidFailToConnectPeripheralError(central: CBCentralManager, peripheral: CBPeripheral, error?: NSError) {
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, 'CBCentralManagerDelegate.centralManagerDidFailToConnectPeripheralError ----', central, peripheral, error);
        }
        this.subDelegates.forEach((d) => {
            if (d.centralManagerDidDisconnectPeripheralError) {
                d.centralManagerDidFailToConnectPeripheralError(central, peripheral, error);
            }
        });
    }

    /**
     * Invoked when the central manager discovers a peripheral while scanning.
     * The advertisement data can be accessed through the keys listed in Advertisement Data Retrieval Keys.
     * You must retain a local copy of the peripheral if any command is to be performed on it.
     * In use cases where it makes sense for your app to automatically connect to a peripheral that is located within a certain range, you can use RSSI data to determine the proximity of a discovered peripheral device.
     * @param central [CBCentralManager] - The central manager providing the update.
     * @param peripheral [CBPeripheral] - The discovered peripheral.
     * @param advData [NSDictionary<string, any>] - A dictionary containing any advertisement data.
     * @param RSSI [NSNumber] - The current received signal strength indicator (RSSI) of the peripheral, in decibels.
     */
    public centralManagerDidDiscoverPeripheralAdvertisementDataRSSI(central: CBCentralManager, peripheral: CBPeripheral, advData: NSDictionary<string, any>, RSSI: number) {
        const UUIDString = NSUUIDToString(peripheral.identifier);
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, `CBCentralManagerDelegateImpl.centralManagerDidDiscoverPeripheralAdvertisementDataRSSI ---- ${peripheral.name} @ ${UUIDString} @ ${RSSI} @ ${advData}`);
        }
        const owner: Bluetooth = this._owner && this._owner.get();
        if (!owner) {
            return;
        }
        owner.adddDiscoverPeripheral(peripheral);

        const advertismentData = new AdvertismentData(advData);

        const payload = {
            UUID: UUIDString,
            name: peripheral.name,
            localName: advertismentData.localName,
            RSSI,
            advertismentData,
            nativeDevice: peripheral,
            state: this._owner.get()._getState(peripheral.state),
            manufacturerId: advertismentData.manufacturerId
        };
        owner._advData[UUIDString] = advertismentData;
        if (owner._onDiscovered) {
            owner._onDiscovered(payload);
        }
        owner.sendEvent(Bluetooth.device_discovered_event, payload);
    }

    /**
     * Invoked when the central manager’s state is updated.
     * You implement this required method to ensure that Bluetooth low energy is supported and available to use on the central device.
     * You should issue commands to the central manager only when the state of the central manager is powered on, as indicated by the poweredOn constant.
     * A state with a value lower than poweredOn implies that scanning has stopped and that any connected peripherals have been disconnected.
     * If the state moves below poweredOff, all CBPeripheral objects obtained from this central manager become invalid and must be retrieved or discovered again.
     * For a complete list and discussion of the possible values representing the state of the central manager, see the CBCentralManagerState enumeration in CBCentralManager.
     * @param central [CBCentralManager] - The central manager providing this information.
     */
    public centralManagerDidUpdateState(central: CBCentralManager) {
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, `CBCentralManagerDelegateImpl.centralManagerDidUpdateState: ${central.state}`);
        }
        if (central.state === CBManagerState.Unsupported) {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.warning, 'CBCentralManagerDelegateImpl.centralManagerDidUpdateState ---- This hardware does not support Bluetooth Low Energy.');
            }
        }
        this._owner.get().state = central.state;
    }

    /**
     * Invoked when the central manager is about to be restored by the system.
     * @param central [CBCentralManager] - The central manager providing this information.
     * @param dict [NSDictionary<string, any>] - A dictionary containing information about the central manager that was preserved by the system at the time the app was terminated.
     * For the available keys to this dictionary, see Central Manager State Restoration Options.
     * @link - https://developer.apple.com/documentation/corebluetooth/cbcentralmanagerdelegate/central_manager_state_restoration_options
     */
    public centralManagerWillRestoreState(central: CBCentralManager, dict: NSDictionary<string, any>) {
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, `CBCentralManagerDelegateImpl.centralManagerWillRestoreState ---- central: ${central}, dict: ${dict}`);
        }
    }
}
declare let NSMakeRange; // not recognized by platform-declarations

export class AdvertismentData {
    constructor(private advData: NSDictionary<string, any>) {}
    get manufacturerData() {
        const data = this.advData.objectForKey(CBAdvertisementDataManufacturerDataKey);
        if (data && data.length > 2) {
            return toArrayBuffer(data.subdataWithRange(NSMakeRange(2, data.length - 2)));
        }
        return undefined;
    }
    get data() {
        return toArrayBuffer(this.advData);
    }
    get manufacturerId() {
        const data = this.advData.objectForKey(CBAdvertisementDataManufacturerDataKey);
        if (data && data.length >= 2) {
            const manufacturerIdBuffer = toArrayBuffer(data.subdataWithRange(NSMakeRange(0, 2)));
            return new DataView(manufacturerIdBuffer, 0).getUint16(0, true);
        }
        return -1;
    }
    get txPowerLevel() {
        return this.advData.objectForKey(CBAdvertisementDataTxPowerLevelKey) || Number.MIN_VALUE;
    }
    get localName() {
        return this.advData.objectForKey(CBAdvertisementDataLocalNameKey);
    }
    get flags() {
        return -1;
    }
    get serviceUUIDs() {
        const result = [];
        const serviceUuids = this.advData.objectForKey(CBAdvertisementDataServiceUUIDsKey);
        if (serviceUuids) {
            for (let i = 0; i < serviceUuids.count; i++) {
                result.push(CBUUIDToString(serviceUuids[i]));
            }
        }
        return result;
    }
    get overtflow() {
        const result = [];
        const serviceUuids = this.advData.objectForKey(CBAdvertisementDataOverflowServiceUUIDsKey);
        if (serviceUuids) {
            for (let i = 0; i < serviceUuids.count; i++) {
                result.push(CBUUIDToString(serviceUuids[i]));
            }
        }
        return result;
    }
    get solicitedServices() {
        const result = [];
        const serviceUuids = this.advData.objectForKey(CBAdvertisementDataSolicitedServiceUUIDsKey);
        if (serviceUuids) {
            for (let i = 0; i < serviceUuids.count; i++) {
                result.push(CBUUIDToString(serviceUuids[i]));
            }
        }
        return result;
    }
    get connectable() {
        return this.advData.objectForKey(CBAdvertisementDataIsConnectable);
    }
    get serviceData() {
        const result = {};
        const obj = this.advData.objectForKey(CBAdvertisementDataServiceDataKey);
        if (obj) {
            obj.enumerateKeysAndObjectsUsingBlock((key, data) => {
                result[CBUUIDToString(key)] = toArrayBuffer(data);
            });
        }
        return result;
    }
}

let _bluetoothInstance: Bluetooth;
export function getBluetoothInstance() {
    if (!_bluetoothInstance) {
        _bluetoothInstance = new Bluetooth();
    }
    return _bluetoothInstance;
}

export function toArrayBuffer(value) {
    return value ? interop.bufferFromData(value) : null;
}

function _getProperties(characteristic: CBCharacteristic) {
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

export function NSUUIDToString(uuid: NSUUID) {
    return uuid.toString().toLowerCase();
}
export function CBUUIDToString(uuid: CBUUID) {
    return uuid.UUIDString.toLowerCase();
}

export class Bluetooth extends BluetoothCommon {
    private _centralDelegate: CBCentralManagerDelegateImpl = null;
    private _centralManager: CBCentralManager = null;

    public _discoverPeripherals: { [k: string]: CBPeripheral } = {};
    public _connectedPeripherals: { [k: string]: CBPeripheral } = {};
    public _connectCallbacks = {};
    public _disconnectCallbacks = {};

    // _advData is used to store Advertisment Data so that we can send it to connection callback
    public _advData = {};
    public _onDiscovered = null;

    clear() {
        // doing nothing on ios
    }

    _state: CBManagerState = CBManagerState.Unsupported;
    set state(state: CBManagerState) {
        if (this._state !== state) {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, 'BLE state change', state);
            }
            this._state = state;
            this.sendEvent(BluetoothCommon.bluetooth_status_event, {
                state: state === CBManagerState.Unsupported ? 'unsupported' : state === CBManagerState.PoweredOn ? 'on' : 'off'
            });
        }
    }
    get state() {
        return this._state;
    }

    get centralDelegate() {
        if (!this._centralDelegate) {
            this._centralDelegate = CBCentralManagerDelegateImpl.new().initWithOwner(new WeakRef(this));
        }
        return this._centralDelegate;
    }

    ensureCentralManager() {
        if (!this._centralManager) {
            const options: NSMutableDictionary<any, any> = new (NSMutableDictionary as any)([this.showPowerAlertPopup], [CBCentralManagerOptionShowPowerAlertKey]);
            if (this.restoreIdentifier) {
                options.setObjectForKey(this.restoreIdentifier, CBCentralManagerOptionRestoreIdentifierKey);
            }
            this._centralManager = CBCentralManager.alloc().initWithDelegateQueueOptions(this.centralDelegate, null, options);
            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, `creating CBCentralManager: ${this._centralManager}`);
            }
        }
    }
    get centralManager() {
        this.ensureCentralManager();
        return this._centralManager;
    }

    private restoreIdentifier: string;

    constructor(
        restoreIdentifierOrOptions: string | Partial<BluetoothOptions> | null = 'ns_bluetooth',
        private showPowerAlertPopup = false
    ) {
        super();
        if (typeof restoreIdentifierOrOptions === 'object') {
            if (restoreIdentifierOrOptions.restoreIdentifier === undefined) {
                this.restoreIdentifier = 'ns_bluetooth';
            } else {
                this.restoreIdentifier = restoreIdentifierOrOptions.restoreIdentifier;
            }
            this.showPowerAlertPopup = !!restoreIdentifierOrOptions.showPowerAlertPopup;
        } else {
            this.restoreIdentifier = restoreIdentifierOrOptions;
        }

        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, 'Creating Bluetooth instance', this.restoreIdentifier);
        }
    }

    onListenerAdded(eventName: string, count: number) {
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, 'onListenerAdded', eventName, count);
        }
        if (eventName === Bluetooth.bluetooth_status_event) {
            // ensure centralManager is set to have status event
            this.ensureCentralManager();
        }
    }

    public _getState(state: CBPeripheralState) {
        if (state === CBPeripheralState.Connecting) {
            return 'connecting';
        } else if (state === CBPeripheralState.Connected) {
            return 'connected';
        } else if (state === CBPeripheralState.Disconnected) {
            return 'disconnected';
        } else {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.warning, '_getState ---- Unexpected state, returning "disconnected" for state of', state);
            }
            return 'disconnected';
        }
    }

    private prepareConnectedPeripheralDelegate(peripheral: CBPeripheral) {
        if (!peripheral.delegate) {
            const UUID = NSUUIDToString(peripheral.identifier);
            const delegate = CBPeripheralDelegateImpl.new().initWithOwner(new WeakRef(this));
            CFRetain(delegate);
            peripheral.delegate = delegate;
        }
    }

    public onPeripheralDisconnected(peripheral: CBPeripheral) {
        const UUID = NSUUIDToString(peripheral.identifier);
        const cb = this._disconnectCallbacks[UUID];

        if (cb) {
            cb({
                UUID,
                name: peripheral.name
            });
            delete this._disconnectCallbacks[UUID];
        }
        this.sendEvent(Bluetooth.device_disconnected_event, {
            UUID,
            name: peripheral.name
        });
        if (peripheral.delegate) {
            CFRelease(peripheral.delegate);
            peripheral.delegate = null;
        }
        delete this._connectedPeripherals[UUID];
    }
    public onPeripheralConnected(peripheral: CBPeripheral) {
        const UUID = NSUUIDToString(peripheral.identifier);
        this.prepareConnectedPeripheralDelegate(peripheral);
        this._connectedPeripherals[UUID] = peripheral;
    }

    public async isBluetoothEnabled() {
        if (this._state === CBManagerState.Unsupported) {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, 'isBluetoothEnabled', 'central manager not ready, waiting for it to start');
            }
            this.ensureCentralManager();
            return new Promise<boolean>((resolve) => {
                this.once(BluetoothCommon.bluetooth_status_event, () => {
                    resolve(this._isEnabled());
                });
            });
        }
        return this._isEnabled();
    }
    scanningReferTimer: {
        timer?: NodeJS.Timeout;
        resolve?: Function;
    };

    @bluetoothEnabled
    public startScanning(args: StartScanningOptions) {
        const methodName = 'startScanning';
        return new Promise<void>((resolve, reject) => {
            try {
                this._discoverPeripherals = {};
                this._onDiscovered = args.onDiscovered;

                let services: any[] = null;
                if (args.filters) {
                    services = [];
                    args.filters.forEach((f) => {
                        if (f.serviceUUID) {
                            services.push(CBUUID.UUIDWithString(f.serviceUUID));
                        }
                    });
                }
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, methodName, '---- services:', services);
                }

                const options: NSMutableDictionary<any, any> = new (NSMutableDictionary as any)();
                if (!args.avoidDuplicates) {
                    options.setObjectForKey(true, CBCentralManagerScanOptionAllowDuplicatesKey);
                }

                // TODO: check on the services as any casting
                this.centralManager.scanForPeripheralsWithServicesOptions(services as any, options);
                if (this.scanningReferTimer) {
                    clearTimeout(this.scanningReferTimer.timer);
                    this.scanningReferTimer.resolve();
                }
                this.scanningReferTimer = {};
                if (args.seconds) {
                    this.scanningReferTimer.timer = setTimeout(() => {
                        // note that by now a manual 'stop' may have been invoked, but that doesn't hurt
                        this.centralManager.stopScan();
                        resolve();
                    }, args.seconds * 1000);
                    this.scanningReferTimer.resolve = resolve;
                } else {
                    resolve();
                }
                if (__DEV__) {
                }
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.error, methodName, '---- error:', ex);
                }
                reject(
                    new BluetoothError(ex.message, {
                        stack: ex.stack,
                        nativeException: ex.nativeException,
                        method: methodName,
                        arguments: args
                    })
                );
            }
        });
    }

    public enable() {
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, 'enable ---- Not possible on iOS');
        }
        return this.isBluetoothEnabled();
    }

    public openBluetoothSettings(url?: string): Promise<void> {
        return Promise.reject(new BluetoothError(BluetoothCommon.msg_cant_open_settings));
        // return this.isBluetoothEnabled().then(isEnabled => {
        //     if (!isEnabled) {
        //         return Promise.resolve().then(() => {
        //             const settingsUrl = NSURL.URLWithString(url || UIApplicationOpenSettingsURLString);
        //             if (UIApplication.sharedApplication.canOpenURL(settingsUrl)) {
        //                 UIApplication.sharedApplication.openURLOptionsCompletionHandler(settingsUrl, null, function(success) {
        //                     // we get the callback for opening the URL, not enabling the bluetooth!
        //                     if (success) {
        //                         return Promise.reject(undefined);
        //                     } else {
        //                         return Promise.reject(BluetoothCommon.msg_cant_open_settings);
        //                     }
        //                 });
        //             }
        //         });
        //     }
        //     return null;
        // });
    }
    @bluetoothEnabled
    public stopScanning() {
        const methodName = 'stopScanning';
        return new Promise<void>((resolve, reject) => {
            try {
                this.centralManager.stopScan();
                if (this.scanningReferTimer) {
                    this.scanningReferTimer.resolve && this.scanningReferTimer.resolve();
                    clearTimeout(this.scanningReferTimer.timer);
                    this.scanningReferTimer = null;
                }
                resolve();
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.error, methodName, '---- error:', ex);
                }
                reject(
                    new BluetoothError(ex.message, {
                        stack: ex.stack,
                        nativeException: ex.nativeException,
                        method: methodName
                    })
                );
            }
        });
    }

    public clearAdvertismentCache() {
        this._advData = {};
    }

    @bluetoothEnabled
    @prepareArgs
    public async getDevice(args: DisconnectOptions) {
        const methodName = 'getDevice';
        if (!args.UUID) {
            return Promise.reject(
                new BluetoothError(BluetoothCommon.msg_missing_parameter, {
                    method: methodName,
                    type: BluetoothCommon.UUIDKey,
                    arguments: args
                })
            );
        }
        return this.findDiscoverPeripheral(args.UUID);
    }

    @bluetoothEnabled
    @prepareArgs
    public async connect(args: ConnectOptions) {
        const methodName = 'connect';
        try {
            if (!args.UUID) {
                return Promise.reject(
                    new BluetoothError(BluetoothCommon.msg_missing_parameter, {
                        method: methodName,
                        type: BluetoothCommon.UUIDKey,
                        arguments: args
                    })
                );
            }
            const connectingUUID = args.UUID;
            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, methodName, '----', args.UUID);
            }
            const peripheral = this.findDiscoverPeripheral(args.UUID);

            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, methodName, '---- peripheral found', peripheral);
            }

            if (!peripheral) {
                throw new BluetoothError(BluetoothCommon.msg_no_peripheral, {
                    method: methodName,
                    arguments: args
                });
            } else {
                await new Promise<void>((resolve, reject) => {
                    const subD = {
                        centralManagerDidConnectPeripheral: (central: CBCentralManager, peripheral: CBPeripheral) => {
                            const UUID = NSUUIDToString(peripheral.identifier);
                            if (UUID === connectingUUID) {
                                resolve();
                                this._centralDelegate.removeSubDelegate(subD);
                            }
                        },
                        centralManagerDidFailToConnectPeripheralError: (central: CBCentralManager, peripheral: CBPeripheral, error?: NSError) => {
                            const UUID = NSUUIDToString(peripheral.identifier);
                            if (UUID === connectingUUID) {
                                reject(
                                    new BluetoothError(error.localizedDescription, {
                                        method: methodName,
                                        status: error.code
                                    })
                                );
                                this._centralDelegate.removeSubDelegate(subD);
                            }
                        }
                    };
                    if (Trace.isEnabled()) {
                        CLog(CLogTypes.info, methodName, '---- Connecting to peripheral with UUID:', connectingUUID, this._centralDelegate, this._centralManager);
                    }
                    this.centralDelegate.addSubDelegate(subD);
                    this._connectCallbacks[connectingUUID] = args.onConnected;
                    this._disconnectCallbacks[connectingUUID] = args.onDisconnected;
                    if (Trace.isEnabled()) {
                        CLog(CLogTypes.info, methodName, '----about to connect:', connectingUUID, this._centralDelegate, this._centralManager);
                    }
                    this.centralManager.connectPeripheralOptions(peripheral, null);
                });
                let services,
                    mtu = FIXED_IOS_MTU;
                if (args.autoDiscoverAll !== true) {
                    services = (await this.discoverAll({ peripheralUUID: connectingUUID }))?.services;
                } else if (args.serviceUUIDs) {
                    services = (await this.discoverAll({ peripheralUUID: connectingUUID, serviceUUIDs: args.serviceUUIDs }))?.services;
                }
                if (!!args.autoMaxMTU) {
                    mtu = await this.requestMtu({ peripheralUUID: connectingUUID, value: FIXED_IOS_MTU });
                }
                const adv = this._advData[connectingUUID];
                const dataToSend = {
                    UUID: connectingUUID,
                    name: peripheral.name,
                    state: this._getState(peripheral.state),
                    services,
                    nativeDevice: peripheral,
                    localName: adv?.localName,
                    manufacturerId: adv?.manufacturerId,
                    advertismentData: adv,
                    mtu
                };
                // delete this._advData[connectingUUID];
                const cb = this._connectCallbacks[connectingUUID];
                if (cb) {
                    cb(dataToSend);
                    delete this._connectCallbacks[connectingUUID];
                }
                this.sendEvent(Bluetooth.device_connected_event, dataToSend);
                return dataToSend;
            }
        } catch (ex) {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.error, methodName, '---- error:', ex);
            }
            throw new BluetoothError(ex.message, {
                stack: ex.stack,
                nativeException: ex.nativeException,
                method: methodName,
                arguments: args
            });
        }
    }

    @bluetoothEnabled
    @prepareArgs
    public async disconnect(args) {
        const methodName = 'disconnect';
        try {
            if (!args.UUID) {
                throw new BluetoothError(BluetoothCommon.msg_missing_parameter, {
                    method: methodName,
                    type: BluetoothCommon.UUIDKey,
                    arguments: args
                });
            }
            const pUUID = args.UUID;
            const peripheral = this.findPeripheral(pUUID);
            if (!peripheral) {
                throw new BluetoothError(BluetoothCommon.msg_no_peripheral, {
                    method: methodName,
                    arguments: args
                });
            } else {
                // no need to send an error when already disconnected, but it's wise to check it
                if (peripheral.state !== CBPeripheralState.Disconnected) {
                    return new Promise<void>((resolve, reject) => {
                        const subD = {
                            centralManagerDidDisconnectPeripheralError: (central: CBCentralManager, peripheral: CBPeripheral, error?: NSError) => {
                                const UUID = NSUUIDToString(peripheral.identifier);
                                if (UUID === pUUID) {
                                    if (error) {
                                        reject(
                                            new BluetoothError(error.localizedDescription, {
                                                method: methodName,
                                                status: error.code
                                            })
                                        );
                                    } else {
                                        resolve();
                                    }
                                    this._centralDelegate.removeSubDelegate(subD);
                                }
                            }
                        };
                        this.centralDelegate.addSubDelegate(subD);
                        if (Trace.isEnabled()) {
                            CLog(CLogTypes.info, methodName, '---- Disconnecting peripheral with UUID', pUUID);
                        }
                        this.centralManager.cancelPeripheralConnection(peripheral);
                    });
                }
            }
        } catch (ex) {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.error, methodName, '---- error:', ex);
            }
            throw new BluetoothError(ex.message, {
                stack: ex.stack,
                nativeException: ex.nativeException,
                method: methodName,
                arguments: args
            });
        }
    }

    @bluetoothEnabled
    @prepareArgs
    public async isConnected(args) {
        const methodName = 'isConnected';
        try {
            if (!args.UUID) {
                throw new BluetoothError(BluetoothCommon.msg_missing_parameter, {
                    method: methodName,
                    type: BluetoothCommon.UUIDKey,
                    arguments: args
                });
            }
            const peripheral = this.findPeripheral(args.UUID);
            if (peripheral === null) {
                return false;
            } else {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, methodName, '---- checking connection with peripheral UUID:', args.UUID);
                }
                return peripheral.state === CBPeripheralState.Connected;
            }
        } catch (ex) {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.error, methodName, '---- error:', ex);
            }

            throw new BluetoothError(ex.message, {
                stack: ex.stack,
                nativeException: ex.nativeException,
                method: methodName,
                arguments: args
            });
        }
    }

    public findPeripheral(UUID) {
        let result = this._connectedPeripherals[UUID] || this._discoverPeripherals[UUID];
        if (!result) {
            const periphs = this.centralManager.retrievePeripheralsWithIdentifiers([NSUUID.alloc().initWithUUIDString(UUID)]);
            if (periphs.count > 0) {
                result = periphs.objectAtIndex(0);
                this.prepareConnectedPeripheralDelegate(result);
            }
        }
        return result as CBPeripheralWithDelegate;
    }
    public adddDiscoverPeripheral(peripheral) {
        const UUID = NSUUIDToString(peripheral.identifier);
        if (!this._discoverPeripherals[UUID]) {
            this._discoverPeripherals[UUID] = peripheral;
        }
    }
    public findDiscoverPeripheral(UUID) {
        let result = this._discoverPeripherals[UUID];
        if (!result) {
            const periphs = this.centralManager.retrievePeripheralsWithIdentifiers([NSUUID.alloc().initWithUUIDString(UUID)]);
            if (periphs.count > 0) {
                result = periphs.objectAtIndex(0);
            }
        }
        return result;
    }

    @prepareArgs
    public read(args: ReadOptions) {
        const methodName = 'read';
        return this._getWrapper(args, CBCharacteristicProperties.PropertyRead).then(
            (wrapper) =>
                new Promise((resolve, reject) => {
                    if (Trace.isEnabled()) {
                        CLog(CLogTypes.info, methodName, `---- peripheralUUID:${args.peripheralUUID} serviceUUID:${args.serviceUUID} characteristicUUID:${args.characteristicUUID}`);
                    }

                    const pUUID = args.peripheralUUID;
                    const p = wrapper.peripheral;
                    let timeoutTimer;
                    if (args.timeout > 0) {
                        timeoutTimer = setTimeout(() => {
                            // we need to try catch because the simple fact of creating a new Error actually throws.
                            // so we will get an uncaughtException
                            try {
                                reject(new Error('timeout'));
                            } catch {}
                        }, args.timeout);
                    }
                    const subD = {
                        peripheralDidUpdateValueForCharacteristicError: (peripheral: CBPeripheral, characteristic: CBCharacteristic, error?: NSError) => {
                            if (!characteristic) {
                                return;
                            }

                            const UUID = NSUUIDToString(peripheral.identifier);
                            const cUUID = CBUUIDToString(characteristic.UUID);
                            const sUUID = CBUUIDToString(characteristic.service.UUID);

                            if (UUID === pUUID && cUUID === args.characteristicUUID && sUUID === args.serviceUUID) {
                                timeoutTimer && clearTimeout(timeoutTimer);
                                if (Trace.isEnabled()) {
                                    CLog(CLogTypes.info, methodName, '---- peripheralDidUpdateValueForCharacteristicError', error);
                                }
                                if (error) {
                                    reject(
                                        new BluetoothError(error.localizedDescription, {
                                            method: 'peripheralDidUpdateValueForCharacteristicError',
                                            status: error.code,
                                            arguments: args
                                        })
                                    );
                                } else {
                                    resolve({
                                        characteristicUUID: cUUID,
                                        ios: characteristic.value,
                                        value: toArrayBuffer(characteristic.value)
                                    });
                                }
                                p.delegate.removeSubDelegate(subD);
                            }
                        }
                    };
                    p.delegate.addSubDelegate(subD);
                    try {
                        p.readValueForCharacteristic(wrapper.characteristic);
                    } catch (ex) {
                        if (Trace.isEnabled()) {
                            CLog(CLogTypes.error, methodName, '---- error:', ex);
                        }
                        timeoutTimer && clearTimeout(timeoutTimer);
                        reject(
                            new BluetoothError(ex.message, {
                                stack: ex.stack,
                                nativeException: ex.nativeException,
                                method: methodName,
                                arguments: args
                            })
                        );
                    }
                })
        );
    }
    @prepareArgs
    public requestMtu(args: MtuOptions) {
        const methodName = 'requestMtu';
        if (!args.value) {
            return Promise.reject(
                new BluetoothError(BluetoothCommon.msg_missing_parameter, {
                    method: methodName,
                    type: 'value',
                    arguments: args
                })
            );
        }
        const peripheral = this.findPeripheral(args.peripheralUUID);
        if (!peripheral) {
            return Promise.reject(new BluetoothError(BluetoothCommon.msg_no_peripheral, { method: methodName, arguments: args }));
        }
        return Promise.resolve(
            Math.min(peripheral.maximumWriteValueLengthForType(CBCharacteristicWriteType.WithoutResponse), peripheral.maximumWriteValueLengthForType(CBCharacteristicWriteType.WithResponse))
        );
    }
    @prepareArgs
    public async readRssi(args: ReadRSSIOptions) {
        const methodName = 'readRssi';
        const p = await this._getDeviceWrapper(args);
        return new Promise<number>((resolve, reject) => {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, methodName, `---- peripheralUUID:${args.peripheralUUID}`);
            }
            const pUUID = args.peripheralUUID;
            const subD = {
                peripheralDidReadRSSIError: (peripheral: CBPeripheral, rssi: number, error?: NSError) => {
                    if (Trace.isEnabled()) {
                        CLog(CLogTypes.info, methodName, '---- peripheralDidWriteValueForCharacteristicError', error);
                    }
                    const UUID = NSUUIDToString(peripheral.identifier);
                    if (UUID === pUUID) {
                        if (error) {
                            reject(
                                new BluetoothError(error.localizedDescription, {
                                    method: methodName,
                                    status: error.code
                                })
                            );
                        } else {
                            resolve(rssi);
                        }
                        p.delegate.removeSubDelegate(subD);
                    }
                }
            };
            p.delegate.addSubDelegate(subD);
            try {
                p.readRSSI();
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.error, methodName, '---- error:', ex);
                }
                p.delegate.removeSubDelegate(subD);
                reject(
                    new BluetoothError(ex.message, {
                        stack: ex.stack,
                        nativeException: ex.nativeException,
                        method: methodName,
                        arguments: args
                    })
                );
            }
        });
    }
    @prepareArgs
    public write(args: WriteOptions) {
        const methodName = 'write';
        if (!args.value) {
            return Promise.reject(
                new BluetoothError(BluetoothCommon.msg_missing_parameter, {
                    method: methodName,
                    type: 'value',
                    arguments: args
                })
            );
        }
        return this._getWrapper(args, CBCharacteristicProperties.PropertyWrite).then(
            (wrapper) =>
                new Promise<void>((resolve, reject) => {
                    if (Trace.isEnabled()) {
                        CLog(CLogTypes.info, methodName, `---- peripheralUUID:${args.peripheralUUID} serviceUUID:${args.serviceUUID} characteristicUUID:${args.characteristicUUID}`);
                    }
                    const valueEncoded = valueToNSData(args.value, args.encoding);

                    if (valueEncoded === null) {
                        return reject(
                            new BluetoothError(BluetoothCommon.msg_invalid_value, {
                                method: methodName,
                                arguments: args
                            })
                        );
                    }
                    const pUUID = args.peripheralUUID;
                    const p = wrapper.peripheral;
                    let timeoutTimer;
                    if (args.timeout > 0) {
                        timeoutTimer = setTimeout(() => {
                            // we need to try catch because the simple fact of creating a new Error actually throws.
                            // so we will get an uncaughtException
                            try {
                                reject(new Error('timeout'));
                            } catch {}
                        }, args.timeout);
                    }
                    const subD = {
                        peripheralDidWriteValueForCharacteristicError: (peripheral: CBPeripheral, characteristic: CBCharacteristic, error?: NSError) => {
                            if (!characteristic) {
                                return;
                            }
                            if (Trace.isEnabled()) {
                                CLog(CLogTypes.info, methodName, '---- peripheralDidWriteValueForCharacteristicError', error);
                            }
                            const UUID = NSUUIDToString(peripheral.identifier);
                            const cUUID = CBUUIDToString(characteristic.UUID);
                            const sUUID = CBUUIDToString(characteristic.service.UUID);
                            if (UUID === pUUID && cUUID === args.characteristicUUID && sUUID === args.serviceUUID) {
                                timeoutTimer && clearTimeout(timeoutTimer);
                                if (error) {
                                    reject(
                                        new BluetoothError(error.localizedDescription, {
                                            method: methodName,
                                            status: error.code
                                        })
                                    );
                                } else {
                                    resolve();
                                }
                                p.delegate.removeSubDelegate(subD);
                            }
                        }
                    };
                    p.delegate.addSubDelegate(subD);
                    try {
                        p.writeValueForCharacteristicType(valueEncoded, wrapper.characteristic, CBCharacteristicWriteType.WithResponse);
                    } catch (ex) {
                        if (Trace.isEnabled()) {
                            CLog(CLogTypes.error, methodName, '---- error:', ex);
                        }
                        timeoutTimer && clearTimeout(timeoutTimer);
                        p.delegate.removeSubDelegate(subD);
                        return reject(
                            new BluetoothError(ex.message, {
                                stack: ex.stack,
                                nativeException: ex.nativeException,
                                method: methodName,
                                arguments: args
                            })
                        );
                    }
                    if (Trace.isEnabled()) {
                        CLog(CLogTypes.info, methodName, JSON.stringify(valueToString(valueEncoded)));
                    }
                })
        );
    }

    @prepareArgs
    public writeWithoutResponse(args: WriteOptions) {
        const methodName = 'writeWithoutResponse';
        if (!args.value) {
            return Promise.reject(
                new BluetoothError(BluetoothCommon.msg_missing_parameter, {
                    method: methodName,
                    type: 'value',
                    arguments: args
                })
            );
        }

        return this._getWrapper(args, CBCharacteristicProperties.PropertyWriteWithoutResponse).then((wrapper) => {
            try {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, methodName, `---- peripheralUUID:${args.peripheralUUID} serviceUUID:${args.serviceUUID} characteristicUUID:${args.characteristicUUID}`);
                }
                const valueEncoded = valueToNSData(args.value, args.encoding);

                if (valueEncoded === null) {
                    return Promise.reject(
                        new BluetoothError(BluetoothCommon.msg_invalid_value, {
                            method: methodName,
                            arguments: args
                        })
                    );
                }

                wrapper.peripheral.writeValueForCharacteristicType(valueEncoded, wrapper.characteristic, CBCharacteristicWriteType.WithoutResponse);

                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, methodName, JSON.stringify(valueToString(valueEncoded)));
                }

                return null;
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.error, methodName, '---- error:', ex);
                }
                return Promise.reject(
                    new BluetoothError(ex.message, {
                        stack: ex.stack,
                        nativeException: ex.nativeException,
                        method: methodName,
                        arguments: args
                    })
                );
            }
        });
    }

    @prepareArgs
    public startNotifying(args: StartNotifyingOptions) {
        const methodName = 'startNotifying';
        return this._getWrapper(args, CBCharacteristicProperties.PropertyNotify).then((wrapper) => {
            try {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, methodName, `---- peripheralUUID:${args.peripheralUUID} serviceUUID:${args.serviceUUID} characteristicUUID:${args.characteristicUUID}`);
                }
                const cb =
                    args.onNotify ||
                    function (result) {
                        if (Trace.isEnabled()) {
                            CLog(CLogTypes.info, methodName, '---- No "onNotify" callback function specified for "startNotifying()"');
                        }
                    };

                const delegate = wrapper.peripheral.delegate;
                const key = args.serviceUUID + '/' + args.characteristicUUID;
                delegate.onNotifyCallbacks[key] = cb;
                wrapper.peripheral.setNotifyValueForCharacteristic(true, wrapper.characteristic);
                return null;
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.error, methodName, '---- error:', ex);
                }
                return Promise.reject(
                    new BluetoothError(ex.message, {
                        stack: ex.stack,
                        nativeException: ex.nativeException,
                        method: methodName,
                        arguments: args
                    })
                );
            }
        });
    }

    @prepareArgs
    public stopNotifying(args: StopNotifyingOptions) {
        const methodName = 'stopNotifying';
        return this._getWrapper(args, CBCharacteristicProperties.PropertyNotify).then((wrapper) => {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.info, methodName, `---- peripheralUUID:${args.peripheralUUID} serviceUUID:${args.serviceUUID} characteristicUUID:${args.characteristicUUID}`);
            }
            try {
                const peripheral = this.findPeripheral(args.peripheralUUID);
                const key = args.serviceUUID + '/' + args.characteristicUUID;
                delete peripheral.delegate.onNotifyCallbacks[key];
                peripheral.setNotifyValueForCharacteristic(false, wrapper.characteristic);
                return null;
            } catch (ex) {
                if (Trace.isEnabled()) {
                    CLog(CLogTypes.error, methodName, '---- error:', ex);
                }
                return Promise.reject(
                    new BluetoothError(ex.message, {
                        stack: ex.stack,
                        nativeException: ex.nativeException,
                        method: methodName,
                        arguments: args
                    })
                );
            }
        });
    }

    @bluetoothEnabled
    @prepareArgs
    public discoverServices(args: DiscoverServicesOptions) {
        const methodName = 'discoverServices';
        if (!args.peripheralUUID) {
            return Promise.reject(
                new BluetoothError(BluetoothCommon.msg_missing_parameter, {
                    method: methodName,
                    type: BluetoothCommon.peripheralUUIDKey,
                    arguments: args
                })
            );
        }
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, methodName, `---- peripheralUUID:${args.peripheralUUID}`);
        }
        const pUUID = args.peripheralUUID;
        const p = this.findPeripheral(pUUID);
        if (!p) {
            return Promise.reject(
                new BluetoothError(BluetoothCommon.msg_no_peripheral, {
                    method: methodName,
                    arguments: args
                })
            );
        }
        if (p.state !== CBPeripheralState.Connected) {
            const error = new BluetoothError(BluetoothCommon.msg_peripheral_not_connected, {
                method: methodName,
                arguments: args
            });
            return Promise.reject(error);
        }
        return new Promise<any>((resolve, reject) => {
            const subD = {
                peripheralDidDiscoverServices: (peripheral: CBPeripheral, error?: NSError) => {
                    const UUID = NSUUIDToString(peripheral.identifier);
                    if (UUID === pUUID) {
                        if (error) {
                            reject(
                                new BluetoothError(error.localizedDescription, {
                                    method: methodName,
                                    status: error.code
                                })
                            );
                        } else {
                            const cbServices = iOSNativeHelper.collections.nsArrayToJSArray(peripheral.services) as any as CBService[];
                            resolve({
                                ios: cbServices,
                                services: cbServices.map((cbs) => ({ UUID: CBUUIDToString(cbs.UUID), name: cbs.UUID.toString() }))
                            });
                        }
                        p.delegate.removeSubDelegate(subD);
                    }
                }
            };
            p.delegate.addSubDelegate(subD);
            p.discoverServices(args.serviceUUIDs ? args.serviceUUIDs.map((s) => CBUUID.UUIDWithString(s)) : null);
        });
    }

    @bluetoothEnabled
    @prepareArgs
    public discoverCharacteristics(args: DiscoverCharacteristicsOptions) {
        const methodName = 'discoverCharacteristics';
        if (!args.peripheralUUID) {
            return Promise.reject(
                new BluetoothError(BluetoothCommon.msg_missing_parameter, {
                    method: methodName,
                    type: BluetoothCommon.peripheralUUIDKey,
                    arguments: args
                })
            );
        }
        if (!args.serviceUUID) {
            return Promise.reject(
                new BluetoothError(BluetoothCommon.msg_missing_parameter, {
                    method: methodName,
                    type: BluetoothCommon.serviceUUIDKey,
                    arguments: args
                })
            );
        }
        if (Trace.isEnabled()) {
            CLog(CLogTypes.info, methodName, `---- peripheralUUID:${args.peripheralUUID} serviceUUID:${args.serviceUUID}`);
        }
        const pUUID = args.peripheralUUID;
        const p = this.findPeripheral(pUUID);
        if (!p) {
            return Promise.reject(
                new BluetoothError(BluetoothCommon.msg_no_peripheral, {
                    method: methodName,
                    arguments: args
                })
            );
        }
        if (p.state !== CBPeripheralState.Connected) {
            const error = new BluetoothError(BluetoothCommon.msg_peripheral_not_connected, {
                method: methodName,
                arguments: args
            });
            return Promise.reject(error);
        }
        const serviceUUID = CBUUID.UUIDWithString(args.serviceUUID);
        const service = this._findService(serviceUUID, p);
        if (!service) {
            return Promise.reject(
                new BluetoothError(BluetoothCommon.msg_no_service, {
                    method: methodName,
                    arguments: args
                })
            );
        }
        return new Promise((resolve, reject) => {
            const subD = {
                peripheralDidDiscoverCharacteristicsForServiceError: (peripheral: CBPeripheral, service: CBService, error?: NSError) => {
                    const UUID = NSUUIDToString(peripheral.identifier);
                    const sUuidLong = CBUUIDToString(service.UUID);
                    const sUuidShort = shortenUuidIfAssignedNumber(sUuidLong);
                    if (Trace.isEnabled()) {
                        CLog(
                            CLogTypes.info,
                            `discoverCharacteristics [UUID]: ${UUID}, [pUUID]: ${pUUID}, [args.serviceUUID]: ${args.serviceUUID}, [sUuidLong]: ${sUuidLong}, [sUuidShort]: ${sUuidShort}`
                        );
                    }
                    if (UUID === pUUID && (sUuidLong === args.serviceUUID || sUuidShort === args.serviceUUID)) {
                        if (error) {
                            reject(
                                new BluetoothError(error.localizedDescription, {
                                    method: methodName,
                                    status: error.code
                                })
                            );
                        } else {
                            const cbChars = iOSNativeHelper.collections.nsArrayToJSArray(service.characteristics) as any as CBCharacteristic[];

                            resolve({
                                ios: cbChars,
                                characteristics: cbChars.map((cbs) => ({
                                    UUID: CBUUIDToString(cbs.UUID),
                                    serviceUUID: CBUUIDToString(service.UUID),
                                    name: CBUUIDToString(cbs.UUID),
                                    // see serviceAndCharacteristicInfo in CBPer+Ext of Cordova plugin
                                    value: toArrayBuffer(cbs.value),
                                    properties: _getProperties(cbs),
                                    // descriptors: this._getDescriptors(characteristic), // TODO we're not currently discovering these
                                    isNotifying: cbs.isNotifying
                                    // permissions: characteristic.permissions // prolly not too useful - don't think we need this for iOS (BradMartin)
                                }))
                            });
                        }
                        p.delegate.removeSubDelegate(subD);
                    }
                }
            };
            p.delegate.addSubDelegate(subD);
            p.discoverCharacteristicsForService(args.characteristicUUIDs ? args.characteristicUUIDs.map((s) => CBUUID.UUIDWithString(s)) : null, service);
        });
    }

    private _isEnabled() {
        return this._state === CBManagerState.PoweredOn;
    }

    private _findService(UUID: CBUUID, peripheral: CBPeripheral) {
        for (let i = 0; i < peripheral.services?.count; i++) {
            const service = peripheral.services.objectAtIndex(i);
            // TODO this may need a different compare, see Cordova plugin's findServiceFromUUID function
            if (UUID.isEqual(service.UUID)) {
                return service;
            }
        }
        // service not found on this peripheral
        return null;
    }

    private _findCharacteristic(UUID: CBUUID, service: CBService, property?: CBCharacteristicProperties) {
        for (let i = 0; i < service.characteristics.count; i++) {
            const characteristic = service.characteristics.objectAtIndex(i);
            if (UUID.isEqual(characteristic.UUID)) {
                if (property && characteristic.properties) {
                    if (property === property) {
                        return characteristic;
                    }
                } else {
                    return characteristic;
                }
            }
        }
        // characteristic not found on this service
        return null;
    }

    @bluetoothEnabled
    private async _getDeviceWrapper(args) {
        // prepareArgs should be called before hand
        if (!args.peripheralUUID) {
            throw new BluetoothError(BluetoothCommon.msg_missing_parameter, {
                type: BluetoothCommon.peripheralUUIDKey,
                arguments: args
            });
        }
        const peripheral = this.findPeripheral(args.peripheralUUID);
        if (!peripheral) {
            throw new BluetoothError(BluetoothCommon.msg_no_peripheral, { arguments: args });
        }

        if (peripheral.state !== CBPeripheralState.Connected) {
            throw new BluetoothError(BluetoothCommon.msg_peripheral_not_connected, {
                arguments: args
            });
        }
        // with that all being checked, let's return a wrapper object containing all the stuff we found here
        return peripheral;
    }
    @bluetoothEnabled
    private async _getWrapper(args, property: CBCharacteristicProperties) {
        // prepareArgs should be called before hand
        if (!args.peripheralUUID) {
            throw new BluetoothError(BluetoothCommon.msg_missing_parameter, {
                type: BluetoothCommon.peripheralUUIDKey,
                arguments: args
            });
        }
        if (!args.serviceUUID) {
            throw new BluetoothError(BluetoothCommon.msg_missing_parameter, {
                type: BluetoothCommon.serviceUUIDKey,
                arguments: args
            });
        }
        if (!args.characteristicUUID) {
            throw new BluetoothError(BluetoothCommon.msg_missing_parameter, {
                type: BluetoothCommon.characteristicUUIDKey,
                arguments: args
            });
        }
        const peripheral = await this._getDeviceWrapper(args);

        const serviceUUID = CBUUID.UUIDWithString(args.serviceUUID);
        const service = this._findService(serviceUUID, peripheral);
        if (!service) {
            throw new BluetoothError(BluetoothCommon.msg_no_service, {
                arguments: args
            });
        }

        const characteristicUUID = CBUUID.UUIDWithString(args.characteristicUUID);
        let characteristic = this._findCharacteristic(characteristicUUID, service, property);

        // Special handling for INDICATE. If charateristic with notify is not found, check for indicate.
        // if (property === CBCharacteristicPropertyNotify && !characteristic) {
        if (property === CBCharacteristicProperties.PropertyNotify && !characteristic) {
            characteristic = this._findCharacteristic(characteristicUUID, service, CBCharacteristicProperties.PropertyIndicate);
            // characteristic = this._findCharacteristic(characteristicUUID, service, CBCharacteristicProperties.PropertyIndicate PropertyIndicate);
        }

        // As a last resort, try and find ANY characteristic with this UUID, even if it doesn't have the correct properties
        if (!characteristic) {
            characteristic = this._findCharacteristic(characteristicUUID, service, null);
        }

        if (!characteristic) {
            throw new BluetoothError(BluetoothCommon.msg_no_characteristic, {
                arguments: args
            });
        }

        // with that all being checked, let's return a wrapper object containing all the stuff we found here
        return {
            peripheral,
            service,
            characteristic
        };
    }
}
