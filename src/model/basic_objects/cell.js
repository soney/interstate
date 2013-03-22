(function(red) {
var cjs = red.cjs, _ = red._;

red.Cell = function(options, defer_initialization) {
	options = options || {};
	this._id = options.uid || uid();
	red.register_uid(this._id, this);
	if(defer_initialization !== true) {
		this.do_initialize(options);
	}
};
(function(my) {
	var proto = my.prototype;
	my.builtins = {
		"str": {
			start_with: function() { return cjs.$(""); },
			getter: function(me) { return me.get(); },
			setter: function(me, str) {
				me.set(str, true);
			}
		},
		"ignore_inherited_in_first_dict": {
			default: function() { false; }
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
	proto.get_value = function(pcontext) {
		var tree = this._tree.get();
		var ignore_inherited_in_contexts;
		if(this.get_ignore_inherited_in_first_dict()) {
			for(var i = pcontext.length() - 1; i>=0; i--) {
				var item = pcontext.points_at(i);
				if(item instanceof red.Dict) {
					ignore_inherited_in_contexts = [item];
					break;
				}
			}
		} else {
			ignore_inherited_in_contexts = [];
		}
		return red.get_parsed_val(tree, {
			context: pcontext,
			ignore_inherited_in_contexts: ignore_inherited_in_contexts
		});
	};
	proto.get_constraint_for_context = function(pcontext) {
		return cjs.$(_.bind(this.get_value, this, pcontext));
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

	proto.id = proto.hash = function() { return this._id; };
	proto.summarize = function() {
		return this.id();
	};

	red.register_serializable_type("cell",
									function(x) { 
										return x instanceof my;
									},
									function(include_uid) {
										var rv = { };
										if(include_uid) { rv.uid = this.id(); }

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
										var rest_args = _.rest(arguments);
										
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
												options[name] = red.deserialize.apply(red, ([serialized_option]).concat(rest_args));
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
