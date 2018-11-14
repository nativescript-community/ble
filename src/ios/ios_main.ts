declare var NSMakeRange;

import { ios as iOS_Utils } from 'tns-core-modules/utils/utils';
import { BluetoothCommon, CLog, CLogTypes, ConnectOptions, StartNotifyingOptions, StartScanningOptions, StopNotifyingOptions } from '../common';
import { CBPeripheralDelegateImpl } from './CBPeripheralDelegateImpl';
import { CBCentralManagerDelegateImpl } from './CBCentralManagerDelegateImpl';

export class Bluetooth extends BluetoothCommon {
    private _centralDelegate = CBCentralManagerDelegateImpl.new().initWithCallback(new WeakRef(this), obj => {
        CLog(CLogTypes.info, `---- centralDelegate ---- obj: ${obj}`);
    });
    private _centralManager: CBCentralManager;

    private _data_service: CBMutableService;
    public _discoverPeripherals: { [k: string]: CBPeripheral } = {};
    public _connectedPeripherals: { [k: string]: CBPeripheral } = {};
    public _connectCallbacks = {};
    public _advData = {};
    public _disconnectCallbacks = {};
    public _onDiscovered = null;

    constructor(restoreIdentifier?: string) {
        super();
        let options: NSDictionary<any, any> = null;
        if (restoreIdentifier) {
            options = new (NSDictionary as any)([restoreIdentifier], [CBCentralManagerOptionRestoreIdentifierKey]);
        }
        this._centralManager = CBCentralManager.alloc().initWithDelegateQueueOptions(this._centralDelegate, null, options);
        CLog(CLogTypes.info, '*** iOS Bluetooth Constructor *** ${restoreIdentifier}');
        CLog(CLogTypes.info, `this._centralManager: ${this._centralManager}`);
    }

    // Getters/Setters
    get enabled(): boolean {
        const state = this._centralManager.state;
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
            CLog(CLogTypes.warning, `Bluetooth._getState ---- Unexpected state, returning 'disconnected' for state of ${state}`);
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
                CLog(CLogTypes.error, `Bluetooth.isBluetoothEnabled ---- ${ex}`);
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
                    CLog(CLogTypes.info, `Bluetooth.startScanning ---- Bluetooth is not enabled.`);
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
                CLog(CLogTypes.info, `Bluetooth.startScanning ---- services: ${services}`);

                // TODO: check on the services as any casting
                this._centralManager.scanForPeripheralsWithServicesOptions(services as any, null);
                if (this.scanningReferTimer) {
                    clearTimeout(this.scanningReferTimer.timer);
                    this.scanningReferTimer.resolve();
                }
                this.scanningReferTimer = {};
                if (arg.seconds) {
                    this.scanningReferTimer.timer = setTimeout(() => {
                        // note that by now a manual 'stop' may have been invoked, but that doesn't hurt
                        this._centralManager.stopScan();
                        resolve();
                    }, arg.seconds * 1000);
                    this.scanningReferTimer.resolve = resolve;
                } else {
                    resolve();
                }
            } catch (ex) {
                CLog(CLogTypes.error, `Bluetooth.startScanning ---- error: ${ex}`);
                reject(ex);
            }
        });
    }

    public toArrayBuffer(value) {
        if (value === null) {
            return null;
        }

        // value is of ObjC type: NSData
        const b = value.base64EncodedStringWithOptions(0);
        return this.base64ToArrayBuffer(b);
    }

    public enable() {
        return new Promise((resolve, reject) => {
            CLog(CLogTypes.info, 'Bluetooth.enable ---- Not possible on iOS');
            resolve(this._isEnabled());
        });
    }
    public isGPSEnabled() {
        return Promise.resolve(true); // we dont need to check for GPS in the bluetooth iOS module
    }
    public enableGPS(): Promise<void> {
        return Promise.resolve(); // we dont need to check for GPS in the bluetooth iOS module
    }
    public stopScanning(arg) {
        return new Promise((resolve, reject) => {
            try {
                if (!this._isEnabled()) {
                    reject('Bluetooth is not enabled.');
                    return;
                }
                this._centralManager.stopScan();
                if (this.scanningReferTimer) {
                    this.scanningReferTimer.resolve && this.scanningReferTimer.resolve();
                    clearTimeout(this.scanningReferTimer.timer);
                    this.scanningReferTimer = null;
                }
                resolve();
            } catch (ex) {
                CLog(CLogTypes.error, `Bluetooth.stopScanning ---- error: ${ex}`);
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
                CLog(CLogTypes.info, `Bluetooth.connect ---- ${args.UUID}`);
                const peripheral = this.findPeripheral(args.UUID);
                CLog(CLogTypes.info, `Bluetooth.connect ---- peripheral found: ${peripheral}`);

                if (!peripheral) {
                    reject(`Could not find peripheral with UUID: ${args.UUID}`);
                } else {
                    CLog(CLogTypes.info, `Bluetooth.connect ---- Connecting to peripheral with UUID: ${args.UUID}`);
                    this._connectCallbacks[args.UUID] = args.onConnected;
                    this._disconnectCallbacks[args.UUID] = args.onDisconnected;
                    this._centralManager.connectPeripheralOptions(peripheral, null);
                    resolve();
                }
            } catch (ex) {
                CLog(CLogTypes.error, `Bluetooth.connect ---- error: ${ex}`);
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
                    CLog(CLogTypes.info, `Bluetooth.disconnect ---- Disconnecting peripheral with UUID ${arg.UUID}`);
                    // no need to send an error when already disconnected, but it's wise to check it
                    if (peripheral.state !== CBPeripheralState.Disconnected) {
                        this._centralManager.cancelPeripheralConnection(peripheral);
                        // peripheral.delegate = null;
                        // TODO remove from the peripheralArray as well
                    }
                    resolve();
                }
            } catch (ex) {
                CLog(CLogTypes.error, `Bluetooth.disconnect ---- error: ${ex}`);
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
                    CLog(CLogTypes.info, `Bluetooth.isConnected ---- checking connection with peripheral UUID: ${arg.UUID}`);
                    resolve(peripheral.state === CBPeripheralState.Connected);
                }
            } catch (ex) {
                CLog(CLogTypes.error, `Bluetooth.isConnected ---- error: ${ex}`);
                reject(ex);
            }
        });
    }

    public findPeripheral(UUID): CBPeripheral {
        return this._connectedPeripherals[UUID] || this._discoverPeripherals[UUID];
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
                CLog(CLogTypes.error, `Bluetooth.read ---- error: ${ex}`);
                reject(ex);
            }
        });
    }

    public write(arg) {
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

                const valueEncoded = arg.raw === true ? arg.value : this._encodeValue(arg.value);
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
            } catch (ex) {
                CLog(CLogTypes.error, `Bluetooth.write ---- error: ${ex}`);
                reject(ex);
            }
        });
    }

    public writeWithoutResponse(arg) {
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

                const valueEncoded = arg.raw === true ? this.valueToNSData(arg.value) : this._encodeValue(arg.value);

                CLog(CLogTypes.info, `Bluetooth.writeWithoutResponse ---- Attempting to write (${arg.raw === true ? 'raw' : 'encoded'}): ${valueEncoded}`);

                wrapper.peripheral.writeValueForCharacteristicType(valueEncoded, wrapper.characteristic, CBCharacteristicWriteType.WithoutResponse);

                resolve();
            } catch (ex) {
                CLog(CLogTypes.error, `Bluetooth.writeWithoutResponse ---- error: ${ex}`);
                reject(ex);
            }
        });
    }

    public startNotifying(args: StartNotifyingOptions) {
        return new Promise((resolve, reject) => {
            try {
                const wrapper = this._getWrapper(args, CBCharacteristicProperties.PropertyNotify, reject);
                CLog(CLogTypes.info, `Bluetooth.startNotifying ---- wrapper: ${wrapper}`);

                if (!wrapper) {
                    // no need to reject, this has already been done in _getWrapper
                    return;
                }

                const cb =
                    args.onNotify ||
                    function(result) {
                        CLog(CLogTypes.info, `Bluetooth.startNotifying ---- No 'onNotify' callback function specified for 'startNotifying()'`);
                    };

                // TODO we could (should?) make this characteristic-specific
                (wrapper.peripheral.delegate as CBPeripheralDelegateImpl)._onNotifyCallback = cb;
                wrapper.peripheral.setNotifyValueForCharacteristic(true, wrapper.characteristic);
                resolve();
            } catch (ex) {
                CLog(CLogTypes.error, `Bluetooth.startNotifying ---- error: ${ex}`);
                reject(ex);
            }
        });
    }

    public stopNotifying(args: StopNotifyingOptions) {
        return new Promise((resolve, reject) => {
            try {
                const wrapper = this._getWrapper(args, CBCharacteristicProperties.PropertyNotify, reject);
                CLog(CLogTypes.info, `Bluetooth.stopNotifying ---- wrapper: ${wrapper}`);

                if (wrapper === null) {
                    // no need to reject, this has already been done
                    return;
                }

                const peripheral = this.findPeripheral(args.peripheralUUID);
                // peripheral.delegate = null;
                peripheral.setNotifyValueForCharacteristic(false, wrapper.characteristic);
                resolve();
            } catch (ex) {
                CLog(CLogTypes.error, `Bluetooth.stopNotifying ---- error: ${ex}`);
                reject(ex);
            }
        });
    }

    private _isEnabled() {
        const state = this._centralManager.state;
        CLog(CLogTypes.info, `Bluetooth._isEnabled ---- this._centralManager.state: ${this._centralManager.state}`);
        return state === CBManagerState.PoweredOn;
    }

    private _stringToUuid(uuidStr) {
        if (uuidStr.length === 4) {
            uuidStr = `0000${uuidStr}-0000-1000-8000-00805f9b34fb`;
        }
        return CFUUIDCreateFromString(null, uuidStr);
    }

    private _findService(UUID, peripheral) {
        for (let i = 0; i < peripheral.services.count; i++) {
            const service = peripheral.services.objectAtIndex(i);
            // CLog("--- service.UUID: " + service.UUID);
            // TODO this may need a different compare, see Cordova plugin's findServiceFromUUID function
            if (UUID.UUIDString === service.UUID.UUIDString) {
                CLog(CLogTypes.info, `Bluetooth._findService ---- found service with UUID:  ${service.UUID}`);
                return service;
            }
        }
        // service not found on this peripheral
        return null;
    }

    private _findCharacteristic(UUID, service, property) {
        CLog(CLogTypes.info, `Bluetooth._findCharacteristic ---- UUID: ${UUID}, service: ${service}, characteristics: ${service.characteristics}`);
        // CLog("--- _findCharacteristic characteristics.count: " + service.characteristics.count);
        for (let i = 0; i < service.characteristics.count; i++) {
            const characteristic = service.characteristics.objectAtIndex(i);
            // CLog("--- characteristic.UUID: " + characteristic.UUID);
            if (UUID.UUIDString === characteristic.UUID.UUIDString) {
                // if (property) {
                //   if ((characteristic.properties & property) === property) {
                if (property && characteristic.properties) {
                    if (property === property) {
                        CLog(CLogTypes.info, `Bluetooth._findCharacteristic ---- characteristic.found: ${characteristic.UUID}`);
                        return characteristic;
                    }
                } else {
                    return characteristic;
                }
            }
        }
        // characteristic not found on this service
        CLog(CLogTypes.warning, 'Bluetooth._findCharacteristic ---- characteristic NOT found');
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

    private valueToNSData(value) {
        if (typeof value === 'string') {
            return NSString.stringWithString(value).dataUsingEncoding(NSUTF8StringEncoding);
            // called within this class
        } else if (Array.isArray(value)) {
            const data = NSMutableData.alloc().initWithCapacity(value.length);
            for (let index = 0; index < value.length; index++) {
                const element = value[index];
                data.appendBytesLength(new Number(element).valueOf() as any, 1);
            }
            return data;
        } else {
            return null;
        }
    }
}
