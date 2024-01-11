import * as dialogs from '@nativescript/core/ui/dialogs';
import { Observable } from '@nativescript/core/data/observable';
import { ObservableArray } from '@nativescript/core/data/observable-array';
import { Prop } from './utils/obs-prop';
import { Bluetooth, Peripheral, getBluetoothInstance } from '@nativescript-community/ble';
import { Frame } from '@nativescript/core/ui/frame';
import { check, request } from '@nativescript-community/perms';
import { Application } from '@nativescript/core';

export class DemoAppModel extends Observable {
    @Prop() public isLoading = false;

    public peripherals = new ObservableArray<Peripheral>();
    private _bluetooth = getBluetoothInstance();

    constructor() {
        super();
        // enables the console.logs from the Bluetooth source code

        // using an event listener instead of the 'onDiscovered' callback of 'startScanning'
        this._bluetooth.on(Bluetooth.device_discovered_event, (eventData: any) => {
            const perip = eventData.data as Peripheral;
            console.log('Peripheral found:', JSON.stringify(eventData.data));
            let index = -1;
            this.peripherals.some((p, i) => {
                if (p.UUID === perip.UUID) {
                    index = i;
                    return true;
                }
                return false;
            });
            if (index === -1) {
                this.peripherals.push(perip);
            } else {
                this.peripherals.setItem(index, perip);
            }
        });
    }

    public doIsBluetoothEnabled() {
        console.log('doIsBluetoothEnabled tap');
        this._bluetooth.isBluetoothEnabled().then((enabled) => {
            if (enabled === false) {
                dialogs.alert('Bluetooth is DISABLED.');
            } else {
                dialogs.alert('Bluetooth is ENABLED.');
            }
        });
    }

    public doEnableBluetooth() {
        this._bluetooth.enable().then((enabled) => {
            setTimeout(() => {
                dialogs.alert({
                    title: 'Did the user allow enabling Bluetooth by our app?',
                    message: enabled ? 'Yes' : 'No',
                    okButtonText: 'OK, nice!'
                });
            }, 500);
        });
    }

    public onPeripheralTap(args) {
        this.doStopScanning();
        console.log('!!&&&&***** Clicked item with index ' + args.index);
        const peri = this.peripherals.getItem(args.index);
        console.log('--- peripheral selected: ' + peri.UUID);

        const navigationEntry = {
            moduleName: 'services-page',
            context: {
                peripheral: peri
            },
            animated: true
        };
        Frame.topmost().navigate(navigationEntry);
    }

    public onPeripheralTestTap(peri) {
        this.doStopScanning();
        console.log('!!&&&&***** Long press item with index ' + peri);
        console.log('--- peripheral selected: ' + peri.UUID);

        const navigationEntry = {
            moduleName: 'test-page',
            context: {
                peripheral: peri
            },
            animated: true
        };
        Frame.topmost().navigate(navigationEntry);
    }

    // this one 'manually' checks for permissions
    public doScanForHeartrateMontitor() {
        this._bluetooth.hasLocationPermission().then((granted) => {
            console.log('hasLocationPermission', granted);
            if (!granted) {
                this._bluetooth.requestLocationPermission().then(
                    // doing it like this for demo / testing purposes.. better usage is demonstrated in 'doStartScanning' below
                    (granted2) => {
                        dialogs.alert({
                            title: 'Granted?',
                            message: granted2 ? 'Yep - now invoke that button again' : 'Nope',
                            okButtonText: 'OK!'
                        });
                    }
                );
            } else {
                const heartrateService = '180d';
                // const omegaService = '12345678-9012-3456-7890-1234567890ee';

                this.isLoading = true;
                // reset the array
                this.peripherals.splice(0, this.peripherals.length);
                this._bluetooth
                    .startScanning({
                        // beware: the peripheral must advertise ALL these services
                        filters: [{ serviceUUID: heartrateService }],
                        seconds: 4,
                        // onDiscovered: peripheral => {
                        //     this.peripherals.push(peripheral);
                        // },
                        skipPermissionCheck: true // we can skip permissions as we use filters:   https://developer.android.com/guide/topics/connectivity/bluetooth-le
                    })
                    .then(
                        (p) => {
                            this.isLoading = false;
                            console.log('p', p);
                        },
                        (err) => {
                            this.isLoading = false;
                            dialogs.alert({
                                title: 'Whoops!',
                                message: err,
                                okButtonText: 'OK, got it'
                            });
                        }
                    );
            }
        });
    }

    // this one 'manually' checks for permissions
    public doScanForBeacon() {
        this._bluetooth.hasLocationPermission().then((granted) => {
            if (!granted) {
                this._bluetooth.requestLocationPermission().then(
                    // doing it like this for demo / testing purposes.. better usage is demonstrated in 'doStartScanning' below
                    (granted2) => {
                        dialogs.alert({
                            title: 'Granted?',
                            message: granted2 ? 'Yep - now invoke that button again' : 'Nope',
                            okButtonText: 'OK!'
                        });
                    }
                );
            } else {
                // const heartrateService = '180d';
                // const omegaService = '12345678-9012-3456-7890-1234567890ee';

                this.isLoading = true;
                // reset the array
                this.peripherals.splice(0, this.peripherals.length);
                this._bluetooth
                    .startScanning({
                        // beware: the peripheral must advertise ALL these services
                        filters: [{ serviceUUID: '0000feaa-0000-1000-8000-00805f9b34fb' }],
                        seconds: 4,
                        // onDiscovered: peripheral => {
                        //     this.peripherals.push(peripheral);
                        // },
                        skipPermissionCheck: true // we can skip permissions as we use filters:   https://developer.android.com/guide/topics/connectivity/bluetooth-le
                    })
                    .then(
                        (p) => {
                            this.isLoading = false;
                            console.log('p', p);
                        },
                        (err) => {
                            this.isLoading = false;
                            dialogs.alert({
                                title: 'Whoops!',
                                message: err,
                                okButtonText: 'OK, got it'
                            });
                        }
                    );
            }
        });
    }

    // this one uses automatic permission handling
    public async doStartScanning() {
        try {
            const r = await request({ bluetoothConnect: {}, bluetoothScan: {} });
            console.log('r', r);
            this._bluetooth.hasLocationPermission().then(async (granted) => {
                console.log('granted', granted);
                if (!granted) {
                    this._bluetooth.requestLocationPermission().then(
                        // doing it like this for demo / testing purposes.. better usage is demonstrated in 'doStartScanning' below
                        (granted2) => {
                            dialogs.alert({
                                title: 'Granted?',
                                message: granted2 ? 'Yep - now invoke that button again' : 'Nope',
                                okButtonText: 'OK!'
                            });
                        }
                    );
                } else {
                    this.isLoading = true;
                    // reset the array
                    this.peripherals.length = 0;
                    await this._bluetooth.startScanning({
                        seconds: 50, // passing in seconds makes the plugin stop scanning after <seconds> seconds
                        onDiscovered: (peripheral) => {
                            console.log("peripheral discovered. Not adding it here because we're using a listener.");
                        }
                    });
                }
            });
        } catch (error) {
            dialogs.alert({
                title: 'Whoops!',
                message: error ? error : 'Unknown error',
                okButtonText: 'OK, got it'
            });
        } finally {
            this.isLoading = false;
        }
    }

    public doStopScanning() {
        this._bluetooth.stopScanning().then(
            () => {
                this.isLoading = false;
            },
            (err) => {
                dialogs.alert({
                    title: 'Whoops!',
                    message: err,
                    okButtonText: 'OK, so be it'
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
