declare var NSMakeRange; // not recognized by platform-declarations

import { CLog, CLogTypes } from '../common';
import { Bluetooth } from './ios_main';

/**
 * @link - https://developer.apple.com/documentation/corebluetooth/cbcentralmanagerdelegate
 * The CBCentralManagerDelegate protocol defines the methods that a delegate of a CBCentralManager object must adopt.
 * The optional methods of the protocol allow the delegate to monitor the discovery, connectivity, and retrieval of peripheral devices.
 * The only required method of the protocol indicates the availability of the central manager, and is called when the central manager’s state is updated.
 */
export class CBCentralManagerDelegateImpl extends NSObject implements CBCentralManagerDelegate {
  static ObjCProtocols = [CBCentralManagerDelegate];

  private _owner: WeakRef<Bluetooth>;

  private _callback: (result?) => void;

  static new(): CBCentralManagerDelegateImpl {
    return <CBCentralManagerDelegateImpl>super.new();
  }

  public initWithCallback(owner: WeakRef<Bluetooth>, callback: (result?) => void): CBCentralManagerDelegateImpl {
    this._owner = owner;
    CLog(CLogTypes.info, `CBCentralManagerDelegateImpl.initWithCallback ---- this._owner: ${this._owner}`);
    this._callback = callback;
    return this;
  }

  /**
   * Invoked when a connection is successfully created with a peripheral.
   * This method is invoked when a call to connect(_:options:) is successful.
   * You typically implement this method to set the peripheral’s delegate and to discover its services.
   * @param central [CBCentralManager] - The central manager providing this information.
   * @param peripheral [CBPeripheral] - The peripheral that has been connected to the system.
   */
  public centralManagerDidConnectPeripheral(central: CBCentralManager, peripheral: CBPeripheral) {
    CLog(CLogTypes.info, `----- CBCentralManagerDelegateImpl centralManager:didConnectPeripheral: ${peripheral}`);

    // find the peri in the array and attach the delegate to that
    const peri = this._owner.get().findPeripheral(peripheral.identifier.UUIDString);
    CLog(CLogTypes.info, `----- CBCentralManagerDelegateImpl centralManager:didConnectPeripheral: cached perio: ${peri}`);

    const cb = this._owner.get()._connectCallbacks[peripheral.identifier.UUIDString];
    const delegate = CBCentralManagerDelegateImpl.new().initWithCallback(this._owner, cb);
    CFRetain(delegate);
    peri.delegate = delegate;

    CLog(CLogTypes.info, "----- CBCentralManagerDelegateImpl centralManager:didConnectPeripheral, let's discover service");
    peri.discoverServices(null);
  }

  /**
   * Invoked when an existing connection with a peripheral is torn down.
   * This method is invoked when a peripheral connected via the connect(_:options:) method is disconnected.
   * If the disconnection was not initiated by cancelPeripheralConnection(_:), the cause is detailed in error.
   * After this method is called, no more methods are invoked on the peripheral device’s CBPeripheralDelegate object.
   * Note that when a peripheral is disconnected, all of its services, characteristics, and characteristic descriptors are invalidated.
   * @param central [CBCentralManager] - The central manager providing this information.
   * @param peripheral [CBPeripheral] - The peripheral that has been disconnected.
   * @param error? [NSError] - If an error occurred, the cause of the failure.
   */
  public centralManagerDidDisconnectPeripheralError(central: CBCentralManager, peripheral: CBPeripheral, error?: NSError) {
    // this event needs to be honored by the client as any action afterwards crashes the app
    const cb = this._owner.get()._disconnectCallbacks[peripheral.identifier.UUIDString];
    if (cb) {
      cb({
        UUID: peripheral.identifier.UUIDString,
        name: peripheral.name
      });
    } else {
      CLog(CLogTypes.info, `***** centralManagerDidDisconnectPeripheralError() no disconnect callback found *****`);
    }
    const foundAt = this._owner.get()._peripheralArray.indexOfObject(peripheral);
    this._owner.get()._peripheralArray.removeObject(foundAt);
  }

  /**
   * Invoked when the central manager fails to create a connection with a peripheral.
   * This method is invoked when a connection initiated via the connect(_:options:) method fails to complete.
   * Because connection attempts do not time out, a failed connection usually indicates a transient issue, in which case you may attempt to connect to the peripheral again.
   * @param central [CBCentralManager] - The central manager providing this information.
   * @param peripheral [CBPeripheral] - The peripheral that failed to connect.
   * @param error? [NSError] - The cause of the failure.
   */
  public centralManagerDidFailToConnectPeripheralError(central: CBCentralManager, peripheral: CBPeripheral, error?: NSError) {
    CLog(CLogTypes.info, `CBCentralManagerDelegate.centralManagerDidFailToConnectPeripheralError ----`, central, peripheral, error);
  }

  /**
   * Invoked when the central manager discovers a peripheral while scanning.
   * The advertisement data can be accessed through the keys listed in Advertisement Data Retrieval Keys.
   * You must retain a local copy of the peripheral if any command is to be performed on it.
   * In use cases where it makes sense for your app to automatically connect to a peripheral that is located within a certain range, you can use RSSI data to determine the proximity of a discovered peripheral device.
   * @param central [CBCentralManager] - The central manager providing the update.
   * @param peripheral [CBPeripheral] - The discovered peripheral.
   * @param advData [NSDictionary<string, any>] - A dictionary containing any advertisement data.
   * @param RSSI [NSNumber] - The current received signal strength indicator (RSSI) of the peripheral, in decibels.
   */
  public centralManagerDidDiscoverPeripheralAdvertisementDataRSSI(
    central: CBCentralManager,
    peripheral: CBPeripheral,
    advData: NSDictionary<string, any>,
    RSSI: number
  ) {
    CLog(
      CLogTypes.info,
      `CBCentralManagerDelegateImpl.centralManagerDidDiscoverPeripheralAdvertisementDataRSSI ---- ${peripheral.name} @ ${RSSI} @ ${advData}`
    );
    const peri = this._owner.get().findPeripheral(peripheral.identifier.UUIDString);
    if (!peri) {
      this._owner.get()._peripheralArray.addObject(peripheral);
      if (this._owner.get()._onDiscovered) {
        let manufacturerId;
        let localName;
        let advertismentData = {};

        if (advData.objectForKey(CBAdvertisementDataManufacturerDataKey)) {
          const manufacturerIdBuffer = this._owner
            .get()
            .toArrayBuffer(advData.objectForKey(CBAdvertisementDataManufacturerDataKey).subdataWithRange(NSMakeRange(0, 2)));
          manufacturerId = new DataView(manufacturerIdBuffer, 0).getUint16(0, true);
          advertismentData['manufacturerData'] = this._owner
            .get()
            .toArrayBuffer(
              advData
                .objectForKey(CBAdvertisementDataManufacturerDataKey)
                .subdataWithRange(NSMakeRange(2, advData.objectForKey(CBAdvertisementDataManufacturerDataKey).length - 2))
            );
        }
        if (advData.objectForKey(CBAdvertisementDataLocalNameKey)) {
          advertismentData['localName'] = advData.objectForKey(CBAdvertisementDataLocalNameKey);
        }
        if (advData.objectForKey(CBAdvertisementDataServiceUUIDsKey)) {
          advertismentData['uuids'] = advData.objectForKey(CBAdvertisementDataServiceUUIDsKey);
        }
        if (advData.objectForKey(CBAdvertisementDataIsConnectable)) {
          advertismentData['connectable'] = advData.objectForKey(CBAdvertisementDataIsConnectable);
        }
        if (advData.objectForKey(CBAdvertisementDataServiceDataKey)) {
          advertismentData['services'] = advData.objectForKey(CBAdvertisementDataServiceDataKey);
        }
        if (advData.objectForKey(CBAdvertisementDataTxPowerLevelKey)) {
          advertismentData['txPowerLevel'] = advData.objectForKey(CBAdvertisementDataTxPowerLevelKey);
        }

        this._owner.get()._onDiscovered({
          UUID: peripheral.identifier.UUIDString,
          name: peripheral.name,
          localName: localName,
          RSSI: RSSI,
          advertismentData: advertismentData,
          state: this._owner.get()._getState(peripheral.state),
          manufacturerId: manufacturerId
        });
      } else {
        CLog(
          CLogTypes.warning,
          'CBCentralManagerDelegateImpl.centralManagerDidDiscoverPeripheralAdvertisementDataRSSI ---- No onDiscovered callback specified'
        );
      }
    }
  }

  /**
   * Invoked when the central manager’s state is updated.
   * You implement this required method to ensure that Bluetooth low energy is supported and available to use on the central device.
   * You should issue commands to the central manager only when the state of the central manager is powered on, as indicated by the poweredOn constant.
   * A state with a value lower than poweredOn implies that scanning has stopped and that any connected peripherals have been disconnected.
   * If the state moves below poweredOff, all CBPeripheral objects obtained from this central manager become invalid and must be retrieved or discovered again.
   * For a complete list and discussion of the possible values representing the state of the central manager, see the CBCentralManagerState enumeration in CBCentralManager.
   * @param central [CBCentralManager] - The central manager providing this information.
   */
  public centralManagerDidUpdateState(central: CBCentralManager) {
    // if (central.state === CBCentralManagerStateUnsupported) {
    if (central.state === CBManagerState.Unsupported) {
      CLog(
        CLogTypes.warning,
        `CBCentralManagerDelegateImpl.centralManagerDidUpdateState ---- This hardware does not support Bluetooth Low Energy.`
      );
    }
  }

  /**
   * Invoked when the central manager is about to be restored by the system.
   * @param central [CBCentralManager] - The central manager providing this information.
   * @param dict [NSDictionary<string, any>] - A dictionary containing information about the central manager that was preserved by the system at the time the app was terminated.
   * For the available keys to this dictionary, see Central Manager State Restoration Options.
   * @link - https://developer.apple.com/documentation/corebluetooth/cbcentralmanagerdelegate/central_manager_state_restoration_options
   */
  public centralManagerWillRestoreState(central: CBCentralManager, dict: NSDictionary<string, any>) {
    CLog(CLogTypes.info, `CBCentralManagerDelegateImpl.centralManagerWillRestoreState ---- central: ${central}, dict: ${dict}`);
  }
}
