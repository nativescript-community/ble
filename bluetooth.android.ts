///<reference path="_references.d.ts" />"

import * as utils from "utils/utils"
import * as application from "application";
import {bluetooth} from "./bluetooth-common";

var ACCESS_COARSE_LOCATION_PERMISSION_REQUEST_CODE = 222;

var adapter, onDiscovered;

class Bluetooth extends bluetooth {
  _scanCallback;

  _coarseLocationPermissionGranted() {
    var hasPermission = android.os.Build.VERSION.SDK_INT < 23; // Android M. (6.0)
    if (!hasPermission) {
      hasPermission = android.content.pm.PackageManager.PERMISSION_GRANTED ==
        android.support.v4.content.ContextCompat.checkSelfPermission(application.android.foregroundActivity, android.Manifest.permission.ACCESS_COARSE_LOCATION);
    }
    return hasPermission;
  };

  hasCoarseLocationPermission() {
    return new Promise(function (resolve) {
      resolve(this._coarseLocationPermissionGranted());
    });
  };

  requestCoarseLocationPermission() {
    return new Promise(function (resolve) {
      if (!this._coarseLocationPermissionGranted()) {
        // in a future version we could hook up the callback and change this flow a bit
        android.support.v4.app.ActivityCompat.requestPermissions( //https://developer.android.com/reference/android/support/v4/app/package-summary.html ******** Should use OnRequestPermissionsResultCallback ?
          application.android.foregroundActivity,
          [android.Manifest.permission.ACCESS_COARSE_LOCATION],
          ACCESS_COARSE_LOCATION_PERMISSION_REQUEST_CODE);
        // this is not the nicest solution as the user needs to initiate scanning again after granting permission,
        // so enhance this in a future version, but it's ok for now
        resolve();
      }
    });
  };

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
  _connections = {};

  constructor() {
    super();
    var bluetoothManager = utils.ad.getApplicationContext().getSystemService(android.content.Context.BLUETOOTH_SERVICE);
    adapter = bluetoothManager.getAdapter();
  
    if (android.os.Build.VERSION.SDK_INT >= 21 /*android.os.Build.VERSION_CODES.LOLLIPOP*/ ) {
      var MyScanCallback = android.bluetooth.le.ScanCallback.extend({
        onBatchScanResults: function (results) {
          console.log("------- scanCallback.onBatchScanResults");
        },
        onScanFailed: function (errorCode) {
          console.log("------- scanCallback.onScanFailed errorCode: " + errorCode);
          var errorMessage;
          if (errorCode == android.bluetooth.le.ScanCallback.SCAN_FAILED_ALREADY_STARTED) {
            errorMessage = "Scan already started";
          } else if (errorCode == android.bluetooth.le.ScanCallback.SCAN_FAILED_APPLICATION_REGISTRATION_FAILED) {
            errorMessage = "Application registration failed";
          } else if (errorCode == android.bluetooth.le.ScanCallback.SCAN_FAILED_FEATURE_UNSUPPORTED) {
            errorMessage = "Feature unsupported";
          } else if (errorCode == android.bluetooth.le.ScanCallback.SCAN_FAILED_INTERNAL_ERROR) {
            errorMessage = "Internal error";
          } else {
            errorMessage = "Scan failed to start";
          }
          console.log("------- scanCallback.onScanFailed errorMessage: " + errorMessage);
        },
        onScanResult: function (callbackType, result) {
          var stateObject = this._connections[result.getDevice().getAddress()];
          if (!stateObject) {
            this._connections[result.getDevice().getAddress()] = {
              state: 'disconnected'
            };
            var payload = {
              type: 'scanResult', // TODO or use different callback functions?
              UUID: result.getDevice().getAddress(),
              name: result.getDevice().getName(),
              RSSI: result.getRssi(),
              state: 'disconnected',
              advertisement: android.util.Base64.encodeToString(result.getScanRecord().getBytes(), android.util.Base64.NO_WRAP)
            };
            console.log("---- Lollipop+ scanCallback result: " + JSON.stringify(payload));
            onDiscovered(payload);
          }
        }
      });
      this._scanCallback = new MyScanCallback();
    } else {
      this._scanCallback = new android.bluetooth.BluetoothAdapter.LeScanCallback({
        // see https://github.com/randdusing/cordova-plugin-bluetoothle/blob/master/src/android/BluetoothLePlugin.java#L2181
        onLeScan: function (device: android.bluetooth.BluetoothDevice, rssi: number, scanRecord: Array<number>) {
          var stateObject = this._connections[device.getAddress()];
          if (!stateObject) {
            this._connections[device.getAddress()] = {
              state: 'disconnected'
            };
            onDiscovered({
              type: 'scanResult', // TODO or use different callback functions?
              UUID: device.getAddress(), // TODO consider renaming to id (and iOS as well)
              name: device.getName(),
              RSSI: rssi,
              state: 'disconnected'
            });
          }
        }
      });
    }
  }

  // callback for connecting and read/write operations
  _MyGattCallback = android.bluetooth.BluetoothGattCallback.extend({
    // add constructor which gets a callback

    /**
     * newState (BluetoothProfile.state)
     * 0: disconnected
     * 1: connecting
     * 2: connected
     * 3: disconnecting
     */
    onConnectionStateChange: function (bluetoothGatt, status, newState) {
      console.log("------- _MyGattCallback.onConnectionStateChange, status: " + status + ", new state: " + newState);

      // https://github.com/don/cordova-plugin-ble-central/blob/master/src/android/Peripheral.java#L191    
      if (newState == 2 /* connected */ && status === 0 /* gatt success */) {
        console.log("---- discovering services..");
        bluetoothGatt.discoverServices();
      } else {
        // perhaps the device was manually disconnected, or in use by another device
        this._disconnect(bluetoothGatt);
      }
    },

    onServicesDiscovered: function (bluetoothGatt, status) {
      console.log("------- _MyGattCallback.onServicesDiscovered, status (0=success): " + status);

      if (status === 0 /* gatt success */) {
        // TODO grab from cached object and extend with services data?
        var services = bluetoothGatt.getServices();
        var servicesJs = [];
        var btChar = android.bluetooth.BluetoothGattCharacteristic;
        for (var i = 0; i < services.size(); i++) {
          var service = services.get(i);
          var characteristics = service.getCharacteristics();
          var characteristicsJs = [];
          for (var j = 0; j < characteristics.size(); j++) {
            var characteristic = characteristics.get(j);
            var props = characteristic.getProperties();
            var descriptors = characteristic.getDescriptors();
            var descriptorsJs = [];
            for (var k = 0; k < descriptors.size(); k++) {
              var descriptor = descriptors.get(k);
              var descriptorJs = {
                UUID: this._uuidToString(descriptor.getUuid()),
                value: descriptor.getValue(), // always empty btw
                permissions: null
              };
              var descPerms = descriptor.getPermissions();
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
              descriptorsJs.push(descriptorJs);
            }

            var characteristicJs = {
              UUID: this._uuidToString(characteristic.getUuid()),
              name: this._uuidToString(characteristic.getUuid()), // there's no sep field on Android
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
            var charPerms = characteristic.getPermissions();
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
            characteristicsJs.push(characteristicJs);
          }

          servicesJs.push({
            UUID: this._uuidToString(service.getUuid()),
            characteristics: characteristicsJs
          });
        }
        var device = bluetoothGatt.getDevice();
        var stateObject = this._connections[device.getAddress()];
        stateObject.onConnected({
          UUID: device.getAddress(), // TODO consider renaming to id (and iOS as well)
          name: device.getName(),
          state: 'connected', // this._getState(peripheral.state),
          services: servicesJs
        });
      }
    },

    _decodeValue: function (value) {
      if (value === null) {
        return null;
      }

      // value is of Java type: byte[]
      var b = android.util.Base64.encodeToString(value, android.util.Base64.NO_WRAP);
      return this._base64ToArrayBuffer(b);
    },

    onCharacteristicRead: function (bluetoothGatt, bluetoothGattCharacteristic, status) {
      console.log("------- _MyGattCallback.onCharacteristicRead");

      var device = bluetoothGatt.getDevice();
      var stateObject = this._connections[device.getAddress()];
      if (!stateObject) {
        this._disconnect(bluetoothGatt);
        return;
      }

      if (stateObject.onReadPromise) {
        var value = bluetoothGattCharacteristic.getValue();
        stateObject.onReadPromise({
          valueRaw: value,
          value: this._decodeValue(value),
          characteristicUUID: bluetoothGattCharacteristic.getUuid()
        });
      }
    },

    onCharacteristicChanged: function (bluetoothGatt, bluetoothGattCharacteristic) {
      console.log("------- _MyGattCallback.onCharacteristicChanged");

      var device = bluetoothGatt.getDevice();
      var stateObject = this._connections[device.getAddress()];
      if (!stateObject) {
        this._disconnect(bluetoothGatt);
        return;
      }

      if (stateObject.onNotifyCallback) {
        var value = bluetoothGattCharacteristic.getValue();
        stateObject.onNotifyCallback({
          valueRaw: value,
          value: this._decodeValue(value),
          characteristicUUID: bluetoothGattCharacteristic.getUuid()
        });
      }
    },

    onCharacteristicWrite: function (bluetoothGatt, bluetoothGattCharacteristic, status) {
      console.log("------- _MyGattCallback.onCharacteristicWrite");

      var device = bluetoothGatt.getDevice();
      var stateObject = this._connections[device.getAddress()];
      if (!stateObject) {
        this._disconnect(bluetoothGatt);
        return;
      }

      console.log(bluetoothGattCharacteristic);

      if (stateObject.onWritePromise) {
        stateObject.onWritePromise({
          characteristicUUID: bluetoothGattCharacteristic.getUuid()
        });
      }
    },

    onDescriptorRead: function (bluetoothGatt, bluetoothGattDescriptor, status) {
      console.log("------- _MyGattCallback.onDescriptorRead");
    },

    onDescriptorWrite: function (bluetoothGatt, bluetoothGattDescriptor, status) {
      console.log("------- _MyGattCallback.onDescriptorWrite");
    },

    onReadRemoteRssi: function (bluetoothGatt, rssi, status) {
      console.log("------- _MyGattCallback.onReadRemoteRssi");
    },

    onMtuChanged: function (bluetoothGatt, mtu, status) {
      console.log("------- _MyGattCallback.onMtuChanged");
    }
  });

  _isEnabled(arg) {
    return adapter !== null && adapter.isEnabled();
  };

  isBluetoothEnabled(arg) {
    return new Promise(function (resolve, reject) {
      try {
        resolve(this._isEnabled());
      } catch (ex) {
        console.log("Error in Bluetooth.isBluetoothEnabled: " + ex);
        reject(ex);
      }
    });
  };

  // Java UUID -> JS
  _uuidToString(uuid) {
    var uuidStr = uuid.toString();
    var pattern = java.util.regex.Pattern.compile("0000(.{4})-0000-1000-8000-00805f9b34fb", 2);
    var matcher = pattern.matcher(uuidStr);
    return matcher.matches() ? matcher.group(1) : uuidStr;
  };

  // JS UUID -> Java
  _stringToUuid(uuidStr) {
    if (uuidStr.length === 4) {
      uuidStr = "0000" + uuidStr + "-0000-1000-8000-00805f9b34fb";
    }
    return java.util.UUID.fromString(uuidStr);
  };

  startScanning(arg) {
    return new Promise(function (resolve, reject) {
      try {
        if (!this._isEnabled()) {
          reject("Bluetooth is not enabled");
          return;
        }
        // log a warning when on Android M and no permission has been granted (it's up to the dev to implement that flow though)
        if (!this._coarseLocationPermissionGranted()) {
          console.warn("Coarse location permission has not been granted; scanning for peripherals may fail.");
        }

        this._connections = {};

        var serviceUUIDs = arg.serviceUUIDs || [];
        var uuids = [];
        for (var s in serviceUUIDs) {
          uuids.push(this._stringToUuid(serviceUUIDs[s]));
        }

        if (android.os.Build.VERSION.SDK_INT < 21 /*android.os.Build.VERSION_CODES.LOLLIPOP */) {
          var didStart = uuids.length === 0 ?
            adapter.startLeScan(this._scanCallback) :
            adapter.startLeScan(uuids, this._scanCallback);
          if (!didStart) {
            // TODO error msg, see https://github.com/randdusing/cordova-plugin-bluetoothle/blob/master/src/android/BluetoothLePlugin.java#L758
            reject("Scanning didn't start");
            return;
          }
        } else {
          var scanFilters = null;
          if (uuids.length > 0) {
            scanFilters = new java.util.ArrayList();
            for (var u in uuids) {
              var theUuid = uuids[u];
              var scanFilterBuilder = new android.bluetooth.le.ScanFilter.Builder();
              scanFilterBuilder.setServiceUuid(new android.os.ParcelUuid(theUuid));
              scanFilters.add(scanFilterBuilder.build());
            }
          }
          // ga hier verder: https://github.com/randdusing/cordova-plugin-bluetoothle/blob/master/src/android/BluetoothLePlugin.java#L775
          var scanSettings = new android.bluetooth.le.ScanSettings.Builder();
          scanSettings.setReportDelay(0);

          var scanMode = arg.scanMode || android.bluetooth.le.ScanSettings.SCAN_MODE_LOW_LATENCY;
          scanSettings.setScanMode(scanMode);

          if (android.os.Build.VERSION.SDK_INT >= 23 /*android.os.Build.VERSION_CODES.M */) {
            var matchMode = arg.matchMode || android.bluetooth.le.ScanSettings.MATCH_MODE_AGGRESSIVE;
            scanSettings.setMatchMode(matchMode);

            var matchNum = arg.matchNum || android.bluetooth.le.ScanSettings.MATCH_NUM_MAX_ADVERTISEMENT;
            scanSettings.setNumOfMatches(matchNum);

            var callbackType = arg.callbackType || android.bluetooth.le.ScanSettings.CALLBACK_TYPE_ALL_MATCHES;
            scanSettings.setCallbackType(callbackType);
          }
          adapter.getBluetoothLeScanner().startScan(scanFilters, scanSettings.build(), this._scanCallback);
        }

        onDiscovered = arg.onDiscovered;

        if (arg.seconds) {
          setTimeout(function () {
            // note that by now a manual 'stop' may have been invoked, but that doesn't hurt
            if (android.os.Build.VERSION.SDK_INT < 21 /* android.os.Build.VERSION_CODES.LOLLIPOP */) {
              adapter.stopLeScan(this._scanCallback);
            } else {
              adapter.getBluetoothLeScanner().stopScan(this._scanCallback);
            }
            resolve();
          }, arg.seconds * 1000);
        } else {
          resolve();
        }
      } catch (ex) {
        console.log("Error in Bluetooth.startScanning: " + ex);
        reject(ex);
      }
    });
  };

  stopScanning() {
    return new Promise(function (resolve, reject) {
      try {
        if (!this._isEnabled()) {
          reject("Bluetooth is not enabled");
          return;
        }
        if (android.os.Build.VERSION.SDK_INT < 21 /* android.os.Build.VERSION_CODES.LOLLIPOP */) {
          adapter.stopLeScan(this._scanCallback);
        } else {
          adapter.getBluetoothLeScanner().stopScan(this._scanCallback);
        }
        resolve();
      } catch (ex) {
        console.log("Error in Bluetooth.stopScanning: " + ex);
        reject(ex);
      }
    });
  };

  _disconnect(gatt) {
    if (gatt !== null) {
      var device = gatt.getDevice();
      var stateObject = this._connections[device.getAddress()];
      console.log("----- invoking disc cb");
      if (stateObject && stateObject.onDisconnected) {
        stateObject.onDisconnected({
          UUID: device.getAddress(),
          name: device.getName()
        });
      } else {
        console.log("----- !!! no disconnect callback found");
      }
      this._connections[device.getAddress()] = null;
      gatt.close();
    }
  };

  // note that this doesn't make much sense without scanning first
  connect(arg) {
    return new Promise(function (resolve, reject) {
      try {
        // or macaddress..
        if (!arg.UUID) {
          reject("No UUID was passed");
          return;
        }
        var bluetoothDevice = adapter.getRemoteDevice(arg.UUID);
        if (bluetoothDevice === null) {
          reject("Could not find peripheral with UUID " + arg.UUID);
        } else {
          console.log("Connecting to peripheral with UUID: " + arg.UUID);

          var bluetoothGatt;
          if (android.os.Build.VERSION.SDK_INT < 23 /*android.os.Build.VERSION_CODES.M */) {
            bluetoothGatt = bluetoothDevice.connectGatt(
              utils.ad.getApplicationContext(), // context
              false, // autoconnect
              new this._MyGattCallback(/* TODO pass in onWhatever function */)
            );
          } else {
            bluetoothGatt = bluetoothDevice.connectGatt(
              utils.ad.getApplicationContext(), // context
              false, // autoconnect
              new this._MyGattCallback(/* TODO pass in onWhatever function */),
              android.bluetooth.BluetoothDevice.TRANSPORT_LE // 2
            );
          }

          this._connections[arg.UUID] = {
            state: 'connecting',
            onConnected: arg.onConnected,
            onDisconnected: arg.onDisconnected,
            device: bluetoothGatt // TODO rename device to gatt?
          };
        }
      } catch (ex) {
        console.log("Error in Bluetooth.connect: " + ex);
        reject(ex);
      }
    });
  };

  disconnect(arg) {
    return new Promise(function (resolve, reject) {
      try {
        if (!arg.UUID) {
          reject("No UUID was passed");
          return;
        }
        var connection = this._connections[arg.UUID];
        if (!connection) {
          reject("Peripheral wasn't connected");
          return;
        }

        this._disconnect(connection.device);
        resolve();
      } catch (ex) {
        console.log("Error in Bluetooth.disconnect: " + ex);
        reject(ex);
      }
    });
  };

  // This guards against peripherals reusing char UUID's. We prefer notify.
  _findNotifyCharacteristic(bluetoothGattService, characteristicUUID) {
    // Check for Notify first
    var characteristics = bluetoothGattService.getCharacteristics();
    for (var i = 0; i < characteristics.size(); i++) {
      var c = characteristics.get(i);
      if ((c.getProperties() & android.bluetooth.BluetoothGattCharacteristic.PROPERTY_NOTIFY) !== 0 && characteristicUUID.equals(c.getUuid())) {
        return c;
      }
    }

    // If there wasn't a Notify Characteristic, check for Indicate
    for (i = 0; i < characteristics.size(); i++) {
      var ch = characteristics.get(i);
      if ((ch.getProperties() & android.bluetooth.BluetoothGattCharacteristic.PROPERTY_INDICATE) !== 0 && characteristicUUID.equals(ch.getUuid())) {
        return ch;
      }
    }

    // As a last resort, try and find ANY characteristic with this UUID, even if it doesn't have the correct properties
    return bluetoothGattService.getCharacteristic(characteristicUUID);
  };

  // This guards against peripherals reusing char UUID's.
  _findCharacteristicOfType(bluetoothGattService, characteristicUUID, charType) {
    var characteristics = bluetoothGattService.getCharacteristics();
    for (var i = 0; i < characteristics.size(); i++) {
      var c = characteristics.get(i);
      if ((c.getProperties() & charType) !== 0 && characteristicUUID.equals(c.getUuid())) {
        return c;
      }
    }
    // As a last resort, try and find ANY characteristic with this UUID, even if it doesn't have the correct properties
    return bluetoothGattService.getCharacteristic(characteristicUUID);
  };

  _getWrapper(arg, reject) {
    if (!this._isEnabled(arg)) { //Is that edit correct?
      reject("Bluetooth is not enabled");
      return;
    }
    if (!arg.peripheralUUID) {
      reject("No peripheralUUID was passed");
      return;
    }
    if (!arg.serviceUUID) {
      reject("No serviceUUID was passed");
      return;
    }
    if (!arg.characteristicUUID) {
      reject("No characteristicUUID was passed");
      return;
    }

    var serviceUUID = this._stringToUuid(arg.serviceUUID);

    var stateObject = this._connections[arg.peripheralUUID];
    if (!stateObject) {
      reject("The peripheral is disconnected");
      return;
    }

    var gatt = stateObject.device;
    var bluetoothGattService = gatt.getService(serviceUUID);

    if (!bluetoothGattService) {
      reject("Could not find service with UUID " + arg.serviceUUID + " on peripheral with UUID " + arg.peripheralUUID);
      return;
    }

    // with that all being checked, let's return a wrapper object containing all the stuff we found here
    return {
      gatt: gatt,
      bluetoothGattService: bluetoothGattService
    };
  };

  read(arg) {
    return new Promise(function (resolve, reject) {
      try {
        var wrapper = this._getWrapper(arg, reject);
        if (wrapper === null) {
          // no need to reject, this has already been done
          return;
        }

        var gatt = wrapper.gatt;
        var bluetoothGattService = wrapper.bluetoothGattService;
        var characteristicUUID = this._stringToUuid(arg.characteristicUUID);

        var bluetoothGattCharacteristic = this._findCharacteristicOfType(bluetoothGattService, characteristicUUID, android.bluetooth.BluetoothGattCharacteristic.PROPERTY_READ);
        if (!bluetoothGattCharacteristic) {
          reject("Could not find characteristic with UUID " + arg.characteristicUUID + " on service with UUID " + arg.serviceUUID + " on peripheral with UUID " + arg.peripheralUUID);
          return;
        }

        var stateObject = this._connections[arg.peripheralUUID];
        stateObject.onReadPromise = resolve;
        if (!gatt.readCharacteristic(bluetoothGattCharacteristic)) {
          reject("Failed to set client characteristic read for " + characteristicUUID);
        }
      } catch (ex) {
        console.log("Error in Bluetooth.read: " + ex);
        reject(ex);
      }
    });
  };

  // val must be a Uint8Array or Uint16Array or a string like '0x01' or '0x007F' or '0x01,0x02', or '0x007F,'0x006F''
  _encodeValue(val) {
    // if it's not a string assume it's a byte array already
    if (typeof val != 'string') {
      return val;
    }
    var parts = val.split(',');
    if (parts[0].indexOf('x') == -1) {
      return null;
    }
    var result = Array.create("byte", parts.length);

    for (var i = 0; i < parts.length; i++) {
      result[i] = parts[i];
    }
    return result;
  };

  write(arg) {
    return new Promise(function (resolve, reject) {
      try {
        if (!arg.value) {
          reject("You need to provide some data to write in the 'value' property");
          return;
        }
        var wrapper = this._getWrapper(arg, reject);
        if (wrapper === null) {
          // no need to reject, this has already been done
          return;
        }

        var bluetoothGattCharacteristic = this._findCharacteristicOfType(wrapper.bluetoothGattService, this._stringToUuid(arg.characteristicUUID), android.bluetooth.BluetoothGattCharacteristic.PROPERTY_WRITE);
        if (!bluetoothGattCharacteristic) {
          reject("Could not find characteristic with UUID " + arg.characteristicUUID + " on service with UUID " + arg.serviceUUID + " on peripheral with UUID " + arg.peripheralUUID);
          return;
        }

        var val = this._encodeValue(arg.value);
        if (val === null) {
          reject("Invalid value: " + arg.value);
          return;
        }

        bluetoothGattCharacteristic.setValue(val);
        bluetoothGattCharacteristic.setWriteType(android.bluetooth.BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT);

        this._connections[arg.peripheralUUID].onWritePromise = resolve;
        if (!wrapper.gatt.writeCharacteristic(bluetoothGattCharacteristic)) {
          reject("Failed to write to characteristic " + arg.characteristicUUID);
        }
      } catch (ex) {
        console.log("Error in Bluetooth.write: " + ex);
        reject(ex);
      }
    });
  };

  writeWithoutResponse(arg) {
    return new Promise(function (resolve, reject) {
      try {
        if (!arg.value) {
          reject("You need to provide some data to write in the 'value' property");
          return;
        }
        var wrapper = this._getWrapper(arg, reject);
        if (wrapper === null) {
          // no need to reject, this has already been done
          return;
        }

        var bluetoothGattCharacteristic = this._findCharacteristicOfType(wrapper.bluetoothGattService, this._stringToUuid(arg.characteristicUUID), android.bluetooth.BluetoothGattCharacteristic.PROPERTY_WRITE);
        if (!bluetoothGattCharacteristic) {
          reject("Could not find characteristic with UUID " + arg.characteristicUUID + " on service with UUID " + arg.serviceUUID + " on peripheral with UUID " + arg.peripheralUUID);
          return;
        }

        var val = this._encodeValue(arg.value);
        if (val === null) {
          reject("Invalid value: " + arg.value);
          return;
        }

        bluetoothGattCharacteristic.setValue(val);
        bluetoothGattCharacteristic.setWriteType(android.bluetooth.BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE);

        if (wrapper.gatt.writeCharacteristic(bluetoothGattCharacteristic)) {
          resolve();
        } else {
          reject("Failed to write to characteristic " + arg.characteristicUUID);
        }
      } catch (ex) {
        console.log("Error in Bluetooth.writeWithoutResponse: " + ex);
        reject(ex);
      }
    });
  };

  startNotifying(arg) {
    return new Promise(function (resolve, reject) {
      try {
        var wrapper = this._getWrapper(arg, reject);
        if (wrapper === null) {
          // no need to reject, this has already been done
          return;
        }

        var gatt = wrapper.gatt;
        var bluetoothGattService = wrapper.bluetoothGattService;
        var characteristicUUID = this._stringToUuid(arg.characteristicUUID);

        var bluetoothGattCharacteristic = this._findNotifyCharacteristic(bluetoothGattService, characteristicUUID);
        if (!bluetoothGattCharacteristic) {
          reject("Could not find characteristic with UUID " + arg.characteristicUUID + " on service with UUID " + arg.serviceUUID + " on peripheral with UUID " + arg.peripheralUUID);
          return;
        }

        if (!gatt.setCharacteristicNotification(bluetoothGattCharacteristic, true)) {
          reject("Failed to register notification for characteristic " + arg.characteristicUUID);
          return;
        }

        var clientCharacteristicConfigId = this._stringToUuid("2902");
        var bluetoothGattDescriptor = bluetoothGattCharacteristic.getDescriptor(clientCharacteristicConfigId);
        if (!bluetoothGattDescriptor) {
          reject("Set notification failed for " + characteristicUUID);
          return;
        }

        // prefer notify over indicate
        if ((bluetoothGattCharacteristic.getProperties() & android.bluetooth.BluetoothGattCharacteristic.PROPERTY_NOTIFY) !== 0) {
          bluetoothGattDescriptor.setValue(android.bluetooth.BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE);
        } else if ((bluetoothGattCharacteristic.getProperties() & android.bluetooth.BluetoothGattCharacteristic.PROPERTY_INDICATE) !== 0) {
          bluetoothGattDescriptor.setValue(android.bluetooth.BluetoothGattDescriptor.ENABLE_INDICATION_VALUE);
        } else {
          console.log("Characteristic " + characteristicUUID + " does not have NOTIFY or INDICATE property set");
        }

        if (gatt.writeDescriptor(bluetoothGattDescriptor)) {
          var cb = arg.onNotify || function (result) { console.log("No 'onNotify' callback function specified for 'startNotifying'"); };
          var stateObject = this._connections[arg.peripheralUUID];
          stateObject.onNotifyCallback = cb;
          console.log("--- notifying");
          resolve();
        } else {
          reject("Failed to set client characteristic notification for " + characteristicUUID);
        }
      } catch (ex) {
        console.log("Error in Bluetooth.startNotifying: " + ex);
        reject(ex);
      }
    });
  };

  // TODO lot of reuse between this and .startNotifying
  stopNotifying(arg) {
    return new Promise(function (resolve, reject) {
      try {
        var wrapper = this._getWrapper(arg, reject);
        if (wrapper === null) {
          // no need to reject, this has already been done
          return;
        }

        var gatt = wrapper.gatt;
        var bluetoothGattService = wrapper.bluetoothGattService;
        var characteristicUUID = this._stringToUuid(arg.characteristicUUID);

        var bluetoothGattCharacteristic = this._findNotifyCharacteristic(bluetoothGattService, characteristicUUID);
        console.log("---- got gatt service char: " + bluetoothGattCharacteristic);

        if (!bluetoothGattCharacteristic) {
          reject("Could not find characteristic with UUID " + arg.characteristicUUID + " on service with UUID " + arg.serviceUUID + " on peripheral with UUID " + arg.peripheralUUID);
          return;
        }

        var stateObject = this._connections[arg.peripheralUUID];
        stateObject.onNotifyCallback = null;

        if (gatt.setCharacteristicNotification(bluetoothGattCharacteristic, false)) {
          resolve();
        } else {
          reject("Failed to remove client characteristic notification for " + characteristicUUID);
        }

      } catch (ex) {
        console.log("Error in Bluetooth.stopNotifying: " + ex);
        reject(ex);
      }
    });
  };

}
