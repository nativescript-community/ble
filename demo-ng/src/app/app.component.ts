import { Component } from '@angular/core';

import { BleTraceCategory } from '@nativescript-community/ble/bluetooth.common';
import { Trace } from '@nativescript/core';
Trace.addCategories(BleTraceCategory);
Trace.enable();

@Component({
    selector: 'App',
    template: '<page-router-outlet></page-router-outlet>',
})
export class AppComponent { }
