import * as blenoTypings from 'bleno';

let bleno: typeof blenoTypings;
if (/^darwin/.test(process.platform)) {
    bleno = require('bleno-mac');
} else {
    bleno = require('bleno');
}

// let BlenoPrimaryService = bleno.PrimaryService;

class EchoCharacteristic extends bleno.Characteristic {
    _value: Buffer;
    _updateValueCallback?: Function;
    constructor() {
        super({
            uuid: 'ec0e',
            properties: ['read', 'write', 'notify'],
            value: null
        });
        this._value = new Buffer(0);
        this._updateValueCallback = null;
    }

    onReadRequest(offset, callback) {
        console.log('EchoCharacteristic - onReadRequest: value = ' + this._value.toString('hex'));

        callback(this.RESULT_SUCCESS, this._value);
    }

    onWriteRequest(data, offset, withoutResponse, callback) {
        this._value = data;

        console.log('EchoCharacteristic - onWriteRequest: value = ' + this._value.toString('hex'));

        if (this._updateValueCallback) {
            console.log('EchoCharacteristic - onWriteRequest: notifying');

            this._updateValueCallback(this._value);
        }

        callback(this.RESULT_SUCCESS);
    }

    onSubscribe(maxValueSize, updateValueCallback) {
        console.log('EchoCharacteristic - onSubscribe');

        this._updateValueCallback = updateValueCallback;
    }

    onUnsubscribe() {
        console.log('EchoCharacteristic - onUnsubscribe');

        this._updateValueCallback = null;
    }
}

console.log('bleno - echo');


bleno.on('advertisingStartError', function(error) {
    console.log('on -> advertisingStartError: ' + (error ? 'error ' + error : 'success'));
});
bleno.on('advertisingStart', function(error) {
    console.log('on -> advertisingStart: ' + (error ? 'error ' + error : 'success'));

    if (!error) {
        bleno.setServices([
            new bleno.PrimaryService({
                uuid: 'ec00',
                characteristics: [new EchoCharacteristic()]
            })
        ]);
    }
});
bleno.on('stateChange', function(state) {
    console.log('on -> stateChange: ' + state);

    if (state === 'poweredOn') {
        console.log('startAdvertising: ' + state);
        bleno.startAdvertising('echo', ['ec00']);
    } else {
        bleno.stopAdvertising();
    }
});
