/*jslint nomen: true, vars: true, bitwise:true, debug:true */
/*global red,esprima,able,uid,console,window */

(function (red) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

	var do_return = {},
		do_break = {},
		do_continue = {};

	var assignments = {
		"=": function (a, b) { return b; },
		"+=": function (a, b) { return a + b; },
		"-=": function (a, b) { return a - b; },
		"*=": function (a, b) { return a * b; },
		"/=": function (a, b) { return a / b; },
		"|=": function (a, b) { return a | b; },
		"&=": function (a, b) { return a & b; },
		"^=": function (a, b) { return a ^ b; }
	};

	function construct(constructor, args) {
		function F() {
			return constructor.apply(this, args);
		}
		F.prototype = constructor.prototype;
		return new F();
	}

	var call_fn = function (node, options) {
		var i, var_map, op_func, rv, test, body, prop, object,
			found_this, curr_context, context_item, id, op_context,
			args;
		if (!node) { return undefined; }
		var type = node.type;
		if (type === "BlockStatement") {
			var len = node.body.length;
			for (i = 0; i < len; i += 1) {
				var statement = node.body[i];
				rv = call_fn(statement, options);
				if (rv === do_return || rv === do_break || rv === do_continue) {
					return rv;
				}
			}
		} else if (type === "VariableDeclaration") {
			var_map = options.var_map;
			_.each(node.declarations, function (declaration) {
				var id = declaration.id.name,
					init = call_fn(declaration.init, options);
				// Do some cleanup here
				var old_value = var_map[id];
				if (old_value && cjs.is_$(old_value)) {
					old_value.destroy();
				}
				var_map[id] = init;
			});
			return;
		} else if (type === "Literal") {
			return node.value;
		} else if (type === "ExpressionStatement") {
			return call_fn(node.expression, options);
		} else if (type === "AssignmentExpression") {
			var left = node.left,
				right_val = call_fn(node.right, options);
			var_map = options.var_map;

			if (left.type === "Identifier") {
				id = left.name;
				var old_value = var_map[id];
				if (old_value && cjs.is_$(old_value)) {
					old_value.destroy();
				}
				var_map[id] = assignments[node.operator](old_value, right_val);
			} else if (left.type === "MemberExpression") {
				object = call_fn(left.object, options);
				if (left.computed) {
					prop = call_fn(left.property, options);
				} else {
					prop = left.property.name;
				}
				object[prop] = right_val;
			} else {
				console.error("Unset");
			}
		} else if (type === "BinaryExpression") {
			op_func = red.binary_operators[node.operator];
			var left_arg = call_fn(node.left, options),
				right_arg = call_fn(node.right, options);
			return op_func.call(window, left_arg, right_arg);
		} else if (type === "UnaryExpression") {
			op_func = red.unary_operators[node.operator];
			var arg = call_fn(node.argument, options);
			return op_func.call(window, arg);
		} else if (type === "Identifier") {
			var key = node.name;
			if (key === "sketch") {
				return red.find_or_put_contextual_obj(options.pcontext.root(), options.pcontext.slice(0, 1));
			} else if (key === "parent") {
				found_this = false;
				curr_context = options.pcontext;
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
			} else if (_.has(options.var_map, key)) {
				return cjs.get(options.var_map[key]);
			} else {
				return red.get_parsed_val(node, {context: options.pcontext});
			}
		} else if (type === "ReturnStatement") {
			options.rv = call_fn(node.argument, options);
			return do_return;
		} else if (type === "IfStatement") {
			if (call_fn(node.test, options)) {
				return call_fn(node.consequent, options);
			} else {
				return call_fn(node.alternate, options);
			}
		} else if (type === "WhileStatement") {
			test = node.test;
			body = node.body;
			while (call_fn(test, options)) {
				rv = call_fn(body, options);
				if (rv === do_return) {
					return rv;
				} else if (rv === do_break) {
					break;
				}
			}
		} else if (type === "ForStatement") {
			var init = node.init,
				update = node.update;
			
			body = node.body;
			test = node.test;

			for (call_fn(init, options); call_fn(test, options); call_fn(update, options)) {
				rv = call_fn(body, options);
				if (rv === do_return) {
					return rv;
				} else if (rv === do_break) {
					break;
				}
			}
		} else if (type === "DoWhileStatement") {
			test = node.test;
			body = node.body;
			do {
				rv = call_fn(body, options);
				if (rv === do_return) {
					return rv;
				} else if (rv === do_break) {
					break;
				}
			} while (call_fn(test, options));
		} else if (type === "ConditionalExpression") {
			return call_fn(node.test, options) ? call_fn(node.consequent, options) : call_fn(node.alternate, options);
		} else if (type === "MemberExpression") {
			object = call_fn(node.object, options);
			if (node.computed) {
				prop = call_fn(node.property, options);
			} else {
				prop = node.property.name;
				if (object instanceof red.ContextualObject && prop === "parent") {
					found_this = false;
					curr_context = object.get_pointer();
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
			}
			if (object instanceof red.ContextualObject) {
				return object.prop_val(prop);
			} else {
				return object[prop];
			}
		} else if (type === "CallExpression") {
			op_context = window;
			if (node.callee.type === "MemberExpression") {
				op_context = call_fn(node.callee.object, options);
			}
			op_func = call_fn(node.callee, options);
			args = _.map(node["arguments"], function (arg) {
				return call_fn(arg, options);
			});
			if (_.isFunction(op_func)) {
				return op_func.apply(op_context, args);
			} else if (op_func instanceof red.ParsedFunction) {
				return op_func._apply(options.js_context, options.pcontext, args);
			}
		} else if (type === "LogicalExpression") {
			var op = node.operator;
			if (op === "&&") {
				return call_fn(node.left, options) && call_fn(node.right, options);
			} else if (op === "||") {
				return call_fn(node.left, options) || call_fn(node.right, options);
			} else {
				console.log("No op " + op);
			}
		} else if (type === "UpdateExpression") {
			var value = call_fn(node.argument, options);
			var operator = node.operator;
			var resulting_value;
			if (operator === " += 1") {
				resulting_value = value + 1;
			} else if (operator === " -= 1") {
				resulting_value = value - 1;
			} else {
				console.error("Unknown operator ", operator);
			}

			if (node.argument.type === "Identifier") {
				id = node.argument.name;
				options.var_map[id] = resulting_value;
			} else {
				console.error("Unset");
			}

			if (node.prefix) {
				return value;
			} else {
				return resulting_value;
			}
		} else if (type === "ThisExpression") {
			return options.js_context;
		} else if (type === "BreakStatement") {
			return do_break;
		} else if (type === "ContinueStatement") {
			return do_continue;
		} else if (type === "NewExpression") {
			op_context = window;
			if (node.callee.type === "MemberExpression") {
				op_context = call_fn(node.callee.object, options);
			}
			op_func = call_fn(node.callee, options);
			args = _.map(node["arguments"], function (arg) {
				return call_fn(arg, options);
			});
			if (_.isFunction(op_func)) {
				return construct(op_func, args);
			} else if (op_func instanceof red.ParsedFunction) {
				console.error("unhandled case");
			}
		} else if (type === "ObjectExpression") {
			rv = {};
			_.each(node.properties, function (prop_node) {
				var key = prop_node.key.name,
					value = call_fn(prop_node.value, options);
				rv[key] = value;
			});
			return rv;
		} else if (type === "DebuggerStatement") {
			debugger;
		} else if (type !== "EmptyStatement") {
			// do nothing
			return;
		} else {
			console.log(type, node);
		}
	};

	red.ParsedFunction = function (node, options) {
		this.node = node;
		this.options = options;
	};

	(function (my) {
		var proto = my.prototype;
		proto._apply = function (js_context, pcontext, args) {
			var node = this.node;

			var var_map = {};
			var_map["arguments"] = args;
			_.each(node.params, function (param, index) {
				var name = param.name;
				var value = args[index];
				var_map[name] = value;
			});

			var opts = {
				var_map: var_map,
				js_context: js_context,
				pcontext: pcontext,
				ignore_inherited_in_contexts: this.options.ignore_inherited_in_contexts
			};
			var rv = call_fn(node.body, opts);
			if (rv === do_return) {
				return opts.rv;
			} else {
				return undefined;
			}
		};
		proto._call = function (js_context, pcontext) {
			return this._apply.apply(this, [js_context, pcontext, _.rest(arguments, 2)]);
		};
	}(red.ParsedFunction));

	red.get_fn_$ = function (node, options) {
		return new red.ParsedFunction(node, options);
	};
}(red));
