(function(red) {
var cjs = red.cjs, _ = red._;

var Antenna = function(paper, options) {
	this.options = _.extend({
		radius: 5
		, height: 40
		, top: 5
		, left: 10
		, animation_duration: 600
		, animate_creation: false
	}, options);

	this.state_attrs = this.get_state_attrs();

	this.highlighted = false;
	if(this.options.animate_creation) {
		this.expanded = false;
	} else {
		this.expanded = true;
	}

	this.rrcompound = red.create("rrcompound", paper, {
		contents: {
			"circle": "circle"
			, "line": "path"
		}
		, attrs: this.get_attrs()
	});

	if(this.options.animate_creation) {
		this.expand();
	}
};

(function(my) {
	var proto = my.prototype;

	proto.get_state_attrs = function() {
		return {
			collapsed: {
				circle: {
					r: 0
					, cx: this.option("left")
					, cy: this.option("top") + this.option("height")
				}, line: {
					path:  "M" + this.option("left") + "," + (this.option("top") + this.option("height"))
				}
			}, expanded: {
				circle: {
					r: this.option("radius")
					, cx: this.option("left")
					, cy: this.option("top") + this.option("radius")
				} , line: {
					path:  "M" + this.option("left") + "," + (this.option("top") + 2*this.option("radius")) +
									"V"+(this.option("top") + this.option("height"))
				}
			}, highlighted: {
				circle: {
					fill: "#FF0000"
					, stroke: "#990000"
				} , line: {
					stroke: "#990000"
				}
			}, dim: {
				circle: {
					fill: "#FFFFFF"
					, stroke: "#000000"
				} , line: {
					stroke: "#000000"
				}
			}
		};
	};
	proto.get_attrs = function() {
		var attrs = {};
		if(this.expanded) { _.deepExtend(attrs, this.state_attrs.expanded); }
		else { _.deepExtend(attrs, this.state_attrs.collapsed); }

		if(this.highlighted) { _.deepExtend(attrs, this.state_attrs.highlighted); }
		else { _.deepExtend(attrs, this.state_attrs.dim); }

		
		return attrs;
	};

	proto.collapse = function() {
		this.expanded = false;
		this.rrcompound.option("attrs", this.get_attrs(), this.option("animation_duration"));
	};
	proto.expand = function() {
		this.expanded = true;
		this.rrcompound.option("attrs", this.get_attrs(), this.option("animation_duration"));
	};
	proto.highlight = function() {
		this.highlighted = true;
		this.rrcompound.option("attrs", this.get_attrs(), this.option("animation_duration"));
	};
	proto.dim = function() {
		this.highlighted = false;
		this.rrcompound.option("attrs", this.get_attrs(), this.option("animation_duration"));
	};

	proto.option = function(key, value, animated) {
		if(_.isString(key)) {
			if(arguments.length === 1) {
				return this.options[key];
			} else if(arguments.length > 1) {
				this.options[key] = value;
			}
		} else {
			animated = value;
			_.each(key, function(v, k) {
				this.options[k] = v;
			}, this);
		}
		this.state_attrs = this.get_state_attrs();
		var new_attrs = this.expanded ? this.state_attrs.expanded: this.state_attrs.collapsed;
		if(animated) {
			var anim_options = _.extend({
				ms: this.option("animation_duration")
			}, animated);
			this.rrcompound.option("attrs", new_attrs, anim_options);
		} else {
			this.rrcompound.option("attrs", new_attrs, false);
		}
		return this;
	};
	proto.remove = function (animated) {
		if(animated) {
			this.collapse({
				callback: function() {
				}
			});
		} else {
			this.rrcompound.remove();
		}
	};
}(Antenna));
red.define("antenna", function(a, b) { return new Antenna(a,b); });

var simple_map = function() {
	var keys = [];
	var values = [];
	return {
		set: function(key, value) {
			var key_index = _.indexOf(keys, key);
			if(key_index < 0) {
				keys.push(key);
				values.push(value);
			} else {
				values[key_index] = value;
			}
		}
		, unset: function(key) {
			var key_index = _.indexOf(keys, key);
			while(key_index >= 0) {
				keys.splice(key_index, 1);
				values.splice(key_index, 1);
				key_index = _.indexOf(keys, key);
			}
			
		}
		, get: function(key) {
			var key_index = _.indexOf(keys, key);
			if(key_index >= 0) {
				return values[key_index];
			}
		}
		, each: function(callback, context) {
			context = context || this;
			for(var i = 0; i<keys.length; i++) {
				var key = keys[i], value = values[i];
				callback.call(context, value, key, i);
			}
		}
	};
};

var TransitionLayoutManager = function(root_view) {
	this.root_view = root_view;
	this.root = this.root_view.statechart;

	this.transition_views = [];
	this.transition_rows = [];
};

(function(my) {
	var proto = my.prototype;
	proto.add_transition_view = function(transition_view) {
		this.transition_views.push(transition_view);
		return this;
	};

	proto.num_rows = function() {
		return this.transition_rows.length;
	};

	proto.update_layout = function() {
		this.transition_rows = this.compute_transition_rows();
		var transition_positions = simple_map();
		for(var i = 0; i<this.transition_rows.length; i++) {
			var transition_row = this.transition_rows[i];
			for(var j = 0; j<transition_row.length; j++) {
				var transition = transition_row[j];
				if(transition !== false) {
					transition_positions.set(transition, i);
				}
			}
		}
		var base_diameter = this.root_view.option("antenna_top_radius")*2 + this.root_view.option("transition_radius");
		var row_height = this.root_view.option("transition_height");
		transition_positions.each(function(inverse_row, transition_view) {
			var row = this.transition_rows.length - inverse_row - 1;
			transition_view.option("y", base_diameter+row * row_height, true);
		}, this);
		return this;
	};

	proto.compute_transition_rows = function() {
		var transitions = _.pluck(this.transition_views, "transition");
		var rows = [];
		var states = this.root.flatten_substates();

		var curr_row = null;
		_.each(transitions, function(transition, index) {
			var from_index = _.indexOf(states, transition.from());
			var to_index = _.indexOf(states, transition.to());

			var min_index = Math.min(from_index, to_index);
			var max_index = Math.max(from_index, to_index);

			if(curr_row === null) {
				curr_row = _.map(states, function() { return false; });
				rows.push(curr_row);
			} else {
				var need_new_row = false;
				for(var i = min_index; i<=max_index; i++) {
					if(curr_row[i]) {
						need_new_row = true;
						break;
					}
				}
				if(need_new_row) {
					curr_row = _.map(states, function() { return false; });
					rows.push(curr_row);
				}
			}

			for(var i = min_index; i<=max_index; i++) {
				curr_row[i] = this.transition_views[index];
			}
		}, this);

		return rows;

	};
}(TransitionLayoutManager));

var statechart_view_map = simple_map();

var StatechartView = function(statechart, paper, options) {
	red.make_this_listenable(this);
	this.statechart = statechart;
	statechart_view_map.set(this.statechart, this);
	this.paper = paper;
	this.options = _.extend({
						root: false
						, parent: null
						, left: 0
						, width: 100
						, state_name: ""
						, height: 50
						, transition_layout_manager: null
						, antenna_top_radius: 5
						, transition_height: 10
						, top: 0
						, transition_radius: 3
					}, options);


	var self = this;
	if(this.options.root) {
		this.options.transition_layout_manager = new TransitionLayoutManager(this);
		this.add_state_button = paper.text(400, 10, "+");
		this.add_state_button.click(function(event) {
			self._emit("add_state", {
				originalEvent: event
			});
		}).attr({
			"font-size": 30
			, "cursor": "pointer"
		});
	} else {
		this.label = red.create("editable_text", this.paper, {
			x: this.option("left") + this.option("width")/2
			, y: 50
			, text: this.option("state_name")
			, text_anchor: "middle"
			, width: this.option("width")
		});
		this.$onRenameRequested = _.bind(this.onRenameRequested, this);
		this.label.on("change", this.$onRenameRequested);
		var bbox = this.label.getBBox();
		var height = bbox.height;
		this.antenna = red.create("antenna", this.paper, { left: this.option("left") + (this.option("width") / 2)
															, height: this.option("height") - bbox.height
															, animate_creation: true
															, radius: this.option("antenna_top_radius")
															, top: this.option("top")
															});

		this.antenna.circle.mousedown(_.bind(function(event) {
			var sc_root = this.statechart.root();
			var substates = sc_root.flatten_substates();
			var sc_root_view = statechart_view_map.get(sc_root);

			var nearest_target_index = function(x, y) {
				var min_distance = -1;
				var min_distance_index = -1;
				for(var i = 0; i<substates.length; i++) {
					var substate = substates[i];
					var substate_view = statechart_view_map.get(substate);
					if(_.has(substate_view, "antenna")) {
						var target = substate_view.antenna.ellipse;
						var distance = Math.pow(target.attr("cx") - x, 2) + Math.pow(target.attr("cy") - y, 2);
						if(min_distance_index < 0 || distance < min_distance) {
							min_distance = distance;
							min_distance_index = i;
						}
					}
				}
				return min_distance_index;
			};
			var nearest_target = function(x, y) {
				var nti = nearest_target_index(x, y);
				return statechart_view_map.get(substates[nti]).antenna.ellipse;
			};
			var get_dest_point = function(x, y) {
				var target = nearest_target(x,y);
				if(!target) {
					return {x: x, y: y};
				} else {
					return {x: target.attr("cx"), y: target.attr("cy")};
				}
			}
				
			var dest_point = get_dest_point(event.clientX, event.clientY);

			var ellipse = this.antenna.ellipse;
			
			var arrow = red.create("arrow", paper, {
				fromX: ellipse.attr("cx")
				, fromY: ellipse.attr("cy")
				, toX: dest_point.x
				, toY: dest_point.y
			});
			var old_dest = {x:-1, y:-1};
			var onMouseMove = _.bind(function(event) {
				var x = event.clientX - this.paper.canvas.offsetLeft;
				var y = event.clientY - this.paper.canvas.offsetTop;
				var dest_point = get_dest_point(x, y);
				if(dest_point.x !== old_dest.x || dest_point.y !== old_dest.y) {
					arrow.option("toX", dest_point.x, true);
					arrow.option("toY", dest_point.y, true);
					old_dest = dest_point;
				}
				event.stopPropagation();
				event.preventDefault();
			}, this);

			window.addEventListener("mousemove", onMouseMove);

			var remove_event_listeners = function() {
				window.removeEventListener("mousemove", onMouseMove);
				window.removeEventListener("mouseup", onMouseUp);
				window.removeEventListener("keydown", onKeyDown);
			};

			var onMouseUp = _.bind(function(event) {
				arrow.remove();
				remove_event_listeners();
				var x = event.clientX - this.paper.canvas.offsetLeft;
				var y = event.clientY - this.paper.canvas.offsetTop;
				var substate_index = nearest_target_index(x, y);
				var to_state = substates[substate_index];
				var from_state = this.statechart;
				//var transition_event = red.create_event("parsed", "");
				//from_state.parent().add_transition(from_state, to_state, transition_event);
				//console.log("emit");
				self._emit("add_transition", {
					originalEvent: event,
					from_state: from_state,
					to_state: to_state
				});
			}, this);

			var onKeyDown = _.bind(function(event) {
				if(event.keyCode === 27) { // Esc
					arrow.remove();
					remove_event_listeners();
				}
			}, this);

			window.addEventListener("mouseup", onMouseUp);
			window.addEventListener("keydown", onKeyDown);
			event.stopPropagation();
			event.preventDefault();
		}, this));
	}

	this.substate_views = [];
	this.transition_views = [];

	this.$substates = this.statechart.$substates;
	this.$outgoing_transitions = this.statechart.$outgoing_transitions;

	this.$onSet = _.bind(this.onSet, this);
	this.$onUnset = _.bind(this.onUnset, this);
	this.$onIndexChange = _.bind(this.onIndexChange, this);
	this.$onMove = _.bind(this.onMove, this);
	this.$onValueChange = _.bind(this.onValueChange, this);
	this.$onKeyChange = _.bind(this.onKeyChange, this);

	this.$substates.each(function(a,b,c) {
		this.$onSet(a,b,c,false);
	}, this);

	this.$substates.onSet(this.$onSet);
	this.$substates.onUnset(this.$onUnset);
	this.$substates.onIndexChange(this.$onIndexChange);
	this.$substates.onMove(this.$onMove);
	this.$substates.onKeyChange(this.$onKeyChange);
	this.$substates.onValueChange(this.$onValueChange)

	if(this.options.root) {
		this.onStatesReady();
	}
};

(function(my) {
	var proto = my.prototype;
	red.make_proto_listenable(proto);
	proto.onStatesReady = function() {
		this.$onTransitionAdded = _.bind(this.onTransitionAdded, this);
		this.$onTransitionRemoved = _.bind(this.onTransitionRemoved, this);
		this.$onTransitionMoved = _.bind(this.onTransitionMoved, this);

		this.$outgoing_transitions.each(this.$onTransitionAdded);

		this.$outgoing_transitions.onAdd(this.$onTransitionAdded);
		this.$outgoing_transitions.onRemove(this.$onTransitionRemoved);
		this.$outgoing_transitions.onMove(this.$onTransitionMoved);

		this.$substates.each(function(substate) {
			var view = statechart_view_map.get(substate);
			view.onStatesReady();
		});
	};
	proto.onTransitionAdded = function(transition, index) {
		var to = transition.to();
		var to_view = statechart_view_map.get(to);
		var transition_view = red.create("transition", transition, this.paper, {
			from_view: this
			, to_view: to_view
			, animate_creation: true
		});
		this.transition_views.splice(index, 0, transition_view);

		var transition_layout_manager = this.option("transition_layout_manager");
		transition_layout_manager	.add_transition_view(transition_view)
									.update_layout();
	};
	proto.onTransitionRemoved = function(transition, index) {
		var transition_view = this.transition_views[index];
		this.transition_views.splice(index, 1);
		transition_view.remove();
	};
	proto.onTransitionMoved = function() {
		console.log("moved", arguments);
	};

	proto.onSet = function(state, state_name, index, also_initialize) {
		var state_view = red.create("statechart_view", state, this.paper, {
			parent: this
			, left: this.options.left + this.option("width")*index
			, width: this.options.width
			, state_name: state_name
			, height: this.options.height
			, transition_layout_manager: this.options.transition_layout_manager
		});
		this.substate_views.splice(index, 0, state_view);
		if(also_initialize !== false) {
			state_view.onStatesReady();
		}
		state_view.on("add_transition", this.forward);
		state_view.on("add_state", this.forward);
	};
	proto.onUnset = function(state, state_name, index) {
		var substate_view = this.substate_views[index];
		this.substate_views.splice(index, 1);
		substate_view.remove(true);
		state_view.off("add_transition", this.forward);
		state_view.off("add_state", this.forward);
		//console.log("unset", arguments);
	};
	proto.onIndexChange = function(state, state_name, to_index, from_index) {
		var substate_view = this.substate_views[from_index];
		substate_view.option("left", this.options.left + this.option("width")*to_index, true);
		//console.log("index change", arguments);
	};
	proto.onMove = function(state, state_name, insert_at, to_index, from_index) {
		var substate_view = this.substate_views[from_index];
		this.substate_views.splice(from_index, 1);
		this.substate_views.splice(insert_at, 0, substate_view);
		//console.log("move", arguments);
	};
	proto.onValueChange = function(state, state_name, old_state, index) {
	/*
		var substate_view = this.substate_views[index];
		substate_view.remove(true);
		var new_substate_view = red.create("statechart_view", state, this.paper, {
			parent: this
			, left: this.options.left + this.option("width")*index
			, width: this.options.width
			, state_name: state_name
			, height: this.options.height
		});
		this.substate_views[index] = new_substate_view;
		state_view.onStatesReady();
		*/
	};
	proto.onKeyChange = function(new_state_name, old_state_name, index) {
		var substate_view = this.substate_views[index];
		substate_view.option("state_name", new_state_name);
	};
	proto.option = function(key, value, animated) {
		if(arguments.length <= 1) {
			return this.options[key];
		} else {
			this.options[key] = value;
			if(key === "left") {
				this.antenna.option("left", this.option("left") + (this.option("width") / 2), animated);
				this.label.option("x", this.option("left") + (this.option("width") / 2), animated);
			}
			return this;
		}
	};
	proto.remove = function(animated) {
		if(_.has(this, "antenna")) {
			this.antenna.remove(animated);
		}
		if(_.has(this, "label")) {
			this.label.off("change", this.$onRenameRequested);
			this.label.remove(animated);
		}
	};
	proto.onRenameRequested = function(event) {
		var new_name = event.value;
		var parent_statechart = this.statechart.parent();
		if(parent_statechart) {
			parent_statechart.rename_substate(this.statechart.get_name(parent_statechart), new_name);
		}
	};
}(StatechartView));
red.define("statechart_view", function(a, b, c) { return new StatechartView(a,b,c); });
}(red));
