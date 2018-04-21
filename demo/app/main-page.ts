import { DemoAppModel } from "./main-view-model";

export function pageLoaded(args) {
  var page = args.object;
  page.bindingContext = new DemoAppModel();
}
