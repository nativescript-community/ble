import { NO_ERRORS_SCHEMA, NgModule } from '@angular/core';
import { NativeScriptCommonModule } from '@nativescript/angular';
import { CharacteristicListComponent } from './characteristicList.component';

@NgModule({
    declarations: [CharacteristicListComponent],
    imports: [NativeScriptCommonModule],
    schemas: [NO_ERRORS_SCHEMA]
})
export class CharacteristicListModule {}
