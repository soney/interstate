var listener = function(source, method, params) {
	console.log("event", arguments);
};
chrome.debugger.onEvent.addListener(listener);

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {   
    if(request.command) {
		var command = request.command;
		if(command === "take_snapshot") {
			var debuggerId = {tabId: sender.tab.id};
			console.log(sender.tab.id);
			chrome.debugger.attach(debuggerId, "1.0", function() {
				if(chrome.runtime.lastError) { console.error(chrome.runtime.lastError); return; }
				var listener = function(source, method, params) {
					if(source.tabId === debuggerId.tabId) {
						if(method === "HeapProfiler.addProfileHeader") {
							var uid = params.header.uid;
							chrome.debugger.sendCommand(debuggerId, "HeapProfiler.getHeapSnapshot", { uid: uid }, function() {
								chrome.debugger.detach(debuggerId, function() {
									if(chrome.runtime.lastError) { console.error(chrome.runtime.lastError);  return;}
									sendResponse({uid: uid});
									console.log("Took snapshot");
								});
							});
							chrome.debugger.onEvent.removeListener(listener);
						}
					}
				};
				chrome.debugger.onEvent.addListener(listener);
				chrome.debugger.sendCommand(debuggerId, "HeapProfiler.takeHeapSnapshot", { reportProgress: false }, function() {
					if(chrome.runtime.lastError) { console.error(chrome.runtime.lastError); }
				});
			});
		} else if(command === "clear_snapshots") {
			var debuggerId = {tabId: sender.tab.id};

			chrome.debugger.attach(debuggerId, "1.0", function() {
				if(chrome.runtime.lastError) { console.error(chrome.runtime.lastError); return; }
				chrome.debugger.sendCommand(debuggerId, "HeapProfiler.clearProfiles", { reportProgress: false }, function() {
					if(chrome.runtime.lastError) { console.error(chrome.runtime.lastError); }
					chrome.debugger.detach(debuggerId, function() {
						if(chrome.runtime.lastError) { console.error(chrome.runtime.lastError);  return;}
						sendResponse("done");
						console.log("Cleared Snapshots");
					});
				});
			});
		}
    }
});
