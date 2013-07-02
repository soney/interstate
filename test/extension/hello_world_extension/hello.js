/*
if (document.readyState == "complete") {
  doMyStuffAfterLoad();
} else {
  window.addEventListener("load", function() {
    setTimeout(doMyStuffAfterLoad, 0);
  });
}

function doMyStuffAfterLoad() {
	console.log("HI");
	chrome.tabs.executeScript(null,
                           {code:"document.body.bgColor='red'"});
}

*/
console.log("Extension");

var port = chrome.runtime.connect();
window.addEventListener("message", function(event) {
    // We only accept messages from ourselves
    if (event.source != window) { return; }

    if (event.data.type && (event.data.type == "FROM_PAGE")) {
		var command = event.data.command;
      console.log("Content script received: " + event.data.text);
      port.postMessage(event.data.text);
    }
}, false);
