var Bluetooth = require("./bluetooth-common");

// if this happens, we can't retain the delegates..
console.log("-------------^^^ INIT BLUETOOH MODULE");

var manager,
    delegate,
    connectCallbacks = {},
    peripheralArray = NSMutableArray.new(),
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
    // this._services = [];
    this._servicesWithCharacteristics = [];
    return this;
  };
  CBPeripheralDelegateImpl.prototype.peripheralDidDiscoverServices = function(peripheral, error) {
    // map native services to a JS object
    this._services = [];
    for (var i = 0; i < peripheral.services.count; i++) {
      var service = peripheral.services.objectAtIndex(i);
      this._services.push({
        UUID: service.UUID.UUIDString,
        name: service.UUID
      });
      // NOTE: discover all is slow -- also, see todo 10 lines down
      peripheral.discoverCharacteristicsForService(null, service);
    }
    /*
    for (var i = 0; i < peripheral.services.count; i++) {
      var service = peripheral.services.objectAtIndex(i);
      peripheral.discoverCharacteristicsForService(null, service);
    }
    */
  };
  CBPeripheralDelegateImpl.prototype.peripheralDidDiscoverIncludedServicesForServiceError = function(peripheral, service, error) {
    console.log("----- delegate peripheral:didDiscoverIncludedServicesForService:error");
  };
  CBPeripheralDelegateImpl.prototype._getProperties = function(characteristic) {
    var props = characteristic.properties;
    return {
      broadcast: (props & CBCharacteristicPropertyBroadcast) == CBCharacteristicPropertyBroadcast,
      read: (props & CBCharacteristicPropertyRead) == CBCharacteristicPropertyRead,
      broadcast2: (props & CBCharacteristicPropertyBroadcast) == CBCharacteristicPropertyBroadcast,
      read2: (props & CBCharacteristicPropertyRead) == CBCharacteristicPropertyRead,
      write: (props & CBCharacteristicPropertyWrite) == CBCharacteristicPropertyWrite,
      writeWithoutResponse: (props & CBCharacteristicPropertyWriteWithoutResponse) == CBCharacteristicPropertyWriteWithoutResponse,
      notify: (props & CBCharacteristicPropertyNotify) == CBCharacteristicPropertyNotify,
      indicate: (props & CBCharacteristicPropertyIndicate) == CBCharacteristicPropertyIndicate,
      authenticatedSignedWrites: (props & CBCharacteristicPropertyAuthenticatedSignedWrites) == CBCharacteristicPropertyAuthenticatedSignedWrites,
      extendedProperties: (props & CBCharacteristicPropertyExtendedProperties) == CBCharacteristicPropertyExtendedProperties,
      notifyEncryptionRequired: (props & CBCharacteristicPropertyNotifyEncryptionRequired) == CBCharacteristicPropertyNotifyEncryptionRequired,
      indicateEncryptionRequired: (props & CBCharacteristicPropertyIndicateEncryptionRequired) == CBCharacteristicPropertyIndicateEncryptionRequired
    };
  };
  CBPeripheralDelegateImpl.prototype.peripheralDidDiscoverCharacteristicsForServiceError = function(peripheral, service, error) {
    if (error) {
      // TODO invoke reject and stop processing
      return;
    }
    var characteristics = [];
    for (var i = 0; i < service.characteristics.count; i++) {
      var characteristic = service.characteristics.objectAtIndex(i);
      var result = {
        UUID: characteristic.UUID.UUIDString,
        name: characteristic.UUID,
        // see serviceAndCharacteristicInfo in CBPer+Ext of Cordova plugin
        value: characteristic.value ? characteristic.value.base64EncodedStringWithOptions(0) : null,
        properties: this._getProperties(characteristic),
        isNotifying: characteristic.isNotifying,
        permissions: characteristic.permissions,
        descriptors: characteristic.descriptors // TODO extract a JSON object, see https://github.com/don/cordova-plugin-ble-central/blob/master/src/ios/CBPeripheral%2BExtensions.m#L186
      };
      characteristics.push(result);

      for (var j=0; j<this._services.length; j++) {
        var s = this._services[j];
        if (s.UUID == service.UUID.UUIDString) {
          s.characteristics = characteristics;
          this._servicesWithCharacteristics.push(s);
          // the same service may be found multiple times, so make sure it's not added yet
          this._services.splice(j, 1);
          break;
        }
      }

      // TODO add this one day.. Rand's has it, Don's doesn't
      // get details about the characteristic
      // peripheral.discoverDescriptorsForCharacteristic(characteristic);
    }
   
    if (this._services.length === 0) { // this._servicesWithCharacteristics.length) {
      if (this._callback) {
        this._callback({
          UUID: peripheral.identifier.UUIDString,
          name: peripheral.name,
          state: Bluetooth._getState(peripheral.state),
          services: this._servicesWithCharacteristics
        });
        this._callback = null;
      }
    }
 };
  // this is called when a value is read from a peripheral
  CBPeripheralDelegateImpl.prototype.peripheralDidUpdateValueForCharacteristicError = function(peripheral, characteristic, error) {
    if (error !== null) {
      // TODO handle.. pass in sep callback?
      console.log("------------ error @ peripheralDidUpdateValueForCharacteristicError!");
      return;
    }

    console.log("^^^^^^^^ peripheralDidUpdateValueForCharacteristicError");

    try {
      var value = characteristic.value;
      if (!value) {
        console.log("^^^^^^^^ NO VALUE!");
        return;
      }

      var buffer = interop.bufferFromData(characteristic.value);
      if (!buffer) {
        console.log("^^^^^^^^ NO BUFFER!");
        return;
      }

      var data = new Uint8Array(buffer);
      if (!data) {
        console.log("^^^^^^^^ NO DATA!");
        return;
      }

      var decodedvalue = data[1];
      if (!decodedvalue) {
        console.log("^^^^^^^^ NO DECODEDVALUE!");
        return;
      }
    
      if (this._onNotifyCallback) {
        this._onNotifyCallback({decodedvalue: decodedvalue});
      } else {
        console.log("^^^^^^^^ CALLBACK IS GONE!");
      }
    } catch (ex) {
      console.log("^^^^^^^^ EXCEPTION!");      
      console.log("^^^^^^^^ EXCEPTION! + " + ex);      
    }

    /*
    var value = characteristic.value;
    var buffer = interop.bufferFromData(characteristic.value);
    var data = new Uint8Array(buffer);
    var decodedvalue = data[1];

    // console.log("^^^^^^^^^^^^^^ 1: " + decodedvalue);
    // console.log("^^^^^^^^^^^^^^ 2: " + String.fromCharCode.apply(null, buffer));

    ///////// kies: MBPr Eddy > 180A > 2A24 //////
    
    
    // TODO invoke callback with:
    var result = {
      type: characteristic.isNotifying ? "notification" : "read",
      characteristicUUID: characteristic.UUID.UUIDString,
      value: value,
      decodedvalue: decodedvalue
    };

    if (result.type === "read") {
      if (this._onReadPromise) {
        this._onReadPromise(result);
      }
    } else {
      if (this._onNotifyCallback) {
        this._onNotifyCallback(result);
      }
    }
    */
  };
  CBPeripheralDelegateImpl.prototype.peripheralDidWriteValueForCharacteristicError = function(peripheral, characteristic, error) {
    console.log("----- delegate peripheral:didWriteValueForCharacteristic:error characteristic: " + characteristic);
    // TODO this should resolve() -- kept from the 'write' function
  };
  
  // The peripheral letting us know whether our subscribe/unsubscribe happened or not
  CBPeripheralDelegateImpl.prototype.peripheralDidUpdateNotificationStateForCharacteristicError = function(peripheral, characteristic, error) {
    console.log("----- delegate peripheral:didUpdateNotificationStateForCharacteristic:error, error: " + error);
    if (error) {
      console.log("----- delegate peripheral:didUpdateNotificationStateForCharacteristic:error.localizedDescription, " + error.localizedDescription);      
    } else {
      if (characteristic.isNotifying) {
        console.log("------ Notification began on " + characteristic);
      } else {
        console.log("------ Notification stopped on " + characteristic + ", diconnecting");
        manager.cancelPeripheralConnection(peripheral);
      }
    }
  };
  CBPeripheralDelegateImpl.prototype.peripheralDidDiscoverDescriptorsForCharacteristicError = function(peripheral, characteristic, error) {
    
    // NOTE that this cb won't be invoked bc we curr don't discover descriptors
    
    console.log("----- delegate peripheral:didDiscoverDescriptorsForCharacteristic:error characteristic: " + characteristic);
    console.log("----- delegate peripheral:didDiscoverDescriptorsForCharacteristic:error characteristic.value: " + characteristic.value);

    // TODO extract details, see https://github.com/randdusing/cordova-plugin-bluetoothle/blob/master/src/ios/BluetoothLePlugin.m#L1844
    console.log(characteristic.descriptors);
    for (var i = 0; i < characteristic.descriptors.count; i++) {
      var descriptor = characteristic.descriptors.objectAtIndex(i);
      console.log("char desc UUID: " + descriptor.UUID.UUIDString);
    }

    // now let's see if we're ready to invoke the callback
    // TODO wait for the last one, THEN return
    if (this._services.length == this._servicesWithCharacteristics.length) {
      if (this._callback) {
        this._callback({
          UUID: peripheral.identifier.UUIDString,
          name: peripheral.name,
          state: Bluetooth._getState(peripheral.state),
          services: this._services
        });
        this._callback = null;
      }
    }
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
    console.log("----- delegate centralManager:didDiscoverPeripheral: " + peripheral.name + " @ " + RSSI);
    peripheralArray.addObject(peripheral);
    if (onDeviceDiscovered) {
      onDeviceDiscovered({
        UUID: peripheral.identifier.UUIDString,
        name: peripheral.name,
        RSSI: RSSI,
        state: Bluetooth._getState(peripheral.state)
      });
    }
  };
  CBCentralManagerDelegateImpl.prototype.centralManagerDidUpdateState = function(central) {
    console.log("----- delegate centralManagerDidUpdateState: " + central.state);
    if (central.state == CBCentralManagerStateUnsupported) {
      console.log("WARNING: This hardware does not support Bluetooth Low Energy.");
    }
  };
  CBCentralManagerDelegateImpl.prototype.centralManagerWillRestoreState = function(central, dict) {
    console.log("----- delegate centralManager:willRestoreState");
  };
  CBCentralManagerDelegateImpl.prototype.centralManagerDidConnectPeripheral = function(central, peripheral) {
    console.log("----- delegate centralManager:didConnectPeripheral: " + peripheral);
    // console.log("----- delegate centralManager:didConnectPeripheral, delegate: " + peripheral.delegate);
    // NOTE: it's inefficient to discover all services
    
    var cb = connectCallbacks[peripheral.identifier.UUIDString];
    peripheral.delegate = CBPeripheralDelegateImpl.new().initWithCallback(cb);
    
    peripheral.discoverServices(null);	
    // console.log("----- delegate centralManager:didConnectPeripheral call peripheral.discoverServices(null)");
    // NOTE: not invoking callback until characteristics are discovered (OR send back a 'type' and notify the caller? Perhaps that's nicer..)
  };
  CBCentralManagerDelegateImpl.prototype.centralManagerDidDisconnectPeripheralError = function(central, peripheral, error) {
    console.log("----- delegate centralManager:didDisconnectPeripheral:error: " + peripheral);
    // TODO send this event..
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
    return 'disconnecting';
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
  for (var i = 0; i < peripheralArray.count; i++) {
    var peripheral = peripheralArray.objectAtIndex(i);
    if (UUID == peripheral.identifier.UUIDString) {
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
        connectCallbacks[arg.UUID] = arg.onDeviceConnected;
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
          // TODO remove from the peripheralArray as well
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
    // console.log("--- service.UUID: " + service.UUID);
    // TODO this may need a different compare, see Cordova plugin's findServiceFromUUID function
    if (UUID.UUIDString == service.UUID.UUIDString) {
      // console.log("--- found our service with UUID: " + service.UUID);
      return service;
    }
  }
  // service not found on this peripheral
  return null;
};

Bluetooth._findCharacteristic = function (UUID, service, property) {
  // console.log("--- _findCharacteristic UUID: " + UUID);
  // console.log("--- _findCharacteristic service: " + service);
  // console.log("--- _findCharacteristic characteristics: " + service.characteristics);
  // console.log("--- _findCharacteristic characteristics.count: " + service.characteristics.count);
  for (var i = 0; i < service.characteristics.count; i++) {
    var characteristic = service.characteristics.objectAtIndex(i);
    // console.log("--- characteristic.UUID: " + characteristic.UUID);
    if (UUID.UUIDString == characteristic.UUID.UUIDString) {
      if (property) {
        if ((characteristic.properties & property) == property) {
          // console.log("--- characteristic.found: " + characteristic.UUID);
          return characteristic;
        }
      } else {
        return characteristic;
      }
    }
  }
  // characteristic not found on this service
  console.log("--- characteristic.NOT.found!");
  return null;
};

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
  console.log("--- getData. Will try to find a service with UUID " + serviceUUID);
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
  };
};

Bluetooth.read = function (arg) {
  return new Promise(function (resolve, reject) {
    try {
      if (!Bluetooth._isEnabled()) {
        reject("Bluetooth is not enabled");
        return;
      }
      var wrapper = Bluetooth._getData(arg, CBCharacteristicPropertyRead, reject);
      if (wrapper !== null) {
        // TODO callback should send the value.. would be nicest if that's in the 'resolve' so the caller can have the result in '.then()'
        // --- but that won't work for notify..
        
        console.log("------ calling readValueForCharacteristic");
        
        var peripheral = Bluetooth._findPeripheral(arg.deviceUUID);
        peripheral.delegate = CBPeripheralDelegateImpl.new().initWithCallback(null);

        peripheral.delegate._onReadPromise = resolve;
        peripheral.readValueForCharacteristic(wrapper.characteristic);
      } else {
        // no need to reject, this has already been done
      }
    } catch (ex) {
      console.log("Error in Bluetooth.read: " + ex);
      reject(ex);
    }
  });
};

Bluetooth.startNotifying = function (arg) {
  return new Promise(function (resolve, reject) {
    try {
      if (!Bluetooth._isEnabled()) {
        reject("Bluetooth is not enabled");
        return;
      }
      var wrapper = Bluetooth._getData(arg, CBCharacteristicPropertyNotify, reject);
      console.log("--------- startNotifying wrapper: " + wrapper);
      if (wrapper !== null) {
        var cb = arg.onNotify || function(result) { console.log("No 'onNotify' callback function specified for 'startNotifying'"); };

        var peripheral = Bluetooth._findPeripheral(arg.deviceUUID);
        peripheral.delegate = CBPeripheralDelegateImpl.new().initWithCallback(null);

        // TODO prolly set a new delegate for methods like this..
        // console.log("--------- DELEGATE 1: " + wrapper.peripheral);
        // console.log("--------- DELEGATE 2: " + wrapper.peripheral.delegate);
        // console.log("--------- DELEGATE._servicesWithCharacteristics: " + wrapper.peripheral.delegate._servicesWithCharacteristics);
        
        // wrapper.peripheral.delegate = 
        peripheral.delegate._onNotifyCallback = cb; // TODO might as well move to constructor above
        peripheral.setNotifyValueForCharacteristic(true, wrapper.characteristic);
      } else {
        // no need to reject, this has already been done
      }
      resolve();
    } catch (ex) {
      console.log("Error in Bluetooth.startNotifying: " + ex);
      reject(ex);
    }
  });
};

Bluetooth.stopNotifying = function (arg) {
  return new Promise(function (resolve, reject) {
    try {
      if (!Bluetooth._isEnabled()) {
        reject("Bluetooth is not enabled");
        return;
      }
      var wrapper = Bluetooth._getData(arg, CBCharacteristicPropertyNotify, reject);
      console.log("--------- stopNotifying wrapper: " + wrapper);
      if (wrapper !== null) {
        var peripheral = Bluetooth._findPeripheral(arg.deviceUUID);
        peripheral.delegate = null;
        peripheral.setNotifyValueForCharacteristic(false, wrapper.characteristic);
      } else {
        // no need to reject, this has already been done
      }
      resolve();
    } catch (ex) {
      console.log("Error in Bluetooth.stopNotifying: " + ex);
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
      if (wrapper !== null) {
        wrapper.peripheral.writeValueForCharacteristicType(
            arg.value,
            wrapper.characteristic,
            CBCharacteristicWriteWithResponse);
        // TODO send resolve from 'didWriteValueForCharacteristic'
      } else {
        // no need to reject, this has already been done
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
      if (!Bluetooth._isEnabled()) {
        reject("Bluetooth is not enabled");
        return;
      }
      if (!arg.value) {
        reject("You need to provide some data to write in the 'value' property");
        return;
      }
      var wrapper = Bluetooth._getData(arg, CBCharacteristicPropertyWrite, reject);
      if (wrapper !== null) {
        wrapper.peripheral.writeValueForCharacteristicType(
            arg.value,
            wrapper.characteristic,
            CBCharacteristicWriteWithoutResponse);
        resolve();
      } else {
        // no need to reject, this has already been done
      }
    } catch (ex) {
      console.log("Error in Bluetooth.writeWithoutResponse: " + ex);
      reject(ex);
    }
  });
};

module.exports = Bluetooth;