(function(red) {
var cjs = red.cjs, _ = red._;
var esprima = window.esprima;

red.on_event = function(event_type) {
	if(event_type === "timeout" || event_type === "time") {
		var time = arguments[1];
		var timeout_event = red.create_event(event_type, time);
		return timeout_event;
	} else {
		var targets = _.rest(arguments);
		var events = [];

		if(targets) {
			var statechart_spec = event_type;
			var statechart_event = red.create_event("transition", targets, statechart_spec);
			events.push(statechart_event);

			var red_event_type = event_type;
			var red_event = red.create_event("red_obj", red_event_type, targets);
			events.push(red_event);
		}
		if(arguments.length <= 1) { // Ex: on('mouseup') <-> on('mouseup', window)
			targets = window;
		}
		var dom_event = red.create_event("dom", event_type, targets);
		events.push(dom_event);

		return red.create_event("combination", events);
	}
};


red.binary_operators = {
	"===":	function(a, b) { return red.check_pointer_value_equality_eqeqeq(a,b); }
	,"!==":	function(a, b) { return !red.check_pointer_value_equality_eqeqeq(a,b); }
	, "==":	function(a, b) { return red.check_pointer_value_equality_eqeq(a, b); }
	, "!=":	function(a, b) { return !red.check_pointer_value_equality_eqeq(a,b); }
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
	,">>>":	function(a, b) { return a >>> b; }
	,"instanceof":	function(a, b) { return a instanceof b; }
};
red.unary_operators = {
	"-":	function(a) { return -a; }
	, "!":	function(a) { return !a; }
	, "~":	function(a) { return ~a; }
	, "typeof":	function(a) { return typeof a; }
};

var get_op_$ = function(calling_context, pcontext, op) {
	var args = _.rest(arguments, 3);
	return cjs.$(function() {
		var op_got = cjs.get(op);

		if(_.isFunction(op_got)) {
			var args_got = _.map(args, cjs.get);
			var calling_context_got = cjs.get(calling_context);
			var rv = op_got.apply(calling_context_got, args_got);
			return rv;
		} else if(op_got instanceof red.ParsedFunction) {
			return op_got._apply(pcontext, args);
		} else {
			throw new Error("Calling a non-function");
		}
	});
};

var AND_OP = 0, OR_OP = 1;
var get_logical_$ = function(op, left, right) {
	var op_id;
	if(op === "&&") {
		op_id = AND_OP;
	} else if(op === "||") {
		op_id = OR_OP;
	} else {
		console.error("Unknown op " + op);
	}
	return cjs.$(function() {
		switch(op_id) {
			case AND_OP:
				return left.get() && right.get();
			case OR_OP:
				return left.get() || right.get();
		};
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
		return new red.PointerValue({pointer: context.slice(0, 1)});
	} else if(key === "window") {
		return window;
	} else if(key === "parent") {
		var found_this = false;
		var curr_context = context;
		var context_item = curr_context.points_at();

		while(!curr_context.is_empty()) {
			if(context_item instanceof red.Dict) {
				if(found_this) {
					return new red.PointerValue({pointer: curr_context});
				} else {
					found_this = true;
				}
			}
			curr_context = curr_context.pop();
			context_item = curr_context.points_at();
		}
	}

	ignore_inherited_in_contexts = ignore_inherited_in_contexts || [];

	var rv = cjs.$(function() {
		var curr_context = context;
		var context_item = curr_context.points_at();

		
		while(!curr_context.is_empty()) {
			if(context_item instanceof red.Dict) {
				if(_.indexOf(ignore_inherited_in_contexts, context_item) >= 0) {
					if(context_item._has_direct_prop(key)) {
						return context_item.prop_val(key, curr_context);
					}
				} else {
					if(context_item._has_prop(key, curr_context)) {
						return context_item.prop_val(key, curr_context);
					}
				}
			} else if(context_item instanceof red.Cell) {
				var special_contexts = curr_context.special_contexts();
				var len = special_contexts.length;
				for(var i = 0; i<len; i++) {
					var sc = special_contexts[i];
					var context_obj = sc.get_context_obj();
					if(context_obj.hasOwnProperty(key)) {
						return context_obj[key].value;
					}
				}
			} else if(context_item && context_item[key]) {
				return context_item[key];
			}
			curr_context = curr_context.pop();
			context_item = curr_context.points_at();
		}
		if(window.hasOwnProperty(key)) {
			return window[key];
		} else {
			return undefined;
		}
	});
	if(red.__debug) {
		rv.__debug_info = {
			type: "identifier",
			key: key,
			context: context
		};
	}
	return rv;
};

var get_this_$ = function(context) {
	var rv = cjs.$(function() {
		var curr_context = context;
		var context_item = curr_context.points_at();

		while(!curr_context.is_empty()) {
			if(context_item instanceof red.Dict) {
				return new red.PointerValue({pointer: curr_context});
			}
			curr_context = curr_context.pop();
			context_item = curr_context.points_at();
		}

		return undefined;
	});

	if(red.__debug) {
		rv.__debug_info = {
			type: "this",
			context: context
		};
	}

	return rv;
};

var get_member_$ = function(object, property) {
	var rv = cjs.$(function() {
		var obj_got = cjs.get(object);

		if(!obj_got) {
			throw new Error("Looking for property of " + obj_got);
		}

		var prop_got = cjs.get(property);


		if(obj_got instanceof red.PointerValue) {
			if(prop_got === "parent") {
				var found_this = false;
				var curr_context = obj_got.get_pointer();
				var context_item = curr_context.points_at();

				while(!curr_context.is_empty()) {
					if(context_item instanceof red.Dict) {
						if(found_this) {
							return new red.PointerValue({pointer: curr_context});
						} else {
							found_this = true;
						}
					}
					curr_context = curr_context.pop();
					context_item = curr_context.points_at();
				}
			}
			var pointer = obj_got.get_pointer();
			var dict = pointer.points_at();
			var rv = dict.prop_val(prop_got, pointer);
			return rv;
		} else {
			return obj_got[prop_got];
		}
	});

	if(red.__debug) {
		rv.__debug_info = {
			type: "member",
			property: property,
			object: object
		};
	}

	return rv;
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
		var op_func = red.binary_operators[node.operator];
		var left_arg = get_$(node.left, options),
			right_arg = get_$(node.right, options);
		return get_op_$(window, options.context, op_func, left_arg, right_arg);
	} else if(type === "UnaryExpression") {
		var op_func = red.unary_operators[node.operator];
		var arg = get_$(node.argument, options);
		return get_op_$(window, options.context, op_func, arg);
	} else if(type === "CallExpression") {
		var callee = get_$(node.callee, options);
		var op_context = window;
		if(node.callee.type === "MemberExpression") {
			op_context = get_$(node.callee.object, options);
		}
		var args = _.map(node.arguments, function(arg) {
			return get_$(arg, options);
		});
		return get_op_$.apply(this, ([op_context, options.context, callee]).concat(args))
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
		return get_conditional_$(get_$(node.test, options), get_$(node.consequent, options), get_$(node.alternate, options));
	} else if(type === "LogicalExpression") {
		var left_arg = get_$(node.left, options),
			right_arg = get_$(node.right, options);
		return get_logical_$(node.operator, left_arg, right_arg);
	} else if(type === "FunctionExpression") {
		return red.get_fn_$(node, options);
	} else if(type === "Program") {
		return get_$(node.body[0], options);
	} else {
		console.log(type, node);
	}
};

var func_regex = /^\s*function\s*\((\s*[a-zA-Z$][\w\$]*\s*,)*\s*([a-zA-Z$][\w\$]*\s*)?\)\s*{.*}\s*$/;

red.parse = function(str) {
	if((str.replace(/\n/g, "")).match(func_regex)) {
		return esprima.parse("("+str+")");
	} else {
		return esprima.parse(str);
	}
};

}(red));
