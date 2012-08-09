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
		
		var args_got = _.map(args, function(arg) {
			return cjs.get(arg);
		});
		var callee_got = cjs.get(callee);
		return callee_got.apply(this, args_got);
	} else if(type === "Identifier") {
		var name = cjs.get(node.name);
		var got_context = cjs.get(context);
		if(got_context) {
			return got_context._get_prop(name);
		} else {
			return undefined;
		}
	} else if(type === "ThisExpression") {
		var got_context = cjs.get(context);
		if(got_context) {
			return got_context._get_this();
		} else {
			return undefined;
		}
	} else if(type === "MemberExpression") {
		var object = eval_tree(node.object, context);
		var object_got = cjs.get(object);
		//More cases here
		variable_context = object_got;
		var property = eval_tree(node.property, variable_context);
		return property;
	} else if(type === "Literal") {
		return node.value;
	} else if(type === "BinaryExpression") {
		var op_func = binary_operators[node.operator];
		var left_arg = eval_tree(node.left, context)
			, right_arg = eval_tree(node.right, context);
		return op_func(cjs.get(left_arg), cjs.get(right_arg));
	} else if(type === "UnaryExpression") {
		var op_func = unary_operators[node.operator];
		var arg = eval_tree(node.argument);

		return op_func(cjs.get(arg));
	} else {
		console.log(type, node);
	}
};

var RedCell = function(str, context) {
	this._context = cjs(context);
	this._str = cjs(str);
	var self = this;
	this._tree = cjs(function() {
		return esprima.parse(self._str.get());
	});
	this._value = cjs(function() {
		var tree = self._tree.get();
		return eval_tree(tree.body[0], self._context);
	});
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
	proto.get = function() {
		return cjs.get(this._value);
	};
	proto.clone = function(context) {
		return new RedCell(this.get_str(), context);
	};
}(RedCell));

red.RedCell = RedCell;
cjs.define("red_cell", function(str, context) {
	var cell = new RedCell(str, context);
	var rv = cjs(function() {
		return cell.get();
	});
	rv.set_str = function(str) {
		cell.set_str(str);
	};
	return rv;
});

}(red));
