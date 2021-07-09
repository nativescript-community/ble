
import * as app from '@nativescript/core/application';
import { BleTraceCategory } from '@nativescript-community/ble/bluetooth.common';
import { Trace } from '@nativescript/core';
Trace.addCategories(BleTraceCategory);
Trace.enable();
app.run({ moduleName: 'app-root' });
