var application = require("application");
var utils = require("utils/utils");
var BLE = require("./ble-common");

/*
LocalNotifications.addOnMessageReceivedCallback = function (callback) {
  return new Promise(function (resolve, reject) {
    try {
      // note that this is ONLY triggered when the user clicked the notification in the statusbar
      com.telerik.localnotifications.LocalNotificationsPlugin.setOnMessageReceivedCallback(
          new com.telerik.localnotifications.LocalNotificationsPluginListener({
            success: function(notification) {
              callback(JSON.parse(notification))
            }
          })
      );
      resolve();
    } catch (ex) {
      console.log("Error in LocalNotifications.addOnMessageReceivedCallback: " + ex);
      reject(ex);
    }
  });
};

LocalNotifications.schedule = function (arg) {
  return new Promise(function (resolve, reject) {
    try {
      var context = application.android.foregroundActivity;

      for (var n in arg) {
        var options = LocalNotifications.merge(arg[n], LocalNotifications.defaults);
        options.icon = application.android.nativeApp.getApplicationInfo().icon;
        options.atTime = options.at ? options.at.getTime() : new Date().getTime();

        // note that setting options.sound to explicitly to null will not add the default sound
        if (options.sound === undefined) {
          options.sound = android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_NOTIFICATION).toString();
        }

        // TODO best move this to native lib so we can reuse it in the restorereceiver (dupl for now)
        var builder = new android.support.v4.app.NotificationCompat.Builder(context)
            .setDefaults(0)
            .setContentTitle(options.title)
            .setContentText(options.body)
            .setSmallIcon(options.icon)
            .setAutoCancel(true) // removes the notification from the statusbar once tapped
            .setSound(options.sound == null ? null : android.net.Uri.parse(options.sound))
            .setNumber(options.badge)
            .setTicker(options.ticker || options.body);

        // add the intent that handles the event when the notification is clicked (which should launch the app)
        var reqCode = new java.util.Random().nextInt();
        var clickIntent = new android.content.Intent(context, com.telerik.localnotifications.NotificationClickedActivity.class)
            .putExtra("pushBundle", JSON.stringify(options))
            .setFlags(android.content.Intent.FLAG_ACTIVITY_NO_HISTORY);

        var pendingContentIntent = android.app.PendingIntent.getActivity(context, reqCode, clickIntent, android.app.PendingIntent.FLAG_UPDATE_CURRENT);
        builder.setContentIntent(pendingContentIntent);

        var not = builder.build();

        // add the intent which schedules the notification
        var notificationIntent = new android.content.Intent(context, com.telerik.localnotifications.NotificationPublisher.class)
            .setAction("" + options.id)
            .putExtra(com.telerik.localnotifications.NotificationPublisher.NOTIFICATION_ID, options.id)
            .putExtra(com.telerik.localnotifications.NotificationPublisher.NOTIFICATION, not);

        var pendingIntent = android.app.PendingIntent.getBroadcast(context, 0, notificationIntent, android.app.PendingIntent.FLAG_CANCEL_CURRENT);

        // configure when we'll show the event
        var alarmManager = utils.ad.getApplicationContext().getSystemService(android.content.Context.ALARM_SERVICE);
        alarmManager.set(android.app.AlarmManager.RTC_WAKEUP, options.atTime, pendingIntent);

        LocalNotifications._persist(options);
      }

      resolve();
    } catch (ex) {
      console.log("Error in LocalNotifications.schedule: " + ex);
      reject(ex);
    }
  });
};

LocalNotifications._persist = function (options) {
  var sharedPreferences = LocalNotifications._getSharedPreferences();
  var sharedPreferencesEditor = sharedPreferences.edit();
  sharedPreferencesEditor.putString("" + options.id, JSON.stringify(options));
  sharedPreferencesEditor.apply();
};

LocalNotifications._unpersist = function (id) {
  var sharedPreferences = LocalNotifications._getSharedPreferences();
  var sharedPreferencesEditor = sharedPreferences.edit();
  sharedPreferencesEditor.remove("" + id);
  sharedPreferencesEditor.apply();
};

LocalNotifications._cancelById = function (id) {
  var context = application.android.foregroundActivity;

  var notificationIntent = new android.content.Intent(context, com.telerik.localnotifications.NotificationPublisher.class)
      .setAction("" + id);

  var pendingIntent = android.app.PendingIntent.getBroadcast(context, 0, notificationIntent, 0);

  var alarmManager = utils.ad.getApplicationContext().getSystemService(android.content.Context.ALARM_SERVICE);
  alarmManager.cancel(pendingIntent);

  var notificationManager = utils.ad.getApplicationContext().getSystemService(android.content.Context.NOTIFICATION_SERVICE);
  notificationManager.cancel(id);

  LocalNotifications._unpersist(id);
};

LocalNotifications.cancel = function (id) {
  return new Promise(function (resolve, reject) {
    try {
      LocalNotifications._cancelById(id);
      resolve(true);
    } catch (ex) {
      console.log("Error in LocalNotifications.cancel: " + ex);
      reject(ex);
    }
  });
};

LocalNotifications.cancelAll = function () {
  return new Promise(function (resolve, reject) {
    try {
      var sharedPreferences = LocalNotifications._getSharedPreferences();
      var keys = sharedPreferences.getAll().keySet();

      console.log("-----will cancel " + keys.size() + " notification(s): " + keys);

      var iterator = keys.iterator();
      while (iterator.hasNext()) {
        LocalNotifications._cancelById(iterator.next());
      }

      resolve();
    } catch (ex) {
      console.log("Error in LocalNotifications.cancelAll: " + ex);
      reject(ex);
    }
  });
};

LocalNotifications.getScheduledIds = function () {
  return new Promise(function (resolve, reject) {
    try {
      var scheduledIds = [];

      var sharedPreferences = LocalNotifications._getSharedPreferences();
      var keys = sharedPreferences.getAll().keySet();

      var iterator = keys.iterator();
      while (iterator.hasNext()) {
        scheduledIds.push(iterator.next());
      }

      resolve(scheduledIds);
    } catch (ex) {
      console.log("Error in LocalNotifications.getScheduledIds: " + ex);
      reject(ex);
    }
  });
};

LocalNotifications.hasPermission = function (arg) {
  return new Promise(function (resolve, reject) {
    try {
      // nothing to do on this platform
      resolve(true);
    } catch (ex) {
      console.log("Error in LocalNotifications.hasPermission: " + ex);
      reject(ex);
    }
  });
};

LocalNotifications.requestPermission = function (arg) {
  return new Promise(function (resolve, reject) {
    try {
      // nothing to do on this platform
      resolve(true);
    } catch (ex) {
      console.log("Error in LocalNotifications.requestPermission: " + ex);
      reject(ex);
    }
  });
};

LocalNotifications._getSharedPreferences = function () {
  var context = application.android.foregroundActivity;
  var PREF_KEY = "LocalNotificationsPlugin"; // TODO get constant from native, as the restorereceiver needs it as well
  return context.getSharedPreferences(PREF_KEY, android.content.Context.MODE_PRIVATE);
};
*/

module.exports = BLE;