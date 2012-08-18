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
		var name = cjs.get(node.name);
		var got_context = cjs.get(context);

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
	} else if(type === "ThisExpression") {
		var got_context = cjs.get(context);

		while(got_context) {
			if(got_context.type === "red_dict" || got_context.type === "red_stateful_obj") {
				return got_context;
			}
			got_context = got_context.get_parent();
		}
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
	this._parent = cjs.create("constraint", options.parent, true);
	this._str = _.isString(options.str) ? cjs.create("constraint", options.str) : options.str;
	if(!this._str) debugger;
	var self = this;
	this._tree = cjs(function() {
		return esprima.parse(self.get_str());
	});
	this._value = cjs(function() {
		var tree = self._tree.get();
		return eval_tree(tree.body[0], self.get_parent());
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
	proto.set_parent = function(parent) {
		this._parent.set(parent, true);
	};
	proto.get_parent = function() {
		return this._parent.get();
	};
}(RedCell));

red.RedCell = RedCell;
cjs.define("red_cell", function(options) {
	var cell = new RedCell(options);
	var constraint = cjs(function() {
		return cell.get();
	});
	constraint.set_str = function(str) {
		cell.set_str(str);
		return constraint;
	};
	constraint.get_str = _.bind(cell.get_str, cell);
	constraint.set_parent = _.bind(cell.set_parent, cell);
	constraint.get_parent = _.bind(cell.get_parent, cell);
	constraint.clone = function(options) {
		options = options || {};
		if(!options.str) {
			options.str = cjs.create("constraint", function() {
				return constraint.get_str();
			});
		}
		return cjs.create("red_cell", options);
	};
	constraint.type = "red_cell";
	constraint.cell = cell;
	return constraint;
});

}(red));
