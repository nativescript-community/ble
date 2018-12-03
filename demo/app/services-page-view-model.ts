import * as dialogs from 'tns-core-modules/ui/dialogs';
import { topmost } from 'tns-core-modules/ui/frame';
import { ObservableArray } from 'tns-core-modules/data/observable-array';
import { fromObject, Observable } from 'tns-core-modules/data/observable';
import { AdvertismentData, Bluetooth, Peripheral, Service } from 'nativescript-akylas-bluetooth';
import { Prop } from './utils/obs-prop';

const companyIdentifier = require('./companyIdentifiers.json');

export class ServicesViewModel extends Observable {
    @Prop() public discoveredServices = new ObservableArray<Service>();
    @Prop() public isLoading = false;
    @Prop() public connected = false;
    @Prop() public peripheral: Peripheral;
    @Prop() public advertismentData: AdvertismentData;
    @Prop() public companyIdentifier = companyIdentifier;

    private _bluetooth = new Bluetooth();

    constructor(navContext) {
        super();
        this._bluetooth.debug = true;
        this.peripheral = navContext.peripheral;
        this.advertismentData = navContext.peripheral.advertismentData as AdvertismentData;
        console.log('peripheral', JSON.stringify(this.peripheral));
        console.log('advertismentData', JSON.stringify(this.advertismentData));
        console.log('manufacturerId', this.advertismentData.manufacturerId, companyIdentifier[this.advertismentData.manufacturerId]);
        // console.log('localName', this.advertismentData.localName);
        // console.log('serviceUUIDs', this.advertismentData.serviceUUIDs);
        // console.log('txPowerLevel', this.advertismentData.txPowerLevel);
        // console.log('flags', this.advertismentData.flags);
        // console.log('manufacturerId', this.advertismentData.manufacturerId);
        // console.log('manufacturerData', this.advertismentData.manufacturerData);
        // console.log('serviceData', this.advertismentData.serviceData);
    }

    public connect() {
        console.log('connecting to peripheral', this.peripheral.UUID);
        this.isLoading = true;
        this._bluetooth.connect({
            UUID: this.peripheral.UUID,
            // NOTE: we could just use the promise as this cb is only invoked once
            onConnected: peripheral => {
                this.connected = true;
                console.log('------- Peripheral connected: ' + JSON.stringify(peripheral));
                peripheral.services.forEach(value => {
                    console.log('---- ###### adding service: ' + value.UUID);
                    this.discoveredServices.push(value);
                });
                this.isLoading = false;
            },
            onDisconnected: peripheral => {
                this.connected = false;
                dialogs.alert({
                    title: 'Disconnected',
                    message: 'Disconnected from peripheral: ' + JSON.stringify(peripheral),
                    okButtonText: 'Okay'
                });
            }
        });
    }

    public onServiceTap(args) {
        const service = this.discoveredServices.getItem(args.index);
        console.log('--- service selected: ' + service.UUID);

        const navigationEntry = {
            moduleName: 'characteristics-page',
            context: {
                peripheral: this.peripheral,
                service
            },
            animated: true
        };

        topmost().navigate(navigationEntry);
    }

    public onConnectTap(args) {
        if (!this.connected) {
            this.connect();
            return;
        }
        console.log('Disconnecting peripheral ' + this.peripheral.UUID);
        this._bluetooth.disconnect({
            UUID: this.peripheral.UUID
        });
        // .then(
        //     () => {
        //         // going back to previous page
        //         topmost().navigate({
        //             moduleName: 'main-page',
        //             animated: true,
        //             transition: {
        //                 name: 'slideRight'
        //             }
        //         });
        //     },
        //     err => {
        //         console.log(err);
        //         // still going back to previous page
        //         topmost().navigate({
        //             moduleName: 'main-page',
        //             animated: true,
        //             transition: {
        //                 name: 'slideRight'
        //             }
        //         });
        //     }
        // );
    }
}
