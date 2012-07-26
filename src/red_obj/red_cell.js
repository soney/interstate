(function(red) {
var cjs = red.cjs, _ = cjs._;
var esprima = window.esprima;

var eval_tree = function(node, context) {
	var type = node.type;
	if(type === "ExpressionStatement") {
		return eval_tree(node.expression, context);
	} else if(type === "CallExpression") {
		var callee = eval_tree(node.callee, context);
		var args = _.map(node.arguments, function(argument) {
			return eval_tree(argument, context);
		});
		return callee.apply(this, args);
	} else if(type === "Identifier") {
		var name = node.name;
		if(name === "window") {
			return window;
		}
		return event_types[name];
	} else if(type === "ThisExpression") {
		return context;
	} else if(type === "MemberExpression") {
		var object = eval_tree(node.object, context);
		var property = eval_tree(node.property, context);
		return object[property];
	} else if(type === "Literal") {
		return node.value;
	} else {
		console.log(type, node);
	}
};

var RedCell = function(str, parent) {
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
		this._value = eval_tree(this._tree.body[0]);
	};

	proto.get = function() {
		return this._value;
	};
}(RedCell));

red.create_cell = function(str, parent) {
	return new RedCell(str, parent);
};

}(red));
