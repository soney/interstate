var cp = function (prefix, strs) {
	var do_it = function (str) {
        "use strict";
		if (prefix === "") {
			return str;
		} else {
			return prefix + "/" + str;
		}
	};

	if (typeof strs === "string") {
		return do_it(strs);
	} else {
		return strs.map(do_it);
	}
};
var c = function () {
    "use strict";
	var rv = [];
	return rv.concat.apply(rv, arguments);
};

var path = "";
var build_path = cp(path, "build");
var src = cp(path, "src");
var vendor_src = cp(src, "_vendor");
var cjs_path = cp(vendor_src, "cjs");

var cjs_inc = require("./src/_vendor/cjs/include_libs");

exports.main_build = cp(build_path, ["red.min.js"]);

exports.main_src = c(
	cp(vendor_src, [
				"stopwatch.js",
				"array_diff.js",
				"set.js",
				"map.js",
				"uid.js",
				"aware_split.js",
	])
	, cp(cjs_path, cjs_inc.main_src)
	, cp(vendor_src, [
				"esprima/esprima.js",
				"ablejs/able.js",
				"underscore/underscore.js",
				"underscore/red_underscore_extensions.js",
				"jquery-ui-1.9.1.custom/js/jquery-1.8.2.js",
				"jquery-ui-1.9.1.custom/js/jquery-ui-1.9.1.custom.js",
				"raphael/raphael.js",
			])
	, cp(src, [
				"model/red.js",
				"model/utils/serialize.js",
				"model/utils/obj_utils.js",
				"model/utils/debug.js",
				"model/utils/parsed_value.js",
				"model/utils/parsed_fn.js",
				"model/basic_objects/cell.js",
				"model/basic_objects/dict.js",
				"model/basic_objects/stateful_obj.js",
				"model/basic_objects/stateful_prop.js",
				"model/basic_objects/query.js",
				"model/pointer/pointer.js",
				"model/pointer/special_contexts.js",
				"model/pointer/pointer_bucket.js",
				"model/contextual_objects/contextual_object.js",
				"model/contextual_objects/contextual_dicts.js",
				"model/contextual_objects/contextual_props.js",
				"model/statechart/red_statechart.js",
				"model/statechart/events/event_core.js",
				"model/statechart/events/red_obj_events.js",
				"model/statechart/events/manual_event.js",
				"model/statechart/events/dom_events.js",
				"model/statechart/events/timer_events.js",
				"model/statechart/events/statechart_events.js",
				"model/statechart/events/constraint_events.js",
				"model/statechart/events/parsed_events.js",
				"model/statechart/events/combination_event.js",
				"model/attachments/attachment_core.js",
				"model/attachments/dom_attachment.js",
				"model/communication_wrapper/wrapper_server.js",
				"model/communication_wrapper/wrapper_client.js",
				"controller/commands/command_core.js",
				"controller/commands/prop_commands.js",
				"controller/commands/cell_commands.js",
				"controller/commands/statechart_commands.js",
				"controller/commands/combined_commands.js",
				"controller/environment/command_stack.js",
				"controller/environment/red_environment.js",
				"view/inter_window_communication.js",
				"view/running_app.js",
				"view/editor_view.js",
				"view/raphael/raphael_utils.js",
				"view/raphael/editable_text.js",
				"view/raphael/state.js",
				"view/raphael/transition.js"
			]));

var ends_with = function(str1, str2) {
	return str1.slice(str1.length-str2.length) == str2;
};
exports.include_templates = function(strs) {
	var do_it = function(str) {
		if(ends_with(str, ".js")) {
			return "<script type = 'text/javascript' src = '"+str+"'></script>";
		} else if(ends_with(str, ".css")) {
			return "<link rel = 'stylesheet' href = '"+str+"' media='screen' />";
		}
	};
	if(typeof strs === "string") {
		return do_it(strs);
	} else {
		return strs.map(do_it).join("");
	}
};
