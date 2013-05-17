/*jslint nomen: true, vars: true, bitwise:true */
/*global red,esprima,able,uid,console,window */

(function (red) {
	"use strict";
	var cjs = red.cjs,
		_ = red._,
		esprima = window.esprima;

	red.on_event = function (event_type, arg1) {
		if (event_type === "timeout" || event_type === "time") {
			var time = arg1;
			var timeout_event = red.create_event(event_type, time);
			return timeout_event;
		} else {
			var targets = _.rest(arguments);
			var events = [];

			if (targets) {
				var statechart_spec = event_type;
				var statechart_event = red.create_event("transition", targets, statechart_spec);
				events.push(statechart_event);

				var red_event_type = event_type;
				var red_event = red.create_event("red_obj", red_event_type, targets);
				events.push(red_event);
			}
			if (arguments.length <= 1) { // Ex: on('mouseup') <-> on('mouseup', window)
				targets = window;
			}
			var dom_event = red.create_event("dom", event_type, targets);
			events.push(dom_event);

			return red.create_event("combination", events);
		}
	};


	red.binary_operators = {
		"===":	function (a, b) { return red.check_contextual_object_equality_eqeqeq(a, b); },
		"!==":	function (a, b) { return !red.check_contextual_object_equality_eqeqeq(a, b); },
		"==":	function (a, b) { return red.check_contextual_object_equality_eqeqeq(a, b); },
		"!=":	function (a, b) { return !red.check_contextual_object_equality_eqeqeq(a, b); },
		">":	function (a, b) { return a > b; },
		">=":	function (a, b) { return a >= b; },
		"<":	function (a, b) { return a < b; },
		"<=":	function (a, b) { return a <= b; },
		"+":	function (a, b) { return a + b; },
		"-":	function (a, b) { return a - b; },
		"*":	function (a, b) { return a * b; },
		"/":	function (a, b) { return a / b; },
		"%":	function (a, b) { return a % b; },
		"&&":	function (a, b) { return a && b; },
		"||":	function (a, b) { return a || b; },
		"&":	function (a, b) { return a & b; },
		"|":	function (a, b) { return a | b; },
		"^":	function (a, b) { return a ^ b; },
		"<<":	function (a, b) { return a << b; },
		">>":	function (a, b) { return a >> b; },
		">>>":  function (a, b) { return a >>> b; },
		"in":	function (a, b) { return a in b; },
		"instanceof":	function (a, b) { return a instanceof b; }
	};
	red.unary_operators = {
		"-":	function (a) { return -a; },
		"!":	function (a) { return !a; },
		"~":	function (a) { return ~a; },
		"typeof":	function (a) { return typeof a; }
	};

	var get_op_val = function (options, calling_context, op) {
		var pcontext = options.context;
		var args = _.rest(arguments, 3);
		if (options.get_constraint) {
			return cjs.$(function () {
				var op_got = cjs.get(op);
				var args_got = _.map(args, cjs.get);
				var calling_context_got = cjs.get(calling_context);

				if (_.isFunction(op_got)) {
					var rv = op_got.apply(calling_context_got, args_got);
					return rv;
				} else if (op_got instanceof red.ParsedFunction) {
					return op_got._apply(calling_context_got, pcontext, args_got);
				} else {
					throw new Error("Calling a non-function");
				}
			});
		} else {
			if (_.isFunction(op)) {
				var rv = op.apply(calling_context, args);
				return rv;
			} else if (op instanceof red.ParsedFunction) {
				return op._apply(calling_context, pcontext, args);
			} else {
				//throw new Error("Calling a non-function");
				return undefined;
			}
		}
	};

	var AND_OP = 0, OR_OP = 1;
	var get_logical_val = function (op, left, right, options) {
		if (options.get_constraint) {
			var op_id;
			if (op === "&&") {
				op_id = AND_OP;
			} else if (op === "||") {
				op_id = OR_OP;
			} else {
				console.error("Unknown op " + op);
			}
			return cjs.$(function () {
				switch (op_id) {
				case AND_OP:
					return cjs.get(left) && cjs.get(right);
				case OR_OP:
					return cjs.get(left) || cjs.get(right);
				}
			});
		} else {
			if (op === "&&") {
				return left && right;
			} else if (op === "||") {
				return left || right;
			} else {
				console.error("Unknown op " + op);
			}
		}
	};

	var get_conditional_val = function (test, consequent, alternate, options) { // test ? consequent : alternate
		if (options.get_constraint) {
			return cjs.$(function () {
				var test_got = cjs.get(test);
				if (test_got) {
					return cjs.get(consequent);
				} else {
					return cjs.get(alternate);
				}
			});
		} else {
			if (test) {
				return consequent;
			} else {
				return alternate;
			}
		}
	};

	var get_identifier_val = function (key, options) {
		var context = options.context,
			ignore_inherited_in_contexts = options.ignore_inherited_in_contexts || [];
		if (key === "sketch") {
			return red.find_or_put_contextual_obj(context.root(), context.slice(0, 1));
		} else if (key === "window") {
			return window;
		}

		var getter = function () {
			var i, curr_context, context_item, rv;
			if (key === "parent") {
				var found_this = false;
				curr_context = context;
				context_item = curr_context.points_at();

				while (!curr_context.is_empty()) {
					if (context_item instanceof red.Dict) {
						if (found_this) {
							rv = red.find_or_put_contextual_obj(context_item, curr_context);
							return rv;
						} else {
							found_this = true;
						}
					}
					curr_context = curr_context.pop();
					context_item = curr_context.points_at();
				}
			}

			curr_context = context;
			context_item = curr_context.points_at();
				
			while (!curr_context.is_empty()) {
				if (context_item instanceof red.Dict) {
					var contextual_obj = red.find_or_put_contextual_obj(context_item, curr_context);
					if (_.indexOf(ignore_inherited_in_contexts, context_item) >= 0) {
						if (contextual_obj.has(key, true)) {
							rv = contextual_obj.prop_val(key);
							return rv;
						}
					} else {
						if (contextual_obj.has(key)) {
							rv = contextual_obj.prop_val(key);
							return rv;
						}
					}
				} else if (context_item instanceof red.Cell) {
					var special_contexts = curr_context.special_contexts();
					var len = special_contexts.length;
					for (i = 0; i < len; i += 1) {
						var sc = special_contexts[i];
						var context_obj = sc.get_context_obj();
						if (context_obj.hasOwnProperty(key)) {
							return context_obj[key].value;
						}
					}
				}
				curr_context = curr_context.pop();
				context_item = curr_context.points_at();
			}
			if (window.hasOwnProperty(key)) {
				return window[key];
			} else {
				return undefined;
			}
		};

		if (options.get_constraint) {
			return cjs.$(getter);
		} else {
			return getter();
		}
	};

	var get_this_val = function (options) {
		var context = options.context;
		var getter = function () {
			var curr_context = context;
			var context_item = curr_context.points_at();

			while (!curr_context.is_empty()) {
				if (context_item instanceof red.Dict) {
					var contextual_obj = red.find_or_put_contextual_obj(context_item, curr_context);
					return contextual_obj;
				}
				curr_context = curr_context.pop();
				context_item = curr_context.points_at();
			}

			return undefined;
		};
		if (options.get_constraint) {
			return cjs.$(getter);
		} else {
			return getter();
		}
	};

	var get_member_val = function (obj, prop, options) {
		var getter = function (object, property) {
			var rv;
			if (!object) {
				return undefined;
			}

			if (object instanceof red.ContextualObject) {
				if (property === "parent") {
					var found_this = false;
					var curr_context = object.get_pointer();
					var context_item = curr_context.points_at();

					while (!curr_context.is_empty()) {
						if (context_item instanceof red.Dict) {
							if (found_this) {
								rv = red.find_or_put_contextual_obj(context_item, curr_context);
								return rv;
							} else {
								found_this = true;
							}
						}
						curr_context = curr_context.pop();
						context_item = curr_context.points_at();
					}
				} else if (_.isNumber(property) && object.is_template()) {
					var instances = object.instances();
					return instances[property];
				}
				rv = object.prop_val(property);
				return rv;
			} else {
				return object[property];
			}
		};

		if (options.get_constraint) {
			return cjs.$(function () {
				var object = cjs.get(obj),
					property = cjs.get(prop);
				return getter(object, property);
			});
		} else {
			return getter(obj, prop);
		}
	};

	var get_array_val = function (elements, options) {
		if (options.get_constraint) {
			return cjs.$(function () {
				return _.map(elements, function (element) {
					return cjs.get(element);
				});
			});
		} else {
			return elements;
		}
	};

	var get_val = red.get_parsed_val = function (node, options) {
		var op_func, left_arg, right_arg, arg;
		if (!node) { return undefined; }
		var type = node.type;
		if (type === "ExpressionStatement") {
			return get_val(node.expression, options);
		} else if (type === "Literal") {
			return node.value;
		} else if (type === "BinaryExpression") {
			op_func = red.binary_operators[node.operator];
			left_arg = get_val(node.left, options);
			right_arg = get_val(node.right, options);
			return get_op_val(options, window, op_func, left_arg, right_arg);
		} else if (type === "UnaryExpression") {
			op_func = red.unary_operators[node.operator];
			arg = get_val(node.argument, options);
			return get_op_val(options, window, op_func, arg);
		} else if (type === "CallExpression") {
			var callee = get_val(node.callee, options);
			var op_context = window;
			if (node.callee.type === "MemberExpression") {
				op_context = get_val(node.callee.object, options);
			}
			var args = _.map(node["arguments"], function (arg) {
				return get_val(arg, options);
			});
			return get_op_val.apply(this, ([options, op_context, callee]).concat(args));
		} else if (type === "Identifier") {
			return get_identifier_val(node.name, options);
		} else if (type === "ThisExpression") {
			return get_this_val(options);
		} else if (type === "MemberExpression") {
			var object = get_val(node.object, options);
			var property = node.computed ? get_val(node.property, options) : node.property.name;
			return get_member_val(object, property, options);
		} else if (type === "ArrayExpression") {
			var elements = _.map(node.elements, function (element) {
				return get_val(element, options);
			});
			return get_array_val(elements, options);
		} else if (type === "ConditionalExpression") {
			return get_conditional_val(get_val(node.test, options), get_val(node.consequent, options), get_val(node.alternate, options), options);
		} else if (type === "LogicalExpression") {
			left_arg = get_val(node.left, options);
			right_arg = get_val(node.right, options);
			return get_logical_val(node.operator, left_arg, right_arg, options);
		} else if (type === "FunctionExpression") {
			return red.get_fn_$(node, options);
		} else if (type === "Program") {
			return get_val(node.body[0], options);
		} else {
			console.log(type, node);
		}
	};

	red.get_parsed_$ = function (node, options) {
		var parsed_value = red.get_parsed_val(node, _.extend({
			get_constraint: true
		}, options));
		return parsed_value;
	};

	var func_regex = new RegExp("^\\s*function\\s*\\((\\s*[a-zA-Z$][\\w\\$]*\\s*,)*\\s*([a-zA-Z$][\\w\\$]*\\s*)?\\)\\s*{.*}\\s*$");

	red.parse = function (str) {
		if ((str.replace(/\n/g, "")).match(func_regex)) {
			return esprima.parse("(" + str + ")");
		} else {
			try {
				return esprima.parse(str);
			} catch(e) {
				return undefined;
			}
		}
	};
}(red));
