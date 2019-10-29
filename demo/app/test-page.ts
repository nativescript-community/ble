import { Page } from 'tns-core-modules/ui/page';
import { TestViewModel } from './test-page-model';

export function pageLoaded(args) {
    const page = args.object as Page;
    console.log('test page laoded', page.bindingContext);

    // might as well not load the rest of the page in this case (nav back)
    if (page.navigationContext === undefined) {
        return;
    }
    if (! page.bindingContext) {
        page.bindingContext = new TestViewModel(page.navigationContext);
    }
}
