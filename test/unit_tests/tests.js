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
/*
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
*/

/*
asyncTest("Map Allocation", function() {
	expect(3);
	clear_snapshots(function() {
		take_snapshot(function() {
			var m = cjs.map();
			m.put("a", 1);
			equal(m.get("b"), undefined);
			equal(m.get("a"), 1);
			m.destroy();
			m = null;
			take_snapshot(function() {
				ok(true, "Make sure nothing was allocated");
				start();
			});
		});
	});
});
*/

test("Pointer Bucket Collection", function() {
	var root = red.create("dict");
	var a_dict = red.create("dict");
	var b_dict = red.create("dict");
	var croot = red.find_or_put_contextual_obj(root);
	root.set("a", a_dict);
	root.set("b", b_dict);
	var ca_dict = croot.prop("a");
	var cb_dict = croot.prop("b");
	equal(ca_dict.get_object(), a_dict);
	equal(cb_dict.get_object(), b_dict);
	root.unset("a");
	equal(croot.prop("a"), undefined);
	var expired_cobjs = red.get_expired_contextual_objects(root);
	equal(expired_cobjs.length, 1);
	equal(expired_cobjs[0], ca_dict);
	ca_dict.destroy();
	expired_cobjs = red.get_expired_contextual_objects(root);
	equal(expired_cobjs.length, 0);
});

}());
