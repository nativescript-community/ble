import { CharacteristicsViewModel } from './characteristics-page-view-model';

export function pageLoaded(args) {
    const page = args.object;
    const data = {
        peripheral: page.navigationContext.peripheral,
        service: page.navigationContext.service
    };
    page.bindingContext = new CharacteristicsViewModel(data);
}
