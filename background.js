chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
		if (request.open) {
			chrome.tabs.update({ url: request.open });
		} else if (request.openNewTab) {
			chrome.tabs.create({ url: request.openNewTab });
		} else if (request.openNewBackgroundTab) {
			chrome.tabs.create({ url: request.openNewBackgroundTab, active: false });
		}
});