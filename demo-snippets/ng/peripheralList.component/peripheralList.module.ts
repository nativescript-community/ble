import { NO_ERRORS_SCHEMA, NgModule } from '@angular/core';
import { NativeScriptCommonModule } from '@nativescript/angular';
import { PeripheralListComponent } from './peripheralList.component';

@NgModule({
    declarations: [PeripheralListComponent],
    imports: [NativeScriptCommonModule],
    schemas: [NO_ERRORS_SCHEMA]
})
export class PeripheralListModule {}
