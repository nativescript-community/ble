# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [3.0.3](https://github.com/eddyverbruggen/@nativescript-community/ble/compare/v3.0.2...v3.0.3) (2020-09-16)


### Bug Fixes

* Scan not working in API < 21 as reported in [#165](https://github.com/eddyverbruggen/@nativescript-community/ble/issues/165) ([070c06f](https://github.com/eddyverbruggen/@nativescript-community/ble/commit/070c06fc9064c7d63132b605c16b17f033135bee))





## [3.0.2](https://github.com/eddyverbruggen/@nativescript-community/ble/compare/v3.0.1...v3.0.2) (2020-09-10)

**Note:** Version bump only for package @nativescript-community/ble





## [3.0.1](https://github.com/eddyverbruggen/@nativescript-community/ble/compare/v3.0.0...v3.0.1) (2020-09-01)


### Bug Fixes

* **android:** correctly check for ermission ([af963e3](https://github.com/eddyverbruggen/@nativescript-community/ble/commit/af963e3c1d9fac87b38bdcab5fff50821fd4248c))
* **ios:** manufacturerData fixes ([cdc5cd8](https://github.com/eddyverbruggen/@nativescript-community/ble/commit/cdc5cd8cbcbd356fe77b00d387e1e5af4665a33d))





# 3.0.0 (2020-08-27)


### Bug Fixes

* **ios:** fixed wrong format for valueToString ([d4b3004](https://github.com/eddyverbruggen/@nativescript-community/ble/commit/d4b30042daf3def4a4aa5b1dd5dd9b08836e2e41))
* **ios:** read was not working for notifying chars ([e3fc4f0](https://github.com/eddyverbruggen/@nativescript-community/ble/commit/e3fc4f00a77759d74638c498dd5f9061dcd40b12))
* any gatt queue promise need to reject on device disconnection ([d7c6834](https://github.com/eddyverbruggen/@nativescript-community/ble/commit/d7c6834a594e3c79abdf098411c3cb9b178c9d40))
* call device.disconnect to get the status change event ([658907d](https://github.com/eddyverbruggen/@nativescript-community/ble/commit/658907d273948305a53f10b455bfba42f66ba561))
* crash on pre lollipop ([dd2623c](https://github.com/eddyverbruggen/@nativescript-community/ble/commit/dd2623cb281092916eea68ba39d022c4f34a236c))
* dont clear adv data automatically, will create side errors ([65d3fe6](https://github.com/eddyverbruggen/@nativescript-community/ble/commit/65d3fe61ef9c335f81aeaefdcb611fc3f89bff7d))
* fixed edge cases for android. needs more refactoring ([aa0b152](https://github.com/eddyverbruggen/@nativescript-community/ble/commit/aa0b1521dd7b6a50ff5c68ffb31bde52ffcf9213))
* fixed ios requestMtu ([05209d6](https://github.com/eddyverbruggen/@nativescript-community/ble/commit/05209d614eb08ba8dfb19f9a12ce8d0854490b2f))
* ios disconnect method was deleted onDisconnected callback from connect ([9427be6](https://github.com/eddyverbruggen/@nativescript-community/ble/commit/9427be640b7b1af49d2b57eca817eb26bdf647df))
* missing export ([fd96ff9](https://github.com/eddyverbruggen/@nativescript-community/ble/commit/fd96ff9bcb3b74fb0b6ec73bbed4f73db5a22827))
* missing localName and manufacturerId from connect event ([a3eeb4d](https://github.com/eddyverbruggen/@nativescript-community/ble/commit/a3eeb4d80c61b1cde5dd87eb0236db559cef2229))
* throw Error and not a string ([77b2e75](https://github.com/eddyverbruggen/@nativescript-community/ble/commit/77b2e75db912240771f8003c041923fcd319b87b))


### Features

* requestMtu for iOS ([665ef11](https://github.com/eddyverbruggen/@nativescript-community/ble/commit/665ef11793276ef41dbd148dea4bee74f6a1a4cf))



## 1.2.4 (2018-12-07)



# 1.3.0 (2017-10-27)



# 1.2.0 (2017-08-13)



## 1.1.6 (2017-05-01)



## 1.1.5 (2017-03-29)


### Bug Fixes

* update package.json to allow webpack bundling ([ef9ec29](https://github.com/eddyverbruggen/@nativescript-community/ble/commit/ef9ec29296ae0e5ed4ab70dfe8426eb156d2714f))



## 1.1.4 (2016-11-22)



## 1.1.3 (2016-10-05)



## 1.1.2 (2016-05-11)



## 1.1.1 (2016-03-15)



# 1.1.0 (2016-03-08)



# 1.0.0 (2016-03-05)
