import * as dialogs from "tns-core-modules/ui/dialogs";
import { Observable, fromObject } from "tns-core-modules/data/observable";
import { ObservableArray } from "tns-core-modules/data/observable-array";
import { topmost } from "tns-core-modules/ui/frame";
import { Prop } from "./utils/obs-prop";
import { Peripheral, Bluetooth } from "nativescript-bluetooth";

export class DemoAppModel extends Observable {
  @Prop() public isLoading = false;

  public peripherals = new ObservableArray<Peripheral>();
  private _bluetooth = new Bluetooth();

  constructor() {
    super();
    // enables the console.logs from the Bluetooth source code
    this._bluetooth.debug = true;
  }

  public doIsBluetoothEnabled() {
    console.log("doIsBluetoothEnabled tap");
    this._bluetooth
      .isBluetoothEnabled()
      .then(enabled => {
        dialogs.alert({
          title: "Enabled?",
          message: enabled ? "Yes" : "No",
          okButtonText: "Okay"
        });
      })
      .catch(err => {
        console.log("error with isBluetoothEnabled");
      });
  }

  public doEnableBluetooth() {
    this._bluetooth.enable().then(enabled => {
      setTimeout(() => {
        dialogs.alert({
          title: "Did the user allow enabling Bluetooth by our app?",
          message: enabled ? "Yes" : "No",
          okButtonText: "OK, nice!"
        });
      }, 500);
    });
  }

  public onPeripheralTap(args) {
    console.log("!!&&&&***** Clicked item with index " + args.index);
    const peri = this.peripherals.getItem(args.index);
    console.log("--- peripheral selected: " + peri.UUID);

    var navigationEntry = {
      moduleName: "services-page",
      context: {
        info: "something you want to pass to your page",
        foo: "bar",
        peripheral: peri
      },
      animated: true
    };
    topmost().navigate(navigationEntry);
  }

  // this one 'manually' checks for permissions
  public doScanForHeartrateMontitor() {
    this._bluetooth.hasCoarseLocationPermission().then(granted => {
      if (!granted) {
        this._bluetooth.requestCoarseLocationPermission().then(
          // doing it like this for demo / testing purposes.. better usage is demonstrated in 'doStartScanning' below
          granted2 => {
            dialogs.alert({
              title: "Granted?",
              message: granted2 ? "Yep - now invoke that button again" : "Nope",
              okButtonText: "OK!"
            });
          }
        );
      } else {
        var heartrateService = "180d";
        var omegaService = "12345678-9012-3456-7890-1234567890ee";

        this.isLoading = true;
        // reset the array
        this.peripherals.splice(0, this.peripherals.length);
        this._bluetooth
          .startScanning({
            // beware: the peripheral must advertise ALL these services
            serviceUUIDs: [omegaService],
            seconds: 4,
            onDiscovered: peripheral => {
              this.peripherals.push(peripheral);
            },
            skipPermissionCheck: false
          })
          .then(
            () => {
              this.isLoading = false;
            },
            err => {
              this.isLoading = false;
              dialogs.alert({
                title: "Whoops!",
                message: err,
                okButtonText: "OK, got it"
              });
            }
          );
      }
    });
  }

  // this one uses automatic permission handling
  public doStartScanning() {
    this.isLoading = true;
    // reset the array
    this.peripherals.length = 0;
    this._bluetooth
      .startScanning({
        serviceUUIDs: [], // pass an empty array to scan for all services
        seconds: 5, // passing in seconds makes the plugin stop scanning after <seconds> seconds
        onDiscovered: peripheral => {
          this.peripherals.push(peripheral);
        },
        skipPermissionCheck: false
      })
      .then(
        () => {
          this.isLoading = false;
        },
        err => {
          this.isLoading = false;
          dialogs.alert({
            title: "Whoops!",
            message: err,
            okButtonText: "OK, got it"
          });
        }
      );
  }

  public doStopScanning() {
    this._bluetooth.stopScanning().then(
      () => {
        this.isLoading = false;
      },
      err => {
        dialogs.alert({
          title: "Whoops!",
          message: err,
          okButtonText: "OK, so be it"
        });
      }
    );
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
}
