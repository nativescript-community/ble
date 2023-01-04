import { NO_ERRORS_SCHEMA, NgModule } from '@angular/core';
import { NativeScriptCommonModule } from '@nativescript/angular';
import { SvcListComponent } from './svcList.component';

@NgModule({
    declarations: [SvcListComponent],
    imports: [NativeScriptCommonModule],
    schemas: [NO_ERRORS_SCHEMA]
})
export class SvcListModule {}
