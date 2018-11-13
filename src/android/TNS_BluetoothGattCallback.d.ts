import { Bluetooth } from './android_main';
export declare class TNS_BluetoothGattCallback extends android.bluetooth.BluetoothGattCallback {
  private owner;
  constructor();
  onInit(owner: WeakRef<Bluetooth>): void;
  onConnectionStateChange(gatt: android.bluetooth.BluetoothGatt, status: number, newState: number): void;
  onServicesDiscovered(gatt: android.bluetooth.BluetoothGatt, status: number): void;
  onCharacteristicRead(
    gatt: android.bluetooth.BluetoothGatt,
    characteristic: android.bluetooth.BluetoothGattCharacteristic,
    status: number
  ): void;
  onCharacteristicChanged(gatt: android.bluetooth.BluetoothGatt, characteristic: android.bluetooth.BluetoothGattCharacteristic): void;
  onCharacteristicWrite(
    gatt: android.bluetooth.BluetoothGatt,
    characteristic: android.bluetooth.BluetoothGattCharacteristic,
    status: number
  ): void;
  onDescriptorRead(gatt: android.bluetooth.BluetoothGatt, descriptor: android.bluetooth.BluetoothGattDescriptor, status: number): void;
  onDescriptorWrite(gatt: android.bluetooth.BluetoothGatt, descriptor: android.bluetooth.BluetoothGattDescriptor, status: number): void;
  onReadRemoteRssi(gatt: android.bluetooth.BluetoothGatt, rssi: number, status: number): void;
  onMtuChanged(gatt: android.bluetooth.BluetoothGatt, mtu: number, status: number): void;
}
