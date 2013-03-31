(function(red) {
var cjs = red.cjs, _ = red._;

// Constants
var THETA_DEGREES = 30,
	TRANSITION_HEIGHT = 15,
	TRANSITION_MARGIN = 1,
	STATE_NAME_WIDTH = 20, // each side
	STATE_PADDING = 2; // each side

var THETA_RADIANS = THETA_DEGREES * Math.PI / 180;

red.StatechartLayoutEngine = function(statechart) {
	this.statechart = statechart;

	this.$central_left_width = cjs.$(_.bind(this._compute_central_left_width, this));
	this.$central_right_width = cjs.$(_.bind(this._compute_central_right_width, this));
	this.$central_width = cjs.$(_.bind(this._compute_central_width, this));
	this.$left_width = cjs.$(_.bind(this._compute_left_width, this));
	this.$right_width = cjs.$(_.bind(this._compute_right_width, this));
	this.$total_width = cjs.$(_.bind(this._compute_total_width, this));
};

(function(my) {
	var proto = my.prototype;

	proto.get_central_width = function() { return this.$central_width.get(); };
	proto.get_left_width = function() { return this.$left_width.get(); };
	proto.get_right_width = function() { return this.$right_width.get(); };
	proto.get_total_width = function() { return this.$total_width.get(); };
	proto.get_crossing_transitions = function() { return this._compute_crossing_transitions; };

	proto._compute_central_right_width = function() {
		var substates = this.statechart.get_substates();
		var side_substates = substates.slice(Math.ceil(substates.length/2));
		var width = 0;
		_.each(side_substates, function(substate) {
			var layout_engine = red.get_state_layout_engine(substate);
			width += layout_engine.get_total_width();
		});
		if(width < STATE_NAME_WIDTH / 2) {
			width = STATE_NAME_WIDTH/2;
		}
		return width;
	};

	proto._compute_central_right_width = function() {
		var substates = this.statechart.get_substates();
		var side_substates = substates.slice(0, Math.ceil(substates.length/2));
		var width = 0;
		_.each(side_substates, function(substate) {
			var layout_engine = red.get_state_layout_engine(substate);
			width += layout_engine.get_total_width();
		});

		if(width < STATE_NAME_WIDTH / 2) {
			width = STATE_NAME_WIDTH/2;
		}
		return width;
	};

	proto._compute_central_width = function() {
		if(this.statechart.is_initialized()) {
			return this.$central_left_width.get() + this.$central_right_width.get();
		} else {
			return STATE_NAME_WIDTH;
		}
	};

	proto._compute_left_width = function() {
		var incoming_transitions = this.statechart.get_incoming_transitions(),
			outgoing_transitions = this.statechart.get_outgoing_transitions();
		var incoming_from = _.map(incoming_transitions, function(t) { return t.from(); }),
			outgoing_to = _.map(outgoing_transitions, function(t) { return t.to(); });

		var incoming_from_side = _.filter(incoming_from, function(x) {
			return this.order(x) <= 0;
		});
		var outgoing_to_side = _.filter(outgoing_to, function(x) {
			return this.order(x) <= 0;
		});

		var crossing_transitions = this.get_crossing_transitions;
		var N = incoming_from_side.length + outgoing_to_side.length + crossing_transitions.length;;
		var height = 2*N*TRANSITION_MARGIN + N * TRANSITION_HEIGHT;
		var width = Math.tan(THETA_RADIANS) / height;
		return width;
	};

	proto._compute_right_width = function() {
		var incoming_transitions = this.statechart.get_incoming_transitions(),
			outgoing_transitions = this.statechart.get_outgoing_transitions();

		var incoming_from_side = _.filter(incoming_from, function(x) {
			return this.order(x) > 0;
		});
		var outgoing_to_side = _.filter(outgoing_to, function(x) {
			return this.order(x) > 0;
		});

		var crossing_transitions = this.get_crossing_transitions;

		var N = incoming_from_side.length + outgoing_to_side.length + crossing_transitions.length;;
		var height = 2*N*TRANSITION_MARGIN + N * TRANSITION_HEIGHT;
		var width = Math.tan(THETA_RADIANS) / height;
		return width;
	};

	proto._compute_total_width = function() { return this.get_left_width() + this.get_central_width() + this.get_right_width(); };

	proto._compute_crossing_transitions = function() {
		return [];
	};

}(red.StatechartLayoutEngine));

var state_layout_engines = new Map({
		hash: "hash"
	});

red.get_state_layout_engine = function(statechart) {
	return state_layout_engines.get_or_put(statechart, function() {
		return new red.StatechartLayoutEngine(statechart);
	});
};

}(red));
