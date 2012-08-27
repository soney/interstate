var cp = concat_prefix = function(prefix, strs) {
	var do_it = function(str) {
		if(prefix == "") {
			return str;
		} else {
			return prefix+"/"+str;
		}
	};

	if(typeof strs === "string") {
		return do_it(strs);
	} else {
		return strs.map(do_it);
	}
};
var c = concat = function() {
	var rv = [];
	return rv.concat.apply(rv, arguments);
};

var path = "";
var build_path = cp(path, "build");
var src = cp(path, "src");
var vendor_src = cp(src, "vendor");
var cjs_path = cp(vendor_src, "cjs");

var cjs_inc = require("./src/vendor/cjs/include_libs");

exports.main_build = cp(build_path, ["red.min.js"]);

exports.main_src = c(
	cp(cjs_path, cjs_inc.main_src)
	, cp(vendor_src, [
				"esprima/esprima.js"
			])
	, cp(src, [
				"model/core.js"
				, "model/core/context_stack.js"
				, "model/core/cell.js"
				, "model/core/dict.js"
				, "model/core/stateful_obj.js"
				, "model/core/stateful_prop.js"
				, "model/core/shadow_statechart.js"
				, "model/attachments/attachment_core.js"
				, "model/attachments/dom_attachment.js"
				, "controller/commands/command_core.js"
				, "controller/commands/prop_commands.js"
				, "controller/commands/cell_commands.js"
				, "controller/commands/statechart_commands.js"
				, "controller/commands/combined_commands.js"
				, "controller/environment/default_environment.js"
			])
);

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
