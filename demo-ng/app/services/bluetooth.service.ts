import { Injectable, NgZone } from '@angular/core';
import { Observable, Subscription, fromEventPattern } from 'rxjs';
import { takeWhile } from 'rxjs/operators';
import * as dialogs from 'tns-core-modules/ui/dialogs';
import { Bluetooth, Peripheral, Service, Characteristic, ReadResult } from 'nativescript-akylas-bluetooth';

const bluetooth = new Bluetooth();

export interface IPeripheral extends Peripheral {
  isConnected?: boolean;
}
export interface IService extends Service {
  peripheralRef?: IPeripheral; // retain a reference to the parent peripheral
}
export interface ICharacteristic extends Characteristic {
  serviceRef?: IService; // retain a reference to the parent service
  isExpandedView?: boolean; // toggle for view component to show/hide the read/write/notify properties
  isNotifying?: boolean;
  readResult?: CharOpResult;
  writeResult?: CharOpResult;
  writeWithoutResponseResult?: CharOpResult;
  notifyResult?: CharOpResult;
}

export class Util {
  // Given, e.g. 15, will return "0f".
  public static toPaddedHexByte(byte: number): string {
    return ('0' + byte.toString(16)).substr(-2);
  }
  // Given, e.g. [1,2,3], will return "0x010203".
  public static abToHexStr(ab: ArrayBuffer): string {
    let s = '';
    if (ab) {
      new Uint8Array(ab).forEach(x => (s += this.toPaddedHexByte(x)));
      s = '0x' + s;
    }
    return s;
  }
  // Given, e.g. "Abc", will return "0x41,0x62,0x63".
  public static strToDelimitedHexStr(str: string): string {
    let s = '';
    if (str) {
      const a: string[] = str
        .split('')
        .map(c => this.toPaddedHexByte(c.charCodeAt(0)));
      s = '0x' + a.join(',0x');
    }
    return s;
  }
  // Given, e.g. "01_ABC", will return the Uint8Array: [48,49,95,65,66,67].
  public static stringToByteArray(str: string): Uint8Array {
    let bytes: Uint8Array;
    if (str) {
      bytes = new Uint8Array(str.split('').map(c => c.charCodeAt(0) & 0xff));
    }
    return bytes;
  }
}

export class CharOpResult {
  // result from a Characteristic read/write/notify type of operation
  constructor(
    public value?: any,
    public valueRaw?: any,
    public timestamp?: Date
  ) { }
  public setFields(value?: any, valueRaw?: any, timestamp?: Date) {
    this.value = value;
    this.valueRaw = valueRaw;
    this.timestamp = timestamp;
  }
  public valueToString(): string {
    return this.value && this.value.toString();
  }
  public valueToHexString(): string {
    return Util.abToHexStr(this.value);
  }
  public valueRawToJSONString(): string {
    return JSON.stringify(this.valueRaw);
  }
  public timestampToISOString(): string {
    return this.timestamp && this.timestamp.toISOString();
  }
}

@Injectable()
export class BluetoothService {

  constructor(private zone: NgZone) {
    console.log('Creating BluetoothService');
  }

  public peripheralList: Array<IPeripheral> = []; // public storage for the list of last-scanned peripherals
  public isScanning = false;

  private isBluetoothEnabled: boolean;
  private scanSubscription: Subscription;
  public static SIGNAL_STOP_PERIPHERAL(): IPeripheral {
    return { UUID: '---stop---', name: '---stop---', RSSI: 0, services: [] };
  }

  public static getEmptyPeripheral(
    uuid?: string,
    name?: string,
    rssi?: number
  ): IPeripheral {
    return {
      UUID: uuid || '',
      name: name || '',
      RSSI: rssi || 0,
      services: []
    };
  }

  clearPeripherals() {
    this.peripheralList.splice(0, this.peripheralList.length);
  }

  addOrReplacePeripheral(peripheral: IPeripheral) {
    // Spin through any children, to set parent references and any default field values.
    if (peripheral.services) {
      peripheral.services.forEach((svc: IService) => {
        svc.peripheralRef = peripheral;
        if (svc.characteristics) {
          svc.characteristics.forEach((char: ICharacteristic) => {
            char.serviceRef = svc;
            char.isExpandedView = false;
            char.isNotifying = false;
            char.readResult = new CharOpResult();
            char.writeResult = new CharOpResult();
            char.writeWithoutResponseResult = new CharOpResult();
            char.notifyResult = new CharOpResult();
          });
        }
      });
    }

    const idx: number = this.findPeripheralIndex(peripheral.UUID);
    this.zone.run(() => {
      if (idx === null) {
        this.peripheralList.unshift(peripheral);
      } else {
        this.peripheralList[idx] = peripheral;
      }
    });
  }

  getPeripheral(idx: number): IPeripheral {
    return this.peripheralList[idx];
  }

  findPeripheral(peripheralUUID: string): IPeripheral {
    const found = this.peripheralList.filter(
      periph => periph.UUID === peripheralUUID
    );
    if (found.length > 0) {
      return found[0];
    } else {
      return null;
    }
  }

  findPeripheralIndex(peripheralUUID: string): number {
    for (let i = 0; i < this.peripheralList.length; i++) {
      if (this.peripheralList[i].UUID === peripheralUUID) {
        return i;
      }
    }
    return null;
  }

  findService(peripheral: IPeripheral, serviceUUID: string): IService {
    if (peripheral.services) {
      const found = peripheral.services.filter(
        svc => svc.UUID.toLowerCase() === serviceUUID.toLowerCase()
      );
      if (found.length > 0) {
        return found[0];
      }
    }
    return null;
  }

  findCharacteristic(
    service: IService,
    characteristicUUID: string
  ): ICharacteristic {
    if (service.characteristics) {
      const found = service.characteristics.filter(
        char => char.UUID.toLowerCase() === characteristicUUID.toLowerCase()
      );
      if (found.length > 0) {
        return found[0];
      }
    }
    return null;
  }

  stringify(obj: IPeripheral | IService | ICharacteristic): string {
    return JSON.stringify(obj, (key, val) => {
      if (key === 'peripheralRef' || key === 'serviceRef') {
        return val.UUID;
      } else {
        return val;
      }
    });
  }

  checkBluetoothEnabled(): boolean {
    bluetooth
      .isBluetoothEnabled()
      .then(enabled => {
        this.isBluetoothEnabled = enabled;
        alert({
          title: 'Bluetooth enabled?',
          message: enabled ? 'Yes' : 'No',
          okButtonText: 'OK'
        });
      })
      .catch(error => {
        this.attention('Problem checking if bluetooth is enabled', error, true);
      });
    return this.isBluetoothEnabled;
  }

  scanForPeripherals(serviceUUIDs?: string[], seconds?: number): boolean {
    if (!serviceUUIDs) { serviceUUIDs = []; } // an empty array means scan for all services
    if (!seconds) { seconds = 3; } // plugin stops scanning after this many seconds
    console.log(
      `scanForPeripherals(${JSON.stringify(serviceUUIDs)}, ${seconds}) called`
    );

    // Android 6 needs this permission to scan for peripherals in the background.
    bluetooth.hasCoarseLocationPermission().then(granted => {
      if (!granted) {
        bluetooth.requestCoarseLocationPermission();
        return false;
      }
    });

    this.clearPeripherals();
    this.isScanning = true;
    this.scanSubscription = this.startScan(serviceUUIDs, seconds)
      .pipe(
        takeWhile((peripheral: IPeripheral, idx: number): boolean => {
          return (
            peripheral.UUID !== BluetoothService.SIGNAL_STOP_PERIPHERAL().UUID
          );
        })
      )
      .subscribe(
        (peripheral: IPeripheral) => {
          console.log(
            'subscribe->next called, with: ' + JSON.stringify(peripheral)
          );
          peripheral.isConnected = false;
          this.addOrReplacePeripheral(peripheral);
        },
        (error: any) => console.log('Error in scanForPeripherals(): ' + error),
        () => {
          this.isScanning = false;
          console.log('subscription completed');
        }
      );

    return true;
  }

  private startScan(
    serviceUUIDs: string[],
    seconds: number
  ): Observable<IPeripheral> {
    console.log(
      `startScan(${JSON.stringify(serviceUUIDs)}, ${seconds}) called`
    );
    const self = this; // for attention() calls below
    const filters = serviceUUIDs.map((uuid) => ({serviceUUID: uuid}));

    return fromEventPattern<IPeripheral>(
      function add(handler: Function) {
        // called when the Observable is subscribed
        bluetooth
          .startScanning({
            filters,
            seconds: seconds,
            onDiscovered: (peripheral: IPeripheral) => handler(peripheral),
            skipPermissionCheck: false
          })
          .then(
            res => {
              console.log('bluetooth scanning complete');
              handler(BluetoothService.SIGNAL_STOP_PERIPHERAL());
            },
            err => {
              handler(BluetoothService.SIGNAL_STOP_PERIPHERAL());
              self.attention('Problem with bluetooth startScanning', err, true);
            }
          );
      },
      function remove(handler: Function) {
        // called when the Subscription is unsubscribed
        bluetooth
          .stopScanning()
          .then(
            res => console.log('bluetooth scanning stopped'),
            err =>
              self.attention('Problem with bluetooth stopScanning', err, true)
          );
      }
    );
  }

  stopScanForPeripherals() {
    if (this.scanSubscription) {
      this.scanSubscription.unsubscribe();
      this.scanSubscription = null;
    }
    this.isScanning = false;
  }

  connectPeripheral(
    peripheralUUID: string,
    callback: (peripheral: IPeripheral) => void
  ) {
    console.log(`connectPeripheral(${peripheralUUID}) called`);
    bluetooth.connect({
      UUID: peripheralUUID,
      onConnected: (data) => {
        const peripheral: IPeripheral = {...data, RSSI: 0};
        console.log('peripheral connected: ' + this.stringify(peripheral));
        peripheral.isConnected = true;
        // Replace current peripheral in list with this newly-connected one (fully populated with service and characteristic info).
        this.addOrReplacePeripheral(peripheral);
        callback(peripheral);
      },
      onDisconnected: (peripheral: IPeripheral) => {
        // this seems to get called even when doing a bluetooth.disconnect(), after peripheral is connected
        this.attention(
          `peripheral disconnected (UUID: ${peripheral.UUID})`,
          '',
          true
        );
        this.findPeripheral(peripheral.UUID).isConnected = false;
        callback(null);
      }
    });
  }

  disconnectPeripheral(peripheralUUID: string) {
    console.log(`disconnectPeripheral(${peripheralUUID}) called`);
    const peripheral: IPeripheral = this.findPeripheral(peripheralUUID);
    if (!peripheral) {
      this.attention(
        `cannot find peripheral (UUID: ${peripheralUUID}) to disconnect`,
        '',
        true
      );
    } else if (!peripheral.isConnected) {
      console.log(
        `peripheral (UUID: ${peripheralUUID}) is not currently connected`
      );
    } else {
      console.log(`disconnecting peripheral with UUID: ${peripheralUUID}`);
      bluetooth
        .disconnect({ UUID: peripheralUUID })
        .then(
          res => console.log('peripheral disconnected'),
          err => this.attention('problem disconnecting peripheral', err, true)
        );
    }
  }

  read(characteristic: ICharacteristic) {
    const self = this;
    bluetooth
      .read({
        peripheralUUID: characteristic.serviceRef.peripheralRef.UUID,
        serviceUUID: characteristic.serviceRef.UUID,
        characteristicUUID: characteristic.UUID
      })
      .then(
        (res: ReadResult) => {
          // result.value is an ArrayBuffer. Every service has a different encoding.
          // e.g. a heartrate monitor value can be retrieved by:
          //      var data = new Uint8Array(result.value);
          //      var heartRate = data[1];
          self.zone.run(() => {
            characteristic.readResult.setFields(
              res.value,
              res.valueRaw,
              new Date()
            );
          });
          console.log(
            `read(charUUID: ${
              characteristic.UUID
            }), result JSON = ${JSON.stringify(res)}`
          );
        },
        err => {
          self.zone.run(() => {
            characteristic.readResult.setFields(
              null,
              `read() error: ${err}`,
              new Date()
            );
          });
        }
      );
  }

  dialogWrite(characteristic: ICharacteristic, value?: any) {
    if (value) {
      this.write(characteristic, value);
    } else {
      dialogs
        .prompt({
          message:
            'Enter comma-delimited value(s) to write , e.g. 0x01 or 0x007F or 0x01,0x02 or 0x007F,0x006E',
          okButtonText: 'Write it',
          cancelButtonText: 'Cancel',
          defaultText: characteristic.writeResult.value || ''
        })
        .then(response => {
          if (response.result) {
            this.write(characteristic, response.text);
          }
        });
    }
  }

  write(characteristic: ICharacteristic, value: any) {
    // According to source code at https://github.com/EddyVerbruggen/nativescript-bluetooth,
    // value must be a Uint8Array or Uint16Array or a string like '0x01' or '0x007F' or '0x01,0x02', or '0x007F,'0x006F'.
    // However, in practice it appears only strings are accepted, as get exception when using a Uint8Array.

    const self = this;
    bluetooth
      .write({
        peripheralUUID: characteristic.serviceRef.peripheralRef.UUID,
        serviceUUID: characteristic.serviceRef.UUID,
        characteristicUUID: characteristic.UUID,
        value: value
      })
      .then(
        res => {
          self.zone.run(() => {
            characteristic.writeResult.setFields(
              value,
              'value written',
              new Date()
            );
          });
          console.log(
            `write(charUUID: ${
              characteristic.UUID
            }), result JSON = ${JSON.stringify(res)}`
          );
        },
        err => {
          self.zone.run(() => {
            characteristic.writeResult.setFields(
              value,
              `write() error: ${err}`,
              new Date()
            );
          });
        }
      );
  }

  dialogWriteWithoutResponse(characteristic: ICharacteristic, value?: any) {
    if (value) {
      this.writeWithoutResponse(characteristic, value);
    } else {
      dialogs
        .prompt({
          message:
            'Enter comma-delimited value(s) to write (without response), e.g. 0x01 or 0x007F or 0x01,0x02 or 0x007F,0x006E',
          okButtonText: 'Write it',
          cancelButtonText: 'Cancel',
          defaultText: characteristic.writeWithoutResponseResult.value || ''
        })
        .then(response => {
          if (response.result) {
            this.writeWithoutResponse(characteristic, response.text);
          }
        });
    }
  }

  writeWithoutResponse(characteristic: ICharacteristic, value: any) {
    // See comments in write() concerning the "value" parameter.

    const self = this;
    bluetooth
      .writeWithoutResponse({
        peripheralUUID: characteristic.serviceRef.peripheralRef.UUID,
        serviceUUID: characteristic.serviceRef.UUID,
        characteristicUUID: characteristic.UUID,
        value: value
      })
      .then(
        res => {
          self.zone.run(() => {
            characteristic.writeWithoutResponseResult.setFields(
              value,
              'value write requested',
              new Date()
            );
          });
          console.log(
            `writeWithoutResponse(charUUID: ${
              characteristic.UUID
            }), result JSON = ${JSON.stringify(res)}`
          );
        },
        err => {
          self.zone.run(() => {
            characteristic.writeWithoutResponseResult.setFields(
              value,
              `writeWithoutResponse() error: ${err}`,
              new Date()
            );
          });
        }
      );
  }

  startNotifying(characteristic: ICharacteristic) {
    const self = this;
    bluetooth
      .startNotifying({
        peripheralUUID: characteristic.serviceRef.peripheralRef.UUID,
        serviceUUID: characteristic.serviceRef.UUID,
        characteristicUUID: characteristic.UUID,
        onNotify: (res: ReadResult) => {
          // result is same as read() method result
          self.zone.run(() => {
            characteristic.notifyResult.setFields(
              res.value,
              res.valueRaw,
              new Date()
            );
          });
          console.log(
            `onNotify callback (charUUID: ${
              characteristic.UUID
            }), result JSON = ${JSON.stringify(res)}`
          );
        }
      })
      .then(
        res => {
          self.zone.run(() => {
            characteristic.notifyResult.setFields(
              null,
              'subscribed to notifications',
              new Date()
            );
            characteristic.isNotifying = true;
          });
          console.log(
            `startNotifying(charUUID: ${
              characteristic.UUID
            }), result JSON = ${JSON.stringify(res)}`
          );
        },
        err => {
          self.zone.run(() => {
            characteristic.notifyResult.setFields(
              null,
              `startNotifying() error: ${err}`,
              new Date()
            );
          });
        }
      );
  }

  stopNotifying(characteristic: ICharacteristic) {
    const self = this;
    bluetooth
      .stopNotifying({
        peripheralUUID: characteristic.serviceRef.peripheralRef.UUID,
        serviceUUID: characteristic.serviceRef.UUID,
        characteristicUUID: characteristic.UUID
      })
      .then(
        res => {
          self.zone.run(() => {
            characteristic.notifyResult.setFields(
              characteristic.notifyResult.value,
              'unsubscribed from notifications',
              new Date()
            );
            characteristic.isNotifying = false;
          });
          console.log(
            `stopNotifying(charUUID: ${
              characteristic.UUID
            }), result JSON = ${JSON.stringify(res)}`
          );
        },
        err => {
          self.zone.run(() => {
            characteristic.notifyResult.setFields(
              null,
              `stopNotifying() error: ${err}`,
              new Date()
            );
          });
        }
      );
  }

  toggleNotifying(characteristic: ICharacteristic) {
    if (characteristic.isNotifying) {
      this.stopNotifying(characteristic);
    } else {
      this.startNotifying(characteristic);
    }
  }

  protected attention(msg: string, error: any, showAlert?: boolean) {
    const fullMsg: string = msg + (error && ': ' + JSON.stringify(error));
    console.log(fullMsg);
    if (showAlert) {
      alert({
        title: error ? 'Error occurred' : null,
        message: fullMsg,
        okButtonText: 'OK'
      });
    }
  }
}
