// this import should be first in order to load some required settings (like globals and reflect-metadata)
import { platformNativeScriptDynamic } from 'nativescript-angular/platform';

import { AppModule } from './app.module';

platformNativeScriptDynamic().bootstrapModule(AppModule);


// // this import should be first in order to load some required settings (like globals and reflect-metadata)
// import { platformNativeScriptDynamic, NativeScriptModule } from "nativescript-angular/platform";
// import { NgModule } from "@angular/core";
// import { NativeScriptRouterModule} from "nativescript-angular/router";

// import { AppComponent } from "./app.component";
// import { routes, navigatableComponents } from "./app.routing";
// import { BluetoothService } from "./services/bluetooth.service";

// @NgModule({
//     imports: [
//         NativeScriptModule,
//         NativeScriptRouterModule,
//         NativeScriptRouterModule.forRoot(routes)
//     ],
//     declarations: [
//         AppComponent,
//         ...navigatableComponents
//     ],
//     providers: [
//         BluetoothService
//     ],
//     bootstrap: [AppComponent]
// })
// export class AppComponentModule {}  //AppModule

// platformNativeScriptDynamic().bootstrapModule(AppComponentModule);
