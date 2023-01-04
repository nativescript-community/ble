
declare namespace com {
    export namespace nativescript {
        export namespace bluetooth {
            export class Bluetooth {
                static writeCharStringValue(char: android.bluetooth.BluetoothGattCharacteristic, value: string, encoding: string);
                static writeCharValue(char: android.bluetooth.BluetoothGattCharacteristic, value: number[]);
                static writeCharBufferValue(char: android.bluetooth.BluetoothGattCharacteristic, value: java.nio.ByteBuffer);
            }
        }
    }
}
