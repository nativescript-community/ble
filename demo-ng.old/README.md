# NativeScript Angular Bluetooth demo

This is based on an [un-merged PR](https://github.com/nativescript-community/ble-demo/pull/15) from [Brad Powell](https://github.com/bapowell).

I took his codebase, upgraded it to Angular 7.1 and NativeScript 5.1 and made some small tweaks to get it running.

## Quickstart

1.  Clone this repo
1.  `cd demo-ng`
1.  `tns install`: app's iOS and Android runtimes, as well as the app's npm dependencies
1.  `tns run ios` (`tns preview` won't work because the NativeScript Preview App does not have all BT requirements built-in)

## Help needed

This demo is not an exact feature-for-feature replication of the [non Angular demo](../demo).  Could use some help from the community to get these two demos in sync.  Few things I notice that need fixing::

- [ ] Styling all components
- [ ] Implement beacon scan
- [ ] Bring codebase to 2019.  Orig demo was written in 2016.  Since then lots of nice things have come along (ex: `async`/`await`)

