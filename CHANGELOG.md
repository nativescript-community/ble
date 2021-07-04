# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [3.0.26](https://github.com/eddyverbruggen/@nativescript-community/ble/compare/v3.0.25...v3.0.26) (2021-07-04)


### Bug Fixes

* **android:** register notifyCallback earlier and optimistically ([b79f475](https://github.com/eddyverbruggen/@nativescript-community/ble/commit/b79f475723ed2ef9a1a3775d950408a07628e847))


### Features

* **android:** new clearCache option for discoverServices ([2a1066d](https://github.com/eddyverbruggen/@nativescript-community/ble/commit/2a1066d45ae04604a04e556c68a6cec8eba264d8))





## [3.0.25](https://github.com/eddyverbruggen/@nativescript-community/ble/compare/v3.0.24...v3.0.25) (2021-06-03)


### Bug Fixes

* **ios:** try to fix build errors on iOS (caused by exported native class) ([63f8fb3](https://github.com/eddyverbruggen/@nativescript-community/ble/commit/63f8fb3b8cc7dea4528e0903fb7781e7c29474b9))





## [3.0.24](https://github.com/eddyverbruggen/@nativescript-community/ble/compare/v3.0.23...v3.0.24) (2021-05-27)

**Note:** Version bump only for package @nativescript-community/ble





## [3.0.23](https://github.com/eddyverbruggen/@nativescript-community/ble/compare/v3.0.22...v3.0.23) (2021-05-27)

**Note:** Version bump only for package @nativescript-community/ble





## [3.0.22](https://github.com/eddyverbruggen/@nativescript-community/ble/compare/v3.0.21...v3.0.22) (2021-05-27)


### Features

* timeout for read / write ([ff3bbc8](https://github.com/eddyverbruggen/@nativescript-community/ble/commit/ff3bbc82b91fe49b7547d5aaaa6ca2373e35499b))





## [3.0.21](https://github.com/eddyverbruggen/@nativescript-community/ble/compare/v3.0.20...v3.0.21) (2021-05-18)


### Bug Fixes

* typings fix ([32ec0a8](https://github.com/eddyverbruggen/@nativescript-community/ble/commit/32ec0a817440d53809acd4cc268bef7f4771f42a))
* **ios:** console log fixes ([b6c0a04](https://github.com/eddyverbruggen/@nativescript-community/ble/commit/b6c0a04702dcb224c9e1dbed4eaa338fe601308b))





## [3.0.20](https://github.com/eddyverbruggen/@nativescript-community/ble/compare/v3.0.19...v3.0.20) (2021-05-12)


### Bug Fixes

* rollback p-queue version to fix build ([ee5bdb0](https://github.com/eddyverbruggen/@nativescript-community/ble/commit/ee5bdb06369650577a26ea932354fe9d0d5bafd3))





## [3.0.19](https://github.com/eddyverbruggen/@nativescript-community/ble/compare/v3.0.18...v3.0.19) (2021-05-06)


### Bug Fixes

* updated deps ([563147a](https://github.com/eddyverbruggen/@nativescript-community/ble/commit/563147aef0152fa32c7fc48ff67245cb08d4cf79))





## [3.0.18](https://github.com/eddyverbruggen/@nativescript-community/ble/compare/v3.0.17...v3.0.18) (2021-05-06)


### Bug Fixes

* **ios:** fix for wrong first isEnabled state ([7076cc0](https://github.com/eddyverbruggen/@nativescript-community/ble/commit/7076cc0f4e8c7526ac9067e8d947e0a90b28c07e))





## [3.0.17](https://github.com/eddyverbruggen/@nativescript-community/ble/compare/v3.0.16...v3.0.17) (2021-05-04)


### Features

* add acces to native device ([58b92cf](https://github.com/eddyverbruggen/@nativescript-community/ble/commit/58b92cf72a5ae6a3a139e22f3ae09c442997507a))





## [3.0.16](https://github.com/eddyverbruggen/@nativescript-community/ble/compare/v3.0.15...v3.0.16) (2021-03-24)


### Bug Fixes

* typings fix ([0a3afc0](https://github.com/eddyverbruggen/@nativescript-community/ble/commit/0a3afc071ac723a6c823298d323510396d3d3209))
* **android:** 2m phy selection is now only attempted if isLe2MPhySupported is true. ([8124923](https://github.com/eddyverbruggen/@nativescript-community/ble/commit/81249234c380d983f14c62924fb4f0ceb4a723b7))





## [3.0.15](https://github.com/eddyverbruggen/@nativescript-community/ble/compare/v3.0.14...v3.0.15) (2021-02-18)


### Bug Fixes

* **android:** autoDiscoverAll was broken in last version ([dda3876](https://github.com/eddyverbruggen/@nativescript-community/ble/commit/dda38763680a926a131e2ee136be412cb08ae706))
* **ios:** correctly query mtu on connection ([6b1a8f8](https://github.com/eddyverbruggen/@nativescript-community/ble/commit/6b1a8f81dead28755e350cfba9cbddb74b63006a))





## [3.0.14](https://github.com/eddyverbruggen/@nativescript-community/ble/compare/v3.0.13...v3.0.14) (2021-02-12)


### Bug Fixes

* **android:** Disconnect listeners now only accept disconnect events from matching devices. ([213e7e4](https://github.com/eddyverbruggen/@nativescript-community/ble/commit/213e7e4013a2377c2cca197835aa1be048529861))


### Features

* **android:** Connections can now be made with 2M PHY and Max MTU. Also removes code duplication by introducing attachSubDelegate. ([e7dee52](https://github.com/eddyverbruggen/@nativescript-community/ble/commit/e7dee522b8203e613b8d9dba2feabe081d9f0066))





## [3.0.13](https://github.com/eddyverbruggen/@nativescript-community/ble/compare/v3.0.12...v3.0.13) (2020-12-14)


### Bug Fixes

* **android:** fix ble not working after disconnexion during write ([f038cb0](https://github.com/eddyverbruggen/@nativescript-community/ble/commit/f038cb05d588d02f3bd72993317073d6eddf23e9))





## [3.0.12](https://github.com/eddyverbruggen/@nativescript-community/ble/compare/v3.0.11...v3.0.12) (2020-11-23)

**Note:** Version bump only for package @nativescript-community/ble





## [3.0.11](https://github.com/eddyverbruggen/@nativescript-community/ble/compare/v3.0.10...v3.0.11) (2020-11-23)

**Note:** Version bump only for package @nativescript-community/ble





## [3.0.10](https://github.com/eddyverbruggen/@nativescript-community/ble/compare/v3.0.9...v3.0.10) (2020-11-22)

**Note:** Version bump only for package @nativescript-community/ble





## [3.0.9](https://github.com/eddyverbruggen/@nativescript-community/ble/compare/v3.0.8...v3.0.9) (2020-11-17)


### Bug Fixes

* ios fix serviceUUIDs not reported correctly ([6a55b6d](https://github.com/eddyverbruggen/@nativescript-community/ble/commit/6a55b6d6ad040c4f1681114bf14ace69c217ad7c))





## [3.0.8](https://github.com/eddyverbruggen/@nativescript-community/ble/compare/v3.0.7...v3.0.8) (2020-11-06)


### Bug Fixes

* wrong encoding fix ([15d5ee3](https://github.com/eddyverbruggen/@nativescript-community/ble/commit/15d5ee352a9058616bf57ca7458bd129ae7ba4c4))





## [3.0.7](https://github.com/eddyverbruggen/@nativescript-community/ble/compare/v3.0.6...v3.0.7) (2020-11-05)

**Note:** Version bump only for package @nativescript-community/ble





## [3.0.6](https://github.com/eddyverbruggen/@nativescript-community/ble/compare/v3.0.5...v3.0.6) (2020-11-02)

**Note:** Version bump only for package @nativescript-community/ble





## [3.0.5](https://github.com/eddyverbruggen/@nativescript-community/ble/compare/v3.0.4...v3.0.5) (2020-11-02)


### Bug Fixes

* android fix for null owner ([44d0c03](https://github.com/eddyverbruggen/@nativescript-community/ble/commit/44d0c03469cca85e38b7c3eb27d314a420e69c1d))





## [3.0.4](https://github.com/eddyverbruggen/@nativescript-community/ble/compare/v3.0.3...v3.0.4) (2020-10-07)


### Bug Fixes

* android fixed advertisment serviceUuids reading ([3268e11](https://github.com/eddyverbruggen/@nativescript-community/ble/commit/3268e11e37b559ea11b82510715d50132480970a))
* Bluetooth GIF path was wrong. ([8f553b4](https://github.com/eddyverbruggen/@nativescript-community/ble/commit/8f553b439f327636dbb46b314f970071c6b4f851))





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
