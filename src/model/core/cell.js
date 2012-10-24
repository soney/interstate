(function(red) {
var cjs = red.cjs, _ = red._;
var esprima = window.esprima;


var binary_operators = {
	"+": function(a, b) { return a + b; }
	, "-": function(a, b) { return a - b; }
	, "*": function(a, b) { return a * b; }
	, "/": function(a, b) { return a / b; }
	, "%": function(a, b) { return a % b; }
	, "||": function(a, b) { return a || b; }
	, "&&": function(a, b) { return a && b; }
	, "|": function(a, b) { return a | b; }
	, "&": function(a, b) { return a & b; }
	, "==": function(a, b) { return a == b; }
	, "===": function(a, b) { return a === b; }
	, ">": function(a, b) { return a > b; }
	, ">=": function(a, b) { return a >= b; }
	, "<": function(a, b) { return a < b; }
	, "<=": function(a, b) { return a <= b; }
};

var unary_operators = {
	"-": function(a) { return -a; }
	, "!": function(a) { return !a; }
};

var get_op_$ = function(op_context, op) {
	var args = _.rest(arguments, 2);
	return cjs.$(function() {
		var op_got = cjs.get(op);
		var args_got = _.map(args, cjs.get);
		var op_context_got = cjs.get(op_context);

		if(_.isFunction(op_got)) {
			var rv = op_got.apply(op_context_got, args_got);
			return rv;
		}
	});
};

var get_member_$ = function(key, context, ignore_inherited_in_contexts) {
	return cjs.$(function() {
		var key_got = cjs.get(key);
		var curr_context = context;
		var context_item = curr_context.last();
		var rv;
		while(!curr_context.is_empty()) {
			var context_item_got = cjs.get(context_item);
			if(context_item_got instanceof red.RedDict) {
				if(_.indexOf(ignore_inherited_in_contexts, context_item_got) >= 0) {
					if(context_item_got._has_direct_prop(key_got)) {
						rv = context_item_got._get_direct_prop(key_got, curr_context);
						break;
					}
				} else {
					if(context_item_got.has_prop(key_got, curr_context)) {
						rv = context_item_got.get(key_got, curr_context);
						break;
					}
				}
			} else if(context_item_got && context_item_got[key_got]/*_.has(context_item_got, key_got)*/) {
				return context_item_got[key_got];
			} else if(context_item && context_item[key_got]) {
				return context_item[key_got];
			}
			curr_context = curr_context.pop();
			context_item = curr_context.last();
		}
		return cjs.get(rv);
	});
};

var get_$ = function(node, context, ignore_inherited_in_contexts) {
	if(!node) { return undefined; }
	if(!ignore_inherited_in_contexts) { ignore_inherited_in_contexts = []; }
	var type = node.type;
	if(type === "ExpressionStatement") {
		return get_$(node.expression, context, ignore_inherited_in_contexts);
	} else if(type === "Literal") {
		return node.value;
	} else if(type === "BinaryExpression") {
		var op_func = binary_operators[node.operator];
		var left_arg = get_$(node.left, context, ignore_inherited_in_contexts)
			, right_arg = get_$(node.right, context, ignore_inherited_in_contexts);
		return get_op_$(window, op_func, left_arg, right_arg);
	} else if(type === "UnaryExpression") {
		var op_func = unary_operators[node.operator];
		var arg = get_$(node.argument, context, ignore_inherited_in_contexts);
		return get_op_$(window, op_func, arg);
	} else if(type === "CallExpression") {
		var callee = get_$(node.callee, context, ignore_inherited_in_contexts);
		var op_context = window;
		if(node.callee.type === "MemberExpression") {
			op_context = get_$(node.callee.object, context, ignore_inherited_in_contexts);
		}
		var args = _.map(node.arguments, function(arg) {
			return get_$(arg, context, ignore_inherited_in_contexts);
		});
		return get_op_$.apply(this, ([op_context, callee]).concat(args))
	} else if(type === "Identifier") {
		var name = node.name;
		return get_member_$(name, context, ignore_inherited_in_contexts);
	} else if(type === "ThisExpression") {
		return cjs.$(function() {
			var curr_context = context;
			var context_item = curr_context.last();
			var rv;
			while(!curr_context.is_empty()) {
				if(context_item instanceof red.RedDict) {
					rv = context_item;
					break;
				}
				curr_context = curr_context.pop();
				context_item = curr_context.last();
			}
			return rv;
		});
	} else if(type === "MemberExpression") {
		var object = get_$(node.object, context, ignore_inherited_in_contexts);
		var variable_context = red.create("context", {stack: [object]});
		var property;
		if(node.computed) {
			var key = get_$(node.property, context, ignore_inherited_in_contexts);
			property = get_member_$(key, variable_context, ignore_inherited_in_contexts);
		} else {
			property = get_$(node.property, variable_context, ignore_inherited_in_contexts);
		}

		return property;
	} else if(type === "ArrayExpression") {
		return _.map(node.elements, function(element) {
			return get_$(element, context, ignore_inherited_in_contexts);
		});
	} else if(type === "BlockStatement") {
		var rv = {};
		_.forEach(node.body, function(key_value_pair) {
			var key = key_value_pair.label.name;
			var value = get_$(key_value_pair.body, context, ignore_inherited_in_contexts);
			rv[key] = value;
		});
		return rv;
	} else if(type === "Program") {
		return get_$(node.body[0], context, ignore_inherited_in_contexts);
	} else {
		console.log(type, node);
	}
};

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
			, setter: function(me, str) { me.set(str, true); }
		}
		, "contextual_values": {
			default: function() { return cjs.map(); }
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
		this.get_contextual_values() .set_equality_check(red.check_context_equality);
	};
	proto.get = function(context) {
		var tree = this._tree.get();
		var contextual_values = this.get_contextual_values();
		if(tree !== this._last_tree) {
			this._last_tree = tree;
			contextual_values.clear();
		}

		var val;
		if(contextual_values.has(context)) {
			val = contextual_values.item(context);
		} else {
			val = get_$(tree, context, this.get_ignore_inherited_in_contexts());
			contextual_values.item(context, val);
		}
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
}(RedCell));

red.RedCell = RedCell;
red.define("cell", function(options) {
	var cell = new RedCell(options);
	return cell;
});

}(red));
