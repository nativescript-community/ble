import { ActionBarComponent } from './actionBar.component/actionBar.component';
import { ScanComponent } from './scan.component/scan.component';
import { PeripheralListComponent } from './peripheralList.component/peripheralList.component';
import { SvcListComponent } from './svcList.component/svcList.component';
import { CharacteristicListComponent } from './characteristicList.component/characteristicList.component';

export const routes = [
    { path: '', component: ScanComponent },
    { path: 'services', component: SvcListComponent },
    { path: 'services/:uuid', component: SvcListComponent },
    { path: 'services/:uuid/characteristics/:idx', component: CharacteristicListComponent }
];

export const navigatableComponents = [ActionBarComponent, ScanComponent, PeripheralListComponent, SvcListComponent, CharacteristicListComponent];
