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

var eval_tree = function(node, context, restrict_context) {
	if(!node) {
		return undefined;
	}
	var type = node.type;
	if(type === "ExpressionStatement") {
		return eval_tree(node.expression, context, restrict_context);
	} else if(type === "CallExpression") {
		var callee = eval_tree(node.callee, context, restrict_context);
		var args = node.arguments;
		
		var args_got = _.map(args, function(arg) {
			return cjs.get(arg);
		});
		var callee_got = cjs.get(callee);
		return callee_got.apply(this, args_got);
	} else if(type === "Identifier") {
		var name = node.name;

		context.reset_iterator();
		var curr_context = context.iter();
		while(curr_context) {
			if(curr_context instanceof red.RedDict) {
				if(curr_context.has_prop(name)) {
					context.reset_iterator();
					return curr_context.get(name);
				}
			}
			curr_context = context.iter();
		}
		context.reset_iterator();
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
		var object = eval_tree(node.object, context, restrict_context);
		var object_got = cjs.get(object);
		//More cases here
		variable_context = object_got;
		var property = eval_tree(node.property, variable_context, true);
		return property;
	} else if(type === "Literal") {
		return node.value;
	} else if(type === "BinaryExpression") {
		var op_func = binary_operators[node.operator];
		var left_arg = eval_tree(node.left, context, restrict_context)
			, right_arg = eval_tree(node.right, context, restrict_context);
		return op_func(cjs.get(left_arg), cjs.get(right_arg));
	} else if(type === "UnaryExpression") {
		var op_func = unary_operators[node.operator];
		var arg = eval_tree(node.argument, context, restrict_context);

		return op_func(cjs.get(arg));
	} else if(type === "ArrayExpression") {
		return _.map(node.elements, function(element) {
			return eval_tree(element, context);
		});
	} else if(type === "BlockStatement") {
		var rv = {};
		_.forEach(node.body, function(key_value_pair) {
			var key = key_value_pair.label.name;
			var value = eval_tree(key_value_pair.body, context, restrict_context);
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
	this._str = _.isString(options.str) ? cjs.create("constraint", options.str) : options.str;
	this._tree = cjs(function() {
		return esprima.parse(self.get_str());
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
	proto.get = function(context) {
		var tree = this._tree.get();
		return eval_tree(tree.body[0], context);
	};
	proto.clone = function() {
		return cjs.create("red_cell", {str: this.get_str()});
	};
	proto.destroy = function() {
		this._tree.destroy();
		this._str.destroy();
	};
}(RedCell));

red.RedCell = RedCell;
cjs.define("red_cell", function(options) {
	var cell = new RedCell(options);
	return cell;
});

}(red));
