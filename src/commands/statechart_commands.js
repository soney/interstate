(function(red) {
var cjs = red.cjs, _ = cjs._;

var AddStateCommand = function(options) {
	AddStateCommand.superclass.constructor.apply(this, arguments);
	this._options = options || {};

	if(!_.has(this._options, "statechart")) {
		throw new Error("Must select a statechart");
	}

	this._statechart = this._options.statechart;
	this._state_name = this._options.state_name;
	this._index = this._options.index;
};

(function(my) {
	_.proto_extend(my, red.Command);
	var proto = my.prototype;

	proto._execute = function() {
		this._statechart.add_state(this._state_name, "statechart", this._index);
		this._state = this._statechart.get_state_with_name(this._state_name);
	};

	proto._unexecute = function() {
		this._statechart.remove_state(this._state_name, false); //don't destroy
	};

	proto._do_destroy = function(in_effect) {
		if(!in_effect) {
			this._state.destroy();
		}
	};
}(AddStateCommand));

red._commands["add_state"] = function(options) {
	return new AddStateCommand(options);
};

var RemoveStateCommand = function(options) {
	RemoveStateCommand.superclass.constructor.apply(this, arguments);
	this._options = options || {};

	if(!_.has(this._options, "statechart")) {
		throw new Error("Must select a statechart");
	}

	this._statechart = this._options.statechart;
	this._state_name = this._options.state_name;
};

(function(my) {
	_.proto_extend(my, red.Command);
	var proto = my.prototype;

	proto._execute = function() {
		this._index = this._statechart.get_state_index(this._state_name);
		this._state = this._statechart._find_state(this._state_name);
		this._transitions = this._statechart.transitions_involving(this._state_name);
		this._statechart.remove_state(this._state_name, false); //don't destroy
	};

	proto._unexecute = function() {
		this._statechart.add_state(this._state_name, this._state, this._index);
		var self = this;
		_.forEach(this._transitions, function(transition) {
			self._statechart.add_transition(transition);
		});
	};

	proto._do_destroy = function(in_effect) {
		if(in_effect) {
			this._state.destroy();
			_.forEach(this._transitions, function(transition) {
				transition.destroy();
			});
		}
	};
}(RemoveStateCommand));

red._commands["remove_state"] = function(options) {
	return new RemoveStateCommand(options);
};

}(red));
