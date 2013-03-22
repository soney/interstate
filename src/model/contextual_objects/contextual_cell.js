(function (red) {
var cjs = red.cjs, _ = red._;

red.ContextualCell = function(options) {
	red.ContextualCell.superclass.constructor.apply(this, arguments);
	this.value_constraint = this.object.constraint_in_context(this.get_pointer());
	this._type = "cell";
};

(function(my) {
	_.proto_extend(my, red.ContextualObject);
	var proto = my.prototype;
	proto.destroy = function() {
		my.superclass.destroy.apply(this, arguments);
		this.value_constraint.destroy();
	};
	proto._getter = function() {
		return cjs.get(this.value_constraint);
	};
	proto.get_str = function() {
		var cell = this.get_object();
		return cell.get_str();
	};
}(red.ContextualCell));

}(red));
