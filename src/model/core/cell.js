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

var get_op_$ = function(op) {
	var args = _.rest(arguments);
	return cjs.$(function() {
		var op_got = cjs.get(op);
		var args_got = _.map(args, cjs.get);

		return op_got.apply(this, args_got);
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
		return get_op_$(op_func, left_arg, right_arg);
	} else if(type === "UnaryExpression") {
		var op_func = unary_operators[node.operator];
		var arg = get_$(node.argument, context, ignore_inherited_in_contexts);
		return get_op_$(op_func, arg);
	} else if(type === "CallExpression") {
		var callee = get_$(node.callee, context, ignore_inherited_in_contexts);
		var args = _.map(node.arguments, function(arg) {
			return get_$(arg, context, ignore_inherited_in_contexts);
		});
		return get_op_$.apply(this, ([callee]).concat(args))
	} else if(type === "Identifier") {
		var name = node.name;
		return cjs.$(function() {
			var curr_context = context;
			var context_item = curr_context.last();
			var rv;
			while(!curr_context.is_empty()) {
				if(context_item instanceof red.RedDict) {
					if(_.indexOf(ignore_inherited_in_contexts, context_item) >= 0) {
						if(context_item._has_direct_prop(name)) {
							rv = context_item._get_direct_prop(name, curr_context);
							break;
						}
					} else {
						if(context_item.has_prop(name, curr_context)) {
							rv = context_item.get(name, curr_context);
							break;
						}
					}
				}
				curr_context = curr_context.pop();
				context_item = curr_context.last();
			}
			return cjs.get(rv);
		});
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
		return cjs.$(function() {
			var object = eval_tree(node.object, context, ignore_inherited_in_contexts);
			var object_got = cjs.get(object);
			if(object_got instanceof red.RedDict) {
				//More cases here
				variable_context = red.create("context", {stack: [object_got]});
				if(!variable_context) { return undefined; }
				var property = get_$(node.property, variable_context, ignore_inherited_in_contexts);
				return property;
			} else {
				if(object_got == null) {
					return undefined;
				} else {
					return(object_got[node.property.name]);
				}
			}
		});
	} else if(type === "ArrayExpression") {
		return _.map(node.elements, function(element) {
			return eval_tree(element, context, ignore_inherited_in_contexts);
		});
	} else if(type === "BlockStatement") {
		var rv = {};
		_.forEach(node.body, function(key_value_pair) {
			var key = key_value_pair.label.name;
			var value = eval_tree(key_value_pair.body, context, ignore_inherited_in_contexts);
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
		return { str: this.get_str(), ignore_inherited_in_contexts: red.serialize(this._ignore_inherited_in_contexts)};
	};
	my.deserialize = function(obj) {
		var rv = new RedCell(undefined, true);
		rv.initialize = function() {
			this.do_initialize({
				str: obj.str
				, ignore_inherited_in_contexts: red.deserialize(obj.ignore_inherited_in_contexts)
			});
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
