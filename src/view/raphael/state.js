(function(red) {
var cjs = red.cjs, _ = red._;

var Antenna = function(paper, options) {
	able.make_this_optionable(this, {
		radius: 5
		, height: function() { return this.option("radius") * 2 + this.option("shaft_height") }
		, shaft_height: 30
		, x: 10
		, y: 5
		, animation_duration: 600
		, animate_creation: false
	}, options);

	this.state_attrs = this.get_state_attrs();

	this.highlighted = false;
	if(this.option("animate_creation")) {
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

	if(this.option("animate_creation")) {
		this.expand();
	}
};

(function(my) {
	var proto = my.prototype;
	able.make_proto_optionable(proto);

	proto.get_state_attrs = function() {
		return {
			collapsed: {
				circle: {
					r: 0
					, cx: this.option("x")
					, cy: this.option("y") + this.option("height")
				}, line: {
					path:  "M" + this.option("x") + "," + (this.option("y") + this.option("height"))
				}
			}, expanded: {
				circle: {
					r: this.option("radius")
					, cx: this.option("x")
					, cy: this.option("y") + this.option("radius")
				} , line: {
					path:  "M" + this.option("x") + "," + (this.option("y") + 2*this.option("radius")) +
									"V"+(this.option("y") + this.option("height"))
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

	proto._on_options_set = function(values, animated) {
		this.state_attrs = this.get_state_attrs();
		this.rrcompound.option("attrs", this.get_attrs(), animated);
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

var TransitionLayoutManager = function(root_view) {
	this.root_view = root_view;
	this.root = this.root_view.statechart;

	this.transition_views = [];
	this.transition_rows = [];
	this.top_offset = 12;
};

(function(my) {
	var proto = my.prototype;
	proto.add_transition_view = function(transition_view) {
		this.transition_views.push(transition_view);
		return this;
	};
	proto.remove_transition_view = function(transition_view) {
		this.transition_views = _.without(this.transition_views, transition_view);
		return this;
	};

	proto.num_rows = function() {
		return this.transition_rows.length;
	};

/*
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
		var base_diameter = this.root_view.option("antenna_top_radius")*2 + this.top_offset;
		var row_height = this.root_view.option("transition_height");
		transition_positions.each(function(inverse_row, transition_view) {
			var row = this.transition_rows.length - inverse_row - 1;
			transition_view.option("y", base_diameter+row * row_height, true);
		}, this);
		this.root_view.option("antenna_shaft_height", this.top_offset + this.transition_rows.length * row_height);

		return this;
	};
	proto.get_heights = function() {
	};
	*/
	proto.get_transition_rows = function() {
		return this.transition_rows;
	};

	proto.recompute_transition_rows = function() {
		var transitions = _.pluck(this.transition_views, "transition");
		var rows = [];
		var states = this.root.flatten_substates();

		_.each(transitions, function(transition, index) {
			var from_index = _.indexOf(states, transition.from());
			var to_index = _.indexOf(states, transition.to());

			var min_index = Math.min(from_index, to_index);
			var max_index = Math.max(from_index, to_index);

			var curr_row;
			var has_enough_space;
			for(var i = 0; i<rows.length; i++) {
				has_enough_space = true;
				var row = rows[i];
				for(var j = min_index; j<=max_index; j++) {
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

			for(var i = min_index; i<=max_index; i++) {
				curr_row[i] = this.transition_views[index];
			}
		}, this);

		this.transition_rows = rows;
		return rows;
	};
}(TransitionLayoutManager));

var statechart_view_map = new Map({
	hash: "hash"
});

var StatechartView = function(statechart, paper, options) {
	able.make_this_listenable(this);
	able.make_this_optionable(this, {
						root: false
						, parent: null
						, x: function() { return this.column_layout_manager.get_x(); }
						, width: function() { return this.column_layout_manager.get_width(); }
						, height: function() { return this.option("antenna_shaft_height") + this.option("antenna_top_radius") * 2 + this.option("state_label_padding_top") + this.option("state_label_height"); }
						, ownStateMiddleX: function() { return this.state_column.get_x() + this.state_column.get_width()/2; }
						, y: 0
						, state_name: ""
						, antenna_shaft_height: 0
						, transition_layout_manager: null
						, antenna_top_radius: 5
						, transition_radius: 3
						, column_layout_manager: null
						, state_width: 70
						, outline_padding: 5
						, state_label_height: 16
						, transition_label_height: 16
						, state_label_padding_top: 2
						, transition_padding_top: 2
					}, options);

	this.paper = paper;
	this.statechart = statechart;
	statechart_view_map.put(this.statechart, this);
	
	this.column_layout_manager = this.option("column_layout_manager") || new red.ColumnLayout();
	this.transition_layout_manager = this.option("transition_layout_manager") || new TransitionLayoutManager(this);
	this.children_layout_manager = this.column_layout_manager.push({own_width: false});

	this.substate_views = [];
	this.transition_views = [];


	this.concurrent_divider = red.create("rrpath", this.paper, {
		path: ""
		, stroke: "black"
		, "stroke-width": "3"
		, "stroke-dasharray": "- "
	}).hide();

	var self = this;
	if(this.option("root")) {
		var add_state_layout_manager = this.column_layout_manager.push({own_width: this.option("state_width")});
		this.add_state_button = paper.text(add_state_layout_manager.get_x(), 10, "+");
		this.add_state_button.click(function(event) {
			self._emit("add_state", {
				originalEvent: event
				, statechart: self.statechart
			});
		}).attr({
			"font-size": 30
			, "cursor": "pointer"
			, "text-anchor": "start"
		});
		add_state_layout_manager.on("move", function(col, x) {
			self.add_state_button.attr("x", x);
		});

		var last_active_substates = [];
		cjs.liven(function() {
			var active_substates = this.statechart.get_active_states();
			var made_active = _.difference(active_substates, last_active_substates);
			var made_inactive = _.difference(last_active_substates, active_substates);
			_.defer(function() {
				var made_active_views = _.map(made_active, function(state) { return statechart_view_map.get(state); });
				var made_inactive_views = _.map(made_inactive, function(state) { return statechart_view_map.get(state); });

				_.each(made_active_views, function(view) { if(view) view.highlight(); });
				_.each(made_inactive_views, function(view) { if(view) view.dim(); });

				last_active_substates = active_substates;
			});
		}, {context: this});
	} else {
		this.state_column = this.column_layout_manager.insert_at(0, {own_width: this.option("state_width")});

		this.state_label = red.create("editable_text", this.paper, {
			x: this.state_column.get_x() + this.state_column.get_width()/2
			, y: this.option("height")
			, text: this.option("state_name")
			, "text-anchor": "middle"
			, width: this.option("width")
		});
		this.$onRenameRequested = _.bind(this.onRenameRequested, this);
		this.state_label.on("change", this.$onRenameRequested);

		this.state_outline = red.create("rrrect", this.paper, {
			r: 3
			, fill: "rgba(100, 100, 100, 0.1)"
			, stroke: "none"
		}).hide();
		this.outline = red.create("rrrect", this.paper, {
			r: 3
			, fill: "rgba(100, 100, 100, 0.1)"
		}).hide();

		this.antenna = red.create("antenna", this.paper, { x: this.option("ownStateMiddleX")
															, shaft_height: 0
															, animate_creation: false
															, radius: this.option("antenna_top_radius")
															, y: this.option("y")
															});

		this.$update_outlines = _.bind(this.update_outlines, this);
		this.$update_antenna = _.bind(this.update_antenna, this);
		this.column_layout_manager	.on("resize", this.$update_outlines)
									.on("move", this.$update_outlines);
		this.state_column	.on("resize", this.$update_antenna)
							.on("move", this.$update_antenna)
							.on("resize", this.$update_outlines)
							.on("move", this.$update_outlines);

		//this.transition_layout_manager.update_layout();
		this.antenna.rrcompound.find("circle").mousedown(_.bind(function(event) {
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
						var target = substate_view.antenna.rrcompound.find("circle");
						var distance = Math.pow(target.option("cx") - x, 2) + Math.pow(target.option("cy") - y, 2);
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
				return statechart_view_map.get(substates[nti]).antenna.rrcompound.find("circle");
			};
			var get_dest_point = function(x, y) {
				var target = nearest_target(x,y);
				if(!target) {
					return {x: x, y: y};
				} else {
					return {x: target.option("cx"), y: target.option("cy")};
				}
			}
				
			var dest_point = get_dest_point(event.clientX, event.clientY);

			var circle = this.antenna.rrcompound.find("circle");
			
			var arrow = red.create("arrow", paper, {
				fromX: circle.option("cx")
				, fromY: circle.option("cy")
				, toX: dest_point.x
				, toY: dest_point.y
			});
			var old_dest = {x:-1, y:-1};
			var onmousemove = _.bind(function(event) {
				var x = event.clientX - this.paper.canvas.offsetLeft;
				var y = event.clientY - this.paper.canvas.offsetTop;
				var dest_point = get_dest_point(x, y);
				if(dest_point.x !== old_dest.x || dest_point.y !== old_dest.y) {
					arrow.option("toX", dest_point.x); arrow.option("toY", dest_point.y);
					old_dest = dest_point;
				}
				event.stopPropagation();
				event.preventDefault();
			}, this);

			window.addEventListener("mousemove", onmousemove);

			var remove_event_listeners = function() {
				window.removeEventListener("mousemove", onmousemove);
				window.removeEventListener("mouseup", onmouseup);
				window.removeEventListener("keydown", onkeydown);
			};

			var onmouseup = _.bind(function(event) {
				arrow.remove();
				remove_event_listeners();
				var x = event.clientX - this.paper.canvas.offsetLeft;
				var y = event.clientY - this.paper.canvas.offsetTop;
				var substate_index = nearest_target_index(x, y);
				var to_state = substates[substate_index];
				var from_state = this.statechart;

				self._emit("add_transition", {
					originalevent: event,
					from_state: from_state,
					to_state: to_state
				});
			}, this);

			var onkeydown = _.bind(function(event) {
				if(event.keycode === 27) { // esc
					arrow.remove();
					remove_event_listeners();
				}
			}, this);

			window.addEventListener("mouseup", onmouseup);
			window.addEventListener("keydown", onkeydown);
			event.stopPropagation();
			event.preventDefault();
		}, this));
	}

	this.$substates = this.statechart.$substates;

	this.$onSet = _.bind(this.onSet, this);
	this.$onUnset = _.bind(this.onUnset, this);
	this.$onIndexChange = _.bind(this.onIndexChange, this);
	this.$onMove = _.bind(this.onMove, this);
	this.$onValueChange = _.bind(this.onValueChange, this);
	this.$onKeyChange = _.bind(this.onKeyChange, this);

	this.$substates.each(function(statechart, name, index) {
		this.$onSet({
			state: statechart,
			state_name: name,
			index: index
		}, false);
	}, this);

	this.statechart.on("add_substate", this.$onSet);
	this.statechart.on("remove_substate", this.$onUnset);
	this.statechart.on("move_substate", this.$onMove);
	this.statechart.on("rename_substate", this.$onKeyChange);

	if(this.option("root")) {
		this.onStatesReady();
	}

	this.update_outlines();
};

(function(my) {
	var proto = my.prototype;
	able.make_proto_listenable(proto);
	able.make_proto_optionable(proto);
	proto.onStatesReady = function() {
		this.$onTransitionAdded = _.bind(this.onTransitionAdded, this);
		this.$onTransitionRemoved = _.bind(this.onTransitionRemoved, this);
		this.$onTransitionMoved = _.bind(this.onTransitionMoved, this);

		_.each(this.statechart.get_outgoing_transitions(), function(transition) {
			this.$onTransitionAdded({
				transition: transition
			});
		}, this);

		this.statechart.on("add_transition", this.$onTransitionAdded);

		this.$substates.each(function(substate) {
			var view = statechart_view_map.get(substate);
			view.onStatesReady();
		});
	};
	proto.onTransitionAdded = function(event) {
		var transition = event.transition,
			index = event.index;

		var to = transition.to();
		var to_view = statechart_view_map.get(to);
		var transition_view = red.create("transition", transition, this.paper, {
			from_view: this
			, to_view: to_view
			, animate_creation: true
		});
		if(_.isNumber(index)) {
			this.transition_views.splice(index, 0, transition_view);
		} else {
			this.transition_views.push(index);
		}

		this.transition_layout_manager	.add_transition_view(transition_view);
		this.update_transition_layout();
		transition_view.on("set_event_str", this.forward);
	};
	proto.onTransitionRemoved = function(transition, index) {
		var transition_view = this.transition_views[index];
		this.transition_layout_manager.remove_transition_view(transition_view);
		this.transition_views.splice(index, 1);
		transition_view.remove();
	};
	proto.onTransitionMoved = function() {
		console.log("moved", arguments);
	};

	proto.onSet = function(event, also_initialize) {
		var state = event.state,
			state_name = event.state_name,
			index = event.index;
		var state_parent = state.parent();
		var state_view = red.create("statechart_view", state, this.paper, {
			parent: this
			, state_name: state_name
			, antenna_shaft_height: this.option("antenna_shaft_height")
			, transition_layout_manager: this.transition_layout_manager
			, column_layout_manager: this.children_layout_manager.push({own_width: false})
		});
		if(_.isNumber(index)) {
			this.substate_views.splice(index, 0, state_view);
		} else {
			this.substate_views.push(state_view);
		}
		if(also_initialize !== false) {
			state_view.onStatesReady();
		}
		state_view.update_transition_layout();

		state_view.on("add_transition", this.forward);
		state_view.on("add_state", this.forward);
		state_view.on("set_event_str", this.forward);
	};
	proto.onUnset = function(event) {
		var state = event.state,
			name = event.name,
			index = -1;
		for(var i = 0; i<this.substate_views.length; i++) {
			if(this.substate_views[i].statechart === state) {
				index = i;
				break;
			}
		}
		var state_view = this.substate_views[index];
		this.substate_views.splice(index, 1);
		state_view.remove(true);
		state_view.off("add_transition", this.forward);
		state_view.off("add_state", this.forward);
		state_view.off("set_event_str", this.forward);
	};
	proto.onIndexChange = function(state, state_name, to_index, from_index) { };
	proto.onMove = function(state, state_name, insert_at, to_index, from_index) {
		var substate_view = this.substate_views[from_index];
		this.substate_views.splice(from_index, 1);
		this.substate_views.splice(insert_at, 0, substate_view);
		this.children_layout_manager.move(from_index, to_index);
	};
	proto.onValueChange = function(state, state_name, old_state, index) {
		var substate_view = this.substate_views[index];
		substate_view.remove(true);
		var new_substate_view = red.create("statechart_view", state, this.paper, {
			parent: this
			, x: this.option("x") + this.option("width")*index
			, width: this.option("width")
			, state_name: state_name
			, height: this.option("height")
			, column_layout_manager: this.children_layout_manager.push({own_width: false})
		});
		this.substate_views[index] = new_substate_view;
		state_view.onStatesReady();
	};
	proto.onKeyChange = function(new_state_name, old_state_name, index) {
		var substate_view = this.substate_views[index];
		substate_view.option("state_name", new_state_name);
	};
	proto._on_option_set = function(key, value, animated) {
		if(_.indexOf(["antenna_shaft_height", "x", "width"], key) >= 0) {
			if(this.option("root")) {
				this.update_paper_size();
			} else {
				this.update_antenna(animated);
			}
			this.update_outlines();
		}

		if(key === "antenna_shaft_height") {
			_.each(this.substate_views, function(substate_view) {
				substate_view.option(key, value, animated);
			}, this);
		}
	};
	proto.highlight = function() {
		this.antenna.highlight();
		this.outline.option({"stroke": "red"});
		this.state_label.option({color: "red"});
	};
	proto.dim = function() {
		this.antenna.dim();
		this.outline.option({"stroke": "black"});
		this.state_label.option({color: "black"});
	};
	proto.remove = function(animated) {
		if(_.has(this, "antenna")) {
			this.antenna.remove(animated);
		}
		if(_.has(this, "label")) {
			this.state_label.off("change", this.$onRenameRequested);
			this.state_label.remove(animated);
		}
	};

	proto.onRenameRequested = function(event) {
		var new_name = event.value;
		var parent_statechart = this.statechart.parent();
		if(parent_statechart) {
			parent_statechart.rename_substate(this.statechart.get_name(parent_statechart), new_name);
		}
	};

	proto.update_paper_size = function(animated) {
		this.paper.setSize(this.option("width"), this.option("y") + this.option("height"));
	};

	proto.update_antenna = function(animated) {
		var middleX = this.option("ownStateMiddleX")
			, antenna_shaft_height = this.option("antenna_shaft_height")
			, y = this.option("y");
		this.antenna.option({
			x: middleX
			, shaft_height: antenna_shaft_height
			, y: y
		}, animated);
		this.state_label.option({
			x: middleX
			, y: y + this.antenna.option("height") + this.option("state_label_padding_top") + this.option("state_label_height")/2
		}, animated);
	};

	proto.update_outlines = function() {
		var height = this.option("height");
		if(this.outline) {
			if(this.statechart.get_substates().length === 0) {
				this.outline.hide();
				this.state_outline.hide();
				this.concurrent_divider.hide();
			} else {
				this.outline.show();
				this.state_outline.show();
				this.outline.option({
					height: height
					, width: this.column_layout_manager.get_width()
					, x: this.state_column.get_x()
					, y: this.option("y")
				});
				this.state_outline.option({
					height: height
					, width: this.state_column.get_width()
					, x: this.state_column.get_x()
					, y: this.option("y")
				});
				

				//var indent_level = -1;
				//var parent = this.statechart;
				//while(parent) {
					//indent_level++;
					//parent = parent.parent();
				//}
			}
		}
		var statechart = this.statechart;
		if(statechart.is_concurrent()) {
			var children = this.children_layout_manager.get_children();
			var path = "";
			var child;
			for(var i = 1; i<children.length; i++) {
				child = children[i];
				path += "M" + child.get_x() + "," + this.option("y") + "V" + height;
			}
			if(this.option("root") && child) {
				path += "M" + (child.get_x() + child.get_width()) + "," + this.option("y") + "V" + height;
			}
			this.concurrent_divider.option({
				path: path
			});
			this.concurrent_divider.show().toFront();
		} else {
			this.concurrent_divider.hide();
		}
	};
	proto.update_transition_layout = function(animated) {
		if(this.option("root")) {
			var rows = this.transition_layout_manager.recompute_transition_rows();
			var top_offset = 2 * this.option("transition_radius");
			var transition_height = this.option("transition_label_height") + this.option("transition_padding_top");
			this.option("antenna_shaft_height", transition_height * rows.length + top_offset);
			var top_padding = this.option("antenna_top_radius")*2 + transition_height;

			var transition_positions = new Map({ });
			for(var i = 0; i<rows.length; i++) {
				var transition_row = rows[i];
				for(var j = 0; j<transition_row.length; j++) {
					var transition = transition_row[j];
					if(transition !== false) {
						transition_positions.put(transition, i);
					}
				}
			}
			transition_positions.each(function(inverse_row, transition_view) {
				var row = rows.length - inverse_row - 1;
				transition_view.option("y", top_padding+row * transition_height, true);
			}, this);
		} else {
			var root_view = this.transition_layout_manager.root_view;
			root_view.update_transition_layout(animated);
		}
	};
}(StatechartView));
red.define("statechart_view", function(a, b, c) { return new StatechartView(a,b,c); });
}(red));
