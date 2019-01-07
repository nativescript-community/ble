import { Component, Input } from '@angular/core';

import { IPeripheral } from '../../services/bluetooth.service';

@Component({
    selector: 'action-bar-template',
    templateUrl: 'components/actionBar.component/actionBar.component.html',
})
export class ActionBarComponent {

    @Input() actionBarTitle: string;
    @Input() currentPeripheral: IPeripheral;

    constructor() {
        console.log('Creating ActionBarComponent');
    }
}
