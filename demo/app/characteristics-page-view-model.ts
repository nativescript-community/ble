import * as dialogs from 'tns-core-modules/ui/dialogs';
import { Observable } from 'tns-core-modules/data/observable';
import { Bluetooth, getBluetoothInstance, Peripheral, Service } from 'nativescript-bluetooth';
import { Prop } from './utils/obs-prop';

export class CharacteristicsViewModel extends Observable {
    @Prop() public peripheral: Peripheral;
    @Prop() public service: Service;

    private _bluetooth = getBluetoothInstance();

    constructor(navContext) {
        super();
        this.service = navContext.service;
        this.peripheral = navContext.peripheral;
        this._bluetooth.debug = true;
    }

    public onCharacteristicTap(args) {
        const page = args.object;
        const service = page.bindingContext;
        const characteristic = service.characteristics[args.index];

        // show an actionsheet which contains the most relevant possible options
        const p = characteristic.properties;
        const actions = [];

        if (p.read) actions.push('read');
        if (p.write) actions.push('write');
        if (p.write) actions.push('write 0x01'); // convenience method, will write hex 1, translated to a binary 1
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
                if (result === 'read') {
                    this._bluetooth
                        .read({
                            peripheralUUID: service.peripheral.UUID,
                            serviceUUID: service.UUID,
                            characteristicUUID: characteristic.UUID
                        })
                        .then(
                            result => {
                                // result.value is an ArrayBuffer. Every service has a different encoding.
                                // fi. a heartrate monitor value can be retrieved by:
                                //   var data = new Uint8Array(result.value);
                                //   var heartRate = data[1];
                                service.set('feedback', result.value);
                                service.set('feedbackRaw', result.valueRaw);
                                service.set('feedbackTimestamp', this._getTimestamp());
                            },
                            error => {
                                service.set('feedback', error);
                                service.set('feedbackTimestamp', this._getTimestamp());
                            }
                        );
                } else if (result === 'write') {
                    dialogs
                        .prompt({
                            title: 'Write what exactly?',
                            message: 'Please enter byte values; use 0x in front for hex and send multiple bytes by adding commas. For example 0x01 or 0x007F,0x006E',
                            cancelButtonText: 'Cancel',
                            okButtonText: 'Write it!'
                        })
                        .then(response => {
                            if (response.result) {
                                this._bluetooth
                                    .write({
                                        peripheralUUID: service.peripheral.UUID,
                                        serviceUUID: service.UUID,
                                        characteristicUUID: characteristic.UUID,
                                        value: response.text
                                    })
                                    .then(
                                        result => {
                                            service.set('feedback', 'value written');
                                            service.set('feedbackTimestamp', this._getTimestamp());
                                        },
                                        errorMsg => {
                                            service.set('feedback', errorMsg);
                                            service.set('feedbackTimestamp', this._getTimestamp());
                                        }
                                    );
                            }
                        });
                } else if (result === 'write 0x01') {
                    this._bluetooth
                        .write({
                            peripheralUUID: service.peripheral.UUID,
                            serviceUUID: service.UUID,
                            characteristicUUID: characteristic.UUID,
                            value: '0x01'
                        })
                        .then(
                            result => {
                                service.set('feedback', 'value written');
                                service.set('feedbackTimestamp', this._getTimestamp());
                            },
                            errorMsg => {
                                service.set('feedback', errorMsg);
                                service.set('feedbackTimestamp', this._getTimestamp());
                            }
                        );
                } else if (result === 'writeWithoutResponse') {
                    dialogs
                        .prompt({
                            title: 'Write what exactly?',
                            message: 'Please enter byte values; use 0x in front for hex and send multiple bytes by adding commas. For example 0x01 or 0x007F,0x006E',
                            cancelButtonText: 'Cancel',
                            okButtonText: 'Write it!'
                        })
                        .then(response => {
                            if (response.result) {
                                this._bluetooth
                                    .writeWithoutResponse({
                                        peripheralUUID: service.peripheral.UUID,
                                        serviceUUID: service.UUID,
                                        characteristicUUID: characteristic.UUID,
                                        value: response.text
                                    })
                                    .then(result => {
                                        service.set('feedback', 'value write requested');
                                        service.set('feedbackTimestamp', this._getTimestamp());
                                    });
                            }
                        });
                } else if (result === 'notify start') {
                    this._bluetooth
                        .startNotifying({
                            peripheralUUID: service.peripheral.UUID,
                            serviceUUID: service.UUID,
                            characteristicUUID: characteristic.UUID,
                            onNotify: result => {
                                // result.value is an ArrayBuffer. Every service has a different encoding.
                                // fi. a heartrate monitor value can be retrieved by:
                                //   var data = new Uint8Array(result.value);
                                //   var heartRate = data[1];
                                service.set('feedback', result.value);
                                service.set('feedbackRaw', result.valueRaw);
                                service.set('feedbackTimestamp', this._getTimestamp());
                            }
                        })
                        .then(result => {
                            service.set('feedback', 'subscribed for notifications');
                            service.set('feedbackTimestamp', this._getTimestamp());
                        });
                } else if (result === 'notify stop') {
                    this._bluetooth
                        .stopNotifying({
                            peripheralUUID: service.peripheral.UUID,
                            serviceUUID: service.UUID,
                            characteristicUUID: characteristic.UUID
                        })
                        .then(
                            result => {
                                service.set('feedback', 'notification stopped');
                                service.set('feedbackTimestamp', this._getTimestamp());
                            },
                            error => {
                                service.set('feedback', error);
                            }
                        );
                }
            });
    }

    private _getTimestamp() {
        return new Date().toLocaleString();
    }
}
