(function(red) {
var cjs = red.cjs, _ = red._;

red.Cell = function(options, defer_initialization) {
	options = options || {};
	this.uid = options.uid || uid();
	red.register_uid(this.uid, this);
	if(defer_initialization !== true) {
		this.do_initialize(options);
	}
};
(function(my) {
	var proto = my.prototype;
	my.builtins = {
		"str": {
			start_with: function() { return cjs.$(""); }
			, getter: function(me) { return me.get(); }
			, setter: function(me, str) {
				cjs.wait();
				me.set(str, true);
				var cvs = this.get_contextual_values();
				if(cvs) { cvs.clear(); }
				cjs.signal();
			}
		}
		, "contextual_values": {
			default: function() { return cjs.map({
				equals: red.check_pointer_equality,
				hash: "hash"
			}); }
			, settable: false
			, serialize: false
		}
		, "ignore_inherited_in_contexts": {
			default: function() { return []; }
		}

	};
	red.install_proto_builtins(proto, my.builtins);
	proto.do_initialize = function(options) {
		var self = this;
		red.install_instance_builtins(this, options, my);
		this._tree = cjs.$(function() {
			var str = self.get_str();
			return red.parse(str);
		});
	};
	proto.constraint_in_context = function(pcontext) {
		var contextual_values = this.get_contextual_values();

		var val = contextual_values.get_or_put(pcontext, function() {
			var tree = this._tree.get();
			if(_.isFunction(tree)) {
				return tree;
			} else {
				return red.get_parsed_$(tree, {
					context: pcontext, 
					ignore_inherited_in_contexts: this.get_ignore_inherited_in_contexts()
				});
			}
		}, this);

		return val;
	};
	proto.destroy = function() {
		this._tree.destroy();
	};
	proto.clone = function(options) {
		var rv = new red.Cell(_.extend({
			str: this.get_str()
		}, options));
		return rv;
	};

	proto.hash = function() {
		return this.uid;
	};

	red.register_serializable_type("cell",
									function(x) { 
										return x instanceof my;
									},
									function(include_uid) {
										var rv = { };
										if(include_uid) { rv.uid = this.uid; }
										if(window.opener && include_uid) { debugger; }

										var self = this;
										_.each(my.builtins, function(builtin, name) {
											if(builtin.serialize !== false) {
												var getter_name = builtin.getter_name || "get_" + name;
												rv[name] = red.serialize(self[getter_name]());
											}
										});

										return rv;
									},
									function(obj) {
										var serialized_options = {};
										_.each(my.builtins, function(builtin, name) {
											if(builtin.serialize !== false) {
												serialized_options[name] = obj[name];
											}
										});

										var rv = new my({uid: obj.uid}, true);
										rv.initialize = function() {
											var options = { };
											_.each(serialized_options, function(serialized_option, name) {
												options[name] = red.deserialize(serialized_option);
											});
											this.do_initialize(options);
										};

										return rv;
									});
}(red.Cell));

red.define("cell", function(options) {
	var cell = new red.Cell(options);
	return cell;
});

}(red));
