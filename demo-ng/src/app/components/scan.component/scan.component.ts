import { Component } from '@angular/core';

import { BluetoothService } from '../../services/bluetooth.service';
import { IPeripheral } from '../../services/bluetooth.service';

@Component({
    selector: 'ble-scan',
    templateUrl: 'scan.component.html',
})
export class ScanComponent {

    constructor(
        public bluetoothService: BluetoothService) {
        console.log('Creating ScanComponent');
        // page.actionBarHidden = true;
    }

    doIsBluetoothEnabled() {
        this.bluetoothService.checkBluetoothEnabled();
    }

    doStartScanning(serviceUUIDs?: string[], seconds?: number) {
        this.bluetoothService.scanForPeripherals(serviceUUIDs, seconds);
    }

    doStopScanning() {
        this.bluetoothService.stopScanForPeripherals();
    }
}
