(function(red) {
var cjs = red.cjs, _ = cjs._;

var RedGroup = function(options) {
/*
	this.type = "red_group";
	options = options || {};
	if(!options.parent) { options.parent = undefined; }

	this._parent = cjs.create("constraint", options.parent);
	this._protos = cjs.create("constraint");
	this._basis = cjs.create("constraint");
	this._last_rv = undefined;
	*/
};
(function(my) {
	//_.proto_extend(my, red.RedDict);
	var proto = my.prototype;
	/*
	
	//
	// === PARENT ===
	//
	proto.set_parent = function(parent) { this._parent.set(parent); };
	proto.get_parent = function() { return this._parent.get(); };

	//
	// === PROTOS ===
	//
	proto.set_protos = function(protos) {
		this._protos.set(protos);
	};
	proto.get_protos = function() {
		return this._protos.get();
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
	
	proto.get = function() {
		var basis = this.get_basis();

		var rv;
		var self = this;
		if(_.isNumber(basis)) {
			rv = [];
			_.times(basis, function(index) {
				var dict = cjs.create("red_stateful_obj", {direct_protos: self._protos});
				dict.set_prop("basis", index);
				rv.push(dict);
			});
		} else if(_.isArray(basis)) {
			rv = _.map(basis, function(basis_obj) {
				var dict = cjs.create("red_stateful_obj", {direct_protos: self._protos});
				dict.set_prop("basis", basis_obj);
				return dict;
			});
		} else {
			rv = [];
		}
		this._last_rv = rv;
		return rv;
	};
	*/

}(RedGroup));

red.RedGroup = RedGroup;

cjs.define("red_group", function(options) {
	var group = new RedGroup(options);
	return group;
});

}(red));
