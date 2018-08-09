import { Bluetooth } from './android_main';
import { CLog, CLogTypes, Peripheral } from '../common';

/**
 * Callback interface used to deliver LE scan results.
 * https://developer.android.com/reference/android/bluetooth/BluetoothAdapter.LeScanCallback.html
 */
@JavaProxy('com.nativescript.TNS_LeScanCallback')
// tslint:disable-next-line:class-name
export class TNS_LeScanCallback extends android.bluetooth.BluetoothAdapter.LeScanCallback {
  private owner: WeakRef<Bluetooth>;
  onPeripheralDiscovered: (data: Peripheral) => void;

  constructor() {
    super({
      /**
       * Callback reporting an LE device found during a device scan initiated by the startLeScan(BluetoothAdapter.LeScanCallback) function.
       * @param device [android.bluetooth.BluetoothDevice] - Identifies the remote device
       * @param rssi [number] - The RSSI value for the remote device as reported by the Bluetooth hardware. 0 if no RSSI value is available.
       * @param scanRecord [byte[]] - The content of the advertisement record offered by the remote device.
       */
      onLeScan(device: android.bluetooth.BluetoothDevice, rssi: number, scanRecord: number[]) {
        CLog(CLogTypes.info, `TNS_LeScanCallback.onLeScan ---- device: ${device}, rssi: ${rssi}, scanRecord: ${scanRecord}`);

        let stateObject = this.owner.get().connections[device.getAddress()];
        if (!stateObject) {
          stateObject = this.owner.get().connections[device.getAddress()] = {
            state: 'disconnected'
          };

          const advertismentData = (stateObject.advertismentData = this.owner.get().extractAdvertismentData(scanRecord));
          let manufacturerId;
          CLog(CLogTypes.info, `TNS_LeScanCallback.onLeScan ---- advertismentData: ${advertismentData}`);
          if (advertismentData.manufacturerData) {
            manufacturerId = new DataView(advertismentData.manufacturerData, 0).getUint16(0, true);
            CLog(CLogTypes.info, `TNS_LeScanCallback.onLeScan ---- manufacturerId: ${manufacturerId}`);
            CLog(CLogTypes.info, `TNS_LeScanCallback.onLeScan ---- manufacturerData: ${advertismentData.manufacturerData}`);
          }

          const payload = {
            type: 'scanResult', // TODO or use different callback functions?
            UUID: device.getAddress(), // TODO consider renaming to id (and iOS as well)
            name: device.getName(),
            RSSI: rssi,
            state: 'disconnected',
            advertismentData: advertismentData,
            manufacturerId: manufacturerId
          };
          CLog(CLogTypes.info, `TNS_LeScanCallback.onLeScan ---- payload: ${JSON.stringify(payload)}`);
          this.onPeripheralDiscovered && this.onPeripheralDiscovered(payload);
          this.owner.get().sendEvent(Bluetooth.device_discovered_event, payload);
        }
      }
    });
    return global.__native(this);
  }

  onInit(owner: WeakRef<Bluetooth>) {
    this.owner = owner;
    CLog(CLogTypes.info, `TNS_LeScanCallback.onInit ---- this.owner: ${this.owner}`);
  }
}
