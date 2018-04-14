/// <reference path="../node_modules/tns-platform-declarations/android.d.ts" />
/// <reference path="../typings/android27.d.ts" />

import { Bluetooth } from "./android_main";
import { CLog, CLogTypes } from "../common";

/**
 * Callback interface used to deliver LE scan results.
 * https://developer.android.com/reference/android/bluetooth/BluetoothAdapter.LeScanCallback.html
 */
@JavaProxy("com.nativescript.TNS_LeScanCallback")
// tslint:disable-next-line:class-name
export class TNS_LeScanCallback extends android.bluetooth.BluetoothAdapter
  .LeScanCallback {
  private owner: WeakRef<Bluetooth>;
  constructor() {
    super({
      /**
       * Callback reporting an LE device found during a device scan initiated by the startLeScan(BluetoothAdapter.LeScanCallback) function.
       * @param device [android.bluetooth.BluetoothDevice] - Identifies the remote device
       * @param rssi [number] - The RSSI value for the remote device as reported by the Bluetooth hardware. 0 if no RSSI value is available.
       * @param scanRecord [byte[]] - The content of the advertisement record offered by the remote device.
       */
      onLeScan(
        device: android.bluetooth.BluetoothDevice,
        rssi: number,
        scanRecord
      ) {
        CLog(
          CLogTypes.info,
          `TNS_LeScanCallback.onLeScan ---- device: ${device}, rssi: ${rssi}, scanRecord: ${scanRecord}`
        );

        const stateObject = this.owner.get().connections[device.getAddress()];
        if (!stateObject) {
          this.owner.get().connections[device.getAddress()] = {
            state: "disconnected"
          };

          let manufacturerId;
          let manufacturerData;
          const manufacturerDataRaw = this.owner
            .get()
            .extractManufacturerRawData(scanRecord);
          CLog(
            CLogTypes.info,
            `TNS_LeScanCallback.onLeScan ---- manufacturerDataRaw: ${manufacturerDataRaw}`
          );
          if (manufacturerDataRaw) {
            manufacturerId = new DataView(manufacturerDataRaw, 0).getUint16(
              0,
              true
            );
            CLog(
              CLogTypes.info,
              `TNS_LeScanCallback.onLeScan ---- manufacturerId: ${manufacturerId}`
            );
            manufacturerData = manufacturerDataRaw.slice(2);
            CLog(
              CLogTypes.info,
              `TNS_LeScanCallback.onLeScan ---- manufacturerData: ${manufacturerData}`
            );
          }

          const payload = {
            type: "scanResult", // TODO or use different callback functions?
            UUID: device.getAddress(), // TODO consider renaming to id (and iOS as well)
            name: device.getName(),
            RSSI: rssi,
            state: "disconnected",
            manufacturerId: manufacturerId,
            manufacturerData: manufacturerData
          };
          CLog(
            CLogTypes.info,
            `TNS_LeScanCallback.onLeScan ---- payload: ${JSON.stringify(
              payload
            )}`
          );
          this.owner
            .get()
            .sendEvent(Bluetooth.device_discovered_event, { data: payload });
        }
      }
    });
    return global.__native(this);
  }

  onInit(owner: WeakRef<Bluetooth>) {
    this.owner = owner;
    CLog(
      CLogTypes.info,
      `TNS_LeScanCallback.onInit ---- this.owner: ${this.owner}`
    );
  }
}
