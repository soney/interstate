(function(red) {
var cjs = red.cjs, _ = red._;

var do_return = {};

var assignments = {
	"=": function(a, b) { return b; },
	"+=": function(a, b) { return a + b; },
	"-=": function(a, b) { return a - b; },
	"*=": function(a, b) { return a * b; },
	"/=": function(a, b) { return a / b; },
	"|=": function(a, b) { return a | b; },
	"&=": function(a, b) { return a & b; },
	"^=": function(a, b) { return a ^ b; },
};

var call_fn = function(node, options) {
	if(!node) { return undefined; }
	var type = node.type;
	if(type === "BlockStatement") {
		for(var i = 0; i<node.body.length; i++) {
			var statement = node.body[i];
			if(call_fn(statement, options) === do_return) {
				return options.rv;
			}
		}
	} else if(type === "VariableDeclaration") {
		var var_map = options.var_map;
		_.each(node.declarations, function(declaration) {
			var id = declaration.id.name,
				init = call_fn(declaration.init);
			// Do some cleanup here
			var old_value = var_map[id];
			if(old_value && cjs.is_$(old_value)) {
				old_value.destroy();
			}
			var_map[id] = init;
		});
		return;
	} else if(type === "Literal") {
		return node.value;
	} else if(type === "ExpressionStatement") {
		return call_fn(node.expression, options);
	} else if(type === "AssignmentExpression") {
		var left = node.left,
			right_val = call_fn(node.right, options),
			var_map = options.var_map;

		if(left.type === "Identifier") {
			var id = left.name;
			var old_value = var_map[id];
			if(old_value && cjs.is_$(old_value)) {
				old_value.destroy();
			}
			var_map[id] = assignments[node.operator](old_value, right_val);
		} else {
		}
	} else if(type === "BinaryExpression") {
		var op_func = red.binary_operators[node.operator];
		var left_arg = call_fn(node.left, options),
			right_arg = call_fn(node.right, options);
		return op_func.call(window, left_arg, right_arg);
	} else if(type === "UnaryExpression") {
		var op_func = red.unary_operators[node.operator];
		var arg = call_fn(node.argument, options);
	} else if(type === "Identifier") {
		var key = node.name;
		var value = options.var_map[key];
		if(value) {
			return cjs.get(value);
		} else {
			var curr_context = options.pcontext;
			var context_item = curr_context.points_at();

			while(!curr_context.is_empty()) {
				if(context_item instanceof red.Dict) {
					if(_.indexOf(options.ignore_inherited_in_contexts, context_item) >= 0) {
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
							return context_obj[key];
						}
					}
				} else if(context_item && context_item[key]) {
					return context_item[key];
				}
				curr_context = curr_context.pop();
				context_item = curr_context.points_at();
			}
			return undefined;
		}
	} else if(type === "ReturnStatement") {
		options.rv = call_fn(node.argument, options);
		return do_return;
	} else {
		console.log(type, node);
	}
};

red.ParsedFunction = function(node, options) {
	this.node = node;
	this.options = options;
};

(function(my) {
	var proto = my.prototype;
	proto._apply = function(pcontext, args) {
		var node = this.node;

		var var_map = {};
		var_map["arguments"] = args;
		_.each(node.params, function(param, index) {
			var name = param.name;
			var value = args[index]
			var_map[name] = value;
		});

		return call_fn(node.body, {
			var_map: var_map,
			pcontext: pcontext,
			ignore_inherited_in_contexts: this.options.ignore_inherited_in_contexts
		});
	};
	proto._call = function(pcontext) {
		return this._apply.apply(pcontext, _.rest(arguments));
	};
}(red.ParsedFunction));

red.get_fn_$ = function(node, options) {
	return new red.ParsedFunction(node, options);
};

}(red));
