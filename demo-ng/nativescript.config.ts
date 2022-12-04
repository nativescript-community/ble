import { NativeScriptConfig } from '@nativescript/core';

export default {
    id: 'org.nativescript.@nativescript-community/ble-demo-ng',
    appPath: 'src',
    appResourcesPath: 'App_Resources',
    android: {
        v8Flags: '--expose_gc',
        markingMode: 'none'
    }
} as NativeScriptConfig;