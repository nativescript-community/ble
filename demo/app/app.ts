import { BleTraceCategory } from '@nativescript-community/ble';
import { Application, Trace } from '@nativescript/core';
Trace.addCategories(BleTraceCategory);
Trace.enable();
Application.run({ moduleName: 'app-root' });
