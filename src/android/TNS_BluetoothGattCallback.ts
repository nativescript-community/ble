import { Bluetooth, byteArrayToBuffer, uuidToString } from '../bluetooth.android';
import { CLog, CLogTypes } from '../bluetooth.common';

@JavaProxy('com.nativescript.TNS_BluetoothGattCallback')
// tslint:disable-next-line:class-name
export class TNS_BluetoothGattCallback extends android.bluetooth.BluetoothGattCallback {
    private owner: WeakRef<Bluetooth>;
    constructor() {
        super();
        return global.__native(this);
    }

    onInit(owner: WeakRef<Bluetooth>) {
        this.owner = owner;
        CLog(CLogTypes.info, `TNS_BluetoothGattCallback.onInit ---- this.owner: ${this.owner}`);
    }

    /**
     * Callback indicating when GATT client has connected/disconnected to/from a remote GATT server.
     * @param bluetoothGatt [android.bluetooth.BluetoothGatt] - GATT client
     * @param status [number] - Status of the connect or disconnect operation. GATT_SUCCESS if the operation succeeds.
     * @param newState [number] - Returns the new connection state. Can be one of STATE_DISCONNECTED or STATE_CONNECTED
     */
    onConnectionStateChange(gatt: android.bluetooth.BluetoothGatt, status: number, newState: number) {
        CLog(CLogTypes.info, `TNS_BluetoothGattCallback.onConnectionStateChange ---- gatt: ${gatt}, status: ${status}, newState: ${newState}`);
        if (newState === android.bluetooth.BluetoothProfile.STATE_CONNECTED && status === android.bluetooth.BluetoothGatt.GATT_SUCCESS) {
            CLog(CLogTypes.info, 'TNS_BluetoothGattCallback.onConnectionStateChange ---- discovering services -----');
            // Discovers services offered by a remote device as well as their characteristics and descriptors.
            gatt.discoverServices();
        } else {
            CLog(CLogTypes.info, `TNS_BluetoothGattCallback.onConnectionStateChange ---- disconnecting the gatt: ${gatt} ----`);
            // perhaps the device was manually disconnected, or in use by another device
            this.owner.get().gattDisconnect(gatt);
        }
    }

    /**
     * Callback invoked when the list of remote services, characteristics and descriptors for the remote device have been updated, ie new services have been discovered.
     * @param gatt [android.bluetooth.BluetoothGatt] - GATT client invoked discoverServices()
     * @param status [number] - GATT_SUCCESS if the remote device has been explored successfully.
     */
    onServicesDiscovered(gatt: android.bluetooth.BluetoothGatt, status: number) {
        CLog(CLogTypes.info, `TNS_BluetoothGattCallback.onServicesDiscovered ---- gatt: ${gatt}, status (0=success): ${status}`);

        if (status === android.bluetooth.BluetoothGatt.GATT_SUCCESS) {
            // TODO grab from cached object and extend with services data?
            const services = gatt.getServices();
            const servicesJs = [];
            const btChar = android.bluetooth.BluetoothGattCharacteristic;
            for (let i = 0; i < services.size(); i++) {
                const service = services.get(i) as android.bluetooth.BluetoothGattService;
                const characteristics = service.getCharacteristics();
                const characteristicsJs = [];
                for (let j = 0; j < characteristics.size(); j++) {
                    const characteristic = characteristics.get(j) as android.bluetooth.BluetoothGattCharacteristic;
                    const props = characteristic.getProperties();
                    const descriptors = characteristic.getDescriptors();
                    const descriptorsJs = [];
                    for (let k = 0; k < descriptors.size(); k++) {
                        const descriptor = descriptors.get(k) as android.bluetooth.BluetoothGattCharacteristic;
                        const descriptorJs = {
                            UUID: uuidToString(descriptor.getUuid()),
                            value: descriptor.getValue(), // always empty btw
                            permissions: null
                        };
                        const descPerms = descriptor.getPermissions();
                        if (descPerms > 0) {
                            descriptorJs.permissions = {
                                read: (descPerms & btChar.PERMISSION_READ) !== 0,
                                readEncrypted: (descPerms & btChar.PERMISSION_READ_ENCRYPTED) !== 0,
                                readEncryptedMitm: (descPerms & btChar.PERMISSION_READ_ENCRYPTED_MITM) !== 0,
                                write: (descPerms & btChar.PERMISSION_WRITE) !== 0,
                                writeEncrypted: (descPerms & btChar.PERMISSION_WRITE_ENCRYPTED) !== 0,
                                writeEncryptedMitm: (descPerms & btChar.PERMISSION_WRITE_ENCRYPTED_MITM) !== 0,
                                writeSigned: (descPerms & btChar.PERMISSION_WRITE_SIGNED) !== 0,
                                writeSignedMitm: (descPerms & btChar.PERMISSION_WRITE_SIGNED_MITM) !== 0
                            };
                        }

                        CLog(CLogTypes.info, `TNS_BluetoothGattCallback.onServicesDiscovered ---- pushing descriptor: ${descriptor}`);
                        descriptorsJs.push(descriptorJs);
                    }

                    const characteristicJs = {
                        serviceUUID: uuidToString(service.getUuid()),
                        UUID: uuidToString(characteristic.getUuid()),
                        name: uuidToString(characteristic.getUuid()), // there's no sep field on Android
                        properties: {
                            read: (props & btChar.PROPERTY_READ) !== 0,
                            write: (props & btChar.PROPERTY_WRITE) !== 0,
                            writeWithoutResponse: (props & btChar.PROPERTY_WRITE_NO_RESPONSE) !== 0,
                            notify: (props & btChar.PROPERTY_NOTIFY) !== 0,
                            indicate: (props & btChar.PROPERTY_INDICATE) !== 0,
                            broadcast: (props & btChar.PROPERTY_BROADCAST) !== 0,
                            authenticatedSignedWrites: (props & btChar.PROPERTY_SIGNED_WRITE) !== 0,
                            extendedProperties: (props & btChar.PROPERTY_EXTENDED_PROPS) !== 0
                        },
                        descriptors: descriptorsJs,
                        permissions: null
                    };

                    // permissions are usually not provided, so let's not return them in that case
                    const charPerms = characteristic.getPermissions();
                    if (charPerms > 0) {
                        characteristicJs.permissions = {
                            read: (charPerms & btChar.PERMISSION_READ) !== 0,
                            readEncrypted: (charPerms & btChar.PERMISSION_READ_ENCRYPTED) !== 0,
                            readEncryptedMitm: (charPerms & btChar.PERMISSION_READ_ENCRYPTED_MITM) !== 0,
                            write: (charPerms & btChar.PERMISSION_WRITE) !== 0,
                            writeEncrypted: (charPerms & btChar.PERMISSION_WRITE_ENCRYPTED) !== 0,
                            writeEncryptedMitm: (charPerms & btChar.PERMISSION_WRITE_ENCRYPTED_MITM) !== 0,
                            writeSigned: (charPerms & btChar.PERMISSION_WRITE_SIGNED) !== 0,
                            writeSignedMitm: (charPerms & btChar.PERMISSION_WRITE_SIGNED_MITM) !== 0
                        };
                    }

                    CLog(CLogTypes.info, `TNS_BluetoothGattCallback.onServicesDiscovered ---- pushing characteristic: ${JSON.stringify(characteristicJs)}`);
                    characteristicsJs.push(characteristicJs);
                }

                servicesJs.push({
                    UUID: uuidToString(service.getUuid()),
                    characteristics: characteristicsJs
                });
            }

            const device = gatt.getDevice();
            let address: string  = null;
            if (device == null) {
                // happens some time, why ... ?
            } else {
                address = device.getAddress();
            }
            const stateObject = this.owner.get().connections[address];
            if (!stateObject) {
                this.owner.get().gattDisconnect(gatt);
                return;
            }
            stateObject.onConnected({
                UUID: address, // TODO consider renaming to id (and iOS as well)
                name: device && device.getName(),
                state: 'connected', // Bluetooth._getState(peripheral.state),
                services: servicesJs,
                advertismentData: stateObject.advertismentData
            });
        }
    }

    /**
     * Callback reporting the result of a characteristic read operation.
     * @param gatt [android.bluetooth.BluetoothGatt] - GATT client invoked readCharacteristic(BluetoothGattCharacteristic)
     * @param characteristic - Characteristic that was read from the associated remote device.
     * @param status [number] - GATT_SUCCESS if the read operation was completed successfully.
     */
    onCharacteristicRead(gatt: android.bluetooth.BluetoothGatt, characteristic: android.bluetooth.BluetoothGattCharacteristic, status: number) {
        const device = gatt.getDevice();
        let address: string  = null;
        if (device == null) {
            // happens some time, why ... ?
        } else {
            address = device.getAddress();
        }
        CLog(CLogTypes.info, `TNS_BluetoothGattCallback.onCharacteristicRead ---- gatt: ${gatt}, characteristic: ${characteristic}, status: ${status}, device: ${address}`);
        const stateObject = this.owner.get().connections[address];
        if (!stateObject) {
            this.owner.get().gattDisconnect(gatt);
            return;
        }

        if (stateObject.onReadPromise) {
            const value = characteristic.getValue();
            stateObject.onReadPromise({
                valueRaw: value,
                value: byteArrayToBuffer(value),
                characteristicUUID: uuidToString(characteristic.getUuid())
            });
        }
    }

    /**
     * Callback triggered as a result of a remote characteristic notification.
     * @param gatt [android.bluetooth.BluetoothGatt] - GATT client the characteristic is associated with.
     * @param characteristic [android.bluetooth.BluetoothGattCharacteristic] - Characteristic that has been updated as a result of a remote notification event.
     */
    onCharacteristicChanged(gatt: android.bluetooth.BluetoothGatt, characteristic: android.bluetooth.BluetoothGattCharacteristic) {
        const device = gatt.getDevice();
        let address: string  = null;
        if (device == null) {
            // happens some time, why ... ?
        } else {
            address = device.getAddress();
        }
        CLog(CLogTypes.info, `TNS_BluetoothGattCallback.onCharacteristicChanged ---- gatt: ${gatt}, characteristic: ${characteristic}, device: ${address}`);

        const stateObject = this.owner.get().connections[address];
        if (!stateObject) {
            this.owner.get().gattDisconnect(gatt);
            return;
        }

        if (stateObject.onNotifyCallback) {
            const value = characteristic.getValue();
            stateObject.onNotifyCallback({
                valueRaw: value,
                value: byteArrayToBuffer(value),
                characteristicUUID: uuidToString(characteristic.getUuid())
            });
        }
    }

    /**
     * Callback indicating the result of a characteristic write operation.
     * If this callback is invoked while a reliable write transaction is in progress, the value of the characteristic represents the value reported by the remote device.
     * An application should compare this value to the desired value to be written.
     * If the values don't match, the application must abort the reliable write transaction.
     * @param gatt - GATT client invoked writeCharacteristic(BluetoothGattCharacteristic)
     * @param characteristic - Characteristic that was written to the associated remote device.
     * @param status - The result of the write operation GATT_SUCCESS if the operation succeeds.
     */
    onCharacteristicWrite(gatt: android.bluetooth.BluetoothGatt, characteristic: android.bluetooth.BluetoothGattCharacteristic, status: number) {
        const device = gatt.getDevice();
        let address: string  = null;
        if (device == null) {
            // happens some time, why ... ?
        } else {
            address = device.getAddress();
        }
        CLog(CLogTypes.info, `TNS_BluetoothGattCallback.onCharacteristicWrite ---- characteristic: ${characteristic}, status: ${status}, device: ${address}`);

        const stateObject = this.owner.get().connections[address];
        if (!stateObject) {
            this.owner.get().gattDisconnect(gatt);
            return;
        }

        if (stateObject.onWritePromise) {
            stateObject.onWritePromise({
                characteristicUUID: uuidToString(characteristic.getUuid())
            });
        }
    }

    /**
     * Callback reporting the result of a descriptor read operation.
     * @param gatt - GATT client invoked readDescriptor(BluetoothGattDescriptor)
     * @param descriptor - Descriptor that was read from the associated remote device.
     * @param status - GATT_SUCCESS if the read operation was completed successfully
     */
    onDescriptorRead(gatt: android.bluetooth.BluetoothGatt, descriptor: android.bluetooth.BluetoothGattDescriptor, status: number) {
        CLog(CLogTypes.info, `TNS_BluetoothGattCallback.onDescriptorRead ---- gatt: ${gatt}, descriptor: ${descriptor}, status: ${status}`);
    }

    /**
     * Callback indicating the result of a descriptor write operation.
     * @param gatt - GATT client invoked writeDescriptor(BluetoothGattDescriptor).
     * @param descriptor - Descriptor that was written to the associated remote device.
     * @param status - The result of the write operation GATT_SUCCESS if the operation succeeds.
     */
    onDescriptorWrite(gatt: android.bluetooth.BluetoothGatt, descriptor: android.bluetooth.BluetoothGattDescriptor, status: number) {
        CLog(CLogTypes.info, `TNS_BluetoothGattCallback.onDescriptorWrite ---- gatt: ${gatt}, descriptor: ${descriptor}, status: ${status}`);
    }

    /**
     * Callback reporting the RSSI for a remote device connection. This callback is triggered in response to the readRemoteRssi() function.
     * @param gatt - GATT client invoked readRemoteRssi().
     * @param rssi - The RSSI value for the remote device.
     * @param status - GATT_SUCCESS if the RSSI was read successfully.
     */
    onReadRemoteRssi(gatt: android.bluetooth.BluetoothGatt, rssi: number, status: number) {
        CLog(CLogTypes.info, `TNS_BluetoothGattCallback.onReadRemoteRssi ---- gatt: ${gatt} rssi: ${rssi}, status: ${status}`);
    }

    /**
     * Callback indicating the MTU for a given device connection has changed. This callback is triggered in response to the requestMtu(int) function, or in response to a connection event.
     * @param gatt - GATT client invoked requestMtu(int).
     * @param mtu - The new MTU size.
     * @param status - GATT_SUCCESS if the MTU has been changed successfully.
     */
    onMtuChanged(gatt: android.bluetooth.BluetoothGatt, mtu: number, status: number) {
        CLog(CLogTypes.info, `TNS_BluetoothGattCallback.onMtuChanged ---- gatt: ${gatt} mtu: ${mtu}, status: ${status}`);
    }
}
