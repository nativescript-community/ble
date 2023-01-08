const HciSocket = require('hci-socket');
const NodeBleHost = require('ble-host');
const BleManager = NodeBleHost.BleManager;
const AdvertisingDataBuilder = NodeBleHost.AdvertisingDataBuilder;
const HciErrors = NodeBleHost.HciErrors;
const AttErrors = NodeBleHost.AttErrors;

const deviceName = 'MyDevice';

const transport = new HciSocket(); // connects to the first hci device on the computer, for example hci0

const options = {
    // optional properties go here
};

BleManager.create(transport, options, function (err, manager) {
    // err is either null or an Error object
    // if err is null, manager contains a fully initialized BleManager object
    if (err) {
        console.error(err);
        return;
    }

    let notificationCharacteristic;

    manager.gattDb.setDeviceName(deviceName);
    manager.gattDb.addServices([
        {
            uuid: '22222222-3333-4444-5555-666666666666',
            characteristics: [
                {
                    uuid: '22222222-3333-4444-5555-666666666667',
                    properties: ['read', 'write'],
                    value: 'some default value' // could be a Buffer for a binary value
                },
                {
                    uuid: '22222222-3333-4444-5555-666666666668',
                    properties: ['read'],
                    onRead(connection, callback) {
                        callback(AttErrors.SUCCESS, new Date().toString());
                    }
                },
                {
                    uuid: '22222222-3333-4444-5555-666666666669',
                    properties: ['write'],
                    onWrite(connection, needsResponse, value, callback) {
                        console.log('A new value was written:', value);
                        callback(AttErrors.SUCCESS); // actually only needs to be called when needsResponse is true
                    }
                },
                (notificationCharacteristic = {
                    uuid: '22222222-3333-4444-5555-66666666666A',
                    properties: ['notify'],
                    onSubscriptionChange(connection, notification, indication, isWrite) {
                        if (notification) {
                            // Notifications are now enabled, so let's send something
                            notificationCharacteristic.notify(connection, 'Sample notification');
                        }
                    }
                })
            ]
        }
    ]);

    const advDataBuffer = new AdvertisingDataBuilder()
        .addFlags(['leGeneralDiscoverableMode', 'brEdrNotSupported'])
        .addLocalName(/*isComplete*/ true, deviceName)
        .add128BitServiceUUIDs(/*isComplete*/ true, ['22222222-3333-4444-5555-666666666666'])
        .build();
    manager.setAdvertisingData(advDataBuffer);
    // call manager.setScanResponseData(...) if scan response data is desired too
    startAdv();

    function startAdv() {
        manager.startAdvertising(
            {
                /*options*/
            },
            connectCallback
        );
    }

    function connectCallback(status, conn) {
        if (status !== HciErrors.SUCCESS) {
            // Advertising could not be started for some controller-specific reason, try again after 10 seconds
            setTimeout(startAdv, 10000);
            return;
        }
        conn.on('disconnect', startAdv); // restart advertising after disconnect
        console.log('Connection established!', conn);
    }
});
