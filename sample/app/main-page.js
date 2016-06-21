"use strict";
var main_view_model_1 = require('./main-view-model');
// Event handler for Page "loaded" event attached in main-page.xml
function pageLoaded(args) {
    // Get the event sender
    var page = args.object;
    page.bindingContext = new main_view_model_1.HelloWorldModel();
}
exports.pageLoaded = pageLoaded;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi1wYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibWFpbi1wYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFFQSxnQ0FBOEIsbUJBQW1CLENBQUMsQ0FBQTtBQUVsRCxrRUFBa0U7QUFDbEUsb0JBQTJCLElBQTBCO0lBQ2pELHVCQUF1QjtJQUN2QixJQUFJLElBQUksR0FBZSxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQ25DLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxpQ0FBZSxFQUFFLENBQUM7QUFDaEQsQ0FBQztBQUplLGtCQUFVLGFBSXpCLENBQUEifQ==