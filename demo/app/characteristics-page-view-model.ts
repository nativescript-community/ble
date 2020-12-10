import * as dialogs from '@nativescript/core/ui/dialogs';
import { Observable } from '@nativescript/core/data/observable';
import { Bluetooth, Peripheral, ReadResult, Service, getBluetoothInstance } from '@nativescript-community/ble';
import { Prop } from './utils/obs-prop';

export class CharacteristicsViewModel extends Observable {
    @Prop() public peripheral: Peripheral;
    @Prop() public service: Service;

    private _bluetooth = getBluetoothInstance();

    constructor(navContext) {
        super();
        this.service = navContext.service;
        this.peripheral = navContext.peripheral;
    }

    public onCharacteristicTap(args) {
        const page = args.object;
        const context = page.bindingContext;
        const service = context.service;
        const characteristic = service.characteristics[args.index];
        console.log('char clicked', args.index, service, characteristic);

        // show an actionsheet which contains the most relevant possible options
        const p = characteristic.properties;
        const actions = [];

        if (p.read) actions.push('read');
        if (p.write) actions.push('write');
        if (p.write) actions.push('write 1'); // convenience method, will write hex 1, translated to a binary 1
        if (p.write) actions.push('write arraybuffer');
        if (p.writeWithoutResponse) actions.push('writeWithoutResponse');
        if (p.notify) actions.push('notify start');
        if (p.notify) actions.push('notify stop');

        dialogs
            .action({
                message: 'Pick a property',
                cancelButtonText: 'Cancel',
                actions
            })
            .then(result => {
                console.log(result);
                if (result === 'read') {
                    this._bluetooth
                        .read({
                            peripheralUUID: context.peripheral.UUID,
                            serviceUUID: service.UUID,
                            characteristicUUID: characteristic.UUID
                        })
                        .then(
                            (result: ReadResult) => {
                                // result.value is an ArrayBuffer. Every service has a different encoding.
                                // fi. a heartrate monitor value can be retrieved by:
                                //   var data = new Uint8Array(result.value);
                                //   var heartRate = data[1];
                                context.set('feedback', result.value);
                                context.set('feedbackRaw', result.ios || result.android);
                                context.set('feedbackTimestamp', this._getTimestamp());
                            },
                            error => {
                                context.set('feedback', error);
                                context.set('feedbackTimestamp', this._getTimestamp());
                            }
                        );
                } else if (result === 'write') {
                    dialogs
                        .prompt({
                            title: 'Write what exactly?',
                            message: 'Please enter string value to send',
                            cancelButtonText: 'Cancel',
                            okButtonText: 'Write it!'
                        })
                        .then(response => {
                            if (response.result) {
                                this._bluetooth
                                    .write({
                                        peripheralUUID: context.peripheral.UUID,
                                        serviceUUID: service.UUID,
                                        characteristicUUID: characteristic.UUID,
                                        value: response.text
                                    })
                                    .then(
                                        result => {
                                            context.set('feedback', 'value written');
                                            context.set('feedbackTimestamp', this._getTimestamp());
                                        },
                                        errorMsg => {
                                            context.set('feedback', errorMsg);
                                            context.set('feedbackTimestamp', this._getTimestamp());
                                        }
                                    );
                            }
                        });
                } else if (result === 'write 1') {
                    this._bluetooth
                        .write({
                            peripheralUUID: context.peripheral.UUID,
                            serviceUUID: service.UUID,
                            characteristicUUID: characteristic.UUID,
                            value: 1
                        })
                        .then(
                            result => {
                                context.set('feedback', 'value written');
                                context.set('feedbackTimestamp', this._getTimestamp());
                            },
                            errorMsg => {
                                context.set('feedback', errorMsg);
                                context.set('feedbackTimestamp', this._getTimestamp());
                            }
                        );
                } else if (result === 'write arraybuffer') {
                    console.log('about to write ArrayBuffer');
                    const bufView = new Uint8Array([97, 114, 114, 97, 121, 98, 117, 102, 102, 101, 114]); // str = arraybuffer
                    this._bluetooth
                        .write({
                            peripheralUUID: context.peripheral.UUID,
                            serviceUUID: service.UUID,
                            characteristicUUID: characteristic.UUID,
                            value: bufView.buffer
                        })
                        .then(
                            result => {
                                context.set('feedback', 'value written');
                                context.set('feedbackTimestamp', this._getTimestamp());
                            },
                            errorMsg => {
                                context.set('feedback', errorMsg);
                                context.set('feedbackTimestamp', this._getTimestamp());
                            }
                        );
                } else if (result === 'writeWithoutResponse') {
                    dialogs
                        .prompt({
                            title: 'Write what exactly?',
                            message: 'Please enter string value',
                            cancelButtonText: 'Cancel',
                            okButtonText: 'Write it!'
                        })
                        .then(response => {
                            if (response.result) {
                                this._bluetooth
                                    .writeWithoutResponse({
                                        peripheralUUID: context.peripheral.UUID,
                                        serviceUUID: service.UUID,
                                        characteristicUUID: characteristic.UUID,
                                        value: response.text
                                    })
                                    .then(result => {
                                        context.set('feedback', 'value write requested');
                                        context.set('feedbackTimestamp', this._getTimestamp());
                                    });
                            }
                        });
                } else if (result === 'notify start') {
                    this._bluetooth
                        .startNotifying({
                            peripheralUUID: context.peripheral.UUID,
                            serviceUUID: service.UUID,
                            characteristicUUID: characteristic.UUID,
                            onNotify: result => {
                                const array = new Uint8Array(result.value);
                                const strVal = String.fromCharCode.apply(null, array);
                                console.log('on notify value', result, array, strVal);
                                // result.value is an ArrayBuffer. Every service has a different encoding.
                                // fi. a heartrate monitor value can be retrieved by:
                                //   var data = new Uint8Array(result.value);
                                //   var heartRate = data[1];
                                context.set('feedback', strVal);
                                context.set('feedbackRaw', Array.prototype.slice.call(array));
                                context.set('feedbackTimestamp', this._getTimestamp());
                            }
                        })
                        .then(result => {
                            context.set('feedback', 'subscribed for notifications');
                            context.set('feedbackTimestamp', this._getTimestamp());
                        });
                } else if (result === 'notify stop') {
                    this._bluetooth
                        .stopNotifying({
                            peripheralUUID: context.peripheral.UUID,
                            serviceUUID: service.UUID,
                            characteristicUUID: characteristic.UUID
                        })
                        .then(
                            result => {
                                context.set('feedback', 'notification stopped');
                                context.set('feedbackTimestamp', this._getTimestamp());
                            },
                            error => {
                                context.set('feedback', error);
                            }
                        );
                }
            });
    }

    private _getTimestamp() {
        return new Date().toLocaleString();
    }
}
