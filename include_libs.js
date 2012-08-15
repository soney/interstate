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
				"core.js"
				, "core/cell.js"
				, "core/dict.js"
				, "core/prop.js"
				, "core/shadow_statechart.js"
				, "core/stateful_obj.js"
				, "core/stateful_prop.js"
				, "blueprints/dom_container.js"
				, "blueprints/dom_obj.js"
				, "commands/command_core.js"
				, "environment/default_environment.js"
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
