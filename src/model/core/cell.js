(function(red) {
var cjs = red.cjs, _ = red._;

var RedCell = function(options, defer_initialization) {
	options = options || {};
	this.id = _.uniqueId();
	if(defer_initialization !== true) {
		this.do_initialize(options);
	}
	this._last_tree = undefined;
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
				equals: red.check_context_equality,
				hash: "hash"
			}); }
			, settable: false
			, serialize: false
		}
		, "ignore_inherited_in_contexts": {
			default: function() { return []; }
		}
		, "default_context": {
			start_with: function() { return cjs.$(); }
			, getter: function(me) { return me.get(); }
			, setter: function(me, context) { me.set(context, true); }
		}
	};
	red.install_proto_builtins(proto, my.builtins);
	proto.do_initialize = function(options) {
		var self = this;
		red.install_instance_builtins(this, options, my);
		this._tree = cjs.$(function() {
			return esprima.parse(self.get_str());
		});
	};
	proto.get = function(context) {
		var contextual_values = this.get_contextual_values();

		var val = contextual_values.get_or_put(context, function() {
			var tree = this._tree.get();
			return red.get_parsed_$(tree, {
				context: context, 
				ignore_inherited_in_contexts: this.get_ignore_inherited_in_contexts()
			});
		}, this);

		return val;
	};
	proto.destroy = function() {
		this._tree.destroy();
		this._str.destroy();
	};
	proto.serialize = function() {
		var rv = {};

		var self = this;
		_.each(my.builtins, function(builtin, name) {
			if(builtin.serialize !== false) {
				var getter_name = builtin.getter_name || "get_" + name;
				rv[name] = red.serialize(self[getter_name]());
			}
		});

		return rv;
	};
	my.deserialize = function(obj) {
		var serialized_options = {};
		_.each(my.builtins, function(builtin, name) {
			if(builtin.serialize !== false) {
				serialized_options[name] = obj[name];
			}
		});

		var rv = new RedCell(undefined, true);
		rv.initialize = function() {
			var options = {};
			_.each(serialized_options, function(serialized_option, name) {
				options[name] = red.deserialize(serialized_option);
			});
			this.do_initialize(options);
		};

		return rv;
	};
	proto.hash = function() {
		return this.id;
	};
}(RedCell));

red.RedCell = RedCell;
red.define("cell", function(options) {
	var cell = new RedCell(options);
	return cell;
});

}(red));
