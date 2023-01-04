import { Component, OnInit, NgZone } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { RouterExtensions } from 'nativescript-angular/router';

import { BluetoothService } from '../../services/bluetooth.service';
import { IPeripheral } from '../../services/bluetooth.service';

@Component({
    selector: 'ble-service-list',
    templateUrl: 'svcList.component.html',
})
export class SvcListComponent implements OnInit {

    peripheralUUID: string;
    peripheral: IPeripheral;
    isConnecting = false;

    constructor(
        private activatedRoute: ActivatedRoute,
        private routerExtensions: RouterExtensions,
        private bluetoothService: BluetoothService,
        private zone: NgZone) {
        console.log('Creating SvcListComponent');
    }

    ngOnInit() {
        console.log('SvcListComponent ngOnInit() called');
        this.activatedRoute.params.forEach( (params: Params) => {
            this.peripheralUUID = params['uuid'];
            console.log(`SvcListComponent ngOnInit(), uuid: ${this.peripheralUUID}`);
        });
        this.setPeripheral(this.bluetoothService.findPeripheral(this.peripheralUUID));
        if (!this.peripheral.isConnected) {
            this.doConnectPeripheral();
        }
    }

    private setPeripheral(peripheral?: IPeripheral) {
        this.peripheral = peripheral || BluetoothService.getEmptyPeripheral(this.peripheralUUID, '(name)' + this.peripheralUUID);
    }

    doConnectPeripheral() {
        this.isConnecting = true;
        const self = this;
        this.bluetoothService.connectPeripheral(this.peripheralUUID,
            (periph: IPeripheral) => {
                console.log('SvcListComponent doConnectPeripheral callback: ' + self.bluetoothService.stringify(periph));
                self.zone.run( () => {
                    if (periph) {
                        self.setPeripheral(periph);
                    }
                    self.isConnecting = false;
                });
        });
    }

    doDisconnectPeripheral() {
        this.bluetoothService.disconnectPeripheral(this.peripheralUUID);
        this.isConnecting = false;
    }

    onServiceTap(args: any) {
        console.log(`service tapped (index: ${args.index})`);
        this.routerExtensions.navigate(['/services', this.peripheral.UUID, 'characteristics', args.index]);
    }
}
