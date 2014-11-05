var self = require("sdk/self");
var tabs = require("sdk/tabs");
var { Hotkey } = require("sdk/hotkeys");

tabs.on("ready", function(tab) {
 	worker = tab.attach({
   		contentScriptFile: [self.data.url("jquery-2.1.1.min.js"), self.data.url("./keynav.js")]
  	});
});

var showHotKey = Hotkey({
  	combo: "shift-w",
  		onPress: function() {
    		worker.port.emit("myMessage")
  		}
});