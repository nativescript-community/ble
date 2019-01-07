import { Component } from '@angular/core';
import { Page } from 'ui/page';

import { BluetoothService } from '../../services/bluetooth.service';
import { IPeripheral } from '../../services/bluetooth.service';

@Component({
    selector: 'ble-scan',
    templateUrl: 'components/scan.component/scan.component.html',
})
export class ScanComponent {

    constructor(
        private page: Page,
        public bluetoothService: BluetoothService) {
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
