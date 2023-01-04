import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';

import { BluetoothService, ICharacteristic, IPeripheral, IService } from '../services/bluetooth.service';

@Component({
    selector: 'ble-service-characteristics',
    templateUrl: 'characteristicList.component.html'
})
export class CharacteristicListComponent implements OnInit {
    peripheralUUID: string;
    peripheral: IPeripheral;
    serviceIndex: number;
    service: IService;

    constructor(private activatedRoute: ActivatedRoute, private bluetoothService: BluetoothService) {
        console.log('Creating CharacteristicListComponent');
    }

    ngOnInit() {
        console.log('CharacteristicListComponent ngOnInit() called');
        this.activatedRoute.params.forEach((params: Params) => {
            this.peripheralUUID = params['uuid'];
            this.serviceIndex = +params['idx']; // the '+' converts it to a number
            console.log(`CharacteristicListComponent ngOnInit(), uuid: ${this.peripheralUUID}, idx: ${this.serviceIndex}`);
        });
        this.peripheral = this.bluetoothService.findPeripheral(this.peripheralUUID);
        this.service = this.peripheral.services[this.serviceIndex];
        console.log(`CharacteristicListComponent ngOnInit(), svc uuid: ${this.service.UUID}, svc name: ${this.service.name}`);
    }

    onCharacteristicTap(char: ICharacteristic) {
        // console.log(`characteristic tapped (uuid: ${char.UUID})`);
        char.isExpandedView = !char.isExpandedView;
    }

    doRead(char: ICharacteristic) {
        // console.log(`doRead() for characteristic: ${this.bluetoothService.stringify(char)}`);
        this.bluetoothService.read(char);
        // console.log("end of doRead()");
    }

    doWrite(char: ICharacteristic) {
        console.log(`doWrite() for characteristic: ${this.bluetoothService.stringify(char)}`);
        this.bluetoothService.dialogWrite(char);
        console.log('end of doWrite()');
    }

    doWriteWithoutResponse(char: ICharacteristic) {
        console.log(`doWriteWithoutResponse() for characteristic: ${this.bluetoothService.stringify(char)}`);
        this.bluetoothService.dialogWriteWithoutResponse(char);
        console.log('end of doWriteWithoutResponse()');
    }

    doNotify(char: ICharacteristic) {
        console.log(`doNotify() for characteristic: ${this.bluetoothService.stringify(char)}`);
        this.bluetoothService.toggleNotifying(char);
        console.log('end of doNotify()');
    }
}
