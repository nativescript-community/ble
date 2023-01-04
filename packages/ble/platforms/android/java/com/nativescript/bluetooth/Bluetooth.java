package com.nativescript.bluetooth;

import android.bluetooth.BluetoothGattCharacteristic;
import java.lang.String;
import android.util.Log;

public class Bluetooth {
    public static boolean writeCharStringValue(BluetoothGattCharacteristic characteristic, String value, String encoding) {
        byte[] byteArray  = value.getBytes(java.nio.charset.Charset.forName(encoding));
        return characteristic.setValue(byteArray);
    }
    public static boolean writeCharValue(BluetoothGattCharacteristic characteristic, byte[] value) {
        return characteristic.setValue(value);
    }
    public static boolean writeCharBufferValue(BluetoothGattCharacteristic characteristic, java.nio.ByteBuffer value) {
        if (!value.isDirect()) {
            return characteristic.setValue(value.array());
        }
        byte[] ret = new byte[value.capacity()];
        value.get(ret);
        return characteristic.setValue(ret);
    }
}