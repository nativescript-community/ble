import { Component } from '@angular/core';
import { Page } from '@nativescript/core';

import { BluetoothService } from '../services/bluetooth.service';

@Component({
    selector: 'ble-scan',
    templateUrl: 'scan.component.html',
    moduleId: module.id
})
export class ScanComponent {
    constructor(private page: Page, public bluetoothService: BluetoothService) {
        console.log('Creating ScanComponent');
        page.actionBarHidden = true;
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
