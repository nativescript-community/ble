import { BleTraceCategory } from '@nativescript-community/ble';
import { PermsTraceCategory } from '@nativescript-community/perms';
import { Application, Trace } from '@nativescript/core';
Trace.addCategories(BleTraceCategory);
Trace.addCategories(PermsTraceCategory);
Trace.enable();
Application.run({ moduleName: 'app-root' });
