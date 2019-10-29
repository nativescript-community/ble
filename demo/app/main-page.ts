import { DemoAppModel } from './main-view-model';

export function pageLoaded(args) {
    const page = args.object;
    page.bindingContext = new DemoAppModel();
}

export function onPeripheralTestTap(args) {
    if (args && args.ios && args.ios.state !== 3) {
        return;
    }
    console.log('!!&&&&***** Long press item with index ', args.object.bindingContext);
    args.object.page.bindingContext.onPeripheralTestTap(args.object.bindingContext);
}