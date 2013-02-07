(function(red) {
var cjs = red.cjs, _ = red._;
var esprima = window.esprima;

var binary_operators = {
	"===":	function(a, b) { return red.check_pointer_equality_eqeqeq(a,b); }
	,"!==":	function(a, b) { return !red.check_pointer_equality_eqeqeq(a,b); }
	, "==":	function(a, b) { return red.check_pointer_equality_eqeq(a, b); }
	, "!=":	function(a, b) { return !red.check_pointer_equality_eqeq(a,b); }
	, ">":	function(a, b) { return a > b; }
	, ">=":	function(a, b) { return a >= b; }
	, "<":	function(a, b) { return a < b; }
	, "<=":	function(a, b) { return a <= b; }
	, "+":	function(a, b) { return a + b; }
	, "-":	function(a, b) { return a - b; }
	, "*":	function(a, b) { return a * b; }
	, "/":	function(a, b) { return a / b; }
	, "%":	function(a, b) { return a % b; }
	, "&&":	function(a, b) { return a && b; }
	, "||":	function(a, b) { return a || b; }
	, "&":	function(a, b) { return a & b; }
	, "|":	function(a, b) { return a | b; }
	, "^":	function(a, b) { return a ^ b; }
	, "<<":	function(a, b) { return a << b; }
	, ">>":	function(a, b) { return a >> b; }
	,">>>":	function(a, b) { return a >>> b; }
}, unary_operators = {
	"-":	function(a) { return -a; }
	, "!":	function(a) { return !a; }
	, "~":	function(a) { return ~a; }
};

var get_op_$ = function(calling_context, op) {
	var args = _.rest(arguments, 2);
	return cjs.$(function() {
		var op_got = cjs.get(op);
		var args_got = _.map(args, cjs.get);
		var calling_context_got = cjs.get(calling_context);

		if(_.isFunction(op_got)) {
			var rv = op_got.apply(calling_context, args_got);
			return rv;
		}
	});
};

var get_conditional_$ = function(test, consequent, alternate) { // test ? consequent : alternate
	return cjs.$(function() {
		var test_got = cjs.get(test);
		if(test_got) {
			return cjs.get(consequent);
		} else {
			return cjs.get(alternate);
		}
	});
};

var get_identifier_$ = function(key, context, ignore_inherited_in_contexts) {
	if(key === "root") {
		return context.slice(0, 1);
	} else if(key === "window") {
		return window;
	}

	ignore_inherited_in_contexts = ignore_inherited_in_contexts || [];

	return cjs.$(function() {
		var curr_context = context;
		var context_item = curr_context.points_at();
		var rv;

		while(!curr_context.is_empty()) {
			if(context_item instanceof red.Dict) {
				if(_.indexOf(ignore_inherited_in_contexts, context_item) >= 0) {
					if(context_item._has_direct_prop(key)) {
						rv = context_item.get_prop_pointer(key, curr_context);
						break;
					}
				} else {
					if(context_item._has_prop(key, curr_context)) {
						rv = context_item.get_prop_pointer(key, curr_context);
						break;
					}
				}
			} else if(context_item instanceof red.SpecialContext) {
				var context_obj = context_item.get_context_obj();
				if(context_obj.hasOwnProperty(key)) {
					return curr_context.push(context_obj[key]);
				}
			} else if(context_item && context_item[key]) {
				rv = curr_context.push(context_item[key]);
			}
			curr_context = curr_context.pop();
			context_item = curr_context.points_at();
		}
		// rv is a context
		if(rv) {
			return rv.val();
		} else {
			return undefined;
		}
	});
};

var get_this_$ = function(context) {
	return cjs.$(function() {
		var curr_context = context;
		var context_item = curr_context.points_at();

		while(!curr_context.is_empty()) {
			if(context_item instanceof red.Dict) {
				return curr_context;
			}
			curr_context = curr_context.pop();
			context_item = curr_context.points_at();
		}

		return undefined;
	});
};

var get_member_$ = function(object, property) {
	return cjs.$(function() {
		var obj_got = cjs.get(object);

		if(!obj_got) {
			throw new Error("Looking for property of " + obj_got);
		}

		var prop_got = cjs.get(property);
		if(obj_got instanceof red.Pointer) {
			var prop_val = obj_got.call("get_prop_pointer", prop_got);
			return prop_val.val();
		} else {
			return obj_got[prop_got];
		}
	});
};

var get_array_$ = function(elements) {
	return cjs.$(function() {
		return _.map(elements, function(element) {
			return cjs.get(element);
		});
	});
};

var get_$ = red.get_parsed_$ = function(node, options) {
	if(!node) { return undefined; }
	var type = node.type;
	if(type === "ExpressionStatement") {
		return get_$(node.expression, options);
	} else if(type === "Literal") {
		return node.value;
	} else if(type === "BinaryExpression") {
		var op_func = binary_operators[node.operator];
		var left_arg = get_$(node.left, options),
			right_arg = get_$(node.right, options);
		return get_op_$(window, op_func, left_arg, right_arg);
	} else if(type === "UnaryExpression") {
		var op_func = unary_operators[node.operator];
		var arg = get_$(node.argument, options);
		return get_op_$(window, op_func, arg);
	} else if(type === "CallExpression") {
		var callee = get_$(node.callee, options);
		var op_context = window;
		if(node.callee.type === "MemberExpression") {
			op_context = get_$(node.callee.object, options);
		}
		var args = _.map(node.arguments, function(arg) {
			return get_$(arg, options);
		});
		return get_op_$.apply(this, ([op_context, callee]).concat(args))
	} else if(type === "Identifier") {
		if(options.is_property) {
			var property_of = options.property_of;
		} else {
			return get_identifier_$(node.name, options.context, options.ignore_inherited_in_contexts);
		}
	} else if(type === "ThisExpression") {
		return get_this_$(options.context);
	} else if(type === "MemberExpression") {
		var object = get_$(node.object, options);
		var property = node.computed ? get_$(node.property, options) : node.property.name;
		return get_member_$(object, property);
	} else if(type === "ArrayExpression") {
		var elements = _.map(node.elements, function(element) {
			return get_$(element, options);
		});
		return get_array_$(elements);
	} else if(type === "ConditionalExpression") {
		return get_conditional_$(node.test, node.consequent, node.alternate);
	} else if(type === "Program") {
		return get_$(node.body[0], options);
	} else {
		console.log(type, node);
	}
};
}(red));
