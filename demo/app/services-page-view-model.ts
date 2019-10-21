import * as dialogs from "tns-core-modules/ui/dialogs";
import { topmost } from "tns-core-modules/ui/frame";
import { ObservableArray } from "tns-core-modules/data/observable-array";
import { Observable, fromObject } from "tns-core-modules/data/observable";
import { Bluetooth, Peripheral, Service } from "nativescript-bluetooth";
import { Prop } from "./utils/obs-prop";

export class ServicesViewModel extends Observable {
  @Prop() public discoveredServices = new ObservableArray<Service>();
  @Prop() public isLoading = false;
  @Prop() public peripheral: Peripheral;

  private _bluetooth = new Bluetooth();

  constructor(navContext) {
    super();
    this._bluetooth.debug = true;
    this.peripheral = navContext.peripheral;
    console.log("this.peripheral", JSON.stringify(this.peripheral));

    this.isLoading = true;

    this._bluetooth.connect({
      UUID: this.peripheral.UUID,
      // NOTE: we could just use the promise as this cb is only invoked once
      onConnected: peripheral => {
        console.log("Peripheral connected: " + JSON.stringify(peripheral));
        peripheral.services.forEach(value => {
          console.log("###### adding service: " + value.UUID);
          this.discoveredServices.push(value);
        });
        this.isLoading = false;
      },
      onDisconnected: peripheral => {
        dialogs.alert({
          title: "Disconnected",
          message: "Disconnected from peripheral: " + JSON.stringify(peripheral),
          okButtonText: "Okay"
        });
      }
    })
        .then(() => console.log("Connected to peripheral"))
        .catch(err => console.log(`Error connecting to peripheral: ${err}`));
  }

  public onServiceTap(args) {
    const service = this.discoveredServices.getItem(args.index);
    console.log("--- service selected: " + service.UUID);

    const navigationEntry = {
      moduleName: "characteristics-page",
      context: {
        peripheral: this.peripheral,
        service: service
      },
      animated: true
    };

    topmost().navigate(navigationEntry);
  }

  public onDisconnectTap(args) {
    console.log("Disconnecting peripheral " + this.peripheral.UUID);
    this._bluetooth
        .disconnect({
          UUID: this.peripheral.UUID
        })
        .then(
            () => {
              // going back to previous page
              topmost().navigate({
                moduleName: "main-page",
                animated: true,
                transition: {
                  name: "slideRight"
                }
              });
            },
            err => {
              console.log(err);
              // still going back to previous page
              topmost().navigate({
                moduleName: "main-page",
                animated: true,
                transition: {
                  name: "slideRight"
                }
              });
            }
        );
  }
}
