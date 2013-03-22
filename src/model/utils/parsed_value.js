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
	"===":	function(a, b) { return red.check_contextual_object_equality_eqeqeq(a,b); }
	,"!==":	function(a, b) { return !red.check_contextual_object_equality_eqeqeq(a,b); }
	, "==":	function(a, b) { return red.check_contextual_object_equality_eqeq(a, b); }
	, "!=":	function(a, b) { return !red.check_contextual_object_equality_eqeq(a,b); }
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

var get_op_val = function(calling_context, pcontext, op) {
	var args = _.rest(arguments, 3);
	if(_.isFunction(op)) {
		var rv = op.apply(calling_context, args);
		return rv;
	} else if(op instanceof red.ParsedFunction) {
		return op._apply(calling_context, pcontext, args);
	} else {
		//throw new Error("Calling a non-function");
		return undefined;
	}
};

var get_logical_val = function(op, left, right) {
	if(op === "&&") {
		return left && right;
	} else if(op === "||") {
		return left || right;
	} else {
		console.error("Unknown op " + op);
	}
};

var get_conditional_val = function(test, consequent, alternate) { // test ? consequent : alternate
	if(test) {
		return consequent;
	} else {
		return alternate;
	}
};

var get_identifier_val = function(key, context, ignore_inherited_in_contexts) {
	if(key === "root") {
		return red.find_or_put_contextual_obj(context.root(), context.slice(0, 1));
	} else if(key === "window") {
		return window;
	} else if(key === "parent") {
		var found_this = false;
		var curr_context = context;
		var context_item = curr_context.points_at();

		while(!curr_context.is_empty()) {
			if(context_item instanceof red.Dict) {
				if(found_this) {
					var rv = red.find_or_put_contextual_obj(context_item, curr_context);
					return rv;
				} else {
					found_this = true;
				}
			}
			curr_context = curr_context.pop();
			context_item = curr_context.points_at();
		}
	}


	ignore_inherited_in_contexts = ignore_inherited_in_contexts || [];

	var curr_context = context;
	var context_item = curr_context.points_at();
		
	while(!curr_context.is_empty()) {
		if(context_item instanceof red.Dict) {
			var contextual_obj = red.find_or_put_contextual_obj(context_item, curr_context);
			if(_.indexOf(ignore_inherited_in_contexts, context_item) >= 0) {
				if(contextual_obj.has(key, true)) {
					var rv = contextual_obj.prop_val(key);
					return rv;
				}
			} else {
				if(contextual_obj.has(key)) {
					var rv = contextual_obj.prop_val(key);
					return rv;
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
		}
		curr_context = curr_context.pop();
		context_item = curr_context.points_at();
	}
	if(window.hasOwnProperty(key)) {
		return window[key];
	} else {
		return undefined;
	}
};

var get_this_val = function(context) {
	var curr_context = context;
	var context_item = curr_context.points_at();

	while(!curr_context.is_empty()) {
		if(context_item instanceof red.Dict) {
			var contextual_obj = red.find_or_put_contextual_obj(context_item, curr_context);
			return contextual_obj;
		}
		curr_context = curr_context.pop();
		context_item = curr_context.points_at();
	}

	return undefined;
};

var get_member_val = function(object, property) {
	if(!object) {
		return undefined;
	}

	if(object instanceof red.ContextualObject) {
		if(property === "parent") {
			var found_this = false;
			var curr_context = object.get_pointer();
			var context_item = curr_context.points_at();

			while(!curr_context.is_empty()) {
				if(context_item instanceof red.Dict) {
					if(found_this) {
						var rv = red.find_or_put_contextual_obj(context_item, curr_context);
						return rv;
					} else {
						found_this = true;
					}
				}
				curr_context = curr_context.pop();
				context_item = curr_context.points_at();
			}
		}
		var rv = object.prop_val(property);
		return rv;
	} else {
		return object[property];
	}
};

var get_array_val = function(elements) {
	return elements;
};

var get_val = red.get_parsed_val = function(node, options) {
	if(!node) { return undefined; }
	var type = node.type;
	if(type === "ExpressionStatement") {
		return get_val(node.expression, options);
	} else if(type === "Literal") {
		return node.value;
	} else if(type === "BinaryExpression") {
		var op_func = red.binary_operators[node.operator];
		var left_arg = get_val(node.left, options),
			right_arg = get_val(node.right, options);
		return get_op_val(window, options.context, op_func, left_arg, right_arg);
	} else if(type === "UnaryExpression") {
		var op_func = red.unary_operators[node.operator];
		var arg = get_val(node.argument, options);
		return get_op_val(window, options.context, op_func, arg);
	} else if(type === "CallExpression") {
		var callee = get_val(node.callee, options);
		var op_context = window;
		if(node.callee.type === "MemberExpression") {
			op_context = get_val(node.callee.object, options);
		}
		var args = _.map(node.arguments, function(arg) {
			return get_val(arg, options);
		});
		return get_op_val.apply(this, ([op_context, options.context, callee]).concat(args))
	} else if(type === "Identifier") {
		if(options.is_property) {
			var property_of = options.property_of;
		} else {
			return get_identifier_val(node.name, options.context, options.ignore_inherited_in_contexts);
		}
	} else if(type === "ThisExpression") {
		return get_this_val(options.context);
	} else if(type === "MemberExpression") {
		var object = get_val(node.object, options);
		var property = node.computed ? get_val(node.property, options) : node.property.name;
		return get_member_val(object, property);
	} else if(type === "ArrayExpression") {
		var elements = _.map(node.elements, function(element) {
			return get_val(element, options);
		});
		return get_array_val(elements);
	} else if(type === "ConditionalExpression") {
		return get_conditional_val(get_val(node.test, options), get_val(node.consequent, options), get_val(node.alternate, options));
	} else if(type === "LogicalExpression") {
		var left_arg = get_val(node.left, options),
			right_arg = get_val(node.right, options);
		return get_logical_val(node.operator, left_arg, right_arg);
	} else if(type === "FunctionExpression") {
		return red.get_fn_$(node, options);
	} else if(type === "Program") {
		return get_val(node.body[0], options);
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
