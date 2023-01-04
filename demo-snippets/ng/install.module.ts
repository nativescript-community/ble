import { NO_ERRORS_SCHEMA, NgModule } from '@angular/core';
import { navigatableComponents } from './app.routing';

import { ActionBarComponent } from './actionBar.component/actionBar.component';
import { ScanComponent } from './scan.component/scan.component';
import { CharacteristicListComponent } from './characteristicList.component/characteristicList.component';
import { PeripheralListComponent } from './peripheralList.component/peripheralList.component';
import { SvcListComponent } from './svcList.component/svcList.component';
import { ScanModule } from './scan.component/scan.module';
import { BluetoothService } from './services/bluetooth.service';
import { PeripheralListModule } from './peripheralList.component/peripheralList.module';
import { CharacteristicListModule } from './characteristicList.component/characteristicList.module';
import { SvcListModule } from './svcList.component/svcList.module';
import { ActionBarModule } from './actionBar.component/actionBar.module';

export const COMPONENTS = [];
@NgModule({
    imports: [ScanModule, PeripheralListModule, CharacteristicListModule, SvcListModule, ActionBarModule],
    providers: [BluetoothService],
    schemas: [NO_ERRORS_SCHEMA]
})
export class InstallModule {}

export function installPlugin() {}

export const demos = [{ name: 'Basic', path: 'Basic', component: ScanModule }];
