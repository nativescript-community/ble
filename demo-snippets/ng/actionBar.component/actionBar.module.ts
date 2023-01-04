import { NO_ERRORS_SCHEMA, NgModule } from '@angular/core';
import { NativeScriptCommonModule } from '@nativescript/angular';
import { ActionBarComponent } from './actionBar.component';

@NgModule({
    declarations: [ActionBarComponent],
    imports: [NativeScriptCommonModule],
    schemas: [NO_ERRORS_SCHEMA]
})
export class ActionBarModule {}
