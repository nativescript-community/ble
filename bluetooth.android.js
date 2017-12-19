var utils = require("tns-core-modules/utils/utils");
var application = require("tns-core-modules/application");
var Bluetooth = require("./bluetooth-common");

var ACCESS_COARSE_LOCATION_PERMISSION_REQUEST_CODE = 222;
var ACTION_REQUEST_ENABLE_BLUETOOTH_REQUEST_CODE = 223;
var ACTION_REQUEST_BLUETOOTH_DISCOVERABLE_REQUEST_CODE = 224;

var adapter /* android.bluetooth.BluetoothAdapter */,
    bluetoothManager,
    gattServer,
    onDiscovered,
    _onBluetoothEnabledResolve,
    _onBluetoothDiscoverableResolve,
    _onBluetoothAdvertiseResolve,
    _onBluetoothAdvertiseReject,
    _permissionRequestResolver,
    _onPermissionGranted;

Bluetooth._coarseLocationPermissionGranted = function () {
  var hasPermission = android.os.Build.VERSION.SDK_INT < 23; // Android M. (6.0)
  if (!hasPermission) {
    hasPermission = android.content.pm.PackageManager.PERMISSION_GRANTED ==
        android.support.v4.content.ContextCompat.checkSelfPermission(application.android.foregroundActivity, android.Manifest.permission.ACCESS_COARSE_LOCATION);
  }
  return hasPermission;
};

Bluetooth.hasCoarseLocationPermission = function () {
  return new Promise(function (resolve) {
    resolve(Bluetooth._coarseLocationPermissionGranted());
  });
};


Bluetooth._requestCoarseLocationPermission = function (resolve) {
  _permissionRequestResolver = resolve;

  android.support.v4.app.ActivityCompat.requestPermissions(
      application.android.foregroundActivity,
      [android.Manifest.permission.ACCESS_COARSE_LOCATION],
      ACCESS_COARSE_LOCATION_PERMISSION_REQUEST_CODE);
};

Bluetooth.requestCoarseLocationPermission = function () {
  return new Promise(function (resolve) {
    Bluetooth._requestCoarseLocationPermission(resolve);
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
Bluetooth._connections = {};

(function () {

  // TODO add something similar for permissions: https://github.com/EddyVerbruggen/nativescript-barcodescanner/blob/master/barcodescanner.android.ts#L20
  application.android.on(application.AndroidApplication.activityResultEvent, function (data /* AndroidActivityResultEventData */) {
    if (data.requestCode === ACTION_REQUEST_ENABLE_BLUETOOTH_REQUEST_CODE) {
      _onBluetoothEnabledResolve && _onBluetoothEnabledResolve(data.resultCode === -1);
      _onBluetoothEnabledResolve = undefined;
    }
    else if (data.requestCode === ACTION_REQUEST_BLUETOOTH_DISCOVERABLE_REQUEST_CODE) {
      _onBluetoothDiscoverableResolve && _onBluetoothDiscoverableResolve(data.resultCode === -1);
      _onBluetoothDiscoverableResolve = undefined;
    }
  });

  application.android.on(application.AndroidApplication.activityRequestPermissionsEvent, function (args) {
    if (args.requestCode !== ACCESS_COARSE_LOCATION_PERMISSION_REQUEST_CODE) {
      return;
    }
    for (var i = 0; i < args.permissions.length; i++) {
      if (args.grantResults[i] === android.content.pm.PackageManager.PERMISSION_DENIED) {
        _permissionRequestResolver && _permissionRequestResolver(false);
        _permissionRequestResolver = undefined;
        return;
      }
    }

    _permissionRequestResolver && _permissionRequestResolver(true);
    _permissionRequestResolver = undefined;
    _onPermissionGranted && _onPermissionGranted();
    _onPermissionGranted = undefined;
  });

  bluetoothManager = utils.ad.getApplicationContext().getSystemService(android.content.Context.BLUETOOTH_SERVICE);
  adapter = bluetoothManager.getAdapter();

  if (android.os.Build.VERSION.SDK_INT >= 21 /*android.os.Build.VERSION_CODES.LOLLIPOP */) {
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
        var stateObject = Bluetooth._connections[result.getDevice().getAddress()];
        if (!stateObject) {
          Bluetooth._connections[result.getDevice().getAddress()] = {
            state: 'disconnected'
          };
          var manufacturerId, manufacturerData;
          if (result.getScanRecord().getManufacturerSpecificData().size() > 0) {
            manufacturerId = result.getScanRecord().getManufacturerSpecificData().keyAt(0);
            manufacturerData = Bluetooth._decodeValue(result.getScanRecord().getManufacturerSpecificData().valueAt(0));
          }
          var payload = {
            type: 'scanResult', // TODO or use different callback functions?
            UUID: result.getDevice().getAddress(),
            name: result.getDevice().getName(),
            RSSI: result.getRssi(),
            state: 'disconnected',
            advertisement: android.util.Base64.encodeToString(result.getScanRecord().getBytes(), android.util.Base64.NO_WRAP),
            manufacturerId: manufacturerId,
            manufacturerData: manufacturerData
          };
          console.log("---- Lollipop+ scanCallback result: " + JSON.stringify(payload));
          onDiscovered(payload);
        }
      }
    });
    Bluetooth._scanCallback = new MyScanCallback();
  } else {

    function extractManufacturerRawData(scanRecord) {
      var offset = 0;
      while (offset < (scanRecord.length - 2)) {
        var len = scanRecord[offset++] & 0xff;
        if (len === 0) {
          break;
        }

        var type = scanRecord[offset++] & 0xff;
        switch (type) {
          case 0xFF:  // Manufacturer Specific Data
            return Bluetooth._decodeValue(java.util.Arrays.copyOfRange(scanRecord, offset, offset + len - 1));
          default:
            offset += (len - 1);
            break;
        }
      }
    }

    Bluetooth._scanCallback = new android.bluetooth.BluetoothAdapter.LeScanCallback({
      // see https://github.com/randdusing/cordova-plugin-bluetoothle/blob/master/src/android/BluetoothLePlugin.java#L2181
      onLeScan: function (device, rssi, scanRecord) {
        var stateObject = Bluetooth._connections[device.getAddress()];
        if (!stateObject) {
          Bluetooth._connections[device.getAddress()] = {
            state: 'disconnected'
          };

          var manufacturerId, manufacturerData;
          var manufacturerDataRaw = extractManufacturerRawData(scanRecord);
          if (manufacturerDataRaw) {
            manufacturerId = new DataView(manufacturerDataRaw, 0).getUint16(0, true);
            manufacturerData = manufacturerDataRaw.slice(2);
          }

          var payload = {
            type: 'scanResult', // TODO or use different callback functions?
            UUID: device.getAddress(), // TODO consider renaming to id (and iOS as well)
            name: device.getName(),
            RSSI: rssi,
            state: 'disconnected',
            manufacturerId: manufacturerId,
            manufacturerData: manufacturerData
          };
          console.log("---- scanCallback result: " + JSON.stringify(payload));
          onDiscovered(payload);
        }
      }
    });
  }
})();

// callback for connecting and read/write operations
Bluetooth._MyGattCallback = android.bluetooth.BluetoothGattCallback.extend({
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
      Bluetooth._disconnect(bluetoothGatt);
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
              UUID: Bluetooth._uuidToString(descriptor.getUuid()),
              value: descriptor.getValue() // always empty btw
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
            UUID: Bluetooth._uuidToString(characteristic.getUuid()),
            name: Bluetooth._uuidToString(characteristic.getUuid()), // there's no sep field on Android
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
            descriptors: descriptorsJs
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
          UUID: Bluetooth._uuidToString(service.getUuid()),
          characteristics: characteristicsJs
        });
      }
      var device = bluetoothGatt.getDevice();
      var stateObject = Bluetooth._connections[device.getAddress()];
      stateObject.onConnected({
        UUID: device.getAddress(), // TODO consider renaming to id (and iOS as well)
        name: device.getName(),
        state: 'connected', // Bluetooth._getState(peripheral.state),
        services: servicesJs
      });
    }
  },

  onCharacteristicRead: function (bluetoothGatt, bluetoothGattCharacteristic, status) {
    if (Bluetooth.characteristicLogging) {
      console.log("------- _MyGattCallback.onCharacteristicRead");
    }

    var device = bluetoothGatt.getDevice();
    var stateObject = Bluetooth._connections[device.getAddress()];
    if (!stateObject) {
      Bluetooth._disconnect(bluetoothGatt);
      return;
    }

    if (stateObject.onReadPromise) {
      var value = bluetoothGattCharacteristic.getValue();
      stateObject.onReadPromise({
        valueRaw: value,
        value: Bluetooth._decodeValue(value),
        characteristicUUID: bluetoothGattCharacteristic.getUuid()
      });
    }
  },

  onCharacteristicChanged: function (bluetoothGatt, bluetoothGattCharacteristic) {
    if (Bluetooth.characteristicLogging) {
      console.log("------- _MyGattCallback.onCharacteristicChanged");
    }

    var device = bluetoothGatt.getDevice();
    var stateObject = Bluetooth._connections[device.getAddress()];
    if (!stateObject) {
      Bluetooth._disconnect(bluetoothGatt);
      return;
    }

    if (stateObject.onNotifyCallback) {
      var value = bluetoothGattCharacteristic.getValue();
      stateObject.onNotifyCallback({
        valueRaw: value,
        value: Bluetooth._decodeValue(value),
        characteristicUUID: bluetoothGattCharacteristic.getUuid()
      });
    }
  },

  onCharacteristicWrite: function (bluetoothGatt, bluetoothGattCharacteristic, status) {
    if (Bluetooth.characteristicLogging) {
      console.log("------- _MyGattCallback.onCharacteristicWrite");
    }

    var device = bluetoothGatt.getDevice();
    var stateObject = Bluetooth._connections[device.getAddress()];
    if (!stateObject) {
      Bluetooth._disconnect(bluetoothGatt);
      return;
    }

    if (Bluetooth.characteristicLogging) {
      console.log(bluetoothGattCharacteristic);
    }

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

Bluetooth._decodeValue = function (value) {
  if (value === null) {
    return null;
  }

  // value is of Java type: byte[]
  var b = android.util.Base64.encodeToString(value, android.util.Base64.NO_WRAP);
  return Bluetooth._base64ToArrayBuffer(b);
};


/* * * * * *  BLUETOOTH PERIPHERAL CODE * * * * * * */
Bluetooth.getAdapter = function() {
  return adapter;
};

Bluetooth.startGattServer = function() {
  // peripheral mode:
  if (android.os.Build.VERSION.SDK_INT >= 21 /*android.os.Build.VERSION_CODES.LOLLIPOP */) {

    var MyDevicePairingHandler = android.content.BroadcastReceiver.extend({
      onReceive: function(context, intent) {
        //console.log("RECEIVED context: " +context+", intent: "+intent);
        const bs = intent.getIntExtra(android.bluetooth.BluetoothDevice.EXTRA_BOND_STATE, android.bluetooth.BluetoothDevice.ERROR);
        const device = intent.getParcelableExtra(android.bluetooth.BluetoothDevice.EXTRA_DEVICE);
        let message = "";
        switch (bs) {
          case android.bluetooth.BluetoothDevice.BOND_BONDING:
            message = "Bonding with ";
            break;
          case android.bluetooth.BluetoothDevice.BOND_BONDED:
            message = "Successfully bonded ";
            //utils.ad.getApplicationContext().unregisterReceiver(this);
            break;
          case android.bluetooth.BluetoothDevice.BOND_NONE:
            message = "Failed to bond ";
            break;
          default:
            message = "Unknown bonding status for ";
            break;
        }
        console.log(message + device);
      }
    });
    var devicePairingIntent = new android.content.IntentFilter( android.bluetooth.BluetoothDevice.ACTION_BOND_STATE_CHANGED );
    Bluetooth._MyDevicePairingHandler = new MyDevicePairingHandler();
    utils.ad.getApplicationContext().registerReceiver(Bluetooth._MyDevicePairingHandler, devicePairingIntent);

    // callback for handling peripheral mode events
    var MyGattServerCallback = android.bluetooth.BluetoothGattServerCallback.extend({
      onCharacteristicWriteRequest: function(device, requestId, characteristic, preparedWrite, responseNeeded, offset, value) {
        console.log("----- _MyGattServerCallback.onCharacteristicWriteRequest, device: " +device + ", requestId: "+requestId);
        console.log("      offset: " + offset)
        let str = "";
        for (let i=0; i<value.length; i++) {
          str += Number(value[i]).toString(16) + " ";
        }
        console.log("      value: " + str)
        let status = 0;
        gattServer.sendResponse(device, requestId, status, offset, new Array([0x01]));
      },
      onCharacteristicReadRequest: function(device, requestId, offset, characteristic) {
        console.log("----- _MyGattServerCallback.onCharacteristicReadRequest, device: " +device + ", requestId: "+requestId);
        let status = 0;
        gattServer.sendResponse(device, requestId, status, offset, new Array([0x01]));
      },
      onDescriptorWriteRequest: function(device, requestId, descriptor, preparedWrite, responseNeeded, offset, value) {
        console.log("----- _MyGattServerCallback.onDescriptorWriteRequest, device: " +device + ", requestId: "+requestId);
        let status = 0;
        gattServer.sendResponse(device, requestId, status, offset, new Array([0x01]));
      },
      onDescriptorReadRequest: function(device, requestId, offset, descriptor) {
        console.log("----- _MyGattServerCallback.onDescriptorReadRequest, device: " +device + ", requestId: "+requestId);
        let status = 0;
        gattServer.sendResponse(device, requestId, status, offset, new Array([0x01]));
      },
      onConnectionStateChange: function(device, status, newState) {
        console.log("----- _MyGattServerCallback.onConnectionStateChange, device: " +device + ", status: "+status +", newState: "+newState);
        switch (newState) {
          case android.bluetooth.BluetoothProfile.STATE_CONNECTED:
            console.log("CONNECTED");
            break;
          case android.bluetooth.BluetoothProfile.STATE_CONNECTING:
            console.log("CONNECTING");
            break;
          case android.bluetooth.BluetoothProfile.STATE_DISCONNECTED:
            console.log("DISCONNECTED");
            break;
          case android.bluetooth.BluetoothProfile.STATE_DISCONNECTING:
            console.log("DISCONNECTING");
            break;
          default:
            console.log("UNKNOWN STATE");
            break;
        }
      },
      onServiceAdded: function(status, service) {
        console.log("----- _MyGattServerCallback.onServiceAdded, status: "+status +", service: "+service);
      },
    });
    Bluetooth._MyGattServerCallback = new MyGattServerCallback();

    var MyAdvertiseCallback = android.bluetooth.le.AdvertiseCallback.extend({
      onStartSuccess: function(settingsInEffect) {
        console.log("---- _MyAdvertiseCallback.onStartSuccess, settingsInEffect: " + settingsInEffect);
        _onBluetoothAdvertiseResolve && _onBluetoothAdvertiseResolve(settingsInEffect);
        _onBluetoothAdvertiseResolve = undefined;
      },
      onStartFailure: function(errorCode) {
        console.log("---- _MyAdvertiseCallback.onStartFailure, errorCode: " + errorCode);
        _onBluetoothAdvertiseReject && _onBluetoothAdvertiseReject(errorCode);
        _onBluetoothAdvertiseReject = undefined;
      }
    });
    Bluetooth._MyAdvertiseCallback = new MyAdvertiseCallback();

    gattServer = bluetoothManager.openGattServer(utils.ad.getApplicationContext(), Bluetooth._MyGattServerCallback);
    Bluetooth._gattServer = gattServer;
  }  
}

Bluetooth.setDiscoverable = function() {
  return new Promise(function (resolve, reject) {
    try {
      _onBluetoothDiscoverableResolve = resolve;
      var intent = new android.content.Intent(android.bluetooth.BluetoothAdapter.ACTION_REQUEST_DISCOVERABLE);
      application.android.foregroundActivity.startActivityForResult(intent, ACTION_REQUEST_BLUETOOTH_DISCOVERABLE_REQUEST_CODE);
    } catch (ex) {
      console.log("Error in Bluetooth.setDiscoverable: " + ex);
      reject(ex);
    }
  });
}

Bluetooth.getAdvertiser = function() {
  return adapter.getBluetoothAdvertiser();
}

Bluetooth.makeAdvService = function(serviceOptions) {
  let suuid = Bluetooth._stringToUuid(serviceOptions.UUID);
  let serviceType = new Number(serviceOptions.serviceType || android.bluetooth.BluetoothGattService.SERVICE_TYPE_PRIMARY);

  return new android.bluetooth.BluetoothGattService( suuid, serviceType );
}

Bluetooth.makeAdvCharacteristic = function(characteristicOptions) {
  let cuuid = Bluetooth._stringToUuid(characteristicOptions.UUID);
  let gprop = new Number(characteristicOptions.gattProperty || android.bluetooth.BluetoothGattCharacteristic.PROPERTY_READ);
  let gperm = new Number(characteristicOptions.gattPermissions || android.bluetooth.BluetoothGattCharacteristic.PERMISSION_READ);

  return new android.bluetooth.BluetoothGattCharacteristic(cuuid, gprop, gperm);
}

Bluetooth.makeDescriptor = function(options) {
  let uuid = Bluetooth._stringToUuid(options.UUID);
  let perms = new Number(options.permissions || android.bluetooth.BluetoothGattDescriptor.PERMISSION_READ);

  return new android.bluetooth.BluetoothGattDescriptor(uuid, perms);
}

Bluetooth.addService = function(service) {
  if (service !== null && service !== undefined && gattServer !== null && gattServer !== undefined) {
    gattServer.addService(service);
  }
}

Bluetooth.clearServices = function() {
  if (gattServer !== null && gattServer !== undefined) {
    gattServer.clearServices();
  }
}

Bluetooth.getServerConnectedDevices = function() {
  if (gattServer !== null && gattServer !== undefined) {
    return bluetoothManager.getConnectedDevices(gattServer);
  }
}

Bluetooth.getServerConnectedDeviceState = function(device) {
  if (gattServer !== null && gattServer !== undefined && device !== null && device !== undefined) {
    return bluetoothManager.getConnectionState(device, gattServer);
  }
}

Bluetooth.getServerConnectedDevicesMatchingState = function(state) {
  if (gattServer !== null && gattServer !== undefined && state !== null && state !== undefined) {
    return bluetoothManager.getDevicesMatchingConnectionState(gattServer, state);
  }
}

Bluetooth.startAdvertising = function(advertiseOptions) {
  return new Promise((resolve, reject) => {
    let adv = adapter.getBluetoothLeAdvertiser();
    if (adv === null || !adapter.isMultipleAdvertisementSupported()) {
      reject("Adapter is turned off or doesnt support bluetooth advertisement");
    }
    else {
      let settings = advertiseOptions.settings;
      let _s = new android.bluetooth.le.AdvertiseSettings.Builder()
        .setAdvertiseMode( settings.advertiseMode || android.bluetooth.le.AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY )
        .setTxPowerLevel( settings.txPowerLevel || android.bluetooth.le.AdvertiseSettings.ADVERTISE_TX_POWER_HIGH )
        .setConnectable( settings.connectable || false )
        .build();

      let pUuid = new android.os.ParcelUuid(Bluetooth._stringToUuid( advertiseOptions.UUID ));

      let data = advertiseOptions.data;
      let _d = new android.bluetooth.le.AdvertiseData.Builder()
        .setIncludeDeviceName( data.includeDeviceName || true )
        .addServiceUuid( pUuid )
        //.addServiceData( pUuid, Bluetooth._encodeValue("0x50") )
        .build();

      console.log("--- bluetooth starting advertising!");
      _onBluetoothAdvertiseResolve = resolve;
      _onBluetoothAdvertiseReject = reject;
      adv.startAdvertising(_s, _d, Bluetooth._MyAdvertiseCallback); // need to flesh out settings
    }
  });
}

Bluetooth.stopAdvertising = function() {
  return new Promise((resolve, reject) => {
    let adv = adapter.getBluetoothLeAdvertiser();
    if (adv === null || !adapter.isMultipleAdvertisementSupported()) {
      reject("Adapter is turned off or doesnt support bluetooth advertisement");
    }
    else {
      console.log("--- bluetooth stopping advertising!");
      _onBluetoothAdvertiseResolve = resolve;
      _onBluetoothAdvertiseReject = reject;
      adv.stopAdvertising(Bluetooth._MyAdvertiseCallback);
      resolve(); // for some reason the callback doesn't get called... TODO: FIX
    }
  });
}

Bluetooth.disable = function() {
  adapter.disable();
  return new Promise(function(resolve, reject) {
    resolve();
  });
};

Bluetooth.isPeripheralModeSupported = function() {
  return new Promise((resolve, reject) => {
    resolve(adapter.isMultipleAdvertisementSupported() &&
    //adapter.isLeExtendedAdvertisingSupported() &&
    //adapter.isLePeriodicAdvertisingSupported() &&
    adapter.isOffloadedFilteringSupported() &&
    adapter.isOffloadedScanBatchingSupported());
  });
};
/* * * * * * END BLUETOOTH PERIPHERAL CODE  * * * * */

Bluetooth._isEnabled = function () {
  return adapter !== null && adapter.isEnabled();
};

Bluetooth.enable = function () {
  return new Promise(function (resolve, reject) {
    try {
      _onBluetoothEnabledResolve = resolve;
      var intent = new android.content.Intent(android.bluetooth.BluetoothAdapter.ACTION_REQUEST_ENABLE);
      application.android.foregroundActivity.startActivityForResult(intent, ACTION_REQUEST_ENABLE_BLUETOOTH_REQUEST_CODE);
    } catch (ex) {
      console.log("Error in Bluetooth.enable: " + ex);
      reject(ex);
    }
  });
};

Bluetooth.isBluetoothEnabled = function () {
  return new Promise(function (resolve, reject) {
    try {
      resolve(Bluetooth._isEnabled());
    } catch (ex) {
      console.log("Error in Bluetooth.isBluetoothEnabled: " + ex);
      reject(ex);
    }
  });
};

// Java UUID -> JS
Bluetooth._uuidToString = function (uuid) {
  var uuidStr = uuid.toString();
  var pattern = java.util.regex.Pattern.compile("0000(.{4})-0000-1000-8000-00805f9b34fb", 2);
  var matcher = pattern.matcher(uuidStr);
  return matcher.matches() ? matcher.group(1) : uuidStr;
};

// JS UUID -> Java
Bluetooth._stringToUuid = function (uuidStr) {
  if (uuidStr.length === 4) {
    uuidStr = "0000" + uuidStr + "-0000-1000-8000-00805f9b34fb";
  }
  return java.util.UUID.fromString(uuidStr);
};

Bluetooth.startScanning = function (arg) {
  return new Promise(function (resolve, reject) {
    try {
      if (!Bluetooth._isEnabled()) {
        reject("Bluetooth is not enabled");
        return;
      }

      _onPermissionGranted = function () {
        Bluetooth._connections = {};

        var serviceUUIDs = arg.serviceUUIDs || [];
        var uuids = [];
        for (var s in serviceUUIDs) {
          uuids.push(Bluetooth._stringToUuid(serviceUUIDs[s]));
        }

        if (android.os.Build.VERSION.SDK_INT < 21 /*android.os.Build.VERSION_CODES.LOLLIPOP */) {
          var didStart = uuids.length === 0 ?
              adapter.startLeScan(Bluetooth._scanCallback) :
              adapter.startLeScan(uuids, Bluetooth._scanCallback);
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
          adapter.getBluetoothLeScanner().startScan(scanFilters, scanSettings.build(), Bluetooth._scanCallback);
        }

        onDiscovered = arg.onDiscovered;

        if (arg.seconds) {
          setTimeout(function () {
            // note that by now a manual 'stop' may have been invoked, but that doesn't hurt
            if (android.os.Build.VERSION.SDK_INT < 21 /* android.os.Build.VERSION_CODES.LOLLIPOP */) {
              adapter.stopLeScan(Bluetooth._scanCallback);
            } else {
              adapter.getBluetoothLeScanner().stopScan(Bluetooth._scanCallback);
            }
            resolve();
          }, arg.seconds * 1000);
        } else {
          resolve();
        }
      };

      // log a warning when on Android M and no permission has been granted (it's up to the dev to implement that flow though)
      if (!Bluetooth._coarseLocationPermissionGranted()) {
        Bluetooth._requestCoarseLocationPermission();
      } else {
        _onPermissionGranted();
      }

    } catch (ex) {
      console.log("Error in Bluetooth.startScanning: " + ex);
      reject(ex);
    }
  });
};

Bluetooth.stopScanning = function () {
  return new Promise(function (resolve, reject) {
    try {
      if (!Bluetooth._isEnabled()) {
        reject("Bluetooth is not enabled");
        return;
      }
      if (android.os.Build.VERSION.SDK_INT < 21 /* android.os.Build.VERSION_CODES.LOLLIPOP */) {
        adapter.stopLeScan(Bluetooth._scanCallback);
      } else {
        adapter.getBluetoothLeScanner().stopScan(Bluetooth._scanCallback);
      }
      resolve();
    } catch (ex) {
      console.log("Error in Bluetooth.stopScanning: " + ex);
      reject(ex);
    }
  });
};

Bluetooth._disconnect = function (gatt) {
  if (gatt !== null) {
    var device = gatt.getDevice();
    var stateObject = Bluetooth._connections[device.getAddress()];
    console.log("----- invoking disc cb");
    if (stateObject && stateObject.onDisconnected) {
      stateObject.onDisconnected({
        UUID: device.getAddress(),
        name: device.getName()
      });
    } else {
      console.log("----- !!! no disconnect callback found");
    }
    Bluetooth._connections[device.getAddress()] = null;
    gatt.close();
  }
};

// note that this doesn't make much sense without scanning first
Bluetooth.connect = function (arg) {
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
              new Bluetooth._MyGattCallback(/* TODO pass in onWhatever function */)
          );
        } else {
          bluetoothGatt = bluetoothDevice.connectGatt(
              utils.ad.getApplicationContext(), // context
              false, // autoconnect
              new Bluetooth._MyGattCallback(/* TODO pass in onWhatever function */),
              android.bluetooth.BluetoothDevice.TRANSPORT_LE // 2
          );
        }

        Bluetooth._connections[arg.UUID] = {
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

Bluetooth.disconnect = function (arg) {
  return new Promise(function (resolve, reject) {
    try {
      if (!arg.UUID) {
        reject("No UUID was passed");
        return;
      }
      var connection = Bluetooth._connections[arg.UUID];
      if (!connection) {
        reject("Peripheral wasn't connected");
        return;
      }

      Bluetooth._disconnect(connection.device);
      resolve();
    } catch (ex) {
      console.log("Error in Bluetooth.disconnect: " + ex);
      reject(ex);
    }
  });
};

// This guards against peripherals reusing char UUID's. We prefer notify.
Bluetooth._findNotifyCharacteristic = function (bluetoothGattService, characteristicUUID) {
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
Bluetooth._findCharacteristicOfType = function (bluetoothGattService, characteristicUUID, charType) {
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

Bluetooth._getWrapper = function (arg, reject) {
  if (!Bluetooth._isEnabled()) {
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

  var serviceUUID = Bluetooth._stringToUuid(arg.serviceUUID);

  var stateObject = Bluetooth._connections[arg.peripheralUUID];
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

Bluetooth.read = function (arg) {
  return new Promise(function (resolve, reject) {
    try {
      var wrapper = Bluetooth._getWrapper(arg, reject);
      if (wrapper === null) {
        // no need to reject, this has already been done
        return;
      }

      var gatt = wrapper.gatt;
      var bluetoothGattService = wrapper.bluetoothGattService;
      var characteristicUUID = Bluetooth._stringToUuid(arg.characteristicUUID);

      var bluetoothGattCharacteristic = Bluetooth._findCharacteristicOfType(bluetoothGattService, characteristicUUID, android.bluetooth.BluetoothGattCharacteristic.PROPERTY_READ);
      if (!bluetoothGattCharacteristic) {
        reject("Could not find characteristic with UUID " + arg.characteristicUUID + " on service with UUID " + arg.serviceUUID + " on peripheral with UUID " + arg.peripheralUUID);
        return;
      }

      var stateObject = Bluetooth._connections[arg.peripheralUUID];
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
Bluetooth._encodeValue = function (val) {
  var parts = val;
  // if it's not a string assume it's a byte array already
  if (typeof val === 'string') {
    parts = val.split(',');

    if (parts[0].indexOf('x') == -1) {
      return null;
    }
  }

  var result = Array.create("byte", parts.length);

  for (var i = 0; i < parts.length; i++) {
    result[i] = parts[i];
  }
  return result;
};

Bluetooth.write = function (arg) {
  return new Promise(function (resolve, reject) {
    try {
      if (!arg.value) {
        reject("You need to provide some data to write in the 'value' property");
        return;
      }
      var wrapper = Bluetooth._getWrapper(arg, reject);
      if (wrapper === null) {
        // no need to reject, this has already been done
        return;
      }

      var bluetoothGattCharacteristic = Bluetooth._findCharacteristicOfType(wrapper.bluetoothGattService, Bluetooth._stringToUuid(arg.characteristicUUID), android.bluetooth.BluetoothGattCharacteristic.PROPERTY_WRITE);
      if (!bluetoothGattCharacteristic) {
        reject("Could not find characteristic with UUID " + arg.characteristicUUID + " on service with UUID " + arg.serviceUUID + " on peripheral with UUID " + arg.peripheralUUID);
        return;
      }

      var val = Bluetooth._encodeValue(arg.value);
      if (val === null) {
        reject("Invalid value: " + arg.value);
        return;
      }

      bluetoothGattCharacteristic.setValue(val);
      bluetoothGattCharacteristic.setWriteType(android.bluetooth.BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT);

      Bluetooth._connections[arg.peripheralUUID].onWritePromise = resolve;
      if (!wrapper.gatt.writeCharacteristic(bluetoothGattCharacteristic)) {
        reject("Failed to write to characteristic " + arg.characteristicUUID);
      }
    } catch (ex) {
      console.log("Error in Bluetooth.write: " + ex);
      reject(ex);
    }
  });
};

Bluetooth.writeWithoutResponse = function (arg) {
  return new Promise(function (resolve, reject) {
    try {
      if (!arg.value) {
        reject("You need to provide some data to write in the 'value' property");
        return;
      }
      var wrapper = Bluetooth._getWrapper(arg, reject);
      if (wrapper === null) {
        // no need to reject, this has already been done
        return;
      }

      var bluetoothGattCharacteristic = Bluetooth._findCharacteristicOfType(wrapper.bluetoothGattService, Bluetooth._stringToUuid(arg.characteristicUUID), android.bluetooth.BluetoothGattCharacteristic.PROPERTY_WRITE);
      if (!bluetoothGattCharacteristic) {
        reject("Could not find characteristic with UUID " + arg.characteristicUUID + " on service with UUID " + arg.serviceUUID + " on peripheral with UUID " + arg.peripheralUUID);
        return;
      }

      var val = Bluetooth._encodeValue(arg.value);
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

Bluetooth.startNotifying = function (arg) {
  return new Promise(function (resolve, reject) {
    try {
      var wrapper = Bluetooth._getWrapper(arg, reject);
      if (wrapper === null) {
        // no need to reject, this has already been done
        return;
      }

      var gatt = wrapper.gatt;
      var bluetoothGattService = wrapper.bluetoothGattService;
      var characteristicUUID = Bluetooth._stringToUuid(arg.characteristicUUID);

      var bluetoothGattCharacteristic = Bluetooth._findNotifyCharacteristic(bluetoothGattService, characteristicUUID);
      if (!bluetoothGattCharacteristic) {
        reject("Could not find characteristic with UUID " + arg.characteristicUUID + " on service with UUID " + arg.serviceUUID + " on peripheral with UUID " + arg.peripheralUUID);
        return;
      }

      if (!gatt.setCharacteristicNotification(bluetoothGattCharacteristic, true)) {
        reject("Failed to register notification for characteristic " + arg.characteristicUUID);
        return;
      }

      var clientCharacteristicConfigId = Bluetooth._stringToUuid("2902");
      var bluetoothGattDescriptor = bluetoothGattCharacteristic.getDescriptor(clientCharacteristicConfigId);
      if (!bluetoothGattDescriptor) {
        bluetoothGattDescriptor = new android.bluetooth.BluetoothGattDescriptor(clientCharacteristicConfigId, android.bluetooth.BluetoothGattDescriptor.PERMISSION_WRITE);
        bluetoothGattCharacteristic.addDescriptor(bluetoothGattDescriptor);
        console.log("BluetoothGattDescriptor created...");
        //Any creation error will trigger the global catch. Ok.
      }

      // prefer notify over indicate
      if ((bluetoothGattCharacteristic.getProperties() & android.bluetooth.BluetoothGattCharacteristic.PROPERTY_NOTIFY) !== 0) {
        bluetoothGattDescriptor.setValue(android.bluetooth.BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE);
      } else if ((bluetoothGattCharacteristic.getProperties() & android.bluetooth.BluetoothGattCharacteristic.PROPERTY_INDICATE) !== 0) {
        bluetoothGattDescriptor.setValue(android.bluetooth.BluetoothGattDescriptor.ENABLE_INDICATION_VALUE);
      } else {
        reject("Characteristic " + characteristicUUID + " does not have NOTIFY or INDICATE property set");
        return;
      }

      if (gatt.writeDescriptor(bluetoothGattDescriptor)) {
        var cb = arg.onNotify || function (result) {
          console.log("No 'onNotify' callback function specified for 'startNotifying'");
        };
        var stateObject = Bluetooth._connections[arg.peripheralUUID];
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
Bluetooth.stopNotifying = function (arg) {
  return new Promise(function (resolve, reject) {
    try {
      var wrapper = Bluetooth._getWrapper(arg, reject);
      if (wrapper === null) {
        // no need to reject, this has already been done
        return;
      }

      var gatt = wrapper.gatt;
      var bluetoothGattService = wrapper.bluetoothGattService;
      var characteristicUUID = Bluetooth._stringToUuid(arg.characteristicUUID);

      var bluetoothGattCharacteristic = Bluetooth._findNotifyCharacteristic(bluetoothGattService, characteristicUUID);
      console.log("---- got gatt service char: " + bluetoothGattCharacteristic);

      if (!bluetoothGattCharacteristic) {
        reject("Could not find characteristic with UUID " + arg.characteristicUUID + " on service with UUID " + arg.serviceUUID + " on peripheral with UUID " + arg.peripheralUUID);
        return;
      }

      var stateObject = Bluetooth._connections[arg.peripheralUUID];
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

module.exports = Bluetooth;
