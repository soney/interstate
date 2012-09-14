(function(red) {
var cjs = red.cjs, _ = cjs._;

var RedGroup = function(options) {
	options = options || {};

	this.type = "red_group";
	this.id = _.uniqueId();

	this._default_context = cjs(options.default_context, true);
	this._template = cjs.create("constraint");
	this._basis = cjs.create("constraint");
};
(function(my) {
	var proto = my.prototype;
	//
	//
	// === DEFAULT CONTEXT ===
	//
	proto.get_default_context = function() { return this._default_context.get(); }
	proto.set_default_context = function(context) { this._default_context.set(context, true); }
	
	//
	// === PROTOS ===
	//
	proto.set_template = function(protos) {
		this._template.set(protos);
	};
	proto.get_template = function() {
		return this._template.get();
	};

	//
	// === BASIS ===
	//
	proto.set_basis = function(basis) {
		this._basis.set(basis);
	};
	proto.get_basis = function() {
		return this._basis.get();
	};


	//
	// === GETTER ===
	//
	
	proto.get = function(context) {
		var basis = this.get_basis();

		var rv;
		var self = this;
		if(_.isNumber(basis)) {
			rv = [];
			_.times(basis, function(index) {
				var dict = cjs.create("red_stateful_obj", {direct_protos: self._template});
				dict.set_prop("basis", index);
				rv.push(dict);
			});
		} else if(_.isArray(basis)) {
			rv = _.map(basis, function(basis_obj) {
				var dict = cjs.create("red_stateful_obj", {direct_protos: self._template});
				dict.set_prop("basis", basis_obj);
				return dict;
			});
		} else {
			rv = [];
		}
		this._last_rv = rv;
		return rv;
	};

	proto.is_inherited = function() { return false; };

}(RedGroup));

red.RedGroup = RedGroup;

cjs.define("red_group", function(options) {
	var group = new RedGroup(options);
	return group;
});

}(red));
