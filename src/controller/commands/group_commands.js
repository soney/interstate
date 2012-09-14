(function(red) {
var cjs = red.cjs, _ = cjs._;

var SetGroupTemplateCommand = function(options) {
	SetGroupTemplateCommand.superclass.constructor.apply(this, arguments);
	this._options = options || {};

	if(!_.has(this._options, "group")) {
		throw new Error("Must select a group");
	}

	this._group = this._options.group;
	this._template = this._options.template;
};

(function(my) {
	_.proto_extend(my, red.Command);
	var proto = my.prototype;

	proto._execute = function() {
		this._old_template = this._group.get_template();
		this._group.set_template(this._template);
	};

	proto._unexecute = function() {
		this._group.set_template(this._old_template);
	};

	proto._do_destroy = function(in_effect) {
		if(in_effect) {
			this._old_template.destroy();
		} else {
			this._template.destroy();
		}
	};
}(SetGroupTemplateCommand));

red._commands["set_group_template"] = function(options) {
	return new SetGroupTemplateCommand(options);
};

var SetGroupBasisCommand = function(options) {
	SetGroupBasisCommand.superclass.constructor.apply(this, arguments);
	this._options = options || {};

	if(!_.has(this._options, "group")) {
		throw new Error("Must select a group");
	}

	this._group = this._options.group;
	this._basis = this._options.basis;
};

(function(my) {
	_.proto_extend(my, red.Command);
	var proto = my.prototype;

	proto._execute = function() {
		this._old_basis = this._group.get_basis();
		this._group.set_basis(this._basis);
	};

	proto._unexecute = function() {
		this._group.set_basis(this._old_basis);
	};

	proto._do_destroy = function(in_effect) {
		if(in_effect) {
			this._old_basis.destroy();
		} else {
			this._basis.destroy();
		}
	};
}(SetGroupBasisCommand));

red._commands["set_group_basis"] = function(options) {
	return new SetGroupBasisCommand(options);
};

}(red));
