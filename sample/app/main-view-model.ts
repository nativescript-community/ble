import {Observable} from 'data/observable';
import {ObservableArray} from "data/observable-array";
import {topmost} from "ui/frame";
import {Bluetooth} from 'nativescript-bluetooth';
import * as dialogs from "ui/dialogs";

export class HelloWorldModel extends Observable {
  private bluetooth: Bluetooth;
  private peripherals: ObservableArray<Bluetooth.Peripheral>;

  constructor() {
    super();
    this.bluetooth = new Bluetooth();
    this.peripherals = new ObservableArray<Bluetooth.Peripheral>();
  }

  doIsBluetoothEnabled() {
    this.bluetooth.isBluetoothEnabled().then(function (enabled) {
      dialogs.alert({
        title: "Enabled?",
        message: enabled ? "Yes" : "No",
        okButtonText: "OK, thanks"
      });
    });
  };

  onPeripheralTap(args) {
    var index = args.index;
    console.log('!!&&&&***** Clicked item with index ' + index);
    var peri = this.peripherals.getItem(index);
    console.log("--- peri selected: " + peri.UUID);

    var navigationEntry = {
      moduleName: "services-page",
      context: {
        info: "something you want to pass to your page",
        foo: 'bar',
        peripheral: peri
      },
      animated: true
    };
    var topmost = topmost();
    topmost.navigate(navigationEntry);
  };


  doScanForHeartrrateMontitor() {
    var that = this;

    this.bluetooth.hasCoarseLocationPermission().then(
      function (granted) {
        if (!granted) {
          this.bluetooth.requestCoarseLocationPermission();
        } else {
          var heartrateService = "180d";
          var omegaService = "12345678-9012-3456-7890-1234567890ee";

          that.set('isLoading', true);
          // reset the array
          that.peripherals.splice(0, that.peripherals.length);
          this.bluetooth.startScanning(
            {
              // beware: the peripheral must advertise ALL these services
              serviceUUIDs: [heartrateService],
              seconds: 4,
              onDiscovered: function (peripheral) {
                var obsp = new Observable(peripheral);
                that.peripherals.push(obsp);
              }
            }
          ).then(function () {
            that.set('isLoading', false);
          },
            function (err) {
              that.set('isLoading', false);
              dialogs.alert({
                title: "Whoops!",
                message: err,
                okButtonText: "OK, got it"
              });
            });
        }
      }
    );
  };

  doStartScanning() {
    var that = this;
    // On Android 6 we need this permission to be able to scan for peripherals in the background.
    this.bluetooth.hasCoarseLocationPermission().then(
      function (granted) {
        if (!granted) {
          that.bluetooth.requestCoarseLocationPermission();
        } else {
          that.set('isLoading', true);
          // reset the array
          that.peripherals.splice(0, that.peripherals.length);
          that.bluetooth.startScanning(
            {
              serviceUUIDs: [], // pass an empty array to scan for all services
              seconds: 4, // passing in seconds makes the plugin stop scanning after <seconds> seconds
              onDiscovered: function (peripheral) {
                var obsp = new Observable(peripheral);
                that.peripherals.push(obsp);
              }
            }
          ).then(function () {
            that.set('isLoading', false);
          },
            function (err) {
              that.set('isLoading', false);
              dialogs.alert({
                title: "Whoops!",
                message: err,
                okButtonText: "OK, got it"
              });
            });
        }
      }
    );
  };

  doStopScanning() {
    var that = this;
    this.bluetooth.stopScanning().then(function () {
      that.set('isLoading', false);
    },
      function (err) {
        dialogs.alert({
          title: "Whoops!",
          message: err,
          okButtonText: "OK, so be it"
        });
      });
  };
}

/*
  DemoAppModel.prototype.doWrite = function () {
    // send 1 byte to switch a light on
    var data = new Uint8Array(1);
    data[0] = 1;

    bluetooth.write(
      {
        peripheralUUID: mostRecentlyFoundperipheralUUID,
        serviceUUID: "B9401000-F5F8-466E-AFF9-25556B57FE6D", // TODO dummy
        characteristicUUID: "B9402001-F5F8-466E-AFF9-25556B57FE6D", // TODO dummy
        value: data.buffer,
        awaitResponse: true // if false you will not get notified of errors (fire and forget) 
      }
    ).then(
      function(result) {
        dialogs.alert({
          title: "Write result",
          message: JSON.stringify(result),
          okButtonText: "OK, splendid"
        });
      },
      function (err) {
        dialogs.alert({
          title: "Whoops!",
          message: err,
          okButtonText: "Hmmkay"
        });
      }
    );
  };
*/