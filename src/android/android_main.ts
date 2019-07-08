/// <reference path="../node_modules/tns-platform-declarations/android-27.d.ts" />

import * as utils from 'tns-core-modules/utils/utils';
import * as application from 'tns-core-modules/application';
import {
  BluetoothCommon,
  CLog,
  CLogTypes,
  StopNotifyingOptions,
  StartNotifyingOptions,
  ConnectOptions,
  StartScanningOptions,
  DisconnectOptions,
  WriteOptions,
  ReadOptions
} from '../common';
import { TNS_BluetoothGattCallback } from './TNS_BluetoothGattCallback';
import { TNS_LeScanCallback } from './TNS_LeScanCallback';
import { TNS_ScanCallback } from './TNS_ScanCallback';

const ACCESS_COARSE_LOCATION_PERMISSION_REQUEST_CODE = 222;
const ACTION_REQUEST_ENABLE_BLUETOOTH_REQUEST_CODE = 223;
const ACTION_REQUEST_BLUETOOTH_DISCOVERABLE_REQUEST_CODE = 224;

declare let android, global: any;

const AppPackageName = useAndroidX() ? global.androidx.core.app : android.support.v4.app;
const ContentPackageName = useAndroidX() ? global.androidx.core.content : android.support.v4.content;

function useAndroidX () {
  return global.androidx && global.androidx.appcompat;
}

export class Bluetooth extends BluetoothCommon {
  // @link - https://developer.android.com/reference/android/content/Context.html#BLUETOOTH_SERVICE
  public bluetoothManager: android.bluetooth.BluetoothManager = utils.ad
    .getApplicationContext()
    .getSystemService(android.content.Context.BLUETOOTH_SERVICE);
  public adapter: android.bluetooth.BluetoothAdapter = this.bluetoothManager.getAdapter();
  public gattServer: android.bluetooth.BluetoothGattServer;
  public bluetoothGattCallback = new TNS_BluetoothGattCallback();
  // not initializing here, if the Android API is < 21  use LeScanCallback
  public scanCallback: TNS_ScanCallback;
  public LeScanCallback: TNS_LeScanCallback;

  /**
   * Connections are stored as key-val pairs of UUID-Connection.
   * So something like this:
   * [{
   *   34343-2434-5454: {
   *     state: 'connected',
   *     discoveredState: '',
   *     operationConnect: someCallbackFunction
   *   },
   *   1323213-21321323: {
   *     ..
   *   }
   * }, ..]
   */
  public connections = {};

  constructor() {
    super();
    CLog(CLogTypes.info, '*** Android Bluetooth Constructor ***');
    CLog(CLogTypes.info, 'this.bluetoothManager', this.bluetoothManager);
    CLog(CLogTypes.info, 'this.adapter', this.adapter);

    // if >= Android21 (Lollipop)
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
      this.scanCallback = new TNS_ScanCallback();
      this.scanCallback.onInit(new WeakRef(this));
    } else {
      this.LeScanCallback = new TNS_LeScanCallback();
      this.LeScanCallback.onInit(new WeakRef(this));
    }

    this.bluetoothGattCallback.onInit(new WeakRef(this));
  }

  // Getter/Setters
  get enabled() {
    if (this.adapter !== null && this.adapter.isEnabled()) {
      return true;
    } else {
      return false;
    }
  }

  public coarseLocationPermissionGranted() {
    let hasPermission = android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.M;
    if (!hasPermission) {
      const ctx = this._getContext();
      CLog(CLogTypes.info, `app context ${ctx}`);

      hasPermission =
        android.content.pm.PackageManager.PERMISSION_GRANTED ===
          ContentPackageName.ContextCompat.checkSelfPermission(ctx, android.Manifest.permission.ACCESS_COARSE_LOCATION);
    }
    CLog(CLogTypes.info, 'Bluetooth.coarseLocationPermissionGranted ---- ACCESS_COARSE_LOCATION permission granted?', hasPermission);
    return hasPermission;
  }

  public requestCoarseLocationPermission(callback?: () => void): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const permissionCb = (args: application.AndroidActivityRequestPermissionsEventData) => {
        if (args.requestCode === ACCESS_COARSE_LOCATION_PERMISSION_REQUEST_CODE) {
          application.android.off(application.AndroidApplication.activityRequestPermissionsEvent, permissionCb);

          for (let i = 0; i < args.permissions.length; i++) {
            if (args.grantResults[i] === android.content.pm.PackageManager.PERMISSION_DENIED) {
              reject('Permission denied');
              return;
            }
          }

          if (callback) {
            callback();
          }
          resolve();
        }
      };

      // grab the permission dialog result
      application.android.on(application.AndroidApplication.activityRequestPermissionsEvent, permissionCb);

      // invoke the permission dialog
      AppPackageName.ActivityCompat.requestPermissions(
        this._getActivity(),
        [android.Manifest.permission.ACCESS_COARSE_LOCATION],
        ACCESS_COARSE_LOCATION_PERMISSION_REQUEST_CODE
      );
    });
  }

  public enable() {
    return new Promise((resolve, reject) => {
      try {
        // activityResult event
        const onBluetoothEnableResult = (args: application.AndroidActivityResultEventData) => {
          CLog(CLogTypes.info, 'Bluetooth.onBluetoothEnableResult ---', `requestCode: ${args.requestCode}, result: ${args.resultCode}`);

          if (args.requestCode === ACTION_REQUEST_ENABLE_BLUETOOTH_REQUEST_CODE) {
            try {
              // remove the event listener
              application.android.off(application.AndroidApplication.activityResultEvent, onBluetoothEnableResult);

              // RESULT_OK = -1
              if (args.resultCode === android.app.Activity.RESULT_OK) {
                this.sendEvent(Bluetooth.bluetooth_enabled_event);
                resolve(true);
              } else {
                resolve(false);
              }
            } catch (ex) {
              CLog(CLogTypes.error, ex);
              application.android.off(application.AndroidApplication.activityResultEvent, onBluetoothEnableResult);
              this.sendEvent(Bluetooth.error_event, { error: ex }, `Bluetooth.enable ---- error: ${ex}`);
              reject(ex);
              return;
            }
          } else {
            application.android.off(application.AndroidApplication.activityResultEvent, onBluetoothEnableResult);
            resolve(false);
            return;
          }
        };

        // set the onBluetoothEnableResult for the intent
        application.android.on(application.AndroidApplication.activityResultEvent, onBluetoothEnableResult);

        // create the intent to start the bluetooth enable request
        const intent = new android.content.Intent(android.bluetooth.BluetoothAdapter.ACTION_REQUEST_ENABLE);
        const activity = application.android.foregroundActivity || application.android.startActivity;
        activity.startActivityForResult(intent, ACTION_REQUEST_ENABLE_BLUETOOTH_REQUEST_CODE);
      } catch (ex) {
        CLog(CLogTypes.error, `Bluetooth.enable: ${ex}`);
        reject(ex);
        this.sendEvent(Bluetooth.error_event, { error: ex }, 'Error enabling bluetooth.');
      }
    });
  }
  public isBluetoothEnabled() {
    return new Promise((resolve, reject) => {
      try {
        resolve(this._isEnabled());
      } catch (ex) {
        CLog(CLogTypes.error, `Bluetooth.isBluetoothEnabled ---- error: ${ex}`);
        reject(ex);
      }
    });
  }

  public startScanning(arg: StartScanningOptions) {
    return new Promise((resolve, reject) => {
      try {
        if (!this._isEnabled()) {
          reject('Bluetooth is not enabled');
          return;
        }

        const onPermissionGranted = () => {
          this.connections = {};

          const serviceUUIDs = arg.serviceUUIDs || [];
          const uuids = [];
          for (const s in serviceUUIDs) {
            if (s) {
              uuids.push(this.stringToUuid(serviceUUIDs[s]));
            }
          }

          // if less than Android21 (Lollipop)
          if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.LOLLIPOP) {
            const didStart =
              uuids.length === 0 ? this.adapter.startLeScan(this.LeScanCallback) : this.adapter.startLeScan(uuids, this.LeScanCallback);
            CLog(CLogTypes.info, `Bluetooth.startScanning ---- didStart scanning: ${didStart}`);

            if (!didStart) {
              // TODO error msg, see https://github.com/randdusing/cordova-plugin-bluetoothle/blob/master/src/android/BluetoothLePlugin.java#L758
              reject("Scanning didn't start");
              return;
            }
          } else {
            let scanFilters = null as java.util.ArrayList<android.bluetooth.le.ScanFilter>;
            if (uuids.length > 0) {
              scanFilters = new java.util.ArrayList();
              for (const u in uuids) {
                if (u) {
                  const theUuid = uuids[u];
                  const scanFilterBuilder = new android.bluetooth.le.ScanFilter.Builder();
                  scanFilterBuilder.setServiceUuid(new android.os.ParcelUuid(theUuid));
                  scanFilters.add(scanFilterBuilder.build());
                }
              }
            }

            // ga hier verder: https://github.com/randdusing/cordova-plugin-bluetoothle/blob/master/src/android/BluetoothLePlugin.java#L775
            const scanSettings = new android.bluetooth.le.ScanSettings.Builder();
            scanSettings.setReportDelay(0);

            const scanMode = (arg.android && arg.android.scanMode) || android.bluetooth.le.ScanSettings.SCAN_MODE_LOW_LATENCY;
            scanSettings.setScanMode(scanMode);

            // if >= Android23 (Marshmallow)
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
              const matchMode = (arg.android && arg.android.matchMode) || android.bluetooth.le.ScanSettings.MATCH_MODE_AGGRESSIVE;
              scanSettings.setMatchMode(matchMode);

              const matchNum = (arg.android && arg.android.matchNum) || android.bluetooth.le.ScanSettings.MATCH_NUM_MAX_ADVERTISEMENT;
              scanSettings.setNumOfMatches(matchNum);

              const callbackType = (arg.android && arg.android.callbackType) || android.bluetooth.le.ScanSettings.CALLBACK_TYPE_ALL_MATCHES;
              scanSettings.setCallbackType(callbackType);
            }

            this.adapter.getBluetoothLeScanner().startScan(scanFilters, scanSettings.build(), this.scanCallback);
          }

          // added this for backward compatibility (if people don't like using the new event listener approach)
          if (this.scanCallback) {
            this.scanCallback.onPeripheralDiscovered = arg.onDiscovered;
          }
          if (this.LeScanCallback) {
            this.LeScanCallback.onPeripheralDiscovered = arg.onDiscovered;
          }

          if (arg.seconds) {
            setTimeout(() => {
              // note that by now a manual 'stop' may have been invoked, but that doesn't hurt
              // if < Android21 (Lollipop)
              if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.LOLLIPOP) {
                this.adapter.stopLeScan(this.LeScanCallback);
              } else {
                this.adapter.getBluetoothLeScanner().stopScan(this.scanCallback);
              }
              resolve();
            }, arg.seconds * 1000);
          } else {
            resolve();
          }
        };

        if (arg.skipPermissionCheck !== true && !this.coarseLocationPermissionGranted()) {
          CLog(
            CLogTypes.info,
            'Bluetooth.startScanning ---- Coarse Location Permission not granted on Android device, will request permission.'
          );
          this.requestCoarseLocationPermission(onPermissionGranted);
        } else {
          onPermissionGranted();
        }
      } catch (ex) {
        CLog(CLogTypes.error, `Bluetooth.startScanning ---- error: ${ex}`);
        reject(ex);
      }
    });
  }

  public stopScanning() {
    return new Promise((resolve, reject) => {
      try {
        if (!this._isEnabled()) {
          reject('Bluetooth is not enabled');
          return;
        }

        // if less than Android21(Lollipop)
        if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.LOLLIPOP) {
          this.adapter.stopLeScan(this.LeScanCallback);
        } else {
          this.adapter.getBluetoothLeScanner().stopScan(this.scanCallback);
        }
        resolve();
      } catch (ex) {
        CLog(CLogTypes.error, `Bluetooth.stopScanning: ${ex}`);
        reject(ex);
      }
    });
  }

  // note that this doesn't make much sense without scanning first
  public connect(arg: ConnectOptions) {
    return new Promise((resolve, reject) => {
      try {
        // or macaddress..
        if (!arg.UUID) {
          reject('No UUID was passed');
          return;
        }
        const bluetoothDevice = this.adapter.getRemoteDevice(arg.UUID);
        if (bluetoothDevice === null) {
          reject('Could not find peripheral with UUID ' + arg.UUID);
        } else {
          CLog(CLogTypes.info, `Bluetooth.connect ---- Connecting to peripheral with UUID: ${arg.UUID}`);

          let gatt;

          // if less than Android23(Marshmallow)
          if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.M) {
            gatt = bluetoothDevice.connectGatt(
              utils.ad.getApplicationContext(), // context
              false, // autoconnect
              this.bluetoothGattCallback
            );
          } else {
            gatt = bluetoothDevice.connectGatt(
              utils.ad.getApplicationContext(), // context
              false, // autoconnect
              this.bluetoothGattCallback,
              android.bluetooth.BluetoothDevice.TRANSPORT_LE // 2
            );
          }

          this.connections[arg.UUID] = {
            state: 'connecting',
            onConnected: arg.onConnected,
            onDisconnected: arg.onDisconnected,
            device: gatt // TODO rename device to gatt?
          };
        }
      } catch (ex) {
        CLog(CLogTypes.error, `Bluetooth.connect ---- error: ${ex}`);
        reject(ex);
      }
    });
  }

  public disconnect(arg: DisconnectOptions) {
    return new Promise((resolve, reject) => {
      try {
        if (!arg.UUID) {
          reject('No UUID was passed');
          return;
        }
        const connection = this.connections[arg.UUID];
        CLog(CLogTypes.info, `Bluetooth.disconnect ---- connection: ${connection}`);
        if (!connection) {
          reject("Peripheral wasn't connected");
          return;
        }

        this.gattDisconnect(connection.device);
        resolve();
      } catch (ex) {
        CLog(CLogTypes.error, `Bluetooth.disconnect ---- error: ${ex}`);
        reject(ex);
      }
    });
  }

  public read(arg: ReadOptions) {
    return new Promise((resolve, reject) => {
      try {
        const wrapper = this._getWrapper(arg, reject);
        if (!wrapper) {
          // no need to reject, this has already been done
          return;
        }

        const gatt = wrapper.gatt;
        CLog(CLogTypes.info, `Bluetooth.read ---- gatt: ${gatt}`);
        const bluetoothGattService = wrapper.bluetoothGattService;
        CLog(CLogTypes.info, `Bluetooth.read ---- bluetoothGattService: ${bluetoothGattService}`);
        const characteristicUUID = this.stringToUuid(arg.characteristicUUID);
        CLog(CLogTypes.info, `Bluetooth.read ---- characteristicUUID: ${characteristicUUID}`);

        const bluetoothGattCharacteristic = this._findCharacteristicOfType(
          bluetoothGattService,
          characteristicUUID,
          android.bluetooth.BluetoothGattCharacteristic.PROPERTY_READ
        );
        CLog(CLogTypes.info, `Bluetooth.read ---- bluetoothGattCharacteristic: ${bluetoothGattCharacteristic}`);

        if (!bluetoothGattCharacteristic) {
          reject(
            `Could not find characteristic with UUID ${arg.characteristicUUID} on service with UUID ${
              arg.serviceUUID
            } on peripheral with UUID ${arg.peripheralUUID}`
          );
          return;
        }

        const stateObject = this.connections[arg.peripheralUUID];
        stateObject.onReadPromise = resolve;
        if (!gatt.readCharacteristic(bluetoothGattCharacteristic)) {
          reject('Failed to set client characteristic read for ' + characteristicUUID);
        }
      } catch (ex) {
        CLog(CLogTypes.error, `Bluetooth.read ---- error: ${ex}`);
        reject(ex);
      }
    });
  }

  public write(arg: WriteOptions) {
    return new Promise((resolve, reject) => {
      try {
        if (!arg.value) {
          reject("You need to provide some data to write in the 'value' property");
          return;
        }
        const wrapper = this._getWrapper(arg, reject);
        if (wrapper === null) {
          // no need to reject, this has already been done
          return;
        }

        const characteristic = this._findCharacteristicOfType(
          wrapper.bluetoothGattService,
          this.stringToUuid(arg.characteristicUUID),
          android.bluetooth.BluetoothGattCharacteristic.PROPERTY_WRITE
        );
        CLog(CLogTypes.info, `Bluetooth.write ---- characteristic: ${characteristic}`);

        if (!characteristic) {
          reject(
            `Could not find characteristic with UUID ${arg.characteristicUUID} on service with UUID ${
              arg.serviceUUID
            } on peripheral with UUID ${arg.peripheralUUID}`
          );
          return;
        }

        const val = this.encodeValue(arg.value);
        if (val === null) {
          reject('Invalid value: ' + arg.value);
          return;
        }

        characteristic.setValue(val);
        characteristic.setWriteType(android.bluetooth.BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT);

        this.connections[arg.peripheralUUID].onWritePromise = resolve;
        if (!wrapper.gatt.writeCharacteristic(characteristic)) {
          reject(`Failed to write to characteristic ${arg.characteristicUUID}`);
        }
      } catch (ex) {
        CLog(CLogTypes.error, `Bluetooth.write ---- error: ${ex}`);
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
        const wrapper = this._getWrapper(arg, reject);
        if (!wrapper) {
          // no need to reject, this has already been done
          return;
        }

        const characteristic = this._findCharacteristicOfType(
          wrapper.bluetoothGattService,
          this.stringToUuid(arg.characteristicUUID),
          android.bluetooth.BluetoothGattCharacteristic.PROPERTY_WRITE
        );
        CLog(CLogTypes.info, `Bluetooth.writeWithoutResponse ---- characteristic: ${characteristic}`);
        if (!characteristic) {
          reject(
            `Could not find characteristic with UUID ${arg.characteristicUUID} on service with UUID ${
              arg.serviceUUID
            } on peripheral with UUID ${arg.peripheralUUID}`
          );
          return;
        }

        const val = this.encodeValue(arg.value);
        CLog(CLogTypes.info, `Bluetooth.writeWithoutResponse ---- encodedValue: ${val}`);
        if (!val) {
          reject(`Invalid value: ${arg.value}`);
          return;
        }

        characteristic.setValue(val);
        characteristic.setWriteType(android.bluetooth.BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE);

        if (wrapper.gatt.writeCharacteristic(characteristic)) {
          resolve();
        } else {
          reject(`Failed to write to characteristic ${arg.characteristicUUID}`);
        }
      } catch (ex) {
        CLog(CLogTypes.error, `Bluetooth.writeWithoutResponse ---- error: ${ex}`);
        reject(ex);
      }
    });
  }

  public startNotifying(arg: StartNotifyingOptions) {
    return new Promise((resolve, reject) => {
      try {
        const wrapper = this._getWrapper(arg, reject);
        if (!wrapper) {
          // no need to reject, this has already been done
          return;
        }

        const gatt = wrapper.gatt;
        const bluetoothGattService = wrapper.bluetoothGattService;
        const characteristicUUID = this.stringToUuid(arg.characteristicUUID);

        const characteristic = this._findNotifyCharacteristic(bluetoothGattService, characteristicUUID);
        CLog(CLogTypes.info, `Bluetooth.startNotifying ---- characteristic: ${characteristic}`);
        if (!characteristic) {
          reject(
            `Could not find characteristic with UUID ${arg.characteristicUUID} on service with UUID ${
              arg.serviceUUID
            } on peripheral with UUID ${arg.peripheralUUID}`
          );
          return;
        }

        if (!gatt.setCharacteristicNotification(characteristic, true)) {
          reject(`Failed to register notification for characteristic ${arg.characteristicUUID}`);
          return;
        }

        const clientCharacteristicConfigId = this.stringToUuid('2902');
        let bluetoothGattDescriptor = characteristic.getDescriptor(
          clientCharacteristicConfigId
        ) as android.bluetooth.BluetoothGattDescriptor;
        if (!bluetoothGattDescriptor) {
          bluetoothGattDescriptor = new android.bluetooth.BluetoothGattDescriptor(
            clientCharacteristicConfigId,
            android.bluetooth.BluetoothGattDescriptor.PERMISSION_WRITE
          );
          characteristic.addDescriptor(bluetoothGattDescriptor);
          CLog(CLogTypes.info, `Bluetooth.startNotifying ---- descriptor: ${bluetoothGattDescriptor}`);
          // Any creation error will trigger the global catch. Ok.
        }

        // prefer notify over indicate
        if ((characteristic.getProperties() & android.bluetooth.BluetoothGattCharacteristic.PROPERTY_NOTIFY) !== 0) {
          bluetoothGattDescriptor.setValue(android.bluetooth.BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE);
        } else if ((characteristic.getProperties() & android.bluetooth.BluetoothGattCharacteristic.PROPERTY_INDICATE) !== 0) {
          bluetoothGattDescriptor.setValue(android.bluetooth.BluetoothGattDescriptor.ENABLE_INDICATION_VALUE);
        } else {
          reject(`Characteristic ${characteristicUUID} does not have NOTIFY or INDICATE property set.`);
          return;
        }

        if (gatt.writeDescriptor(bluetoothGattDescriptor)) {
          const cb =
            arg.onNotify ||
            function(result) {
              CLog(CLogTypes.warning, "No 'onNotify' callback function specified for 'startNotifying'");
            };
          const stateObject = this.connections[arg.peripheralUUID];
          stateObject.onNotifyCallback = cb;
          CLog(CLogTypes.info, '--- notifying');
          resolve();
        } else {
          reject(`Failed to set client characteristic notification for ${characteristicUUID}`);
        }
      } catch (ex) {
        CLog(CLogTypes.error, `Bluetooth.startNotifying ---- error: ${ex}`);
        reject(ex);
      }
    });
  }

  // TODO lot of reuse between this and .startNotifying
  public stopNotifying(arg: StopNotifyingOptions) {
    return new Promise((resolve, reject) => {
      try {
        const wrapper = this._getWrapper(arg, reject);
        if (!wrapper) {
          // no need to reject, this has already been done
          return;
        }

        const gatt = wrapper.gatt;
        const gattService = wrapper.bluetoothGattService;
        const characteristicUUID = this.stringToUuid(arg.characteristicUUID);

        const characteristic = this._findNotifyCharacteristic(gattService, characteristicUUID);
        CLog(CLogTypes.info, `Bluetooth.stopNotifying ---- service characteristic: ${characteristic}`);

        if (!characteristic) {
          reject(
            `Could not find characteristic with UUID ${arg.characteristicUUID} on service with UUID ${
              arg.serviceUUID
            } on peripheral with UUID ${arg.peripheralUUID}`
          );
          return;
        }

        const stateObject = this.connections[arg.peripheralUUID];
        stateObject.onNotifyCallback = null;

        if (gatt.setCharacteristicNotification(characteristic, false)) {
          resolve();
        } else {
          reject('Failed to remove client characteristic notification for ' + characteristicUUID);
        }
      } catch (ex) {
        CLog(CLogTypes.error, `Bluetooth.stopNotifying: ${ex}`);
        reject(ex);
      }
    });
  }

  public gattDisconnect(gatt: android.bluetooth.BluetoothGatt) {
    if (gatt !== null) {
      const device = gatt.getDevice() as android.bluetooth.BluetoothDevice;
      CLog(CLogTypes.info, `Bluetooth.gattDisconnect ---- device: ${device}`);
      const stateObject = this.connections[device.getAddress()];
      CLog(CLogTypes.info, `Bluetooth.gattDisconnect ---- invoking disconnect callback`);
      if (stateObject && stateObject.onDisconnected) {
        stateObject.onDisconnected({
          UUID: device.getAddress(),
          name: device.getName()
        });
      } else {
        CLog(CLogTypes.info, 'Bluetooth.gattDisconnect ---- no disconnect callback found');
      }
      this.connections[device.getAddress()] = null;
      // Close this Bluetooth GATT client.
      CLog(CLogTypes.info, 'Bluetooth.gattDisconnect ---- Closing GATT client');
      gatt.close();
    }
  }

  // Java UUID -> JS
  public uuidToString(uuid) {
    const uuidStr = uuid.toString();
    const pattern = java.util.regex.Pattern.compile('0000(.{4})-0000-1000-8000-00805f9b34fb', 2);
    const matcher = pattern.matcher(uuidStr);
    return matcher.matches() ? matcher.group(1) : uuidStr;
  }

  // val must be a Uint8Array or Uint16Array or a string like '0x01' or '0x007F' or '0x01,0x02', or '0x007F,'0x006F''
  public encodeValue(val) {
    let parts = val;
    // if it's not a string assume it's a byte array already
    if (typeof val === 'string') {
      parts = val.split(',');

      if (parts[0].indexOf('x') === -1) {
        return null;
      }
    }

    const result = Array.create('byte', parts.length);

    for (let i = 0; i < parts.length; i++) {
      result[i] = parts[i];
    }
    return result;
  }

  public decodeValue(value) {
    if (value === null) {
      return null;
    }

    // value is of Java type: byte[]
    const b = android.util.Base64.encodeToString(value, android.util.Base64.NO_WRAP);
    return this.base64ToArrayBuffer(b);
  }

  // JS UUID -> Java
  public stringToUuid(uuidStr) {
    if (uuidStr.length === 4) {
      uuidStr = '0000' + uuidStr + '-0000-1000-8000-00805f9b34fb';
    }
    return java.util.UUID.fromString(uuidStr);
  }

  public extractManufacturerRawData(scanRecord) {
    let offset = 0;
    while (offset < scanRecord.length - 2) {
      const len = scanRecord[offset++] & 0xff;
      if (len === 0) {
        break;
      }

      const type = scanRecord[offset++] & 0xff;
      switch (type) {
        case 0xff: // Manufacturer Specific Data
          return this.decodeValue(java.util.Arrays.copyOfRange(scanRecord, offset, offset + len - 1));
        default:
          offset += len - 1;
          break;
      }
    }
  }

  // This guards against peripherals reusing char UUID's. We prefer notify.
  private _findNotifyCharacteristic(bluetoothGattService, characteristicUUID) {
    // Check for Notify first
    const characteristics = bluetoothGattService.getCharacteristics();
    for (let i = 0; i < characteristics.size(); i++) {
      const c = characteristics.get(i);
      if (
        (c.getProperties() & android.bluetooth.BluetoothGattCharacteristic.PROPERTY_NOTIFY) !== 0 &&
        characteristicUUID.equals(c.getUuid())
      ) {
        return c;
      }
    }

    // If there wasn't a Notify Characteristic, check for Indicate
    for (let j = 0; j < characteristics.size(); j++) {
      const ch = characteristics.get(j);
      if (
        (ch.getProperties() & android.bluetooth.BluetoothGattCharacteristic.PROPERTY_INDICATE) !== 0 &&
        characteristicUUID.equals(ch.getUuid())
      ) {
        return ch;
      }
    }

    // As a last resort, try and find ANY characteristic with this UUID, even if it doesn't have the correct properties
    return bluetoothGattService.getCharacteristic(characteristicUUID);
  }

  // This guards against peripherals reusing char UUID's.
  private _findCharacteristicOfType(bluetoothGattService: android.bluetooth.BluetoothGattService, characteristicUUID, charType) {
    // Returns a list of characteristics included in this service.
    const characteristics = bluetoothGattService.getCharacteristics();
    for (let i = 0; i < characteristics.size(); i++) {
      const c = characteristics.get(i) as android.bluetooth.BluetoothGattCharacteristic;
      if ((c.getProperties() & charType) !== 0 && characteristicUUID.equals(c.getUuid())) {
        return c;
      }
    }
    // As a last resort, try and find ANY characteristic with this UUID, even if it doesn't have the correct properties
    return bluetoothGattService.getCharacteristic(characteristicUUID);
  }

  private _getWrapper(arg, reject) {
    if (!this._isEnabled()) {
      reject('Bluetooth is not enabled');
      return;
    }
    if (!arg.peripheralUUID) {
      reject('No peripheralUUID was passed');
      return;
    }
    if (!arg.serviceUUID) {
      reject('No serviceUUID was passed');
      return;
    }
    if (!arg.characteristicUUID) {
      reject('No characteristicUUID was passed');
      return;
    }

    const serviceUUID = this.stringToUuid(arg.serviceUUID);

    const stateObject = this.connections[arg.peripheralUUID];
    if (!stateObject) {
      reject('The peripheral is disconnected');
      return;
    }

    const gatt = stateObject.device;
    const bluetoothGattService = gatt.getService(serviceUUID);

    if (!bluetoothGattService) {
      reject(`Could not find service with UUID ${arg.serviceUUID} on peripheral with UUID ${arg.peripheralUUID}`);
      return;
    }

    // with that all being checked, let's return a wrapper object containing all the stuff we found here
    return {
      gatt: gatt,
      bluetoothGattService: bluetoothGattService
    };
  }

  private _isEnabled() {
    return this.adapter && this.adapter.isEnabled();
  }

  private _getContext() {
    //noinspection JSUnresolvedVariable,JSUnresolvedFunction
    const ctx = java.lang.Class.forName('android.app.AppGlobals')
      .getMethod('getInitialApplication', null)
      .invoke(null, null);
    if (ctx) {
      return ctx;
    }

    //noinspection JSUnresolvedVariable,JSUnresolvedFunction
    return java.lang.Class.forName('android.app.ActivityThread')
      .getMethod('currentApplication', null)
      .invoke(null, null);
  }

  private _getActivity() {
    const activity = application.android.foregroundActivity || application.android.startActivity;
    if (activity === null) {
      // Throw this off into the future since an activity is not available....
      setTimeout(() => {
        this._getActivity();
      }, 250);
      return;
    } else {
      return activity;
    }
  }
}
