/*jslint evil:true,nomen: true, vars: true, bitwise:true */
/*global red,esprima,able,uid,console,window */

(function (red) {
	"use strict";
	var cjs = red.cjs,
		_ = red._,
		esprima = window.esprima;

	red.construct = function(constructor, args) {
		if(constructor === Date) { // Functions check to see if date object
			var rv = eval("new constructor(" + args.join(",") + ")");
			return rv;
		}
		function F() {
			return constructor.apply(this, args);
		}
		F.prototype = constructor.prototype;
		return new F();
	};

	red.MultiExpression = function(expressions) {
		this.expressions = expressions;
	};

	(function(My) {
		var proto = My.prototype;
		proto.get_expressions = function() {
			return this.expressions;
		};
		proto.first = function() {
			return _.first(this.expressions);
		};
		proto.rest = function() {
			return _.rest(this.expressions);
		};
		proto.last = function() {
			return _.last(this.expressions);
		};
	}(red.MultiExpression));

	red.on_event = function (event_type, arg1) {
		if (event_type === "timeout") {
			//console.log(arg1);
			var timeout_event = new red.TimeoutEvent(arg1);
			return timeout_event;
		} else if(event_type === "time") {
			var time_event = new red.TimeEvent(arg1);
			return time_event;
		} else if(event_type === "frame") {
			var frame_event = new red.FrameEvent();
			return frame_event;
		} else {
			var targets = _.rest(arguments);
			var events = [];

			if (targets) {
				var statechart_spec = event_type;
				var statechart_event = new red.TransitionEvent(targets, statechart_spec);
				events.push(statechart_event);

				if (arguments.length <= 1) { // Ex: on('mouseup') <-> on('mouseup', window)
					targets = window;
				}
				var red_event_type = event_type;
				var red_event = new red.RedObjEvent(red_event_type, targets);
				events.push(red_event);
			}
			if (arguments.length <= 1) { // Ex: on('mouseup') <-> on('mouseup', window)
				targets = window;
			}
			var dom_event = new red.DOMEvent(event_type, targets);
			events.push(dom_event);

			return new red.CombinationEvent(events);
		}
	};

	red.register_serializable_type("red_on_event_func",
		function (x) {
			return x === red.on_event;
		},
		function () {
			return {};
		},
		function (obj) {
			return red.on_event;
		});

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
				var op_got = cjs.get(op, options.auto_add_dependency);
				//if(op_got === red.on_event) {
					//debugger;
					//window.dbg = true;
				//}
				var args_got = _.map(args, function(arg) {
													return cjs.get(arg, options.auto_add_dependency);
												});
				//window.dbg = false;
				var calling_context_got = cjs.get(calling_context, options.auto_add_dependency);

				if (_.isFunction(op_got)) {
					var rv = op_got.apply(calling_context_got, args_got);
					return rv;
				} else if (op_got instanceof red.ParsedFunction) {
					return op_got._apply(calling_context_got, pcontext, args_got, options);
				} else {
					//throw new Error("Calling a non-function");
					return undefined;
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
					return cjs.get(left, options.auto_add_dependency) && cjs.get(right, options.auto_add_dependency);
				case OR_OP:
					return cjs.get(left, options.auto_add_dependency) || cjs.get(right, options.auto_add_dependency);
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
				var test_got = cjs.get(test, options.auto_add_dependency);
				if (test_got) {
					return cjs.get(consequent, options.auto_add_dependency);
				} else {
					return cjs.get(alternate, options.auto_add_dependency);
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
			//if(key == "animation_duration") {
				//debugger;
			//}

			curr_context = context;
			context_item = curr_context.points_at();
			//if(window.dbg) {
				//debugger;
			//}
				
			while (!curr_context.is_empty()) {
				if (context_item instanceof red.Dict) {
					var contextual_obj = red.find_or_put_contextual_obj(context_item, curr_context);
					if (_.indexOf(ignore_inherited_in_contexts, context_item) >= 0) {
						if (contextual_obj.has(key, true)) {
							rv = contextual_obj.prop_val(key);
							return rv;
						}
					} else {
						//if(red.dbg) {
							//console.log(curr_context);
							//curr_context = curr_context.pop();
							//context_item = curr_context.points_at();
							//return;
							//continue;
						//}
						if (contextual_obj.has(key)) {
							rv = contextual_obj.prop_val(key);
							return rv;
						}
					}
				} else if (context_item instanceof red.ProvisionalContext) {
					if(context_item.has(key)) {
						return context_item.get(key);
					}
				}

				if(curr_context.has_special_contexts()) {
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
				var object = cjs.get(obj, options.auto_add_dependency),
					property = cjs.get(prop, options.auto_add_dependency);
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
					return cjs.get(element, options.auto_add_dependency);
				});
			});
		} else {
			return elements;
		}
	};

	var get_new_$ = function (options, calling_context, op) {
		var pcontext = options.context;
		var args = _.rest(arguments, 3);
		if (options.get_constraint) {
			return cjs.$(function () {
				var op_got = cjs.get(op, options.auto_add_dependency);
				//if(op_got === red.on_event) {
					//debugger;
					//window.dbg = true;
				//}
				var args_got = _.map(args, function(arg) {
													return cjs.get(arg, options.auto_add_dependency);
												});
				//window.dbg = false;
				var calling_context_got = cjs.get(calling_context, options.auto_add_dependency);

				if (_.isFunction(op_got)) {
					var rv = red.construct.call(calling_context_got, op_got, args_got);
					return rv;
				} else if (op_got instanceof red.ParsedFunction) {
					return op_got._apply(calling_context_got, pcontext, args_got, options);
				} else {
					//throw new Error("Calling a non-function");
					return undefined;
				}
			});
		} else {
			if (_.isFunction(op)) {
				var rv = red.construct.call(calling_context, op, args);
				return rv;
			} else if (op instanceof red.ParsedFunction) {
				return op._apply(calling_context, pcontext, args);
			} else {
				//throw new Error("Calling a non-function");
				return undefined;
			}
		}
	/*
		if(options.get_constraint) {
			console.error("not implemented");
		} else {
			return red.construct(callee, args);
		}
		op_context = window;
		if (node.callee.type === "MemberExpression") {
			op_context = call_fn(node.callee.object, options);
		}
		op_func = call_fn(node.callee, options);
		args = _.map(node["arguments"], function (arg) {
			return call_fn(arg, options);
		});
		if (_.isFunction(op_func)) {
			return red.construct(op_func, args);
		} else if (op_func instanceof red.ParsedFunction) {
			console.error("unhandled case");
		}
		*/
	};

	var get_val = red.get_parsed_val = function (node, options) {
		var op_func, left_arg, right_arg, arg, callee, op_context, args;
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
			callee = get_val(node.callee, options);
			op_context = window;
			if (node.callee.type === "MemberExpression") {
				op_context = get_val(node.callee.object, options);
			}
			args = _.map(node["arguments"], function (arg) {
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
		} else if (type === "NewExpression") {
			callee = get_val(node.callee, options);
			op_context = window;
			if (node.callee.type === "MemberExpression") {
				op_context = get_val(node.callee.object, options);
			}
			args = _.map(node["arguments"], function (arg) {
				return get_val(arg, options);
			});
			return get_new_$.apply(this, ([options, op_context, callee]).concat(args));
		} else if (type === "ObjectExpression") {
			if(options.get_constraint) {
				console.error("not set");
			} else {
				var rv = {};
				_.each(node.properties, function (prop_node) {
					var key = prop_node.key.name,
						value = get_val(prop_node.value, options);
					rv[key] = value;
				});
				return rv;
			}
		} else if (type === "Program") {
			if(node.body.length === 1) {
				return get_val(node.body[0], options);
			} else {
			/*
				if (options.get_constraint) {
					return cjs.$(function () {
						return new red.MultiExpression(_.map(node.body, function(body) {
							return get_val(body, options);
						}));
					});
				} else {
				*/
					return new red.MultiExpression(_.map(node.body, function(bodyi, i) {
						if(!options.only_parse_first || i === 0) {
							return get_val(bodyi, options);
						} else {
							return bodyi;
						}
					}));
				//}
			}
			//return get_val(node.body[0], options);
		} else {
			console.log(type, node);
		}
	};

	red.get_parsed_$ = function (node, options) {
		var parsed_value = red.get_parsed_val(node, _.extend({
			get_constraint: true,
			auto_add_dependency: true
		}, options));
		return parsed_value;
	};

	var func_regex = new RegExp("^\\s*function\\s*\\((\\s*[a-zA-Z$][\\w\\$]*\\s*,)*\\s*([a-zA-Z$][\\w\\$]*\\s*)?\\)\\s*{.*}\\s*$");

	red.parse = function (str) {
		if ((str.replace(/\n/g, "")).match(func_regex)) {
			str = "(" + str + ")";
		}

		try {
			return esprima.parse(str);
		} catch(e) {
			return new red.Error({
				message: e.description
			});
		}
	};
}(red));
