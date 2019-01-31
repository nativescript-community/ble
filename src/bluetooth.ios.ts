import {
    BluetoothCommon,
    bluetoothEnabled,
    BluetoothUtil,
    Characteristic,
    CLog,
    CLogTypes,
    ConnectOptions,
    DiscoverCharacteristicsOptions,
    DiscoverServicesOptions,
    Peripheral,
    prepareArgs,
    ReadOptions,
    ReadResult,
    Service,
    StartNotifyingOptions,
    StartScanningOptions,
    StopNotifyingOptions,
    WriteOptions
} from './bluetooth.common';

import { ios } from 'tns-core-modules/utils/utils';

export type SubPeripheralDelegate = Partial<CBPeripheralDelegate>;
export type SubCentralManagerDelegate = Partial<CBCentralManagerDelegate>;

export interface CBPeripheralWithDelegate extends CBPeripheral {
    delegate: CBPeripheralDelegateImpl;
}
/**
 * @link - https://developer.apple.com/documentation/corebluetooth/cbperipheraldelegate
 * The delegate of a CBPeripheral object must adopt the CBPeripheralDelegate protocol.
 * The delegate uses this protocol’s methods to monitor the discovery, exploration, and interaction of a remote peripheral’s services and properties.
 * There are no required methods in this protocol.
 */
export class CBPeripheralDelegateImpl extends NSObject implements CBPeripheralDelegate {
    public static ObjCProtocols = [CBPeripheralDelegate];
    public onNotifyCallback?: (result: ReadResult) => void;
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
        CLog(CLogTypes.info, `CBPeripheralDelegateImpl.initWithOwner: ${owner.get()}`);
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
        CLog(CLogTypes.info, `CBPeripheralDelegateImpl.peripheralDidDiscoverServices ---- peripheral: ${peripheral}, ${error}, ${this}`);
        this.subDelegates.forEach(d => {
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
        CLog(CLogTypes.info, `CBPeripheralDelegateImpl.peripheralDidDiscoverIncludedServicesForServiceError ---- peripheral: ${peripheral}, service: ${service}, error: ${error}`);
        this.subDelegates.forEach(d => {
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
        CLog(CLogTypes.info, `CBPeripheralDelegateImpl.peripheralDidDiscoverCharacteristicsForServiceError ---- peripheral: ${peripheral}, service: ${service}, error: ${error}`);

        this.subDelegates.forEach(d => {
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
        CLog(CLogTypes.info, `CBPeripheralDelegateImpl.peripheralDidDiscoverDescriptorsForCharacteristicError ---- peripheral: ${peripheral}, characteristic: ${characteristic}, error: ${error}`);

        this.subDelegates.forEach(d => {
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
            CLog(CLogTypes.warning, `CBPeripheralDelegateImpl.peripheralDidUpdateValueForCharacteristicError ---- No CBCharacteristic.`);
            return;
        }

        this.subDelegates.forEach(d => {
            if (d.peripheralDidUpdateValueForCharacteristicError) {
                d.peripheralDidUpdateValueForCharacteristicError(peripheral, characteristic, error);
            }
        });

        if (error !== null) {
            CLog(CLogTypes.error, `CBPeripheralDelegateImpl.peripheralDidUpdateValueForCharacteristicError ---- ${error}`);
            return;
        }

        if (characteristic.isNotifying) {
            if (this.onNotifyCallback) {
                this.onNotifyCallback({
                    // type: 'notification',
                    characteristicUUID: CBUUIDToString(characteristic.UUID),
                    ios: characteristic.value,
                    value: toArrayBuffer(characteristic.value)
                });
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
        this.subDelegates.forEach(d => {
            if (d.peripheralDidUpdateValueForDescriptorError) {
                d.peripheralDidUpdateValueForDescriptorError(peripheral, descriptor, error);
            }
        });
    }

    /**
     * Invoked when you write data to a characteristic’s value.
     */
    public peripheralDidWriteValueForCharacteristicError(peripheral: CBPeripheral, characteristic: CBCharacteristic, error?: NSError) {
        CLog(CLogTypes.info, `CBPeripheralDelegateImpl.peripheralDidWriteValueForCharacteristicError ---- peripheral: ${peripheral}, characteristic: ${characteristic}, error: ${error}`);

        this.subDelegates.forEach(d => {
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
        CLog(CLogTypes.info, `CBPeripheralDelegateImpl.peripheralDidUpdateNotificationStateForCharacteristicError ---- peripheral: ${peripheral}, characteristic: ${characteristic}, error: ${error}`);

        this.subDelegates.forEach(d => {
            if (d.peripheralDidUpdateNotificationStateForCharacteristicError) {
                d.peripheralDidUpdateNotificationStateForCharacteristicError(peripheral, characteristic, error);
            }
        });
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
        this.subDelegates.forEach(d => {
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
export class CBCentralManagerDelegateImpl extends NSObject implements CBCentralManagerDelegate {
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
        CLog(CLogTypes.info, `CBCentralManagerDelegateImpl.initWithOwner: ${this._owner}`);
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
        CLog(CLogTypes.info, `----- CBCentralManagerDelegateImpl centralManager:didConnectPeripheral: ${peripheral}`);

        this._owner.get().onPeripheralConnected(peripheral);
        CLog(CLogTypes.info, "----- CBCentralManagerDelegateImpl centralManager:didConnectPeripheral, let's discover service");
        this.subDelegates.forEach(d => {
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
        CLog(CLogTypes.info, `CBCentralManagerDelegate.centralManagerDidDisconnectPeripheralError ----`, central, peripheral, error);

        this._owner.get().onPeripheralDisconnected(peripheral);
        this.subDelegates.forEach(d => {
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
        CLog(CLogTypes.info, `CBCentralManagerDelegate.centralManagerDidFailToConnectPeripheralError ----`, central, peripheral, error);
        this.subDelegates.forEach(d => {
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

    get centralDelegate() {
        if (!this._centralDelegate) {
            this._centralDelegate = CBCentralManagerDelegateImpl.new().initWithOwner(new WeakRef(this));
        }
        return this._centralDelegate;
    }
    get centralManager() {
        if (!this._centralManager) {
            const options: NSMutableDictionary<any, any> = new (NSMutableDictionary as any)([this.showPowerAlertPopup], [CBCentralManagerOptionShowPowerAlertKey]);
            if (this.restoreIdentifier) {
                options.setObjectForKey(this.restoreIdentifier, CBCentralManagerOptionRestoreIdentifierKey);
            }
            this._centralManager = CBCentralManager.alloc().initWithDelegateQueueOptions(this.centralDelegate, null, options);
            setTimeout(() => {
                this.state = this._centralManager.state;
            }, 100);
            CLog(CLogTypes.info, `this._centralManager: ${this._centralManager}`);
        }
        return this._centralManager;
    }

    constructor(private restoreIdentifier: string = 'ns_bluetooth', private showPowerAlertPopup = false) {
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

    // needed for consecutive calls to isBluetoothEnabled. Until readyToAskForEnabled, everyone waits!
    readyToAskForEnabled = false;
    public isBluetoothEnabled(): Promise<boolean> {
        // CLog(CLogTypes.info, 'isBluetoothEnabled', !!this._centralManager);
        return Promise.resolve()
            .then(() => {
                if (!this.readyToAskForEnabled) {
                    // the centralManager return wrong state just after initialization
                    // so create it and wait a bit
                    // tslint:disable-next-line:no-unused-expression
                    this.centralManager;
                    CLog(CLogTypes.info, 'isBluetoothEnabled waiting a bit');
                    return new Promise(resolve => setTimeout(resolve, 50)).then(() => (this.readyToAskForEnabled = true));
                }
                return null;
            })
            .then(
                () => this._isEnabled()
                // new Promise((resolve, reject) => {
                //     try {
                //         const isEnabled = this._isEnabled();
                //         // CLog(CLogTypes.info, 'isBluetoothEnabled requesting value', isEnabled);
                //         resolve(isEnabled);
                //     } catch (ex) {
                //         CLog(CLogTypes.error, 'isBluetoothEnabled ----', ex);
                //         reject(ex);
                //     }
                // }) as Promise<boolean>
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
        CLog(CLogTypes.info, 'enable ---- Not possible on iOS');
        return this.isBluetoothEnabled();
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
                                return Promise.reject(undefined);
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
    @prepareArgs
    public connect(args: ConnectOptions) {
        try {
            if (!args.UUID) {
                return Promise.reject({ msg: BluetoothCommon.msg_missing_parameter, type: 'UUID' });
            }
            const connectingUUID = args.UUID;
            CLog(CLogTypes.info, 'connect ----', args.UUID);
            const peripheral = this.findDiscoverPeripheral(args.UUID);

            CLog(CLogTypes.info, 'connect ---- peripheral found', peripheral);

            if (!peripheral) {
                return Promise.reject({ msg: BluetoothCommon.msg_no_peripheral, args });
            } else {
                return new Promise((resolve, reject) => {
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
                                reject(error.localizedDescription);
                                this._centralDelegate.removeSubDelegate(subD);
                            }
                        }
                    };
                    CLog(CLogTypes.info, 'connect ---- Connecting to peripheral with UUID:', connectingUUID, this._centralDelegate, this._centralManager);
                    this.centralDelegate.addSubDelegate(subD);
                    this._connectCallbacks[connectingUUID] = args.onConnected;
                    this._disconnectCallbacks[connectingUUID] = args.onDisconnected;
                    CLog(CLogTypes.info, 'connect ----about to connect:', connectingUUID, this._centralDelegate, this._centralManager);
                    this.centralManager.connectPeripheralOptions(peripheral, null);
                })
                    .then(() => {
                        if (args.autoDiscoverAll !== false) {
                            return this.discoverAll({ peripheralUUID: connectingUUID });
                        }
                        return undefined;
                    })
                    .then(result => {
                        const dataToSend = {
                            UUID: connectingUUID,
                            name: peripheral.name,
                            state: this._getState(peripheral.state),
                            services: result ? result.services : undefined,
                            advertismentData: this._advData[connectingUUID]
                        };
                        delete this._advData[connectingUUID];
                        const cb = this._connectCallbacks[connectingUUID];
                        if (cb) {
                            cb(dataToSend);
                            delete this._connectCallbacks[connectingUUID];
                        }
                        return dataToSend;
                    });
            }
        } catch (ex) {
            CLog(CLogTypes.error, 'connect ---- error:', ex);
            return Promise.reject(ex);
        }
    }

    @bluetoothEnabled
    @prepareArgs
    public disconnect(args) {
        try {
            if (!args.UUID) {
                return Promise.reject({ msg: BluetoothCommon.msg_missing_parameter, type: 'UUID' });
            }
            const pUUID = args.UUID;
            const peripheral = this.findPeripheral(pUUID);
            if (!peripheral) {
                return Promise.reject({ msg: BluetoothCommon.msg_no_peripheral, args });
            } else {
                // no need to send an error when already disconnected, but it's wise to check it
                if (peripheral.state !== CBPeripheralState.Disconnected) {
                    return new Promise((resolve, reject) => {
                        const subD = {
                            centralManagerDidDisconnectPeripheralError: (central: CBCentralManager, peripheral: CBPeripheral, error?: NSError) => {
                                const UUID = NSUUIDToString(peripheral.identifier);
                                if (UUID === pUUID) {
                                    if (error) {
                                        reject(error.localizedDescription);
                                    } else {
                                        resolve();
                                    }
                                    this._centralDelegate.removeSubDelegate(subD);
                                }
                            }
                        };
                        this.centralDelegate.addSubDelegate(subD);
                        CLog(CLogTypes.info, 'disconnect ---- Disconnecting peripheral with UUID', pUUID);
                        this._connectCallbacks[pUUID] = args.onConnected;
                        this._disconnectCallbacks[pUUID] = args.onDisconnected;
                        this.centralManager.cancelPeripheralConnection(peripheral);
                    });
                }
                return Promise.resolve();
            }
        } catch (ex) {
            CLog(CLogTypes.error, 'disconnect ---- error:', ex);
            return Promise.reject(ex);
        }
    }

    @bluetoothEnabled
    @prepareArgs
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
        return result as CBPeripheralWithDelegate;
    }
    public adddDiscoverPeripheral = peripheral => {
        const UUID = NSUUIDToString(peripheral.identifier);
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

    @prepareArgs
    public read(args: ReadOptions) {
        return this._getWrapper(args, CBCharacteristicProperties.PropertyRead).then(
            wrapper =>
                new Promise((resolve, reject) => {
                    CLog(CLogTypes.info, `read ---- peripheralUUID:${args.peripheralUUID} serviceUUID:${args.serviceUUID} characteristicUUID:${args.characteristicUUID}`);

                    const pUUID = args.peripheralUUID;
                    const p = wrapper.peripheral;
                    const subD = {
                        peripheralDidUpdateValueForCharacteristicError: (peripheral: CBPeripheral, characteristic: CBCharacteristic, error?: NSError) => {
                            if (!characteristic) {
                                reject({ msg: BluetoothCommon.msg_error_function_call, args: { method: 'peripheralDidUpdateValueForCharacteristicError', ...args } });
                            }
                            if (characteristic.isNotifying) {
                                return;
                            }
                            const UUID = NSUUIDToString(peripheral.identifier);
                            const cUUID = CBUUIDToString(characteristic.UUID);
                            const sUUID = CBUUIDToString(characteristic.service.UUID);

                            if (UUID === pUUID && cUUID === args.characteristicUUID && sUUID === args.serviceUUID) {
                                CLog(CLogTypes.info, 'read ---- peripheralDidUpdateValueForCharacteristicError', error);
                                if (error) {
                                    reject(error.localizedDescription);
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
                        CLog(CLogTypes.error, 'read ---- error:', ex);
                        reject(ex);
                    }
                })
        );
    }

    @prepareArgs
    public write(args: WriteOptions) {
        if (!args.value) {
            return Promise.reject({ msg: BluetoothCommon.msg_missing_parameter, type: 'value' });
        }
        return this._getWrapper(args, CBCharacteristicProperties.PropertyWrite).then(
            wrapper =>
                new Promise((resolve, reject) => {
                    CLog(CLogTypes.info, `write ---- peripheralUUID:${args.peripheralUUID} serviceUUID:${args.serviceUUID} characteristicUUID:${args.characteristicUUID}`);
                    try {
                        const valueEncoded = this.valueToNSData(args.value, args.encoding);

                        if (valueEncoded === null) {
                            return Promise.reject({ msg: BluetoothCommon.msg_invalid_value, value: args.value });
                        }

                        return new Promise((resolve, reject) => {
                            const pUUID = args.peripheralUUID;
                            const p = wrapper.peripheral;
                            const subD = {
                                peripheralDidWriteValueForCharacteristicError: (peripheral: CBPeripheral, characteristic: CBCharacteristic, error?: NSError) => {
                                    CLog(CLogTypes.info, 'read ---- peripheralDidWriteValueForCharacteristicError', error);
                                    const UUID = NSUUIDToString(peripheral.identifier);
                                    const cUUID = CBUUIDToString(characteristic.UUID);
                                    const sUUID = CBUUIDToString(characteristic.service.UUID);
                                    if (UUID === pUUID && cUUID === args.characteristicUUID && sUUID === args.serviceUUID) {
                                        if (error) {
                                            reject(error.localizedDescription);
                                        } else {
                                            resolve();
                                        }
                                        p.delegate.removeSubDelegate(subD);
                                    }
                                }
                            };
                            p.delegate.addSubDelegate(subD);
                            p.writeValueForCharacteristicType(valueEncoded, wrapper.characteristic, CBCharacteristicWriteType.WithResponse);
                            if (BluetoothUtil.debug) {
                                CLog(CLogTypes.info, 'write:', args.value, JSON.stringify(this.valueToString(valueEncoded)));
                            }
                        });
                    } catch (ex) {
                        CLog(CLogTypes.error, 'write ---- error:', ex);
                        return reject(ex);
                    }
                })
        );
    }

    @prepareArgs
    public writeWithoutResponse(args: WriteOptions) {
        if (!args.value) {
            return Promise.reject({ msg: BluetoothCommon.msg_missing_parameter, type: 'value' });
        }

        return this._getWrapper(args, CBCharacteristicProperties.PropertyWriteWithoutResponse).then(wrapper => {
            try {
                CLog(CLogTypes.info, `writeWithoutResponse ---- peripheralUUID:${args.peripheralUUID} serviceUUID:${args.serviceUUID} characteristicUUID:${args.characteristicUUID}`);
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

    @prepareArgs
    public startNotifying(args: StartNotifyingOptions) {
        return this._getWrapper(args, CBCharacteristicProperties.PropertyNotify).then(wrapper => {
            try {
                CLog(CLogTypes.info, `startNotifying ---- peripheralUUID:${args.peripheralUUID} serviceUUID:${args.serviceUUID} characteristicUUID:${args.characteristicUUID}`);
                const cb =
                    args.onNotify ||
                    function(result) {
                        CLog(CLogTypes.info, 'startNotifying ---- No "onNotify" callback function specified for "startNotifying()"');
                    };

                const delegate = wrapper.peripheral.delegate as CBPeripheralDelegateImpl;
                delegate.onNotifyCallback = cb;
                wrapper.peripheral.setNotifyValueForCharacteristic(true, wrapper.characteristic);
                return null;
            } catch (ex) {
                CLog(CLogTypes.error, 'startNotifying ---- error:', ex);
                return Promise.reject(ex);
            }
        });
    }

    @prepareArgs
    public stopNotifying(args: StopNotifyingOptions) {
        return this._getWrapper(args, CBCharacteristicProperties.PropertyNotify).then(wrapper => {
            CLog(CLogTypes.info, `stopNotifying ---- peripheralUUID:${args.peripheralUUID} serviceUUID:${args.serviceUUID} characteristicUUID:${args.characteristicUUID}`);
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

    @bluetoothEnabled
    @prepareArgs
    public discoverServices(args: DiscoverServicesOptions) {
        if (!args.peripheralUUID) {
            return Promise.reject({ msg: BluetoothCommon.msg_missing_parameter, type: 'peripheralUUID' });
        }
        CLog(CLogTypes.info, `discoverServices ---- peripheralUUID:${args.peripheralUUID}`);
        const pUUID = args.peripheralUUID;
        const p = this.findPeripheral(pUUID);
        if (!p) {
            return Promise.reject({ msg: BluetoothCommon.msg_no_peripheral, args });
        }
        if (p.state !== CBPeripheralState.Connected) {
            return Promise.reject({ msg: BluetoothCommon.msg_peripheral_not_connected, args });
        }
        return new Promise((resolve, reject) => {
            const subD = {
                peripheralDidDiscoverServices: (peripheral: CBPeripheral, error?: NSError) => {
                    const UUID = NSUUIDToString(peripheral.identifier);
                    if (UUID === pUUID) {
                        if (error) {
                            reject(error.localizedDescription);
                        } else {
                            const cbServices = (ios.collections.nsArrayToJSArray(peripheral.services) as any) as CBService[];
                            resolve({
                                ios: cbServices,
                                services: cbServices.map(cbs => ({ UUID: CBUUIDToString(cbs.UUID), name: cbs.UUID.toString() }))
                            });
                        }
                        p.delegate.removeSubDelegate(subD);
                    }
                }
            };
            p.delegate.addSubDelegate(subD);
            p.discoverServices(args.serviceUUIDs ? args.serviceUUIDs.map(s => CBUUID.UUIDWithString(s)) : null);
        }) as Promise<{ services: Service[]; ios: CBService[] }>;
    }

    @bluetoothEnabled
    @prepareArgs
    public discoverCharacteristics(args: DiscoverCharacteristicsOptions) {
        if (!args.peripheralUUID) {
            return Promise.reject({ msg: BluetoothCommon.msg_missing_parameter, type: 'peripheralUUID' });
        }
        if (!args.serviceUUID) {
            return Promise.reject({ msg: BluetoothCommon.msg_missing_parameter, type: 'serviceUUID' });
        }
        CLog(CLogTypes.info, `discoverServices ---- peripheralUUID:${args.peripheralUUID} serviceUUID:${args.serviceUUID}`);
        const pUUID = args.peripheralUUID;
        const p = this.findPeripheral(pUUID);
        if (!p) {
            return Promise.reject({ msg: BluetoothCommon.msg_no_peripheral, args });
        }
        if (p.state !== CBPeripheralState.Connected) {
            return Promise.reject({ msg: BluetoothCommon.msg_peripheral_not_connected, args });
        }
        const serviceUUID = CBUUID.UUIDWithString(args.serviceUUID);
        const service = this._findService(serviceUUID, p);
        if (!service) {
            return Promise.reject({ msg: BluetoothCommon.msg_no_service, args });
        }
        return new Promise((resolve, reject) => {
            const subD = {
                peripheralDidDiscoverCharacteristicsForServiceError: (peripheral: CBPeripheral, service: CBService, error?: NSError) => {
                    const UUID = NSUUIDToString(peripheral.identifier);
                    const sUUID = CBUUIDToString(service.UUID);
                    if (UUID === pUUID && sUUID === args.serviceUUID) {
                        if (error) {
                            reject(error.localizedDescription);
                        } else {
                            const cbChars = (ios.collections.nsArrayToJSArray(service.characteristics) as any) as CBCharacteristic[];

                            resolve({
                                ios: cbChars,
                                characteristics: cbChars.map(cbs => ({
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
            p.discoverCharacteristicsForService(args.characteristicUUIDs ? args.characteristicUUIDs.map(s => CBUUID.UUIDWithString(s)) : null, service);
        }) as Promise<{ characteristics: Characteristic[]; ios: CBCharacteristic[] }>;
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
        // prepareArgs should be called before hand
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
