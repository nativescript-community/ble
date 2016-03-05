# NativeScript <img src="https://www.bluetooth.com/~/media/bluetooth/homepage/smalllogo.ashx" height="20px" alt="Bluetooth"/> plugin

### Use when you want to
* scan for Bluetooth LE / Smart peripherals,
* connect to those peripherals,
* read values of a characteristic,
* write new values to them,
* get notified when the value of a characteristic changes.

### Supported platforms
* iOS
* Android 4.3 and up

Note that a simulator can't be used to test conneting to Bluetooth peripherals.

## Installation
From the command prompt go to your app's root folder and execute:

```
tns plugin add nativescript-bluetooth
```

And do yourself a favor by adding TypeScript support to your nativeScript app:

```
tns install typescript
```

## API
Want to dive in quickly? Check out [the demo app](https://github.com/EddyVerbruggen/nativescript-bluetooth-demo)! Otherwise, mix and match these functions as you see fit:

#### Prerequisites
- [isBluetoothEnabled](#isbluetoothenabled)
- [hasCoarseLocationPermission](#hascoarselocationpermission)
- [requestCoarseLocationPermission](#requestcoarselocationpermission)

#### Discovery
- [startScanning](#startscanning)
- [stopScanning](#startscanning)

#### Connectivity
- [connect](#connect)
- [disconnect](#disconnect)

#### Interaction
- [read](#read)
- [write](#write)
- [startNotifying](#startnotifying)
- [stopNotifying](#stopnotifying)


### isBluetoothEnabled
Reports if bluetooth is enabled.

```js
// require the plugin
var bluetooth = require("nativescript-bluetooth");

isBluetoothEnabled().then(
  function(enabled) {
    console.log("Enabled? " + enabled);
  }
);
```
### hasCoarseLocationPermission
On Android 6 you need to request permission to be able to interact with a Bluetooth peripheral (when the app is in the background) when targeting API level 23+. Even if the `uses-permission` tag for `ACCESS_COARSE_LOCATION` is present in `AndroidManifest.xml`.

Note that for `BLUETOOTH` and `BLUETOOTH_ADMIN` you don't require runtime permission; adding those to `AndroidManifest.xml` suffices (which the plugin does for you).

Note that `hasCoarseLocationPermission ` will return true when:
* You're running this on iOS, or
* You're targeting an API level lower than 23, or
* You're using a device running Android < 6, or
* You've already granted permission.

```js
bluetooth.hasCoarseLocationPermission().then(
  function(granted) {
    // if this is 'false' you probably want to call 'requestCoarseLocationPermission' now
    console.log("Has Location Permission? " + granted);
  }
);
```

### requestCoarseLocationPermission
```js
// if no permission was granted previously this will open a user consent screen
bluetooth.requestCoarseLocationPermission().then(
  function() {
    console.log("Location permission requested");
  }
);
```

### startScanning
A few of the optional params require a bit of explanation:

#### seconds
Scanning for peripherals drains the battery quickly, so you better not scan any longer than necessary. If a peripheral is in range and not engaged in another connection it usually pops up in under a second. If you don't pass in a number of seconds you will need to manually call `stopScanning`.

#### serviceUUIDs
It's inefficient to scan for all available Bluetooth peripheral and have them report all services they offer.
If you're only interested in finding a heartrate peripheral for instance, pass in service UUID `'180d'` like this: serviceUUIDs: ['180d']. If you add 2 or more (comma separated) services then only peripherals supporting ALL those services will match.

#### onDiscovered
While scanning the plugin will immediately report back uniquely discovered peripherals. This function will receive an object representing the peripheral which contains the properties `UUID`, `name` and `RSSI` (relative signal strength).

```js
bluetooth.startScanning({
  serviceUUIDs: [],
  seconds: 4,
  onDiscovered: function (peripheral) {
  	console.log("Periperhal found with UUID: " + peripheral.UUID);
  }
}).then(function() {
  console.log("scanning complete");
}, function (err) {
  console.log("error while scanning: " + err);
});
```

### stopScanning
At any time during a scan, being one where you passed in a number or seconds or not, you can stop the scan by calling this function.

You may for instance want to stop scanning when the peripheral you found in `startScanning`'s `onDiscovered` callback matches your criteria.

```js
bluetooth.stopScanning().then(function() {
  console.log("scanning stopped");
});
```

### connect
Pass in the UUID of the peripheral you want to connect to and once a connection has been established the `onConnected` callback function will be invoked. This callback will received the peripheral object as before, but it's now enriched with a `services` property. An example of the returned peripheral object could be:

```js
  peripheral: {
    UUID: '3424-542-4534-53454',
    name: 'Polar P7 Heartrate Monitor',
    RSSI: '-57',
    services: [{    
      UUID: '180d',
      name: 'Heartrate service',
      characteristics: [{
        UUID: '34534-54353-234324-343',
        name: 'Heartrate characteristic',
        properties: {
          read: true,
          write: false,
          writeWithoutResponse: false,
          notify: true
        }
      }]
    }]
  }
```

Here's the `connect` function in action with an implementation of `onConnected` that simply dumps the entire peripheral object to the console:

```js
bluetooth.connect({
  UUID: '04343-23445-45243-423434',
  onConnected: function (peripheral) {
  	console.log("Periperhal connected with UUID: " + peripheral.UUID);

  	// the peripheral object now has a list of available services:
  	peripheral.services.forEach(function(service) {
  	  console.log("service found: " + JSON.stringify(service));
   });
  },
  onDisconnected: function (peripheral) {
  	console.log("Periperhal disconnected with UUID: " + peripheral.UUID);
  }
});
```

Also note that `onDisconnected` function: if you try to interact with the peripheral after this event you risk crashing your app.


### disconnect
Once done interacting with the peripheral be a good citizen and disconnect. This will allow other applications establishing a connection.

```js
bluetooth.disconnect({
  UUID: '34234-5453-4453-54545'
}).then(function() {
  console.log("disconnected successfully");
}).then(function(err) {
  // in this case you're probably best off treating this as a disconnected peripheral though
  console.log("disconnection error: " + err);
});
```

### read
So you're connected? Then finally we can have some fun!

bluetooth.read({
  UUID: '34234-5453-4453-54545'
}).then(function() {
  console.log("disconnected successfully");
}).then(function(err) {
  // in this case you're probably best off treating this as a disconnected peripheral though
  console.log("disconnection error: " + err);
});

