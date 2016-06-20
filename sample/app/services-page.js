var observableArray = require("data/observable-array");
var observable = require("data/observable");
var frameModule = require("ui/frame");
var bluetooth = require("nativescript-bluetooth");
var dialogs = require("ui/dialogs");

var _peripheral;

function pageLoaded(args) {
  var page = args.object;

  // might as well not load the rest of the page in this case (nav back)
  if (page.navigationContext === undefined) {
    return;
  }
  
  console.log("--- page.navigationContext: " + page.navigationContext);
  
  _peripheral = page.navigationContext.peripheral;
  _peripheral.services = new observableArray.ObservableArray();
  page.bindingContext = _peripheral;
  _peripheral.set('isLoading', true);

  bluetooth.connect(
    {
      UUID: _peripheral.UUID,
      // NOTE: we could just use the promise as this cb is only invoked once
      onConnected: function (peripheral) {
        console.log("------- Peripheral connected: " + JSON.stringify(peripheral));
        peripheral.services.forEach(function(value) {
          console.log("---- ###### adding service: " + value.UUID);
          _peripheral.services.push(value);
        });
        _peripheral.set('isLoading', false);
      },
      onDisconnected: function (peripheral) {
        dialogs.alert({
          title: "Disconnected",
          message: "Disconnected from peripheral: " + JSON.stringify(peripheral),
          okButtonText: "OK, thanks"
        });
      }
    }
  );
}

function onServiceTap(args) {
  var index = args.index;
  console.log('!!&&&&***** Clicked service with index ' + args.index);

  var service = _peripheral.services.getItem(index);
  console.log("--- service selected: " + service.UUID);

  var navigationEntry = {
    moduleName: "characteristics-page",
    context: {
      peripheral: _peripheral,
      service: service
    },
    animated: true
  };
  var topmost = frameModule.topmost();
  topmost.navigate(navigationEntry);
}

function onDisconnectTap(args) {
  console.log("Disconnecting peripheral " + _peripheral.UUID);
  bluetooth.disconnect(
    {
      UUID: _peripheral.UUID
    }
  ).then(
    function() {
      // going back to previous page
      frameModule.topmost().navigate({
        moduleName: "main-page",
        animated: true,
        transition: {
          name: "slideRight"
        }
      });
    },
    function (err) {
      console.log(err);
      // still going back to previous page
      frameModule.topmost().navigate({
        moduleName: "main-page",
        animated: true,
        transition: {
          name: "slideRight"
        }
      });
    }
  );
}

exports.pageLoaded = pageLoaded;
exports.onServiceTap = onServiceTap;
exports.onDisconnectTap = onDisconnectTap;