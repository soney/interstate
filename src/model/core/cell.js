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

var eval_tree = function(node, context, ignore_inherited_in_contexts) {
	if(!node) {
		return undefined;
	}
	if(!ignore_inherited_in_contexts) {
		ignore_inherited_in_contexts = [];
	}
	var type = node.type;
	if(type === "ExpressionStatement") {
		return eval_tree(node.expression, context, ignore_inherited_in_contexts);
	} else if(type === "CallExpression") {
		var callee = eval_tree(node.callee, context, ignore_inherited_in_contexts);
		var args = node.arguments;
		
		var args_got = _.map(args, function(arg) {
			return cjs.get(arg);
		});
		var callee_got = cjs.get(callee);
		return callee_got.apply(this, args_got);
	} else if(type === "Identifier") {
		var name = node.name;

		var curr_context = context;
		var context_item = curr_context.last();
		while(!curr_context.is_empty()) {
			if(context_item instanceof red.RedDict) {
				if(_.indexOf(ignore_inherited_in_contexts, context_item) < 0) {
					if(context_item.has_prop(name, curr_context)) {
						return context_item.get(name, curr_context);
					}
				} else {
					if(context_item._has_direct_prop(name)) {
						return context_item._get_direct_prop(name, curr_context);
					}
					
				}
			}
			curr_context = curr_context.pop();
			context_item = curr_context.last();
		}
		return undefined;
		/*

		var got_context;
		if(cjs.is_constraint(context)) {
			if(context.type === "red_stateful_prop") {
				got_context = context;
			} else {
				got_context = cjs.get(context);
			}
		} else {
			got_context = cjs.get(context);
		}

		var prop;
		while(got_context) {
			if(got_context.get_prop) {
				prop = got_context.get_prop(name);
				if(prop) {
					return cjs.get(prop);
				}
			}
			if(restrict_context === true) {
				break;
			}
			got_context = got_context.get_parent();
		}
		return undefined;
		*/
	} else if(type === "ThisExpression") {
	/*
		var got_context = cjs.get(context);

		while(got_context) {
			if(got_context instanceof RedDict) {
				return got_context;
			}
			got_context = got_context.get_parent();
		}
		*/
		return undefined;
	} else if(type === "MemberExpression") {
		var object = eval_tree(node.object, context, ignore_inherited_in_contexts);
		var object_got = cjs.get(object);
		//More cases here
		variable_context = object_got;
		var property = eval_tree(node.property, variable_context, ignore_inherited_in_contexts);
		return property;
	} else if(type === "Literal") {
		return node.value;
	} else if(type === "BinaryExpression") {
		var op_func = binary_operators[node.operator];
		var left_arg = eval_tree(node.left, context, ignore_inherited_in_contexts)
			, right_arg = eval_tree(node.right, context, ignore_inherited_in_contexts);
		return op_func(cjs.get(left_arg), cjs.get(right_arg));
	} else if(type === "UnaryExpression") {
		var op_func = unary_operators[node.operator];
		var arg = eval_tree(node.argument, context, ignore_inherited_in_contexts);

		return op_func(cjs.get(arg));
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
	} else {
		console.log(type, node);
	}
};

var RedCell = function(options) {
	options = options || {};
	var self = this;
	this._str = _.isString(options.str) ? cjs.$(options.str) : options.str;
	this._tree = cjs.$(function() {
		return esprima.parse(self.get_str());
	});
	this._ignore_inherited_in_contexts = _.isArray(options.ignore_inherited_in_contexts) ? options.ignore_inherited_in_contexts : [];
	this.id = _.uniqueId();

	red._set_descriptor(this._str,   "Cell str " + this.id);
	red._set_descriptor(this._tree,   "Cell tree " + this.id);
};
(function(my) {
	var proto = my.prototype;
	proto.set_str = function(str) {
		this._str.set(str);
		return this;
	};
	proto.get_str = function() {
		return this._str.get();
	};
	proto.get = function(context) {
		var self = this;
		var tree = this._tree.get();
		var ignore_inherited_in_contexts = this._ignore_inherited_in_contexts.slice();
		var context_item;
		while(context_item = context.iter()) {
			if(context_item instanceof red.RedDict && (cjs.get(context_item.direct_protos()) === self)) {
				ignore_inherited_in_contexts.push(context_item);
			}
		}
		context.reset_iterator();
		
		return eval_tree(tree.body[0], context, ignore_inherited_in_contexts);
	};
	proto.clone = function() {
		return red.create("cell", {str: this.get_str()});
	};
	proto.destroy = function() {
		this._tree.destroy();
		this._str.destroy();
	};
}(RedCell));

red.RedCell = RedCell;
red.define("cell", function(options) {
	var cell = new RedCell(options);
	return cell;
});

}(red));
