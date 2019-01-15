import { BluetoothCommon, BluetoothUtil, CLog, CLogTypes } from './bluetooth.common';
import { ConnectOptions, Peripheral, ReadResult, Service, StartNotifyingOptions, StartScanningOptions, StopNotifyingOptions, WriteOptions } from './bluetooth';


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
            ios: characteristic.value,
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

/**
 * @link - https://developer.apple.com/documentation/corebluetooth/cbcentralmanagerdelegate
 * The CBCentralManagerDelegate protocol defines the methods that a delegate of a CBCentralManager object must adopt.
 * The optional methods of the protocol allow the delegate to monitor the discovery, connectivity, and retrieval of peripheral devices.
 * The only required method of the protocol indicates the availability of the central manager, and is called when the central manager’s state is updated.
 */
export class CBCentralManagerDelegateImpl extends NSObject implements CBCentralManagerDelegate {
    static ObjCProtocols = [CBCentralManagerDelegate];

    private _owner: WeakRef<Bluetooth>;

    private _callback: (result?) => void;

    static new(): CBCentralManagerDelegateImpl {
        return super.new() as CBCentralManagerDelegateImpl;
    }

    public initWithCallback(owner: WeakRef<Bluetooth>, callback: (result?) => void): CBCentralManagerDelegateImpl {
        this._owner = owner;
        CLog(CLogTypes.info, `CBCentralManagerDelegateImpl.initWithCallback ---- this._owner: ${this._owner}`);
        this._callback = callback;
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
        CLog(CLogTypes.info, `----- CBCentralManagerDelegateImpl centralManager:didConnectPeripheral: ${peripheral}`);
        const UUID = peripheral.identifier.UUIDString;
        // find the peri in the array and attach the delegate to that
        // const peri = this._owner.get().findPeripheral(UUID);
        // CLog(CLogTypes.info, `----- CBCentralManagerDelegateImpl centralManager:didConnectPeripheral: cached perio: ${peripheral}`);

        const cb = this._owner.get()._connectCallbacks[UUID];
        delete this._owner.get()._connectCallbacks[UUID];
        const delegate = CBPeripheralDelegateImpl.new().initWithCallback(this._owner, cb);
        // CFRetain(delegate);
        peripheral.delegate = delegate;

        CLog(CLogTypes.info, "----- CBCentralManagerDelegateImpl centralManager:didConnectPeripheral, let's discover service");
        this._owner.get().onPeripheralConnected(peripheral);
        peripheral.discoverServices(null);
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
        const UUID = peripheral.identifier.UUIDString;
        const cb = this._owner.get()._disconnectCallbacks[UUID];
        if (cb) {
            cb({
                UUID: peripheral.identifier.UUIDString,
                name: peripheral.name
            });
            delete this._owner.get()._disconnectCallbacks[UUID];
        } else {
            CLog(CLogTypes.info, `***** centralManagerDidDisconnectPeripheralError() no disconnect callback found *****`);
        }
        this._owner.get().onPeripheralDisconnected(peripheral);
        peripheral.delegate = null;
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
        CLog(CLogTypes.info, `CBCentralManagerDelegate.centralManagerDidFailToConnectPeripheralError ----`, central, peripheral, error);
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
        const UUIDString = peripheral.identifier.UUIDString;
        CLog(CLogTypes.info, `CBCentralManagerDelegateImpl.centralManagerDidDiscoverPeripheralAdvertisementDataRSSI ---- ${peripheral.name} @ ${UUIDString} @ ${RSSI} @ ${advData}`);
        this._owner.get().adddDiscoverPeripheral(peripheral);

        const advertismentData = new AdvertismentData(advData);

        const payload = {
            UUID: UUIDString,
            name: peripheral.name,
            localName: advertismentData.localName,
            RSSI,
            advertismentData,
            state: this._owner.get()._getState(peripheral.state),
            manufacturerId: advertismentData.manufacturerId
        };
        this._owner.get()._advData[UUIDString] = advertismentData;
        if (this._owner.get()._onDiscovered) {
            this._owner.get()._onDiscovered(payload);
        }
        this._owner.get().sendEvent(Bluetooth.device_discovered_event, payload);
        // } else {
        // CLog(CLogTypes.warning, 'CBCentralManagerDelegateImpl.centralManagerDidDiscoverPeripheralAdvertisementDataRSSI ---- No onDiscovered callback specified');
        // }
        // }
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
        // if (central.state === CBCentralManagerStateUnsupported) {
        if (central.state === CBManagerState.Unsupported) {
            CLog(CLogTypes.warning, `CBCentralManagerDelegateImpl.centralManagerDidUpdateState ---- This hardware does not support Bluetooth Low Energy.`);
        }
        this._owner.get().sendEvent(Bluetooth.bluetooth_status_event, {
            state: central.state === CBManagerState.Unsupported ? 'unsupported' : central.state === CBManagerState.PoweredOn ? 'on' : 'off'
        });
    }

    /**
     * Invoked when the central manager is about to be restored by the system.
     * @param central [CBCentralManager] - The central manager providing this information.
     * @param dict [NSDictionary<string, any>] - A dictionary containing information about the central manager that was preserved by the system at the time the app was terminated.
     * For the available keys to this dictionary, see Central Manager State Restoration Options.
     * @link - https://developer.apple.com/documentation/corebluetooth/cbcentralmanagerdelegate/central_manager_state_restoration_options
     */
    public centralManagerWillRestoreState(central: CBCentralManager, dict: NSDictionary<string, any>) {
        CLog(CLogTypes.info, `CBCentralManagerDelegateImpl.centralManagerWillRestoreState ---- central: ${central}, dict: ${dict}`);
    }
}
declare var NSMakeRange; // not recognized by platform-declarations

export class AdvertismentData {
    constructor(private advData: NSDictionary<string, any>) {}
    get manufacturerData() {
        const data = this.advData.objectForKey(CBAdvertisementDataManufacturerDataKey);
        if (data) {
            return toArrayBuffer(data.subdataWithRange(NSMakeRange(2, data.length - 2)));
        }
        return undefined;
    }
    get data() {
        return toArrayBuffer(this.advData);
    }
    get manufacturerId() {
        const data = this.advData.objectForKey(CBAdvertisementDataManufacturerDataKey);
        if (data) {
            const manufacturerIdBuffer = toArrayBuffer(data.subdataWithRange(NSMakeRange(0, 2)));
            return new DataView(manufacturerIdBuffer, 0).getUint16(0, true);
        }
        return -1;
        // return this.manufacturerData[0];
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
    get uuids() {
        const result = [];
        const serviceUuids = this.advData.objectForKey(CBAdvertisementDataServiceUUIDsKey) as NSArray<CBUUID>;
        if (serviceUuids) {
            for (let i = 0; i < serviceUuids.count; i++) {
                result.push(serviceUuids[i].toString());
            }
        }
        return result;
    }
    get overtflow() {
        const result = [];
        const serviceUuids = this.advData.objectForKey(CBAdvertisementDataOverflowServiceUUIDsKey) as NSArray<CBUUID>;
        if (serviceUuids) {
            for (let i = 0; i < serviceUuids.count; i++) {
                result.push(CBUUIDToString(serviceUuids[i]));
            }
        }
        return result;
    }
    get solicitedServices() {
        const result = [];
        const serviceUuids = this.advData.objectForKey(CBAdvertisementDataSolicitedServiceUUIDsKey) as NSArray<CBUUID>;
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
        const obj = this.advData.objectForKey(CBAdvertisementDataServiceDataKey) as NSDictionary<CBUUID, NSData>;
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
export { Peripheral, ReadResult, Service };

export function toArrayBuffer(value) {
    if (value === null) {
        return null;
    }
    return interop.bufferFromData(value);
}

export function CBUUIDToString(uuid: CBUUID) {
    return uuid.toString().toLowerCase();
}

export class Bluetooth extends BluetoothCommon {
    private _centralDelegate: CBCentralManagerDelegateImpl;
    private _centralManager: CBCentralManager;

    public _discoverPeripherals: { [k: string]: CBPeripheral } = {};
    public _connectedPeripherals: { [k: string]: CBPeripheral } = {};
    public _connectCallbacks = {};
    public _disconnectCallbacks = {};

    // _advData is used to store Advertisment Data so that we can send it to connection callback
    public _advData = {};
    public _onDiscovered = null;

    get centralManager() {
        if (!this._centralManager) {
            let options: NSDictionary<any, any> = null;
            if (this.restoreIdentifier) {
                options = new (NSDictionary as any)([this.restoreIdentifier], [CBCentralManagerOptionRestoreIdentifierKey]);
            }
            this._centralDelegate = CBCentralManagerDelegateImpl.new().initWithCallback(new WeakRef(this), obj => {
                CLog(CLogTypes.info, `---- centralDelegate ---- obj: ${obj}`);
            });
            this._centralManager = CBCentralManager.alloc().initWithDelegateQueueOptions(this._centralDelegate, null, options);
            CLog(CLogTypes.info, `this._centralManager: ${this._centralManager}`);
        }
        return this._centralManager;
    }

    constructor(private restoreIdentifier?: string) {
        super();
        CLog(CLogTypes.info, `*** iOS Bluetooth Constructor *** ${restoreIdentifier}`);
    }

    // Getters/Setters
    get enabled(): boolean {
        const state = this.centralManager.state;
        if (state === CBManagerState.PoweredOn) {
            return true;
        } else {
            return false;
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
            CLog(CLogTypes.warning, '_getState ---- Unexpected state, returning "disconnected" for state of', state);
            return 'disconnected';
        }
    }

    public onPeripheralDisconnected(peripheral: CBPeripheral) {
        const UUID = peripheral.identifier.UUIDString;
        delete this._connectedPeripherals[UUID];
    }
    public onPeripheralConnected(peripheral: CBPeripheral) {
        const UUID = peripheral.identifier.UUIDString;
        this._connectedPeripherals[UUID] = peripheral;
    }

    public isBluetoothEnabled() {
        return new Promise((resolve, reject) => {
            try {
                const isEnabled = this._isEnabled();
                resolve(isEnabled);
            } catch (ex) {
                CLog(CLogTypes.error, 'isBluetoothEnabled ----', ex);
                reject(ex);
            }
        });
    }
    scanningReferTimer: {
        timer?: number;
        resolve?: Function;
    };
    public startScanning(arg: StartScanningOptions) {
        return new Promise((resolve, reject) => {
            try {
                if (!this._isEnabled()) {
                    CLog(CLogTypes.info, 'startScanning ---- Bluetooth is not enabled.');
                    reject('Bluetooth is not enabled.');
                    return;
                }
                this._discoverPeripherals = {};
                this._onDiscovered = arg.onDiscovered;

                let services: any[] = null;
                if (arg.filters) {
                    services = [];
                    arg.filters.forEach(f => {
                        if (f.serviceUUID) {
                            services.push(CBUUID.UUIDWithString(f.serviceUUID));
                        }
                    });
                }
                CLog(CLogTypes.info, 'startScanning ---- services:', services);

                // TODO: check on the services as any casting
                this.centralManager.scanForPeripheralsWithServicesOptions(services as any, null);
                if (this.scanningReferTimer) {
                    clearTimeout(this.scanningReferTimer.timer);
                    this.scanningReferTimer.resolve();
                }
                this.scanningReferTimer = {};
                if (arg.seconds) {
                    this.scanningReferTimer.timer = setTimeout(() => {
                        // note that by now a manual 'stop' may have been invoked, but that doesn't hurt
                        this.centralManager.stopScan();
                        resolve();
                    }, arg.seconds * 1000);
                    this.scanningReferTimer.resolve = resolve;
                } else {
                    resolve();
                }
            } catch (ex) {
                CLog(CLogTypes.error, 'startScanning ---- error:', ex);
                reject(ex);
            }
        });
    }

    public enable() {
        return new Promise((resolve, reject) => {
            CLog(CLogTypes.info, 'enable ---- Not possible on iOS');
            resolve(this._isEnabled());
        });
    }
    public isGPSEnabled() {
        return Promise.resolve(true); // we dont need to check for GPS in the bluetooth iOS module
    }
    public enableGPS(): Promise<void> {
        return Promise.resolve(); // we dont need to check for GPS in the bluetooth iOS module
    }

    public openBluetoothSettings(url?: string): Promise<void> {
        console.log('openBluetoothSettings', this._isEnabled());
        if (!this._isEnabled()) {
            return Promise.resolve().then(() => {
                const settingsUrl = NSURL.URLWithString(url || 'App-prefs:root=General&path=BLUETOOTH');
                console.log('openBluetoothSettings url ', settingsUrl.absoluteString, UIApplication.sharedApplication.canOpenURL(settingsUrl));
                if (UIApplication.sharedApplication.canOpenURL(settingsUrl)) {
                    UIApplication.sharedApplication.openURLOptionsCompletionHandler(settingsUrl, null, function(success) {
                        // we get the callback for opening the URL, not enabling the GPS!
                        if (success) {
                            // if (isEnabled()) {
                            //     return Promise.resolve();
                            // } else {
                            return Promise.reject(undefined);
                            // }
                        } else {
                            return Promise.reject('cant_open_settings');
                        }
                    });
                }
            });
        }
        return Promise.resolve();
    }
    public stopScanning() {
        return new Promise((resolve, reject) => {
            try {
                if (!this._isEnabled()) {
                    reject('Bluetooth is not enabled.');
                    return;
                }
                this.centralManager.stopScan();
                if (this.scanningReferTimer) {
                    this.scanningReferTimer.resolve && this.scanningReferTimer.resolve();
                    clearTimeout(this.scanningReferTimer.timer);
                    this.scanningReferTimer = null;
                }
                resolve();
            } catch (ex) {
                CLog(CLogTypes.error, 'stopScanning ---- error:', ex);
                reject(ex);
            }
        });
    }

    // note that this doesn't make much sense without scanning first
    public connect(args: ConnectOptions) {
        return new Promise((resolve, reject) => {
            try {
                if (!this._isEnabled()) {
                    reject('Bluetooth is not enabled.');
                    return;
                }
                if (!args.UUID) {
                    reject('No UUID was passed');
                    return;
                }
                // console.log('test', this._discoverPeripherals);
                CLog(CLogTypes.info, 'connect ----', args.UUID);
                const peripheral = this.findDiscoverPeripheral(args.UUID);

                CLog(CLogTypes.info, 'connect ---- peripheral found', peripheral);

                if (!peripheral) {
                    reject(`Could not find peripheral with UUID: ${args.UUID}`);
                } else {
                    CLog(CLogTypes.info, 'connect ---- Connecting to peripheral with UUID:', args.UUID);
                    this._connectCallbacks[args.UUID] = args.onConnected;
                    this._disconnectCallbacks[args.UUID] = args.onDisconnected;
                    this.centralManager.connectPeripheralOptions(peripheral, null);
                    resolve();
                }
            } catch (ex) {
                CLog(CLogTypes.error, 'connect ---- error:', ex);
                reject(ex);
            }
        });
    }

    public disconnect(arg) {
        return new Promise((resolve, reject) => {
            try {
                if (!this._isEnabled()) {
                    reject('Bluetooth is not enabled');
                    return;
                }
                if (!arg.UUID) {
                    reject('No UUID was passed');
                    return;
                }
                const peripheral = this.findPeripheral(arg.UUID);
                if (!peripheral) {
                    reject('Could not find peripheral with UUID ' + arg.UUID);
                } else {
                    CLog(CLogTypes.info, 'disconnect ---- Disconnecting peripheral with UUID', arg.UUID);
                    // no need to send an error when already disconnected, but it's wise to check it
                    if (peripheral.state !== CBPeripheralState.Disconnected) {
                        this.centralManager.cancelPeripheralConnection(peripheral);
                        // peripheral.delegate = null;
                        // TODO remove from the peripheralArray as well
                    }
                    resolve();
                }
            } catch (ex) {
                CLog(CLogTypes.error, 'disconnect ---- error:', ex);
                reject(ex);
            }
        });
    }

    public isConnected(arg) {
        return new Promise((resolve, reject) => {
            try {
                if (!this._isEnabled()) {
                    reject('Bluetooth is not enabled');
                    return;
                }
                if (!arg.UUID) {
                    reject('No UUID was passed');
                    return;
                }
                const peripheral = this.findPeripheral(arg.UUID);
                if (peripheral === null) {
                    reject('Could not find peripheral with UUID ' + arg.UUID);
                } else {
                    CLog(CLogTypes.info, 'isConnected ---- checking connection with peripheral UUID:', arg.UUID);
                    resolve(peripheral.state === CBPeripheralState.Connected);
                }
            } catch (ex) {
                CLog(CLogTypes.error, 'isConnected ---- error:', ex);
                reject(ex);
            }
        });
    }

    public findPeripheral = UUID => {
        let result = this._connectedPeripherals[UUID] || this._discoverPeripherals[UUID];
        if (!result) {
            const periphs = this.centralManager.retrievePeripheralsWithIdentifiers([NSUUID.alloc().initWithUUIDString(UUID)]);
            if (periphs.count > 0) {
                result = periphs.objectAtIndex(0);
            }
        }
        return result;
    }
    public adddDiscoverPeripheral = peripheral => {
        const UUID = peripheral.identifier.UUIDString;
        if (!this._discoverPeripherals[UUID]) {
            this._discoverPeripherals[UUID] = peripheral;
        }
    }
    public findDiscoverPeripheral = UUID => {
        let result = this._discoverPeripherals[UUID];
        if (!result) {
            const periphs = this.centralManager.retrievePeripheralsWithIdentifiers([NSUUID.alloc().initWithUUIDString(UUID)]);
            if (periphs.count > 0) {
                result = periphs.objectAtIndex(0);
            }
        }
        return result;
    }

    public read(arg) {
        return new Promise((resolve, reject) => {
            try {
                const wrapper = this._getWrapper(arg, CBCharacteristicProperties.PropertyRead, reject);
                if (!wrapper) {
                    // no need to reject, this has already been done in _getWrapper()
                    return;
                }

                // TODO we could (should?) make this characteristic-specific
                (wrapper.peripheral.delegate as CBPeripheralDelegateImpl)._onReadPromise = resolve;
                wrapper.peripheral.readValueForCharacteristic(wrapper.characteristic);
            } catch (ex) {
                CLog(CLogTypes.error, 'read ---- error:', ex);
                reject(ex);
            }
        });
    }

    public write(arg: WriteOptions) {
        return new Promise((resolve, reject) => {
            try {
                if (!arg.value) {
                    reject(`You need to provide some data to write in the 'value' property.`);
                    return;
                }
                const wrapper = this._getWrapper(arg, CBCharacteristicProperties.PropertyWrite, reject);
                if (!wrapper) {
                    // no need to reject, this has already been done
                    return;
                }

                const valueEncoded = this.valueToNSData(arg.value, arg.encoding);
                if (BluetoothUtil.debug) {
                    CLog(CLogTypes.info, 'write:', arg.value);
                }
                if (valueEncoded === null) {
                    reject('Invalid value: ' + arg.value);
                    return;
                }

                // the promise will be resolved from 'didWriteValueForCharacteristic',
                // but we should make this characteristic-specific (see .read)
                (wrapper.peripheral.delegate as CBPeripheralDelegateImpl)._onWritePromise = resolve;

                wrapper.peripheral.writeValueForCharacteristicType(
                    valueEncoded,
                    wrapper.characteristic,
                    // CBCharacteristicWriteWithResponse
                    CBCharacteristicWriteType.WithResponse
                );

                if (BluetoothUtil.debug) {
                    CLog(CLogTypes.info, 'write:', arg.value, JSON.stringify(this.valueToString(valueEncoded)));
                }
            } catch (ex) {
                CLog(CLogTypes.error, 'write ---- error:', ex);
                reject(ex);
            }
        });
    }

    public writeWithoutResponse(arg: WriteOptions) {
        return new Promise((resolve, reject) => {
            try {
                if (!arg.value) {
                    reject("You need to provide some data to write in the 'value' property");
                    return;
                }
                const wrapper = this._getWrapper(arg, CBCharacteristicProperties.PropertyWriteWithoutResponse, reject);
                if (!wrapper) {
                    // no need to reject, this has already been done
                    return;
                }

                const valueEncoded = this.valueToNSData(arg.value, arg.encoding);

                if (valueEncoded === null) {
                    reject('Invalid value: ' + arg.value);
                    return;
                }

                wrapper.peripheral.writeValueForCharacteristicType(valueEncoded, wrapper.characteristic, CBCharacteristicWriteType.WithoutResponse);

                if (BluetoothUtil.debug) {
                    CLog(CLogTypes.info, 'writeWithoutResponse:', arg.value, JSON.stringify(this.valueToString(valueEncoded)));
                }

                resolve();
            } catch (ex) {
                CLog(CLogTypes.error, 'writeWithoutResponse ---- error:', ex);
                reject(ex);
            }
        });
    }

    public startNotifying(args: StartNotifyingOptions) {
        return new Promise((resolve, reject) => {
            try {
                const wrapper = this._getWrapper(args, CBCharacteristicProperties.PropertyNotify, reject);
                CLog(CLogTypes.info, 'startNotifying ---- wrapper:', wrapper);

                if (!wrapper) {
                    // no need to reject, this has already been done in _getWrapper
                    return;
                }

                const cb =
                    args.onNotify ||
                    function(result) {
                        CLog(CLogTypes.info, 'startNotifying ---- No "onNotify" callback function specified for "startNotifying()"');
                    };

                // TODO we could (should?) make this characteristic-specific
                (wrapper.peripheral.delegate as CBPeripheralDelegateImpl)._onNotifyCallback = cb;
                wrapper.peripheral.setNotifyValueForCharacteristic(true, wrapper.characteristic);
                resolve();
            } catch (ex) {
                CLog(CLogTypes.error, 'startNotifying ---- error:', ex);
                reject(ex);
            }
        });
    }

    public stopNotifying(args: StopNotifyingOptions) {
        return new Promise((resolve, reject) => {
            try {
                const wrapper = this._getWrapper(args, CBCharacteristicProperties.PropertyNotify, reject);
                CLog(CLogTypes.info, 'stopNotifying ---- wrapper:', wrapper);

                if (wrapper === null) {
                    // no need to reject, this has already been done
                    return;
                }

                const peripheral = this.findPeripheral(args.peripheralUUID);
                // peripheral.delegate = null;
                peripheral.setNotifyValueForCharacteristic(false, wrapper.characteristic);
                resolve();
            } catch (ex) {
                CLog(CLogTypes.error, 'stopNotifying ---- error:', ex);
                reject(ex);
            }
        });
    }

    private _isEnabled() {
        return this.centralManager.state === CBManagerState.PoweredOn;
    }

    private _stringToUuid(uuidStr) {
        if (uuidStr.length === 4) {
            uuidStr = `0000${uuidStr}-0000-1000-8000-00805f9b34fb`;
        }
        return CFUUIDCreateFromString(null, uuidStr);
    }

    private _findService(UUID: CBUUID, peripheral: CBPeripheral) {
        for (let i = 0; i < peripheral.services.count; i++) {
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

    private _getWrapper(
        arg,
        property: CBCharacteristicProperties,
        reject
    ): {
        peripheral: CBPeripheral;
        service: CBService;
        characteristic: CBCharacteristic;
    } {
        if (!this._isEnabled()) {
            reject('Bluetooth is not enabled');
            return null;
        }
        if (!arg.peripheralUUID) {
            reject('No peripheralUUID was passed');
            return null;
        }
        if (!arg.serviceUUID) {
            reject('No serviceUUID was passed');
            return null;
        }
        if (!arg.characteristicUUID) {
            reject('No characteristicUUID was passed');
            return null;
        }

        const peripheral = this.findPeripheral(arg.peripheralUUID);
        if (!peripheral) {
            reject('Could not find peripheral with UUID ' + arg.peripheralUUID);
            return null;
        }

        if (peripheral.state !== CBPeripheralState.Connected) {
            reject('The peripheral is disconnected');
            return null;
        }

        const serviceUUID = CBUUID.UUIDWithString(arg.serviceUUID);
        const service = this._findService(serviceUUID, peripheral);
        if (!service) {
            reject(`Could not find service with UUID ${arg.serviceUUID} on peripheral with UUID ${arg.peripheralUUID}`);
            return null;
        }

        const characteristicUUID = CBUUID.UUIDWithString(arg.characteristicUUID);
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
            reject(`Could not find characteristic with UUID ${arg.characteristicUUID} on service with UUID ${arg.serviceUUID} on peripheral with UUID ${arg.peripheralUUID}`);
            return null;
        }

        // with that all being checked, let's return a wrapper object containing all the stuff we found here
        return {
            peripheral,
            service,
            characteristic
        };
    }

    /**
     * Value must be a Uint8Array or Uint16Array or
     * a string like '0x01' or '0x007F' or '0x01,0x02', or '0x007F,'0x006F''
     */
    private _encodeValue(value) {
        // if it's not a string assume it's a UintXArray
        if (typeof value !== 'string') {
            return value.buffer;
        }
        const parts = value.split(',');
        if (parts[0].indexOf('x') === -1) {
            return null;
        }
        let result;
        if (parts[0].length === 4) {
            // eg. 0x01
            result = new Uint8Array(parts.length);
        } else {
            // assuming eg. 0x007F
            result = new Uint16Array(parts.length);
        }
        for (let i = 0; i < parts.length; i++) {
            result[i] = parts[i];
        }
        return result.buffer;
    }

    private nativeEncoding(encoding) {
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

    private valueToNSData(value: any, encoding = 'iso-8859-1') {
        const type = typeof value;
        if (type === 'string') {
            return NSString.stringWithString(value).dataUsingEncoding(this.nativeEncoding(encoding));
        } else if (type === 'number') {
            return NSData.dataWithData(new Uint8Array([value]).buffer as any);
        } else if (Array.isArray(value)) {
            // const intRef = new interop.Reference(interop.types.int8, interop.alloc(value.length));
            // for (let i = 0; i < value.length; i++) {
            //     intRef[i] = value[i];
            // }
            // return NSData.dataWithBytesLength(intRef, value.length);
            return NSData.dataWithData(new Uint8Array(value).buffer as any);
        } else if (value instanceof ArrayBuffer) {
            // for ArrayBuffer to NSData
            return NSData.dataWithData(value as any);
        }
        return null;
    }

    private valueToString(value) {
        if (value instanceof NSData) {
            const data = new Uint8Array(interop.bufferFromData(value));
            const result = [];
            data.forEach((v, i) => (result[i] = v));
            return result;
        }
        return value;
    }
}
