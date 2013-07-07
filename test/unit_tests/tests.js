(function() {
//var cjs = red.cjs;
var command_id = 0;
var callbacks = {};
var do_command = function(command_name, callback) {
	var id = command_id++;
	callbacks[id] = callback;
	window.postMessage({ id: id, type: "FROM_PAGE", command: command_name }, "*");
};
var clear_snapshots = function(callback) {
	do_command("clear_snapshots", callback);
};
var take_snapshot = function(callback) {
	do_command("take_snapshot", callback);
};

window.addEventListener("message", function(event) {
    // We only accept messages from ourselves
    if (event.source != window) { return; }

    if (event.data.type && (event.data.type == "FROM_EXTENSION")) {
		var id = event.data.id;
		var callback = callbacks[id];
		delete callbacks[id];
		callback(event.data.response);
    }
}, false);

var cjs = red.cjs;
asyncTest("Constraint allocation", function() {
	expect(3);
	clear_snapshots(function() {
		take_snapshot(function() {
			var x = cjs.$(1);
			var y = cjs.$(function() { return x.get() + 1; });
			equal(y.get(), 2);
			equal(x.get(), 1);
			x.get();
			x.destroy();
			x = null;
			y = null;
			take_snapshot(function() {
				ok(true, "Make sure nothing was allocated");
				start();
			});
		});
	});
});
}());
