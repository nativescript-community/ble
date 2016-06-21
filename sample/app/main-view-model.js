"use strict";
var observable_1 = require('data/observable');
var observable_array_1 = require("data/observable-array");
var nativescript_bluetooth_1 = require('nativescript-bluetooth');
var dialogs = require("ui/dialogs");
var HelloWorldModel = (function (_super) {
    __extends(HelloWorldModel, _super);
    function HelloWorldModel() {
        _super.call(this);
        this.bluetooth = new nativescript_bluetooth_1.Bluetooth();
        this.peripherals = new observable_array_1.ObservableArray();
    }
    HelloWorldModel.prototype.doIsBluetoothEnabled = function () {
        this.bluetooth.isBluetoothEnabled().then(function (enabled) {
            dialogs.alert({
                title: "Enabled?",
                message: enabled ? "Yes" : "No",
                okButtonText: "OK, thanks"
            });
        });
    };
    ;
    HelloWorldModel.prototype.onPeripheralTap = function (args) {
        var index = args.index;
        console.log('!!&&&&***** Clicked item with index ' + index);
        var peri = this.peripherals.getItem(index);
        console.log("--- peri selected: " + peri.UUID);
        var navigationEntry = {
            moduleName: "services-page",
            context: {
                info: "something you want to pass to your page",
                foo: 'bar',
                peripheral: peri
            },
            animated: true
        };
        var topmost = topmost();
        topmost.navigate(navigationEntry);
    };
    ;
    HelloWorldModel.prototype.doScanForHeartrrateMontitor = function () {
        var that = this;
        console.log("Clicked");
        this.bluetooth.hasCoarseLocationPermission().then(function (granted) {
            if (!granted) {
                this.bluetooth.requestCoarseLocationPermission();
            }
            else {
                var heartrateService = "180d";
                var omegaService = "12345678-9012-3456-7890-1234567890ee";
                that.set('isLoading', true);
                // reset the array
                that.peripherals.splice(0, that.peripherals.length);
                this.bluetooth.startScanning({
                    // beware: the peripheral must advertise ALL these services
                    serviceUUIDs: [heartrateService],
                    seconds: 4,
                    onDiscovered: function (peripheral) {
                        var obsp = new observable_1.Observable(peripheral);
                        that.peripherals.push(obsp);
                    }
                }).then(function () {
                    that.set('isLoading', false);
                }, function (err) {
                    that.set('isLoading', false);
                    dialogs.alert({
                        title: "Whoops!",
                        message: err,
                        okButtonText: "OK, got it"
                    });
                });
            }
        });
    };
    ;
    HelloWorldModel.prototype.doStartScanning = function () {
        var that = this;
        // On Android 6 we need this permission to be able to scan for peripherals in the background.
        this.bluetooth.hasCoarseLocationPermission().then(function (granted) {
            if (!granted) {
                that.bluetooth.requestCoarseLocationPermission();
            }
            else {
                that.set('isLoading', true);
                // reset the array
                that.peripherals.splice(0, that.peripherals.length);
                that.bluetooth.startScanning({
                    serviceUUIDs: [],
                    seconds: 4,
                    onDiscovered: function (peripheral) {
                        var obsp = new observable_1.Observable(peripheral);
                        that.peripherals.push(obsp);
                    }
                }).then(function () {
                    that.set('isLoading', false);
                }, function (err) {
                    that.set('isLoading', false);
                    dialogs.alert({
                        title: "Whoops!",
                        message: err,
                        okButtonText: "OK, got it"
                    });
                });
            }
        });
    };
    ;
    HelloWorldModel.prototype.doStopScanning = function () {
        var that = this;
        this.bluetooth.stopScanning().then(function () {
            that.set('isLoading', false);
        }, function (err) {
            dialogs.alert({
                title: "Whoops!",
                message: err,
                okButtonText: "OK, so be it"
            });
        });
    };
    ;
    return HelloWorldModel;
}(observable_1.Observable));
exports.HelloWorldModel = HelloWorldModel;
/*
  DemoAppModel.prototype.doWrite = function () {
    // send 1 byte to switch a light on
    var data = new Uint8Array(1);
    data[0] = 1;

    bluetooth.write(
      {
        peripheralUUID: mostRecentlyFoundperipheralUUID,
        serviceUUID: "B9401000-F5F8-466E-AFF9-25556B57FE6D", // TODO dummy
        characteristicUUID: "B9402001-F5F8-466E-AFF9-25556B57FE6D", // TODO dummy
        value: data.buffer,
        awaitResponse: true // if false you will not get notified of errors (fire and forget)
      }
    ).then(
      function(result) {
        dialogs.alert({
          title: "Write result",
          message: JSON.stringify(result),
          okButtonText: "OK, splendid"
        });
      },
      function (err) {
        dialogs.alert({
          title: "Whoops!",
          message: err,
          okButtonText: "Hmmkay"
        });
      }
    );
  };
*/ 
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi12aWV3LW1vZGVsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibWFpbi12aWV3LW1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSwyQkFBeUIsaUJBQWlCLENBQUMsQ0FBQTtBQUMzQyxpQ0FBOEIsdUJBQXVCLENBQUMsQ0FBQTtBQUV0RCx1Q0FBd0Isd0JBQXdCLENBQUMsQ0FBQTtBQUNqRCxJQUFZLE9BQU8sV0FBTSxZQUFZLENBQUMsQ0FBQTtBQUV0QztJQUFxQyxtQ0FBVTtJQUk3QztRQUNFLGlCQUFPLENBQUM7UUFDUixJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksa0NBQVMsRUFBRSxDQUFDO1FBQ2pDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxrQ0FBZSxFQUF3QixDQUFDO0lBQ2pFLENBQUM7SUFFRCw4Q0FBb0IsR0FBcEI7UUFDRSxJQUFJLENBQUMsU0FBUyxDQUFDLGtCQUFrQixFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsT0FBTztZQUN4RCxPQUFPLENBQUMsS0FBSyxDQUFDO2dCQUNaLEtBQUssRUFBRSxVQUFVO2dCQUNqQixPQUFPLEVBQUUsT0FBTyxHQUFHLEtBQUssR0FBRyxJQUFJO2dCQUMvQixZQUFZLEVBQUUsWUFBWTthQUMzQixDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7O0lBRUQseUNBQWUsR0FBZixVQUFnQixJQUFJO1FBQ2xCLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUM7UUFDdkIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQ0FBc0MsR0FBRyxLQUFLLENBQUMsQ0FBQztRQUM1RCxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMzQyxPQUFPLENBQUMsR0FBRyxDQUFDLHFCQUFxQixHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUUvQyxJQUFJLGVBQWUsR0FBRztZQUNwQixV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