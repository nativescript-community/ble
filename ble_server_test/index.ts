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
        this._value = Buffer.alloc(0);
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

function createAdvertisementData(_data): any[] {
    console.log('createData: ' + JSON.stringify(_data, null, 2));

    let advertisementDataLength = 3;
    let scanDataLength = 0;

    const serviceUuids16bit = [];
    const serviceUuids128bit = [];
    let i = 0;

    if (_data.name && _data.name.length) {
        scanDataLength += 2 + _data.name.length;
    }
    if (_data.manufacturerData && _data.manufacturerData) {
        scanDataLength += 2 + _data.manufacturerData.length;
    }

    if (_data.services && _data.services.length) {
        for (i = 0; i < _data.services.length; i++) {
            const serviceUuid = Buffer.from(
                _data.services[i]
                    .replace(/-/g, '')
                    .match(/.{1,2}/g)
                    .reverse()
                    .join(''),
                'hex'
            );

            if (serviceUuid.length === 2) {
                serviceUuids16bit.push(serviceUuid);
            } else if (serviceUuid.length === 16) {
                serviceUuids128bit.push(serviceUuid);
            }
        }
    }

    if (serviceUuids16bit.length) {
        advertisementDataLength += 2 + 2 * serviceUuids16bit.length;
    }

    if (serviceUuids128bit.length) {
        advertisementDataLength += 2 + 16 * serviceUuids128bit.length;
    }

    const advertisementData = Buffer.alloc(advertisementDataLength);
    const scanData = Buffer.alloc(scanDataLength);

    // flags
    advertisementData.writeUInt8(2, 0);
    advertisementData.writeUInt8(0x01, 1);
    advertisementData.writeUInt8(0x06, 2);

    let advertisementDataOffset = 3;

    if (serviceUuids16bit.length) {
        advertisementData.writeUInt8(1 + 2 * serviceUuids16bit.length, advertisementDataOffset);
        advertisementDataOffset++;

        advertisementData.writeUInt8(0x03, advertisementDataOffset);
        advertisementDataOffset++;

        for (i = 0; i < serviceUuids16bit.length; i++) {
            serviceUuids16bit[i].copy(advertisementData, advertisementDataOffset);
            advertisementDataOffset += serviceUuids16bit[i].length;
        }
    }

    if (serviceUuids128bit.length) {
        advertisementData.writeUInt8(1 + 16 * serviceUuids128bit.length, advertisementDataOffset);
        advertisementDataOffset++;

        advertisementData.writeUInt8(0x06, advertisementDataOffset);
        advertisementDataOffset++;

        for (i = 0; i < serviceUuids128bit.length; i++) {
            serviceUuids128bit[i].copy(advertisementData, advertisementDataOffset);
            advertisementDataOffset += serviceUuids128bit[i].length;
        }
    }

    let scanDataOffset = 0;
    let nameBuffer;
    // name
    if (_data.name && _data.name.length) {
        nameBuffer = Buffer.from(_data.name);

        scanData.writeUInt8(1 + nameBuffer.length, scanDataOffset++);
        scanData.writeUInt8(0x08, scanDataOffset++);
        nameBuffer.copy(scanData, scanDataOffset);
        scanDataOffset += nameBuffer.length;
    }
    // manufacturer
    if (_data.manufacturerData) {
        nameBuffer = Buffer.from(_data.manufacturerData);
        scanData.writeUInt8(1 + nameBuffer.length, scanDataOffset++);
        scanData.writeUInt8(0xff, scanDataOffset++);
        nameBuffer.copy(scanData, scanDataOffset);
        scanDataOffset += nameBuffer.length;
    }

    return [advertisementData, scanData];
}
function numberToArray(_number) {
    const result = [];
    let str = _number.toString(16);
    if (str.length % 2 === 1) {
        str = '0' + str;
    }
    for (let i = 0; i < str.length; i += 2) {
        result.push(parseInt('0x' + str.substr(i, 2), 16));
    }
    return result;
}

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
        const name = 'MacOs glasses';
        const advertisement = createAdvertisementData({
            name,
            manufacturerData: numberToArray(56058)
        });

        // if (bleno.startAdvertisingWithEIRData) {
        //     bleno.startAdvertisingWithEIRData(advertisement[0], advertisement[1]);
        // } else {
            bleno.startAdvertising(name);
        // }
    } else {
        bleno.stopAdvertising();
    }
});
