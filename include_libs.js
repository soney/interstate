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
var src = cp(path, "src");
var vendor_src = cp(src, "_vendor");
var cjs_path = cp(vendor_src, "constraintjs");

exports.vendor = c(
	cp(vendor_src, [
				"underscore/underscore.js",
				"jquery-ui-1.10.4.custom/js/jquery-2.1.1.js",
				"jquery-ui-1.10.4.custom/js/jquery-ui-1.10.4.custom.js",
				"raphael/raphael.js",
				"snap/snap.svg.js",
				"esprima/esprima.js",
				"qrcode.min.js",
				"ace/ace.js",
				"magictouch.js",
				"Box2dWeb-2.1a.3/Box2dWeb-2.1.a.3.js"
			])
);

exports.runtime = c(
	cp(vendor_src, [
				"set.js",
				"map.js",
				"uid.js",
				"touch_replay.js"
	]),
	cp(cjs_path, ["cjs.js"]),
	cp(vendor_src, [
				"ablejs/able.js",
				"underscore/underscore.deferred.js",
				"underscore/ist_underscore_extensions.js",
			]),
	cp(src, [
				"model/interstate.js",
				"model/utils/serialize.js",
				"model/errors.js",
				"model/utils/obj_utils.js",
				"model/utils/debug.js",
				"model/utils/parsed_value.js",
				"model/utils/parsed_fn.js",
				"model/utils/map_diff.js",
				"model/builtins/devices.js",
				"model/builtins/query.js",
				"model/builtins/initialize_root.js",
				"model/basic_objects/basic_core.js",
				"model/basic_objects/cell.js",
				"model/basic_objects/dict.js",
				"model/basic_objects/stateful_obj.js",
				"model/basic_objects/stateful_prop.js",
				"model/pointer/pointer.js",
				"model/pointer/special_contexts.js",
				"model/contextual_objects/contextual_core.js",
				"model/contextual_objects/contextual_dict.js",
				"model/contextual_objects/contextual_cell.js",
				"model/contextual_objects/contextual_stateful.js",
				"model/contextual_objects/contextual_stateful_prop.js",
				"model/statechart/ist_state.js",
				"model/statechart/ist_start_state.js",
				"model/statechart/ist_statechart.js",
				"model/statechart/ist_statechart_transition.js",
				"model/statechart/events/event_core.js",
				"model/statechart/events/animation_events.js",
				"model/statechart/events/box2d_events.js",
				"model/statechart/events/ist_obj_events.js",
				"model/statechart/events/manual_event.js",
				"model/statechart/events/dom_events.js",
				"model/statechart/events/timer_events.js",
				"model/statechart/events/statechart_events.js",
				"model/statechart/events/constraint_events.js",
				"model/statechart/events/parsed_events.js",
				"model/statechart/events/combination_event.js",
				"model/statechart/events/path_crossing.js",
				"model/attachments/attachment_core.js",
				"model/attachments/touchcluster_attachment.js",
				"model/attachments/dom_attachment.js",
				"model/attachments/raphael_attachment.js",
				"model/attachments/fireable_attachment.js",
				"model/attachments/event_attachment.js",
				//"model/attachments/three_attachment.js",
				"model/attachments/canvas_attachment.js",
				"model/attachments/box2d_attachment.js",
				"model/touch/touch_cluster.js",
				//"model/touch/gesture.js",
				"model/touch/svg_path.js",
				"model/communication_wrapper/remote_constraint.js",
				"model/communication_wrapper/comm_mechanisms.js",
				"model/communication_wrapper/wrapper_server.js",
				"model/communication_wrapper/wrapper_client.js",
				"model/communication_wrapper/remote_statecharts.js",
				"model/communication_wrapper/program_state_client.js",
				"model/communication_wrapper/program_state_server.js",
				"controller/commands/command_core.js",
				"controller/commands/prop_commands.js",
				"controller/commands/cell_commands.js",
				"controller/commands/statechart_commands.js",
				"controller/commands/combined_commands.js",
				"controller/environment/command_stack.js",
				"controller/environment/ist_environment.js",
				"view/running_app.js",
				"view/touchscreen/touchscreen_layer.js",
				"view/touchscreen/simple_touch_view.js",
				"view/touchscreen/touch_cluster_view.js",
				"view/touchscreen/svg_path_view.js",
			])
);

exports.runtime_style = cp(src, ["view/editor/style/runtime_style.css"]);

exports.editor = c(
	cp(src, [
		"view/editor/jqui_editable_text.js",
		"view/editor/editor_view.js",
		"view/editor/component_list.js",
		"view/editor/navigator.js",
		"view/editor/pinned.js",
		"view/editor/column.js",
		"view/editor/prop.js",
		"view/editor/cell.js",
		"view/editor/copies.js",
		"view/editor/val_summary.js",
		//"view/editor/statechart/raphael_utils.js",
		"view/editor/statechart/editable_text.js",
		"view/editor/statechart/layout_engine.js",
		"view/editor/statechart/start_state_view.js",
		"view/editor/statechart/state_view.js",
		"view/editor/statechart/transition_view.js",
		"view/editor/statechart/statechart_view.js",
		"view/editor/statechart/hrange.js",
		"view/editor/style/editor_style.css",
		"view/editor/style/attachment_styles.css",
		"view/editor/style/fonts/Inconsolata/stylesheet.css",
		"view/editor/style/fonts/SourceSansPro/stylesheet.css",
		"view/editor/attachment_views/attachment_view.js",
		"view/editor/attachment_views/dom_attachment_view.js",
		"view/editor/attachment_views/raphael_attachment_view.js",
		"view/editor/attachment_views/touch_cluster_attachment_view.js",
		"view/editor/attachment_views/gesture_attachment_view.js",
		"_vendor/bootstrap-3.1.0/css/bootstrap.css",
		"_vendor/bootstrap-3.1.0/css/bootstrap-theme.css"
	])
);

var ends_with = function(str1, str2) {
	return str1.slice(str1.length-str2.length) == str2;
};
exports.include_templates = function(strs, exclude_css) {
	var do_it = function(str) {
		if(ends_with(str, ".js")) {
			return "<script type = 'text/javascript' src = '"+str+"'></script>";
		} else if(ends_with(str, ".css") && exclude_css !== true) {
			return "<link rel = 'stylesheet' href = '"+str+"' />";
		} else {
			return "";
		}
	};
	if(typeof strs === "string") {
		return do_it(strs);
	} else {
		return strs.map(do_it).join("");
	}
};
