import { AdvertismentData, getBluetoothInstance, Peripheral, Service } from 'nativescript-bluetooth';
import { GPS, Options as GeolocationOptions } from 'nativescript-gps';
import { ApplicationEventData, on as applicationOn, resumeEvent, suspendEvent } from '@nativescript/core/application';
import { Observable } from '@nativescript/core/data/observable';
import { ObservableArray } from '@nativescript/core/data/observable-array';
import * as dialogs from '@nativescript/core/ui/dialogs';
import { Accuracy } from '@nativescript/core/ui/enums/enums';
import { topmost } from '@nativescript/core/ui/frame';
import { Prop } from './utils/obs-prop';


const geolocation = new GPS();
export class TestViewModel extends Observable {
    @Prop() public discoveredServices = new ObservableArray<Service>();
    @Prop() public isLoading = false;
    @Prop() public connected = false;
    @Prop() public peripheral: Peripheral;
    @Prop() public advertismentData: AdvertismentData;

    private _bluetooth = getBluetoothInstance();

    _isIOSBackgroundMode = false;
    watchId;
    currentWatcher: Function;
    _deferringUpdates  =false

    constructor(navContext) {
        super();
        this._bluetooth.debug = false;
        this.peripheral = navContext.peripheral;
        this.advertismentData = navContext.peripheral.advertismentData as AdvertismentData;
        console.log('peripheral', JSON.stringify(this.peripheral));
        console.log('advertismentData', JSON.stringify(this.advertismentData));
        console.log('serviceData', JSON.stringify(this.advertismentData.serviceData));
        console.log('uuids', this.advertismentData.serviceUUIDs);
        console.log('txPowerLevel', this.advertismentData.txPowerLevel);

        applicationOn(suspendEvent, this.onAppPause, this);
        applicationOn(resumeEvent, this.onAppResume, this);
        // console.log('localName', this.advertismentData.localName);
        // console.log('serviceUUIDs', this.advertismentData.serviceUUIDs);
        // console.log('txPowerLevel', this.advertismentData.txPowerLevel);
        // console.log('flags', this.advertismentData.flags);
        // console.log('manufacturerId', this.advertismentData.manufacturerId);
        // console.log('manufacturerData', this.advertismentData.manufacturerData);
        // console.log('serviceData', this.advertismentData.serviceData);
    }
    onAppResume(args: ApplicationEventData) {
        if (args.ios) {
            this._isIOSBackgroundMode = false;
            // For iOS applications, args.ios is UIApplication.
            console.log('UIApplication: resumeEvent', this.isWatching());
            if (this.isWatching()) {
                const watcher = this.currentWatcher;
                this.stopWatch();
                this.startWatch(watcher);
            }
        }
    }
    onAppPause(args: ApplicationEventData) {
        if (args.ios) {
            this._isIOSBackgroundMode = true;
            // For iOS applications, args.ios is UIApplication.
            console.log('UIApplication: suspendEvent', this.isWatching());
            if (this.isWatching()) {
                const watcher = this.currentWatcher;
                this.stopWatch();
                this.startWatch(watcher);
            }
        }
    }
    onDeferred() {
        this._deferringUpdates = false;
    }
    onLocation(loc, manager?: any) {

        if (manager && this._isIOSBackgroundMode && !this._deferringUpdates) {
            this._deferringUpdates = true;
            manager.allowDeferredLocationUpdatesUntilTraveledTimeout(0, 10);
        }
    }
    startWatch(onLoc?: Function) {
        this.currentWatcher = onLoc;
        const options: GeolocationOptions = { desiredAccuracy: Accuracy.high, minimumUpdateTime: 1000, onDeferred:this.onDeferred.bind(this) };

        // if (!isAndroid) {
        // if (this._isIOSBackgroundMode) {
        //     options.pausesLocationUpdatesAutomatically = false;
        //     options.allowsBackgroundLocationUpdates = true;
        //     options.activityType = CLActivityType.Fitness;
        // } else {
        options.pausesLocationUpdatesAutomatically = false;
        options.allowsBackgroundLocationUpdates = true;
        options.activityType = 3;
        // }
        // } else {
        //     if (!gVars.isWatch) {
        //         options.provider = 'gps';
        //     }
        // }
        console.log('startWatch', options);

        return geolocation.watchLocation(this.onLocation.bind(this), () => {}, options).then(id => (this.watchId = id));
    }

    stopWatch() {
        console.log('stopWatch', this.watchId);
        if (this.watchId) {
            geolocation.clearWatch(this.watchId);
            this.watchId = null;
            this.currentWatcher = null;
        }
    }

    isWatching() {
        return !!this.watchId;
    }
    formatData(title: string, advKey: string) {
        return title + ': ' + JSON.stringify(this.advertismentData[advKey]);
    }

    sendTimer;
    startSendTimer() {
        if (!this.sendTimer) {
            this.sendTimer = setInterval(() => {
                this._bluetooth
                    .write({
                        peripheralUUID: this.peripheral.UUID,
                        serviceUUID: 'ec00',
                        characteristicUUID: 'ec0e',
                        value: `echo ${Date.now()}`
                    })
                    .then(
                        result => {
                            // console.log('feedback', 'value written');
                            // console.log('feedbackTimestamp', new Date().toLocaleString());
                        },
                        errorMsg => {
                            // console.log('feedback', errorMsg);
                            // console.log('feedbackTimestamp', new Date().toLocaleString());
                            this.stopSendTimer();
                        }
                    );
            }, 500);
        }
    }
    stopSendTimer() {
        if (this.sendTimer) {
            clearInterval(this.sendTimer);
            this.sendTimer = null;
        }
    }
    public start() {
        console.log('connecting to peripheral', this.peripheral.UUID);
        this.isLoading = true;
        this._bluetooth
            .connect({
                UUID: this.peripheral.UUID,
                // NOTE: we could just use the promise as this cb is only invoked once
                onConnected: peripheral => {
                    this.connected = true;
                    console.log('------- Peripheral connected: ' + JSON.stringify(peripheral));
                    this.startWatch();
                    peripheral.services.forEach(value => {
                        console.log('---- ###### adding service: ' + value.UUID);
                        this.discoveredServices.push(value);
                    });
                    this.isLoading = false;
                    this.startSendTimer();
                },
                onDisconnected: peripheral => {
                    this.connected = false;
                    this.stopSendTimer();
                    dialogs.alert({
                        title: 'Disconnected',
                        message: 'Disconnected from peripheral: ' + JSON.stringify(peripheral),
                        okButtonText: 'Okay'
                    });
                }
            })
            .catch(err => {
                this.connected = false;
                console.log('error connecting to peripheral', err);
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

    public onStartTap(args) {
        if (!this.connected) {
            this.start();
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
