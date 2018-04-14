import { Page } from "tns-core-modules/ui/page";
import { ServicesViewModel } from "./services-page-view-model";

export function pageLoaded(args) {
  const page = args.object as Page;

  // might as well not load the rest of the page in this case (nav back)
  if (page.navigationContext === undefined) {
    return;
  }

  page.bindingContext = new ServicesViewModel(page.navigationContext);
}
