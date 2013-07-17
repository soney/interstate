/*
var listener = function(source, method, params) {
	console.log("event", arguments);
};
chrome.debugger.onEvent.addListener(listener);
*/

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {   
    if(request.command) {
		var command = request.command;
		if(command === "take_snapshot") {
			var debuggerId = {tabId: sender.tab.id};
			console.log(sender.tab.id);
			chrome.debugger.attach(debuggerId, "1.0", function() {
				if(chrome.runtime.lastError) { console.error(chrome.runtime.lastError); return; }
				var snapshot = "";
				var listener = function(source, method, params) {
					if(source.tabId === debuggerId.tabId) {
						if(method === "HeapProfiler.addProfileHeader") {
							var uid = params.header.uid;
							//https://code.google.com/p/chromium/issues/detail?id=260749
							chrome.debugger.sendCommand(debuggerId,"Debugger.enable", { }, function() {
								chrome.debugger.sendCommand(debuggerId, "Profiler.getHeapSnapshot", { uid: uid }, function() {
									chrome.debugger.sendCommand(debuggerId,"Debugger.disable", { }, function() {
										chrome.debugger.onEvent.removeListener(listener);
										chrome.debugger.detach(debuggerId, function() {
											if(chrome.runtime.lastError) { console.error(chrome.runtime.lastError);  return;}
											sendResponse({uid: uid, snapshot: snapshot});
										});
										console.log("Took snapshot");
									});
								});
							});
						} else if(method === "HeapProfiler.addHeapSnapshotChunk") {
							var chunk = params.chunk;
							//snapshot += chunk;
						} else if(method === "HeapPropfiler.finishHeapSnapshot") {
							//chrome.debugger.onEvent.removeListener(listener);
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
