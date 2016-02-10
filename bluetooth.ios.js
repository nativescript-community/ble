var Bluetooth = require("./bluetooth-common");

var manager,
    delegate,
    peripherals = [], // NSMutableArray.init(),
    onDeviceDiscovered;

var CBPeripheralDelegateImpl = (function (_super) {
  __extends(CBPeripheralDelegateImpl, _super);
  function CBPeripheralDelegateImpl() {
    _super.apply(this, arguments);
  }
  CBPeripheralDelegateImpl.new = function () {
    return _super.new.call(this);
  };
  CBPeripheralDelegateImpl.prototype.initWithCallback = function (callback) {
    this._callback = callback;
    return this;
  };
  CBPeripheralDelegateImpl.prototype.peripheralDidDiscoverServices = function(peripheral, error) {
    console.log("----- delegate peripheral:didDiscoverServices, error: " + error);
    console.log("----- delegate peripheral:didDiscoverServices, peripheral: " + peripheral);
    console.log("----- delegate peripheral:didDiscoverServices, peripheral.services: " + peripheral.services);
    // TODO don't callback (resolve) yet, so remove this
    if (!error && this._callback) {
      this._callback({
        UUID: peripheral.identifier.UUIDString,
        name: peripheral.name,
        state: Bluetooth._getState(peripheral.state),
        services: peripheral.services
      })
    }
    // .. instead wait until the last one of these reuturns (see Cordova plugin 'didDiscoverCharacteristicsForService')
    for (var i = 0; i < peripheral.services.count; i++) {
      var service = peripheral.services.objectAtIndex(i);
      // NOTE: discover all is slow
      peripheral.discoverCharacteristicsForService(null, service);
    }
  };
  CBPeripheralDelegateImpl.prototype.peripheralDidDiscoverIncludedServicesForServiceError = function(peripheral, service, error) {
    console.log("----- delegate peripheral:didDiscoverIncludedServicesForService:error");
  };
  CBPeripheralDelegateImpl.prototype._getProperties = function(characteristic) {
    var props = characteristic.properties;
    console.log("---- props: " + props);
    console.log("---- props.broadcast: " + (props & CBCharacteristicPropertyBroadcast));
    return {
      broadcast: (props & CBCharacteristicPropertyBroadcast) == CBCharacteristicPropertyBroadcast,
      read: (props & CBCharacteristicPropertyRead) == CBCharacteristicPropertyRead,
      // TODO these other properties
      broadcast2: (props & CBCharacteristicPropertyBroadcast) == 0x0,
      read2: (props & CBCharacteristicPropertyRead) == 0x0,
      write: true,
      writeWithoutResponse: true,
      notify: true,
      indicate: true,
      authenticatedSignedWrites: true,
      extendedProperties: true,
      notifyEncryptionRequired: true,
      indicateEncryptionRequired: true
    }
  };
  CBPeripheralDelegateImpl.prototype.peripheralDidDiscoverCharacteristicsForServiceError = function(peripheral, service, error) {
    if (error) {
      // TODO invoke reject and stop processing
      return;
    }
    console.log("----- delegate peripheral:didDiscoverCharacteristicsForService:error");
    console.log("----- delegate peripheral:didDiscoverCharacteristicsForService:error service: " + service);
    console.log("----- delegate peripheral:didDiscoverCharacteristicsForService:error service.characteristics: " + service.characteristics);
    console.log("----- delegate peripheral:didDiscoverCharacteristicsForService:error service.characteristics.count: " + service.characteristics.count);
    for (var i = 0; i < service.characteristics.count; i++) {
      var characteristic = service.characteristics.objectAtIndex(i);
      var result = {
        UUID: characteristic.UUID.UUIDString,
        // see serviceAndCharacteristicInfo in CBPer+Ext of Cordova plugin
        value: characteristic.value ? characteristic.value.base64EncodedStringWithOptions(0) : null,
        properties: this._getProperties(characteristic),
        isNotifying: characteristic.isNotifying,
        permissions: characteristic.permissions,
        descriptors: characteristic.descriptors // TODO extract a JSON object
      };
      console.log("----- delegate peripheral:didDiscoverCharacteristicsForService:error chardata: " + JSON.stringify(result));

      // get details about the characteristics
      peripheral.discoverDescriptorsForCharacteristic(characteristic);
    }
  };
  // this is called when a value is read from a peripheral
  CBPeripheralDelegateImpl.prototype.peripheralDidUpdateValueForCharacteristicError = function(peripheral, characteristic, error) {
    console.log("----- delegate peripheral:didUpdateValueForCharacteristic:error");
    // TODO this should be sent to the callback... to the resolve() of the called function preferrably..
    console.log("----- delegate peripheral:didUpdateValueForCharacteristic:error characteristic: " + characteristic);
  };
  CBPeripheralDelegateImpl.prototype.peripheralDidWriteValueForCharacteristicError = function(peripheral, characteristic, error) {
    console.log("----- delegate peripheral:didWriteValueForCharacteristic:error");
    console.log("----- delegate peripheral:didWriteValueForCharacteristic:error characteristic: " + characteristic);
    // TODO this should resolve() -- kept from the 'write' function
  };
  CBPeripheralDelegateImpl.prototype.peripheralDidUpdateNotificationStateForCharacteristicError = function(peripheral, characteristic, error) {
    console.log("----- delegate peripheral:didUpdateNotificationStateForCharacteristic:error");
  };
  CBPeripheralDelegateImpl.prototype.peripheralDidDiscoverDescriptorsForCharacteristicError = function(peripheral, characteristic, error) {
    console.log("----- delegate peripheral:didDiscoverDescriptorsForCharacteristic:error");
    console.log("----- delegate peripheral:didDiscoverDescriptorsForCharacteristic:error characteristic: " + characteristic);
    console.log("----- delegate peripheral:didDiscoverDescriptorsForCharacteristic:error characteristic.value: " + characteristic.value);
  };
  CBPeripheralDelegateImpl.prototype.peripheralDidUpdateValueForDescriptorError = function(peripheral, descriptor, error) {
    console.log("----- delegate peripheral:didUpdateValueForDescriptor:error");
  };
  CBPeripheralDelegateImpl.prototype.peripheralDidWriteValueForDescriptorError = function(peripheral, descriptor, error) {
    console.log("----- delegate peripheral:didWriteValueForDescriptor:error");
  };
  CBPeripheralDelegateImpl.ObjCProtocols = [CBPeripheralDelegate];
  return CBPeripheralDelegateImpl;
})(NSObject);


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
  // fires when a device is discovered after executing the 'scan' function
  CBCentralManagerDelegateImpl.prototype.centralManagerDidDiscoverPeripheralAdvertisementDataRSSI = function(central, peripheral, advData, RSSI) {
    console.log("----- delegate centralManager:didDiscoverPeripheral:advertisementData:RSSI");
    peripherals.push(peripheral);
    if (onDeviceDiscovered) {
      onDeviceDiscovered({
        UUID: peripheral.identifier.UUIDString,
        name: peripheral.name,
        RSSI: RSSI,
        state: Bluetooth._getState(peripheral.state)
      })
    }
  };
  CBCentralManagerDelegateImpl.prototype.centralManagerDidUpdateState = function(central) {
    console.log("----- delegate centralManagerDidUpdateState");
    if (central.state == CBCentralManagerStateUnsupported) {
      console.log("WARNING: This hardware does not support Bluetooth Low Energy.");
    }
  };
  CBCentralManagerDelegateImpl.prototype.centralManagerWillRestoreState = function(central, dict) {
    console.log("----- delegate centralManager:willRestoreState");
  };
  CBCentralManagerDelegateImpl.prototype.centralManagerDidConnectPeripheral = function(central, peripheral) {
    console.log("----- delegate centralManager:didConnectPeripheral: " + peripheral);
    // NOTE: it's inefficient to discover all services
    peripheral.discoverServices(null);
    console.log("----- delegate centralManager:didConnectPeripheral call peripheral.discoverServices(null)");
    // NOTE: not invoking callback until characteristics are discovered (OR send back a 'type' and notify the caller? Perhaps that nicer..)
  };
  CBCentralManagerDelegateImpl.prototype.centralManagerDidDisconnectPeripheralError = function(central, peripheral, error) {
    console.log("----- delegate centralManager:didDisconnectPeripheral:error: " + peripheral);
  };
  CBCentralManagerDelegateImpl.prototype.centralManagerDidFailToConnectPeripheralError = function(central, peripheral, error) {
    console.log("----- delegate centralManager:didFailToConnectPeripheral:error");
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

Bluetooth._isEnabled = function (arg) {
  return manager.state == CBCentralManagerStatePoweredOn;
};

Bluetooth._getState = function(stateId) {
  if (stateId == CBPeripheralStateConnecting) {
    return 'connecting';
  } else if (stateId == CBPeripheralStateConnected) {
    return 'connected';
  } else if (stateId == CBPeripheralStateDisconnecting) {
    return 'disconnecting'
  } else if (stateId == CBPeripheralStateDisconnected) {
    return 'disconnected';
  } else {
    console.log("Unexpected state, returning 'disconnected': " + stateId);
    return 'disconnected';
  }
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
      if (!Bluetooth._isEnabled()) {
        reject("Bluetooth is not enabled");
        return;
      }
      // TODO actualy, should init the delegate here with this as the callback (see 'onDeviceConnected') --> but first test if that works
      onDeviceDiscovered = arg.onDeviceDiscovered;
      var serviceUUIDs = [];
      manager.scanForPeripheralsWithServicesOptions(serviceUUIDs, null);
      if (arg.seconds) {
        setTimeout(function() {
          // note that by now a manual 'stop' may have been invoked, but that doesn't hurt
          manager.stopScan();
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

Bluetooth.stopScanning = function (arg) {
  return new Promise(function (resolve, reject) {
    try {
      if (!Bluetooth._isEnabled()) {
        reject("Bluetooth is not enabled");
        return;
      }
      manager.stopScan();
      resolve();
    } catch (ex) {
      console.log("Error in Bluetooth.stopScanning: " + ex);
      reject(ex);
    }
  });
};

Bluetooth._findPeripheral = function(UUID) {
  for (var i=0; i<peripherals.length; i++) {
    var peripheral = peripherals[i];
    if (UUID == peripheral.identifier.UUIDString) {
      console.log("---- found!");
      return peripheral;
    }
  }
  return null;
};

// note that this doesn't make much sense without scanning first
Bluetooth.connect = function (arg) {
  return new Promise(function (resolve, reject) {
    try {
      if (!Bluetooth._isEnabled()) {
        reject("Bluetooth is not enabled");
        return;
      }
      if (!arg.UUID) {
        reject("No UUID was passed");
        return;
      }
      var peripheral = Bluetooth._findPeripheral(arg.UUID);
      if (peripheral === null) {
        reject("Could not find device with UUID " + arg.UUID);
      } else {
        console.log("Connecting to device with UUID: " + arg.UUID);
        peripheral.delegate = CBPeripheralDelegateImpl.new().initWithCallback(arg.onDeviceConnected);
        manager.connectPeripheralOptions(peripheral, null);
        resolve();
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
      if (!Bluetooth._isEnabled()) {
        reject("Bluetooth is not enabled");
        return;
      }
      if (!arg.UUID) {
        reject("No UUID was passed");
        return;
      }
      var peripheral = Bluetooth._findPeripheral(arg.UUID);
      if (peripheral === null) {
        reject("Could not find device with UUID " + arg.UUID);
      } else {
        console.log("Disconnecting device with UUID: " + arg.UUID);
        // no need to send an error when already disconnected, but it's wise to check it
        if (peripheral.state != CBPeripheralStateDisconnected) {
          manager.cancelPeripheralConnection(peripheral);
          peripheral.delegate = null;
        }
        resolve();
      }
    } catch (ex) {
      console.log("Error in Bluetooth.disconnect: " + ex);
      reject(ex);
    }
  });
};

Bluetooth.isConnected = function (arg) {
  return new Promise(function (resolve, reject) {
    try {
      if (!Bluetooth._isEnabled()) {
        reject("Bluetooth is not enabled");
        return;
      }
      if (!arg.UUID) {
        reject("No UUID was passed");
        return;
      }
      var peripheral = Bluetooth._findPeripheral(arg.UUID);
      if (peripheral === null) {
        reject("Could not find device with UUID " + arg.UUID);
      } else {
        console.log("checking connection with device UUID: " + arg.UUID);
        resolve(peripheral.state == CBPeripheralStateConnected);
      }
    } catch (ex) {
      console.log("Error in Bluetooth.isConnected: " + ex);
      reject(ex);
    }
  });
};

Bluetooth._findService = function (UUID, peripheral) {
  for (var i = 0; i < peripheral.services.count; i++) {
    var service = peripheral.services.objectAtIndex(i);
    console.log("--- service.UUID: " + service.UUID);
    // TODO this may need a different compare, see Cordova plugin's findServiceFromUUID function
    if (UUID.UUIDString == service.UUID.UUIDString) {
      console.log("--- found our service with UUID: " + service.UUID);
      return service;
    }
  }
  // service not found on this peripheral
  return null;
}

Bluetooth._findCharacteristic = function (UUID, service, property) {
  console.log("--- _findCharacteristic UUID: " + UUID);
  console.log("--- _findCharacteristic service: " + service);
  console.log("--- _findCharacteristic characteristics: " + service.characteristics);
  console.log("--- _findCharacteristic characteristics.count: " + service.characteristics.count);
  for (var i = 0; i < service.characteristics.count; i++) {
    var characteristic = service.characteristics.objectAtIndex(i);
    console.log("--- characteristic.UUID: " + characteristic.UUID);
    // TODO this may need a different compare, see Cordova plugin's findCharacteristicFromUUID function
    if (UUID.UUIDString == characteristic.UUID.UUIDString) {
      if (property) {
        console.log("--- characteristic.properties: " + characteristic.properties);
        console.log("--- characteristic.properties & property: " + characteristic.properties & property);
        console.log("--- 0x0: " + 0x0);
        if ((characteristic.properties & property) != 0x0) {
          return characteristic;
        }
      } else {
        return characteristic;
      }
    }
  }
  // characteristic not found on this service
  return null;
}

Bluetooth._getData = function (arg, property, reject) {
  if (!arg.deviceUUID) {
    reject("No deviceUUID was passed");
    return null;
  }
  if (!arg.serviceUUID) {
    reject("No serviceUUID was passed");
    return null;
  }
  if (!arg.characteristicUUID) {
    reject("No characteristicUUID was passed");
    return null;
  }

  var peripheral = Bluetooth._findPeripheral(arg.deviceUUID);
  if (!peripheral) {
    reject("Could not find device with UUID " + arg.deviceUUID);
    return null;
  }

  if (peripheral.state != CBPeripheralStateConnected) {
    reject("The device is not connected, so interaction is not possible");
    return null;
  }

  var serviceUUID = CBUUID.UUIDWithString(arg.serviceUUID);
  console.log("--- getData. WIll try to find a service with UUID " + serviceUUID);
  var service = Bluetooth._findService(serviceUUID, peripheral);
  if (!service) {
    reject("Could not find service with UUID " + arg.serviceUUID + " on device with UUID " + arg.deviceUUID);
    return null;
  }

  var characteristicUUID = CBUUID.UUIDWithString(arg.characteristicUUID);
  var characteristic = Bluetooth._findCharacteristic(characteristicUUID, service, property);

  // Special handling for INDICATE. If charateristic with notify is not found, check for indicate.
  if (property == CBCharacteristicPropertyNotify && !characteristic) {
    characteristic = Bluetooth._findCharacteristic(characteristicUUID, service, CBCharacteristicPropertyIndicate);
  }

  // As a last resort, try and find ANY characteristic with this UUID, even if it doesn't have the correct properties
  if (!characteristic) {
    characteristic = Bluetooth._findCharacteristic(characteristicUUID, service);
  }

  if (!characteristic) {
    reject("Could not find characteristic with UUID " + arg.characteristicUUID + " on service with UUID " + arg.serviceUUID + " on device with UUID " + arg.deviceUUID);
    return null;
  }

  // with that all being checked, let's return a wrapper object containing all the stuff we found here
  return {
    peripheral: peripheral,
    service: service,
    characteristic: characteristic
  }
};

Bluetooth.read = function (arg) {
  return new Promise(function (resolve, reject) {
    try {
      if (!Bluetooth._isEnabled()) {
        reject("Bluetooth is not enabled");
        return;
      }
      var wrapper = Bluetooth._getData(arg, CBCharacteristicPropertyRead, reject);
      if (wrapper != null) {
        // TODO callback should send the value.. would be nicest if that's in the 'resolve' so the caller can have the result in '.then()'
        wrapper.peripheral.readValueForCharacteristic(wrapper.characteristic);
      } else {
        // no need to reject, this has already been done
      }
    } catch (ex) {
      console.log("Error in Bluetooth.read: " + ex);
      reject(ex);
    }
  });
};

Bluetooth.write = function (arg) {
  return new Promise(function (resolve, reject) {
    try {
      if (!Bluetooth._isEnabled()) {
        reject("Bluetooth is not enabled");
        return;
      }
      if (!arg.value) {
        reject("You need to provide some data to write in the 'value' property");
        return;
      }
      var wrapper = Bluetooth._getData(arg, CBCharacteristicPropertyWrite, reject);
      if (wrapper != null) {
        wrapper.peripheral.writeValueForCharacteristicType(
            arg.value,
            wrapper.characteristic,
            arg.awaitResponse ? CBCharacteristicWriteWithResponse : CBCharacteristicWriteWithoutResponse);
        if (arg.awaitResponse) {
          // TODO send resolve from 'didWriteValueForCharacteristic'
        } else {
          resolve();
        }
      } else {
        // no need to reject, this has already been done
      }
    } catch (ex) {
      console.log("Error in Bluetooth.write: " + ex);
      reject(ex);
    }
  });
};

module.exports = Bluetooth;