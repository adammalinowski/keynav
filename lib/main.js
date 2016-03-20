var self = require("sdk/self");
var tabs = require("sdk/tabs");

tabs.on("ready", function(tab) {
	worker = tab.attach({
		contentScriptFile: [self.data.url("jquery-2.1.1.min.js"), self.data.url("keynav.js")]
	});
	worker.port.on("open", function(url) {
		tab.url = url;
	});
	worker.port.on("open-new-tab", function(url) {
		tabs.open(url);
	});
	worker.port.on("open-new-background-tab", function(url) {
		tabs.open({url: url, inBackground: true});
	});
});