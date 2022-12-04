import { ActionBarComponent } from './components/actionBar.component/actionBar.component';
import { ScanComponent } from './components/scan.component/scan.component';
import { PeripheralListComponent } from './components/peripheralList.component/peripheralList.component';
import { SvcListComponent } from './components/svcList.component/svcList.component';
import { CharacteristicListComponent } from './components/characteristicList.component/characteristicList.component';

export const routes = [
    { path: '', component: ScanComponent },
    { path: 'services', component: SvcListComponent },
    { path: 'services/:uuid', component: SvcListComponent },
    { path: 'services/:uuid/characteristics/:idx', component: CharacteristicListComponent }
];

export const navigatableComponents = [
    ActionBarComponent,
    ScanComponent,
    PeripheralListComponent,
    SvcListComponent,
    CharacteristicListComponent
];
