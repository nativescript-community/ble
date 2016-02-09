var BLE = require("./ble-common");

var manager,
    delegate,
    peripherals = [],
    onDeviceDiscovered;

var CBCentralManagerDelegateImpl = (function (_super) {
  __extends(CBCentralManagerDelegateImpl, _super);
  function CBCentralManagerDelegateImpl() {
    _super.apply(this, arguments);
  }

  CBCentralManagerDelegateImpl.new = function () {
    return _super.new.call(this);
  };
  CBCentralManagerDelegateImpl.prototype.initWithCallback = function (callback) {
    this._callback = callback;
    return this;
  };
  CBCentralManagerDelegateImpl.prototype.centralManagerDidDiscoverPeripheralAdvertisementDataRSSI = function(central, peripheral, advData, rssi) {
    console.log("----- delegate centralManagerDidDiscoverPeripheralAdvertisementDataRSSI");
    peripherals.addObject(peripheral);
    BLE._findPeripheral(peripheral.identifier.UUIDString);
    if (onDeviceDiscovered) {
      onDeviceDiscovered({
        UUID: peripheral.identifier.UUIDString,
        name: peripheral.name,
        RSSI: rssi,
        state: BLE._getState(peripheral.state)
      })
    }
  };
  CBCentralManagerDelegateImpl.prototype.centralManagerDidUpdateState = function(central) {
    console.log("----- delegate centralManagerDidUpdateState");
    // this._callback(central);
  };
  CBCentralManagerDelegateImpl.prototype.centralManagerDidConnectPeripheral = function(central, peripheral) {
    console.log("----- delegate centralManagerDidConnectPeripheral");
    // this._callback(peripheral);
  };
  CBCentralManagerDelegateImpl.prototype.centralManagerDidConnectPeripheralError = function(central, peripheral, error) {
    console.log("----- delegate centralManagerDidConnectPeripheralError");
    // this._callback(peripheral);
  };
  CBCentralManagerDelegateImpl.prototype.centralManagerDidFailToConnectPeripheralError = function(central, peripheral, error) {
    console.log("----- delegate centralManagerDidFailToConnectPeripheralError");
    // this._callback(error);
  };
  CBCentralManagerDelegateImpl.ObjCProtocols = [CBCentralManagerDelegate];
  return CBCentralManagerDelegateImpl;
})(NSObject);

// check for bluetooth being enabled as soon as the app starts
(function () {
  // TODO have the dev pass in a callback when 'scan' is called
  delegate = CBCentralManagerDelegateImpl.new().initWithCallback(function (obj) {
    console.log("----- delegate obj: " + obj);
  });
  manager = CBCentralManager.alloc().initWithDelegateQueue(delegate, null);
})();

BLE._isEnabled = function (arg) {
  var bluetoothState = manager.state;
  return bluetoothState == CBCentralManagerStatePoweredOn;
};

BLE._getState = function(stateId) {
  if (stateId == 1) {
    return 'connecting';
  } else if (stateId == 2) {
    return 'connected';
  } else if (stateId == 3) {
    return 'disconnecting'
  } else {
    return 'disconnected';
  }
};

BLE.isBluetoothEnabled = function (arg) {
  return new Promise(function (resolve, reject) {
    try {
      resolve(BLE._isEnabled());
    } catch (ex) {
      console.log("Error in BLE.isBluetoothEnabled: " + ex);
      reject(ex);
    }
  });
};

BLE.scan = function (arg) {
  return new Promise(function (resolve, reject) {
    try {
      onDeviceDiscovered = arg.onDeviceDiscovered;
      var serviceUUIDs = [];
      manager.scanForPeripheralsWithServicesOptions(serviceUUIDs, null);
      setTimeout(function() {
        manager.stopScan();
        resolve();
      }, arg.seconds * 1000);
    } catch (ex) {
      console.log("Error in BLE.scan: " + ex);
      reject(ex);
    }
  });
};

BLE._findPeripheral = function(UUID) {
  console.log("---- pppp 0y: " + typeof peripherals);
  console.log("---- pppp 00: " + peripherals);
  console.log("---- pppp 000: " + peripherals.allObjects);
  for (var peripheral in peripherals) {
    // console.log("p = " + p);
    // }
    // for (var i = 0, l = peripherals.count; i < l; i++) {
    // var peripheral = peripherals.objectAtIndex(i);
    console.log("---- pppp 1: " + peripheral);
    console.log("---- pppp 2: " + peripheral.identifier.UUIDString);
    if (UUID == peripheral.identifier.UUIDString) {
      return peripheral;
    }
  }
  return null;
};

// note that this doesn't make much sense without scanning first
BLE.connect = function (arg) {
  return new Promise(function (resolve, reject) {
    try {
      if (!arg.UUID) {
        reject("No UUID was passed");
        return;
      }
      var peripheral = BLE._findPeripheral(arg.UUID);
      if (peripheral == null) {
        reject("Could not find device with UUID " + arg.UUID);
      } else {
        console.log("Connecting to device with UUID: " + arg.UUID);
        // TODO
        //[connectCallbacks setObject:[command.callbackId copy] forKey:[peripheral uuidAsString]];
        manager.connectPeripheralOptions(peripheral, null);
        // TODO don't resolve here, but wait for callback
      }
    } catch (ex) {
      console.log("Error in BLE.connect: " + ex);
      reject(ex);
    }
  });
};

module.exports = BLE;