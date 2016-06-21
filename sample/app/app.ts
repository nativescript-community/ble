/*var application = require("application");
application.mainModule = "main-page";
application.cssFile = "./app.css";
application.start();*/

import * as application from 'application';
application.start({ moduleName: 'main-page' });