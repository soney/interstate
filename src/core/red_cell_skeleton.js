(function(red) {
var cjs = red.cjs, _ = cjs._;
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

var eval_tree = function(node, context) {
	var type = node.type;
	if(type === "ExpressionStatement") {
		return eval_tree(node.expression, context);
	} else if(type === "CallExpression") {
		var callee = eval_tree(node.callee, context);
		var args = node.arguments;
		return cjs(function() {
			var args_got = _.map(args, function(arg) {
				return cjs.get(arg);
			});
			var callee_got = cjs.get(callee);
			return callee_got.apply(this, args_got);
		});
	} else if(type === "Identifier") {
		var name = node.name;
		return cjs(function() {
			var got_context = cjs.get(context);
			if(got_context) {
				return got_context.get_prop_constraint(name);
			} else {
				return undefined;
			}
		});
	} else if(type === "ThisExpression") {
		return cjs(function() {
			var got_context = cjs.get(context);
			return got_context.get_this_constraint();
		});
	} else if(type === "MemberExpression") {
		var object = eval_tree(node.object, context);
		var variable_context = cjs(function() {
			var object_got = cjs.get(object);
			if(object_got && object_got.is) {
				if(object_got.is("context")) {
					return object_got;
				}
			}
			return object_got;
		});
		var property = eval_tree(node.property, variable_context);
		return property;
	} else if(type === "Literal") {
		return node.value;
	} else if(type === "BinaryExpression") {
		var op_func = binary_operators[node.operator];
		var left_arg = eval_tree(node.left, context)
			, right_arg = eval_tree(node.right, context);
		return cjs(function() {
			return op_func(cjs.get(left_arg), cjs.get(right_arg));
		});
	} else if(type === "UnaryExpression") {
		var op_func = unary_operators[node.operator];
		var arg = eval_tree(node.argument);

		return cjs(function() {
			return op_func(cjs.get(arg));
		});
	} else {
		console.log(type, node);
	}
};

var RedCell = function(str, context) {
	this._context = context;
	this.set_str(str);
};
(function(my) {
	var proto = my.prototype;
	proto.set_str = function(str) {
		this._str = str;
		this._update_tree();
		this._update_value();
		return this;
	};
	proto.get_str = function() { return this._str; };

	proto._update_tree = function() {
		this._tree = esprima.parse(this.get_str());
	};

	proto._update_value = function() {
		this._value = eval_tree(this._tree.body[0], this._context);
	};

	proto.get = function() {
		return cjs.get(this._value);
	};
	proto.clone = function(context) {
		return new RedCell(this.get_str(), context);
	};
}(RedCell));

red.RedCell = RedCell;

}(red));
