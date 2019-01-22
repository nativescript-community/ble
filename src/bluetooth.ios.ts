import {
    BluetoothCommon,
    bluetoothEnabled,
    BluetoothUtil,
    CLog,
    CLogTypes,
    ConnectOptions,
    Peripheral,
    ReadOptions,
    ReadResult,
    Service,
    StartNotifyingOptions,
    StartScanningOptions,
    StopNotifyingOptions,
    WriteOptions
} from './bluetooth.common';

/**
 * @link - https://developer.apple.com/documentation/corebluetooth/cbperipheraldelegate
 * The delegate of a CBPeripheral object must adopt the CBPeripheralDelegate protocol.
 * The delegate uses this protocol’s methods to monitor the discovery, exploration, and interaction of a remote peripheral’s services and properties.
 * There are no required methods in this protocol.
 */
export class CBPeripheralDelegateImpl extends NSObject implements CBPeripheralDelegate {
    public static ObjCProtocols = [CBPeripheralDelegate];
    public onReadCallbacks?: Array<(result: ReadResult) => void>;
    public onWriteCallbacks?: Array<(result: { characteristicUUID: string }) => void>;
    public onNotifyCallback?: (result: ReadResult) => void;
    private _servicesWithCharacteristics;
    private _services: Array<{ UUID: string; characteristics?: Array<{ UUID: string }> }>;
    private _owner: WeakRef<Bluetooth>;
    private _callback: (result?) => void;

    static new(): CBPeripheralDelegateImpl {
        return super.new() as CBPeripheralDelegateImpl;
    }

    public initWithCallback(owner: WeakRef<Bluetooth>, callback: (result?) => void): CBPeripheralDelegateImpl {
        this._owner = owner;
        this._callback = callback;
        this._services = [];
        this._servicesWithCharacteristics = [];
        CLog(CLogTypes.info, `CBPeripheralDelegateImpl.initWithCallback ---- owner: ${owner.get()} ---- callback: ${callback}`);
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
        CLog(CLogTypes.info, `CBPeripheralDelegateImpl.peripheralDidDiscoverServices ---- peripheral: ${peripheral}, ${error}, ${this}, ${this._services}`);
        // map native services to a JS object
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
            if (this.onReadCallbacks && this.onReadCallbacks.length > 0) {
                this.onReadCallbacks.shift()(result);
            } else {
                CLog(CLogTypes.info, 'No _onReadPromise found!');
            }
        } else {
            if (this.onNotifyCallback) {
                this.onNotifyCallback(result);
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
        if (this.onWriteCallbacks && this.onWriteCallbacks.length > 0) {
            this.onWriteCallbacks.shift()({
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

        this._owner.get().onPeripheralConnected(peripheral);
        CLog(CLogTypes.info, "----- CBCentralManagerDelegateImpl centralManager:didConnectPeripheral, let's discover service");

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
        CLog(CLogTypes.info, `CBCentralManagerDelegate.centralManagerDidDisconnectPeripheralError ----`, central, peripheral, error);

        this._owner.get().onPeripheralDisconnected(peripheral);
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
        CLog(CLogTypes.info, `CBCentralManagerDelegateImpl.centralManagerDidUpdateState: ${central.state}`);
        if (central.state === CBManagerState.Unsupported) {
            CLog(CLogTypes.warning, `CBCentralManagerDelegateImpl.centralManagerDidUpdateState ---- This hardware does not support Bluetooth Low Energy.`);
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
    get serviceUUIDs() {
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
    private _centralDelegate: CBCentralManagerDelegateImpl = null;
    private _centralManager: CBCentralManager = null;
    // private _cbQueue: NSObject;

    public _discoverPeripherals: { [k: string]: CBPeripheral } = {};
    public _connectedPeripherals: { [k: string]: CBPeripheral } = {};
    public _connectCallbacks = {};
    public _disconnectCallbacks = {};

    // _advData is used to store Advertisment Data so that we can send it to connection callback
    public _advData = {};
    public _onDiscovered = null;

    _state: CBManagerState;
    set state(state: CBManagerState) {
        if (this._state !== state) {
            this._state = state;
            this.sendEvent(BluetoothCommon.bluetooth_status_event, {
                state: state === CBManagerState.Unsupported ? 'unsupported' : state === CBManagerState.PoweredOn ? 'on' : 'off'
            });
        }
    }
    get state() {
        return this._state;
    }

    get centralManager() {
        if (!this._centralManager) {
            const options: NSMutableDictionary<any, any> = new (NSMutableDictionary as any)([true], [CBCentralManagerOptionShowPowerAlertKey]);
            if (this.restoreIdentifier) {
                options.setObjectForKey(this.restoreIdentifier, CBCentralManagerOptionRestoreIdentifierKey);
            }
            // this._cbQueue = dispatch_queue_create('ns.bt.cbqueue', null);
            this._centralDelegate = CBCentralManagerDelegateImpl.new().initWithCallback(new WeakRef(this), obj => {
                CLog(CLogTypes.info, `---- centralDelegate ---- obj: ${obj}`);
            });
            this._centralManager = CBCentralManager.alloc().initWithDelegateQueueOptions(this._centralDelegate, null, options);
            setTimeout(() => {
                this.state = this._centralManager.state;
            }, 100);
            CLog(CLogTypes.info, `this._centralManager: ${this._centralManager}`);
        }
        return this._centralManager;
    }

    constructor(private restoreIdentifier: string = 'ns_bluetooth') {
        super();
        console.log(`*** iOS Bluetooth Constructor *** ${restoreIdentifier}`);
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

    private prepareConnectedPeripheralDelegate(peripheral: CBPeripheral) {
        if (!peripheral.delegate) {
            const UUID = peripheral.identifier.UUIDString;
            const cb = this._connectCallbacks[UUID];
            delete this._connectCallbacks[UUID];
            const delegate = CBPeripheralDelegateImpl.new().initWithCallback(new WeakRef(this), cb);
            CFRetain(delegate);
            peripheral.delegate = delegate;
        }
    }

    public onPeripheralDisconnected(peripheral: CBPeripheral) {
        const UUID = peripheral.identifier.UUIDString;
        peripheral.delegate = null;
        delete this._connectedPeripherals[UUID];
    }
    public onPeripheralConnected(peripheral: CBPeripheral) {
        const UUID = peripheral.identifier.UUIDString;
        this.prepareConnectedPeripheralDelegate(peripheral);
        this._connectedPeripherals[UUID] = peripheral;
    }

    public isBluetoothEnabled(): Promise<boolean> {
        return Promise.resolve()
            .then(() => {
                if (!this._centralManager) {
                    // the centralManager return wrong state just after initialization
                    // so create it and wait a bit
                    // tslint:disable-next-line:no-unused-expression
                    this.centralManager;
                    return new Promise(resolve => setTimeout(resolve, 50));
                }
                return null;
            })
            .then(
                () =>
                    new Promise((resolve, reject) => {
                        try {
                            const isEnabled = this._isEnabled();
                            resolve(isEnabled);
                        } catch (ex) {
                            CLog(CLogTypes.error, 'isBluetoothEnabled ----', ex);
                            reject(ex);
                        }
                    }) as Promise<boolean>
            );
    }
    scanningReferTimer: {
        timer?: number;
        resolve?: Function;
    };

    @bluetoothEnabled
    public startScanning(arg: StartScanningOptions) {
        return new Promise((resolve, reject) => {
            try {
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
        // return new Promise((resolve, reject) => {
        CLog(CLogTypes.info, 'enable ---- Not possible on iOS');
        return this.isBluetoothEnabled();
        // });
    }
    public isGPSEnabled() {
        return Promise.resolve(true); // we dont need to check for GPS in the bluetooth iOS module
    }
    public enableGPS(): Promise<void> {
        return Promise.resolve(); // we dont need to check for GPS in the bluetooth iOS module
    }

    public openBluetoothSettings(url?: string): Promise<void> {
        return this.isBluetoothEnabled().then(isEnabled => {
            if (!isEnabled) {
                return Promise.resolve().then(() => {
                    const settingsUrl = NSURL.URLWithString(url || 'App-prefs:root=General&path=BLUETOOTH');
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
                                return Promise.reject(BluetoothCommon.msg_cant_open_settings);
                            }
                        });
                    }
                });
            }
            return null;
        });
    }
    @bluetoothEnabled
    public stopScanning() {
        return new Promise((resolve, reject) => {
            try {
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

    @bluetoothEnabled
    public connect(args: ConnectOptions) {
        try {
            if (!args.UUID) {
                return Promise.reject({ msg: BluetoothCommon.msg_missing_parameter, type: 'UUID' });
                // return;
            }
            CLog(CLogTypes.info, 'connect ----', args.UUID);
            const peripheral = this.findDiscoverPeripheral(args.UUID);

            CLog(CLogTypes.info, 'connect ---- peripheral found', peripheral);

            if (!peripheral) {
                return Promise.reject({ msg: BluetoothCommon.msg_no_peripheral, args });
            } else {
                CLog(CLogTypes.info, 'connect ---- Connecting to peripheral with UUID:', args.UUID);
                this._connectCallbacks[args.UUID] = args.onConnected;
                this._disconnectCallbacks[args.UUID] = args.onDisconnected;
                this.centralManager.connectPeripheralOptions(peripheral, null);
                return Promise.resolve();
            }
        } catch (ex) {
            CLog(CLogTypes.error, 'connect ---- error:', ex);
            return Promise.reject(ex);
        }
    }

    @bluetoothEnabled
    public disconnect(args) {
        try {
            if (!args.UUID) {
                return Promise.reject({ msg: BluetoothCommon.msg_missing_parameter, type: 'UUID' });
            }
            const peripheral = this.findPeripheral(args.UUID);
            if (!peripheral) {
                return Promise.reject({ msg: BluetoothCommon.msg_no_peripheral, args });
            } else {
                CLog(CLogTypes.info, 'disconnect ---- Disconnecting peripheral with UUID', args.UUID);
                // no need to send an error when already disconnected, but it's wise to check it
                if (peripheral.state !== CBPeripheralState.Disconnected) {
                    this.centralManager.cancelPeripheralConnection(peripheral);
                    // peripheral.delegate = null;
                    // TODO remove from the peripheralArray as well
                }
                return Promise.resolve();
            }
        } catch (ex) {
            CLog(CLogTypes.error, 'disconnect ---- error:', ex);
            return Promise.reject(ex);
        }
    }

    @bluetoothEnabled
    public isConnected(args) {
        try {
            if (!args.UUID) {
                return Promise.reject({ msg: BluetoothCommon.msg_missing_parameter, type: 'UUID' });
            }
            const peripheral = this.findPeripheral(args.UUID);
            if (peripheral === null) {
                return Promise.reject({ msg: BluetoothCommon.msg_no_peripheral, args });
            } else {
                CLog(CLogTypes.info, 'isConnected ---- checking connection with peripheral UUID:', args.UUID);
                return Promise.resolve(peripheral.state === CBPeripheralState.Connected);
            }
        } catch (ex) {
            CLog(CLogTypes.error, 'isConnected ---- error:', ex);
            return Promise.reject(ex);
        }
    }

    public findPeripheral = UUID => {
        let result = this._connectedPeripherals[UUID] || this._discoverPeripherals[UUID];
        if (!result) {
            const periphs = this.centralManager.retrievePeripheralsWithIdentifiers([NSUUID.alloc().initWithUUIDString(UUID)]);
            if (periphs.count > 0) {
                result = periphs.objectAtIndex(0);
                this.prepareConnectedPeripheralDelegate(result);
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

    public read(args: ReadOptions) {
        return this._getWrapper(args, CBCharacteristicProperties.PropertyRead).then(
            wrapper =>
                new Promise((resolve, reject) => {
                    try {
                        // TODO we could (should?) make this characteristic-specific
                        const delegate = (wrapper.peripheral.delegate as CBPeripheralDelegateImpl);
                        delegate.onReadCallbacks = delegate.onReadCallbacks || [];
                        delegate.onReadCallbacks.push(resolve);
                        // }
                        wrapper.peripheral.readValueForCharacteristic(wrapper.characteristic);
                    } catch (ex) {
                        CLog(CLogTypes.error, 'read ---- error:', ex);
                        reject(ex);
                    }
                })
        );
    }

    public write(args: WriteOptions) {
        if (!args.value) {
            return Promise.reject({ msg: BluetoothCommon.msg_missing_parameter, type: 'value' });
        }
        return this._getWrapper(args, CBCharacteristicProperties.PropertyWrite).then(
            wrapper =>
                new Promise((resolve, reject) => {
                    try {
                        const valueEncoded = this.valueToNSData(args.value, args.encoding);
                        if (BluetoothUtil.debug) {
                            CLog(CLogTypes.info, 'write:', args.value);
                        }
                        if (valueEncoded === null) {
                            return Promise.reject({ msg: BluetoothCommon.msg_invalid_value, value: args.value });
                        }

                        // the promise will be resolved from 'didWriteValueForCharacteristic',
                        // but we should make this characteristic-specific (see .read)
                        const delegate = (wrapper.peripheral.delegate as CBPeripheralDelegateImpl);
                        delegate.onWriteCallbacks = delegate.onWriteCallbacks || [];
                        delegate.onWriteCallbacks.push(resolve);

                        wrapper.peripheral.writeValueForCharacteristicType(
                            valueEncoded,
                            wrapper.characteristic,
                            // CBCharacteristicWriteWithResponse
                            CBCharacteristicWriteType.WithResponse
                        );

                        if (BluetoothUtil.debug) {
                            CLog(CLogTypes.info, 'write:', args.value, JSON.stringify(this.valueToString(valueEncoded)));
                        }
                    } catch (ex) {
                        CLog(CLogTypes.error, 'write ---- error:', ex);
                        return reject(ex);
                    }
                })
        );
    }

    public writeWithoutResponse(args: WriteOptions) {
        if (!args.value) {
            return Promise.reject({ msg: BluetoothCommon.msg_missing_parameter, type: 'value' });
        }
        return this._getWrapper(args, CBCharacteristicProperties.PropertyWriteWithoutResponse).then(wrapper => {
            try {
                const valueEncoded = this.valueToNSData(args.value, args.encoding);

                if (valueEncoded === null) {
                    return Promise.reject({ msg: BluetoothCommon.msg_invalid_value, value: args.value });
                }

                wrapper.peripheral.writeValueForCharacteristicType(valueEncoded, wrapper.characteristic, CBCharacteristicWriteType.WithoutResponse);

                if (BluetoothUtil.debug) {
                    CLog(CLogTypes.info, 'writeWithoutResponse:', args.value, JSON.stringify(this.valueToString(valueEncoded)));
                }

                return null;
            } catch (ex) {
                CLog(CLogTypes.error, 'writeWithoutResponse ---- error:', ex);
                return Promise.reject(ex);
            }
        });
    }

    public startNotifying(args: StartNotifyingOptions) {
        return this._getWrapper(args, CBCharacteristicProperties.PropertyNotify).then(wrapper => {
            try {
                const cb =
                    args.onNotify ||
                    function(result) {
                        CLog(CLogTypes.info, 'startNotifying ---- No "onNotify" callback function specified for "startNotifying()"');
                    };

                const delegate = (wrapper.peripheral.delegate as CBPeripheralDelegateImpl);
                delegate.onNotifyCallback = cb;
                wrapper.peripheral.setNotifyValueForCharacteristic(true, wrapper.characteristic);
                return null;
            } catch (ex) {
                CLog(CLogTypes.error, 'startNotifying ---- error:', ex);
                return Promise.reject(ex);
            }
        });
    }

    public stopNotifying(args: StopNotifyingOptions) {
        return this._getWrapper(args, CBCharacteristicProperties.PropertyNotify).then(wrapper => {
            try {
                const peripheral = this.findPeripheral(args.peripheralUUID);
                (peripheral.delegate as CBPeripheralDelegateImpl).onNotifyCallback = null;
                peripheral.setNotifyValueForCharacteristic(false, wrapper.characteristic);
                return null;
            } catch (ex) {
                CLog(CLogTypes.error, 'stopNotifying ---- error:', ex);
                return Promise.reject(ex);
            }
        });
    }

    private _isEnabled() {
        return this.state === CBManagerState.PoweredOn;
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

    @bluetoothEnabled
    private _getWrapper(args, property: CBCharacteristicProperties) {
        if (!args.peripheralUUID) {
            return Promise.reject({ msg: BluetoothCommon.msg_missing_parameter, type: 'peripheralUUID' });
        }
        if (!args.serviceUUID) {
            return Promise.reject({ msg: BluetoothCommon.msg_missing_parameter, type: 'serviceUUID' });
        }
        if (!args.characteristicUUID) {
            return Promise.reject({ msg: BluetoothCommon.msg_missing_parameter, type: 'characteristicUUID' });
        }
        const peripheral = this.findPeripheral(args.peripheralUUID);
        if (!peripheral) {
            return Promise.reject({ msg: BluetoothCommon.msg_no_peripheral, args });
        }

        if (peripheral.state !== CBPeripheralState.Connected) {
            return Promise.reject({ msg: BluetoothCommon.msg_peripheral_not_connected, args });
        }

        const serviceUUID = CBUUID.UUIDWithString(args.serviceUUID);
        const service = this._findService(serviceUUID, peripheral);
        if (!service) {
            return Promise.reject({ msg: BluetoothCommon.msg_no_service, args });
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
            return Promise.reject({ msg: BluetoothCommon.msg_no_characteristic, args });
        }

        // with that all being checked, let's return a wrapper object containing all the stuff we found here
        return Promise.resolve({
            peripheral,
            service,
            characteristic
        });
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
