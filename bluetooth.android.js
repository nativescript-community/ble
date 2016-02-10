var application = require("application");
var utils = require("utils/utils");
var Bluetooth = require("./bluetooth-common");

var adapter,
    onDeviceDiscovered;

(function () {
  var bluetoothManager = utils.ad.getApplicationContext().getSystemService(android.content.Context.BLUETOOTH_SERVICE);
  adapter = bluetoothManager.getAdapter();
  
  if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
    var MyScanCallback = android.bluetooth.le.ScanCallback.extend({
      // TODO https://github.com/randdusing/cordova-plugin-bluetoothle/blob/master/src/android/BluetoothLePlugin.java#L2222
      onBatchScanResults: function(results) {
        console.log("------- scanCallback.onBatchScanResults");
      },
      onScanFailed: function(errorCode) {
        console.log("------- scanCallback.onScanFailed errorCode: " + errorCode);
      },
      onScanResult: function(callbackType, result) {
        // TODO sync with iOS
        var payload = {
          type: 'scanResult', // TODO or use different callback functions?
          rssi: result.getRssi(),
          device: {
            name: result.getDevice().getName(),
            address: result.getDevice().getAddress()
          },
          advertisement: android.util.Base64.encodeToString(result.getScanRecord().getBytes(), android.util.Base64.NO_WRAP)
        };
        console.log("---- Lollipop+ scanCallback result: " + JSON.stringify(payload));
      }
    });
    Bluetooth._scanCallback = new MyScanCallback();
  } else {
    Bluetooth._scanCallback = new android.bluetooth.BluetoothAdapter.LeScanCallback({
      // see https://github.com/randdusing/cordova-plugin-bluetoothle/blob/master/src/android/BluetoothLePlugin.java#L2181
      onLeScan: function(device, rssi, scanRecord) {
        console.log("------- scanCallbackKitKat.onLeScan");
        console.log("------- scanCallbackKitKat.onLeScan device: " + device);
      }
    });
  }
})();

// callback for connecting and read/write operations
Bluetooth._MyGattCallback = android.bluetooth.BluetoothGattCallback.extend({
  // add constructor which gets a callback
  
  onConnectionStateChange: function(bluetoothGatt, status, newState) {
    console.log("------- _MyGattCallback.onConnectionStateChange");
  },
  
  onServicesDiscovered: function(bluetoothGatt, status) {
    console.log("------- _MyGattCallback.onServicesDiscovered");
  },
  
  onCharacteristicRead: function(bluetoothGatt, bluetoothGattCharacteristic, status) {
    console.log("------- _MyGattCallback.onCharacteristicRead");
  },
  
  onCharacteristicChanged: function(bluetoothGatt, bluetoothGattCharacteristic) {
    console.log("------- _MyGattCallback.onCharacteristicChanged");
  },
  
  onCharacteristicWrite: function(bluetoothGatt, bluetoothGattCharacteristic, status) {
    console.log("------- _MyGattCallback.onCharacteristicWrite");
  },
  
  onDescriptorRead: function(bluetoothGatt, bluetoothGattDescriptor, status) {
    console.log("------- _MyGattCallback.onDescriptorRead");
  },
  
  onDescriptorWrite: function(bluetoothGatt, bluetoothGattDescriptor, status) {
    console.log("------- _MyGattCallback.onDescriptorWrite");
  },

  onReadRemoteRssi: function(bluetoothGatt, rssi, status) {
    console.log("------- _MyGattCallback.onReadRemoteRssi");
  },

  onMtuChanged: function(bluetoothGatt, mtu, status) {
    console.log("------- _MyGattCallback.onMtuChanged");
  },
});


Bluetooth._isEnabled = function (arg) {
  return adapter !== null && adapter.isEnabled();
};

Bluetooth.isBluetoothEnabled = function (arg) {
  return new Promise(function (resolve, reject) {
    try {
      resolve(Bluetooth._isEnabled());
    } catch (ex) {
      console.log("Error in Bluetooth.isBluetoothEnabled: " + ex);
      reject(ex);
    }
  });
};

Bluetooth.startScanning = function (arg) {
  return new Promise(function (resolve, reject) {
    try {
      // TODO add this guard to iOS as well
      if (onDeviceDiscovered) {
        // TODO clear this callback when stopping scanning :)
        reject("Already scanning");
        return;
      }

      var serviceUUIDs = []; // TODO pass in
      var uuids = [];
      for (var s in serviceUUIDs) {
        var uuidStr = serviceUUIDs[s];
        if (uuidStr.length === 4) {
          uuidStr = "0000" + uuidStr + "-0000-1000-8000-00805f9b34fb";
          var uuid = java.util.UUID.fromString(uuidStr);
          uuids.push(uuid);
        }
      }

      if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.LOLLIPOP) {
        var didStart = uuids.length === 0 ?
            adapter.startLeScan(Bluetooth._scanCallback) :
            adapter.startLeScan(uuids, Bluetooth._scanCallback);
        if (!didStart) {
          // TODO error msg, see https://github.com/randdusing/cordova-plugin-bluetoothle/blob/master/src/android/BluetoothLePlugin.java#L758
          reject("Scanning didn't start");
          return;
        }
      } else {
        var scanFilters = new java.util.ArrayList();
        for (var u in uuids) {
          var theUuid = uuids[u];
          var scanFilterBuilder = new android.bluetooth.le.ScanFilter.Builder();
          scanFilterBuilder.setServiceUuid(new android.os.ParcelUuid(theUuid));
          scanFilters.add(scanFilterBuilder.build());
        }
        // ga hier verder: https://github.com/randdusing/cordova-plugin-bluetoothle/blob/master/src/android/BluetoothLePlugin.java#L775
        var scanSettings = new android.bluetooth.le.ScanSettings.Builder();
        scanSettings.setReportDelay(0);

        var scanMode = arg.scanMode || android.bluetooth.le.ScanSettings.SCAN_MODE_LOW_LATENCY;
        scanSettings.setScanMode(scanMode);
        
        if (android.os.Build.VERSION.SDK_INT >= 23 /*android.os.Build.VERSION_CODES.M */) {
          var matchMode = arg.keyMatchMode || android.bluetooth.le.ScanSettings.MATCH_MODE_AGGRESSIVE;
          scanSettings.setMatchMode(matchMode);
          

          var matchNum = argkeyMatchNum || android.bluetooth.le.ScanSettings.MATCH_NUM_MAX_ADVERTISEMENT;
          scanSettings.setNumOfMatches(matchNum);
          
          var callbackType = arg.keyCallbackType || android.bluetooth.le.ScanSettings.CALLBACK_TYPE_ALL_MATCHES;
          scanSettings.setCallbackType(callbackType);
        }

        adapter.getBluetoothLeScanner().startScan(scanFilters, scanSettings.build(), Bluetooth._scanCallback);
      }

      onDeviceDiscovered = arg.onDeviceDiscovered;

/*      
      setTimeout(function() {
        manager.stopScan();
        resolve();
      }, arg.seconds * 1000);
*/
      resolve();
    } catch (ex) {
      console.log("Error in Bluetooth.startScanning: " + ex);
      reject(ex);
    }
  });
};

// TODO check iOS - I seem to be missing stop/start scanning stuff in iOS... check the BigMac!
Bluetooth.stopScanning = function (arg) {
  return new Promise(function (resolve, reject) {
    try {
      if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.LOLLIPOP) {
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
        reject("Could not find device with UUID " + arg.UUID);
      } else {
        console.log("Connecting to device with UUID: " + arg.UUID);
        // TODO
        var bluetoothGatt = bluetoothDevice.connectGatt(
          utils.ad.getApplicationContext(),
          false,
          new Bluetooth._MyGattCallback(/* TODO pass in onWhatever function */)
        );
        // TODO don't resolve here, but wait for callback(?) -- no, just resolve and let the passed in function handle it
      }
    } catch (ex) {
      console.log("Error in Bluetooth.connect: " + ex);
      reject(ex);
    }
  });
};

// connections are stored as key-val pairs of UUID-Connection
// (not sure we can use ES6's Map here..)
/**
 * So something like this:
 * {
 *   34343-2434-5454: {
 *     state: 'connected',
 *     discoveredState: '',
 *     operationConnect: someCallbackFunction
 *   }
 * }
 */
Bluetooth._connections = {};

Bluetooth.disconnect = function (arg) {
  return new Promise(function (resolve, reject) {
    try {
      if (!arg.UUID) {
        reject("No UUID was passed");
        return;
      }
      var connection = Bluetooth._connections[arg.UUID];
      if (!connection) {
        reject("Device wasn't connected");
        return;
      }
      var bluetoothGatt = connection.get("peripheral");
      var device = bluetoothGatt.getDevice();
      
      var state = connection.get("state");
      console.log("------ disconnect, state: " + state);
      var stateInt = java.lang.Integer.valueOf(connection.get("state").toString());
      console.log("------ disconnect, stateInt: " + stateInt);

      if (state == android.bluetooth.BluetoothProfile.STATE_CONNECTING) {
        // TODO a connection is a custom object: https://github.com/randdusing/cordova-plugin-bluetoothle/blob/master/src/android/BluetoothLePlugin.java#L960
        connection.state = android.bluetooth.BluetoothProfile.STATE_DISCONNECTED;
      }


      
      if (peripheral === null) {
        reject("Could not find device with UUID " + arg.UUID);
      } else {
        console.log("Connecting to device with UUID: " + arg.UUID);
        // TODO
        //[connectCallbacks setObject:[command.callbackId copy] forKey:[peripheral uuidAsString]];
        manager.connectPeripheralOptions(peripheral, null);
        // TODO don't resolve here, but wait for callback
      }
    } catch (ex) {
      console.log("Error in Bluetooth.connect: " + ex);
      reject(ex);
    }
  });
};

module.exports = Bluetooth;