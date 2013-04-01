(function(red) {
var cjs = red.cjs, _ = red._;

// Constants
var THETA_DEGREES = 30,
	TRANSITION_HEIGHT = 15,
	TRANSITION_MARGIN = 1,
	STATE_NAME_WIDTH = 20, // each side
	STATE_PADDING = 2; // each side

var THETA_RADIANS = THETA_DEGREES * Math.PI / 180,
	TAN_THETA = Math.tan(THETA_RADIANS);

red.RootStatechartLayoutEngine = function(statecharts) {
	this.statechart = statechart;
	this.state_layout_engines = new Map({
		hash: "hash"
	});
};
(function(my) {
	var proto = my.prototype;

	proto.get_statechart_tree = function() {
		var curr_node = {statechart: this.statechart};
		var expand_node = function(node) {
			var sc = node.statechart;
			node.children = _.map(sc.get_substates(), function(x) {
				var subnode = {statechart: x};
				expand_node(subnode);
				return subnode;
			});
		};
		expand_node(curr_node);
		return curr_node;
	};

	proto.get_layout_engine = function(statechart) {
		return this.state_layout_engine.get_or_put(statechart, function() {
			return new red.StatechartLayoutEngine(statechart, this);
		}, this);
	};

	proto.compute_left_crossing_transitions = function(statechart) {
		var sc_tree = this.get_statechart_tree();
		return [];
	};
	proto.compute_right_crossing_transitions = function(statechart) {
		var sc_tree = this.get_statechart_tree();
		return [];
	};

	proto._compute_transition_rows = function() {
		var sc_tree = this.get_statechart_tree();
		var columns = [];

		var col_indicies = new Map({
			hash: "hash"
		});
		var depth = 0;
		var push_node_columns = function(node, depth) {
			var statechart = node.statechart;
			var li = columns.length;
			var children = node.children;
			columns.push({ state: statechart, lr: "l"});
			_.each(children, function(childnode) {
				push_node_columns(childnode, depth+1);
			});
			var ri = columns.length;
			columns.push({ state: statechart, lr: "r"});

			col_indicies.put(statechart, {l: li, r: ri});
		};
		push_node_columns(sc_tree, 0);


		var from_to = [];
		var collect_from_to = function(node) {
			var statechart = node.statechart,
				indicies = col_indicies.get(statechart);
				li = indicies.l,
				ri = indicies.r;

			var incoming_transitions = statechart.get_incoming_transitions(),
				outgoing_transitions = statechart.get_outgoing_transitions();

			// filter out the outgoing transitions to self (as they will be counted in the incoming as well
			outgoing_transitions = _.filter(outgoing_transitions, function(x) { return x.to() !== statechart; });

			var transition_targets = [];
			_.each(incoming_transitions, function(x) {
				transition_targets.push({transition: x, target: x.from()});
			});
			_.each(outgoing_transitions, function(x) {
				transition_targets.push({transition: x, target: x.to()});
			});

			var targets_from_to = _.map(transition_targets, function(info) {
				var x = info.target,
					t = info.transition;
				if(x instanceof red.StartState) {
					return {from: li, to: li, transition: t};
				} else if(x === statechart) {
					return {from: ri, to: ri};
				} else {
					var x_indicies = col_indicies.get(x);
					if(statechart.order(x) < 0) {
						return {from: x_indicies.r, to: ri, transition: t};
					} else {
						return {from: ri, to: x_indicies.l, transition: t};
					}
				}
			});
			from_to.push.apply(targets_from_to);
			_.each(node.children, collect_from_to);
		};
		collect_from_to(sc_tree);

		var rows = [];
		_.each(from_to, function(info) {
			var from = info.from,
				to = info.to;

			var has_enough_space;
			var curr_row = false;
			for(var i = 0; i<rows.length; i++) {
				has_enough_space = true;
				var row = rows[i];
				for(var j = from; j<=to; j++) {
					if(row[j]) {
						has_enough_space = false;
						break;
					}
				}
				if(has_enough_space) {
					curr_row = rows[i];
					break;
				}
			}
			if(!curr_row) {
				curr_row = _.map(states, function() { return false; });
				rows.push(curr_row);
			}

			for(var i = from; i<=to; i++) {
				curr_row[i] = info.transition;
			}

		});

		return rows;
	};
}(red.RootStatechartLayoutEngine));


red.StatechartLayoutEngine = function(statechart, root_layout_engine) {
	this.statechart = statechart;
	this.root_layout_engine = root_engine;

	this.$central_left_width = cjs.$(_.bind(this._compute_central_left_width, this));
	this.$central_right_width = cjs.$(_.bind(this._compute_central_right_width, this));
	this.$central_width = cjs.$(_.bind(this._compute_central_width, this));
	this.$left_width = cjs.$(_.bind(this._compute_left_width, this));
	this.$right_width = cjs.$(_.bind(this._compute_right_width, this));
	this.$total_width = cjs.$(_.bind(this._compute_total_width, this));
	this.$left_crossing_transitions = cjs.$(_.bind(this._compute_left_crossing_transitions, this));
	this.$right_crossing_transitions = cjs.$(_.bind(this._compute_right_crossing_transitions, this));
};
(function(my) {
	var proto = my.prototype;

	proto.get_central_width = function() { return this.$central_width.get(); };
	proto.get_left_width = function() { return this.$left_width.get(); };
	proto.get_right_width = function() { return this.$right_width.get(); };
	proto.get_total_width = function() { return this.$total_width.get(); };
	proto.get_left_crossing_transitions = function() { return this.$left_crossing_transitions.get(); };
	proto.get_right_crossing_transitions = function() { return this.$right_crossing_transitions.get(); };

	proto._compute_central_left_width = function() {
		var substates = _.toArray(this.statechart.get_substates());
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

	proto._compute_central_right_width = function() {
		var substates = _.toArray(this.statechart.get_substates());
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

	proto._compute_central_width = function() {
		if(this.statechart.is_initialized()) {
			return this.$central_left_width.get() + this.$central_right_width.get();
		} else {
			return STATE_NAME_WIDTH;
		}
	};

	proto._compute_left_width = function() {
		var crossing_transitions = this.get_left_crossing_transitions();

		var N = crossing_transitions.length;
		var height = 2*N*TRANSITION_MARGIN + N * TRANSITION_HEIGHT;
		var width = height / TAN_THETA;
		return width;
	};

	proto._compute_right_width = function() {
		var crossing_transitions = this.get_right_crossing_transitions();

		var N = crossing_transitions.length;
		var height = 2*N*TRANSITION_MARGIN + N * TRANSITION_HEIGHT;
		var width = height / TAN_THETA;
		return width;
	};

	proto._compute_total_width = function() { return this.get_left_width() + this.get_central_width() + this.get_right_width(); };

	proto._compute_left_crossing_transitions = function() {
		return this.root_layout_engine.compute_left_crossing_transitions(this.statechart);
	};
	proto._compute_right_crossing_transitions = function() {
		return this.root_layout_engine.compute_right_crossing_transitions(this.statechart);
	};
}(red.StatechartLayoutEngine));


red.get_state_layout_engine = function(statechart) {
	return state_layout_engines.get_or_put(statechart, function() {
		return new red.StatechartLayoutEngine(statechart);
	});
};

}(red));
