/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console,RedMap,jQuery,window,Snap */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	cjs.registerPartial("statechartView", function(options, parent_elem) {
		if(!parent_elem) {
			parent_elem = $("<div />")[0];
		}
		$(parent_elem).statechart(options);
		return parent_elem;
	});
	$.widget("interstate.statechart", {
		options: {
			transition_font_family: "Source Sans Pro",
			transition_font_size: 12,
			transition_arrow_color: "#000",
			transition_text_background_color: "#FFF",
			transition_text_color: "#000",
			active_transition_color: "#007000",

			state_font_family: "Source Sans Pro",
			state_font_size: 13,
			state_text_background_color: "#FFF",
			state_text_color: "#000",
			state_fill: "#EEE",
			state_stroke: "#999",
			active_state_fill: "#FFF",
			active_state_stroke: "#007000",
			active_state_text_color: "#007000",
			start_state_color: "#000",
			add_state_width: 50,

			statecharts: [],

			hrange_y: 5,
			hrange_height: 14,

			//client: false,

			padding_top: function() {
				return this.option("hrange_y") + this.option("hrange_height");
			}
		},

		_create: function () {
			var statecharts = this.option("statecharts");
			this.$stateMachineSummary = cjs(_.bind(function() {
				var statecharts = this.option("statecharts"),
					statecharts_val = statecharts.get();
				if(statecharts_val) {
					return _.chain(statecharts_val)
							.map(function(sc) {
								var constraint = sc.get_$("summarizeStatechart");
								if(constraint) {
									return constraint.get();
								} else {
									return false;
								}
							})
							.compact()
							.value();
				} else {
					return false;
				}
			}, this));

			this.paper = new Snap(0,0);
			this.paperNode = $(this.paper.node).prependTo(this.element);

			this.layout_manager = new ist.RootStatechartLayoutEngine({
				stateMachineSummary: this.$stateMachineSummary,
				padding_top: this.option("padding_top").call(this),
				add_state_width: this.option("add_state_width")
			});
			/*
			console.log(statecharts);

			return;
			this.element.addClass("statechart");
			this.paper = new Raphael(this.element[0], 0, 0);
			//this.paper = Snap(0,0);
			//$(this.paper.node).appendTo(this.element);
			*/

			this.statechart_view = new ist.RootStatechartView(statecharts, this.layout_manager, this.paper, this.$stateMachineSummary, this.options);
			this._addClassBindings();
			this._addCommandBindings();
		},

		_addClassBindings: function() {
			this.element.addClass("statechart");
		},
		_removeClassBindings: function() {
			this.element.removeClass("statechart");
		},

		_addCommandBindings: function() {
			this.statechart_view.on("add_state", this.add_state, this);
			this.statechart_view.on("remove_state", this.remove_state, this);
			this.statechart_view.on("remove_transition", this.remove_transition, this);
			this.statechart_view.on("add_transition", this.add_transition, this);
			this.statechart_view.on("set_to", this.set_transition_to, this);
			this.statechart_view.on("set_from", this.set_transition_from, this);
			this.statechart_view.on("rename", this.rename_state, this);
			this.statechart_view.on("set_str", this.set_transition_str, this);
			this.statechart_view.on("make_concurrent", this.make_concurrent, this);
			this.statechart_view.on("reset", this.reset, this);
		},

		_removeCommandBindings: function() {
			this.statechart_view.off("add_state", this.add_state, this);
			this.statechart_view.off("remove_state", this.remove_state, this);
			this.statechart_view.off("remove_transition", this.remove_transition, this);
			this.statechart_view.off("add_transition", this.add_transition, this);
			this.statechart_view.off("set_to", this.set_transition_to, this);
			this.statechart_view.off("set_from", this.set_transition_from, this);
			this.statechart_view.off("rename", this.rename_state, this);
			this.statechart_view.off("set_str", this.set_transition_str, this);
			this.statechart_view.off("make_concurrent", this.make_concurrent, this);
			this.statechart_view.off("reset", this.reset, this);
		},

		_destroy: function () {
			this._removeClassBindings();
			this._removeCommandBindings();
			this.statechart_view.destroy();
			this._super();
			this.paper.remove();

			delete this.statechart_view;

			this.paper.remove();

			delete this.options.statecharts;
			delete this.options;

			this.layout_manager.destroy();
			delete this.layout_manager;
		},


		get_layout_manager: function() {
			return this.layout_manager;
		},

		_setOption: function(key, value) {
			this._super(key, value);
		},
		add_state: function(e) {
			var event = new $.Event("command");
			event.command_type = "add_state";
			event.state = e.parent;

			this.element.trigger(event);
		},
		remove_state: function(e) {
			var event = new $.Event("command");
			event.command_type = "remove_state";
			event.state = e.state;

			this.element.trigger(event);
		},
		remove_transition: function(e) {
			var event = new $.Event("command");
			event.command_type = "remove_transition";
			event.transition = e.transition;

			this.element.trigger(event);
		},
		add_transition: function(e) {
			var event = new $.Event("command");
			event.command_type = "add_transition";
			event.from = e.from;
			event.to = e.to;

			this.element.trigger(event);
		},
		set_transition_to: function(e) {
			var event = new $.Event("command");
			event.command_type = "set_transition_to";
			event.transition = e.transition;
			event.to = e.to;

			this.element.trigger(event);
		},
		set_transition_from: function(e) {
			var event = new $.Event("command");
			event.command_type = "set_transition_from";
			event.transition = e.transition;
			event.from = e.from;

			this.element.trigger(event);
		},
		set_transition_event: function(e) {
			var event = new $.Event("command");
			event.command_type = "set_transition_event";
			event.transition = e.transition;
			event.from = e.from;

			this.element.trigger(event);
		},
		rename_state: function(e) {
			var event = new $.Event("command");
			event.command_type = "rename_state";
			event.state = e.state;
			event.new_name = e.name;

			this.element.trigger(event);
		},
		set_transition_str: function(e) {
			var event = new $.Event("command");
			event.command_type = "set_transition_str";
			event.transition = e.transition;
			event.str = e.str;

			this.element.trigger(event);
		},
		make_concurrent: function(e) {
			var event = new $.Event("command");
			event.command_type = "make_concurrent";
			event.state = e.state;
			event.concurrent = e.concurrent;

			this.element.trigger(event);
		},
		reset: function(e) {
			var event = new $.Event("command");
			event.command_type = "reset";
			event.client = cjs.get(this.option("client"));
			if(event.client) {
				this.element.trigger(event);
			}
		}
	});


	ist.RootStatechartView = function (statecharts, layout_engine, paper, $stateMachineSummary, options) {
		able.make_this_listenable(this);
		able.make_this_optionable(this, {}, options);

		this.statecharts = statecharts;
		this.layout_engine = layout_engine;
		this.object_views = {};
		this.hranges = {};
		/*
		this.object_views = new RedMap({
			hash: "hash"
		});
		this.hranges = new RedMap({
			hash: "hash"
		});
		*/
		this.paper = paper;
		this.add_state_shape = this.paper.path("M0,0");
		this.add_state_button = this.paper.text(0,0,"+");

		this.add_state_button	.attr({
									"font-size": "42px",
									fill: this.option("state_stroke"),
									opacity: 0.5,
									cursor: "pointer",
									"text-anchor": "middle"
								})
								.click(_.bind(this.on_add_state_click, this));
		this.add_state_shape	.attr({
									fill: this.option("state_fill"),
									stroke: this.option("state_stroke"),
									opacity: 0.5,
									cursor: "pointer"
								})
								.click(_.bind(this.on_add_state_click, this));

		var curr_items = [];
		this.$stateMachineSummary = $stateMachineSummary;

		function flattenStateTree(tree) {
			var rv = [tree];
			return rv.concat.apply(rv, _.map(tree.substates, function(substate) {
				return flattenStateTree(substate);
			}));
		}

		this.live_layout = cjs.liven(function () {
			var stateMachineSummary = this.$stateMachineSummary.get();
			if(stateMachineSummary) {
				var layout_info = this.layout_engine.get_layout(),
					width = layout_info.width,
					height = layout_info.height,
					locations = layout_info.locations;
				//this.paper.setSize(width, height);
				this.paper.attr({
					width: width,
					height: height
				});
				_.each(stateMachineSummary, function(topLevelStateMachine_info, index) {
					var id = topLevelStateMachine_info.id,
						layout = locations[topLevelStateMachine_info.id],
						is_own = index === 0,
						hrange = this.get_hrange(topLevelStateMachine_info.state, is_own ? "own" : "inherited", layout), // will update hrange
						flat_state_machine = flattenStateTree(topLevelStateMachine_info);

					if (layout.add_state_button_x) {
						var shorten_height = this.layout_engine.option("state_name_height");
						var dx = 0;//layout.right_wing_end.x - layout.right_wing_start.x;
						var padding_top = this.option("padding_top");
						var x = layout.add_state_button_x;
						var width = this.option("add_state_width");
						this.add_state_shape.attr({
							path: "M"+(x)+","+padding_top +
									"h" + width +
									"V" + height +
									"h" + (-width) + 
									"Z"
						});
						this.add_state_button.attr({
							x: layout.add_state_button_x + width/2,
							y: height / 2 + 21
						});
					}
					_	.chain(flat_state_machine)
						.rest() // use rest to remove top level state machine
						.each(function(state_info, index_j) {
							var state = state_info.state,
								id = state_info.id,
								layout = locations[id];
							if(layout) {
								var state_view = this.get_state_view(state_info, layout); // will update shape
								state_view.toFront();
							}
						}, this)
						.each(function(state_info) {
							var outgoing_transitions = state_info.outgoingTransitions;
							_.each(outgoing_transitions, function(transition_info) {
								var id = transition_info.id,
									transition = transition_info.transition,
									layout = locations[id];

								if(layout) {
									var transition_view = this.get_transition_view(transition_info, layout);
									transition_view.toFront();
								}
							}, this);
						}, this);

						_.each(this.object_views, function(object_view) {
							var state;
							if(object_view instanceof ist.StateView) {
								state = object_view.option("state");
							} else if(object_view instanceof ist.StartStateView) {
								state = object_view.option("state");
							} else if(object_view instanceof ist.TransitionView) {
								state = object_view.option("transition");
							}

							if(!locations[state.cobj_id]) {
								object_view.remove();
							}
						});
						_.each(this.hranges, function(object_view) {
							var state = object_view.option("state");
							if(!locations[state.cobj_id]) {
								object_view.remove();
							}
						});
				}, this);
			}
		/*
			var layout_info = this.layout_engine.get_layout();
			var width = layout_info.width,
				height = layout_info.height,
				layout = layout_info.locations;
			//this.paper.setSize(width, height);
			this.paper.attr({
				width: width,
				height: height
			});
			var new_items = [];
			_.each(layout, function(layout_info, state_id) {
				var view;
				if (state instanceof ist.State) {
					if (_.indexOf(this.statecharts, state) >= 0) {
						if (layout_info.add_state_button_x) {
							this.add_state_button.attr({
								x: layout_info.add_state_button_x,
								y: height / 2
							}).show();
							var shorten_height = this.layout_engine.option("state_name_height");
							var dx = layout_info.right_wing_end.x - layout_info.right_wing_start.x;
							var padding_top = this.option("padding_top");
							var x = layout_info.add_state_button_x;
							var width = this.option("add_state_width");
							this.add_state_shape.attr({
								path: "M"+(x-width/2)+","+padding_top +
										"H" + (x + width/2) +
										"V" + (layout_info.right_wing_end.y-shorten_height) +
										"L" + (layout_info.right_wing_start.x) + "," + (layout_info.right_wing_start.y - shorten_height) +
										"H" + (x - width/2 + dx) + 
										"L" + (x - width/2) + "," + (layout_info.right_wing_end.y - shorten_height) +
										"Z"
							}).show();
						}
						var hrange;
						var text = "inherited";
						if(this.statecharts[0] === state) {
							text = "own";
						}

						if(this.hranges.has(state)) {
							hrange = this.hranges.get(state);
							hrange.option({
								from_x: layout_info.left_wing_start.x,
								to_x: layout_info.right_wing_end.x
							});
						} else {
							hrange = this.get_hrange(state, text, layout_info);
							hrange.on("add_state", this.forward_event, this);
							hrange.on("make_concurrent", this.forward_event, this);
							hrange.on("reset", this.forward_event, this);
						}
						return; //it's a root statechart
					}
					if (this.object_views.has(state)) {
						view = this.get_view(state, layout_info);
						if (state instanceof ist.StartState) {
							view.option({
								c: layout_info.center
							});
						} else {
							view.option({
								lws: layout_info.left_wing_start,
								lwe: layout_info.left_wing_end,
								rws: layout_info.right_wing_start,
								rwe: layout_info.right_wing_end,
								c: layout_info.center
							});
						}
						new_items.push(view);
					} else {
						view = this.get_view(state, layout_info);
						new_items.push(view);
					}
					view.toFront();
				} else if (state instanceof ist.StatechartTransition) {
					if (this.object_views.has(state)) {
						view = this.get_view(state, layout_info);
						view.option({
							from: layout_info.from,
							to: layout_info.to
						});
						new_items.push(view);
					} else {
						view = this.get_view(state, layout_info);
						new_items.push(view);
					}
				}
			}, this);

			var key;
			_.each(curr_items, function (ci) {
				if (new_items.indexOf(ci) < 0) {
					key = ci instanceof ist.TransitionView ? ci.option("transition") : ci.option("state");
					this.object_views.remove(key);
					ci.remove();
					ci.destroy();
				}
			}, this);
			_.each(new_items, function(view) {
				if(view instanceof ist.TransitionView) {
					view.toFront();
				}
			});
			curr_items = new_items;
			*/
		}, {
			context: this
		});
		this.editing = false;
	};

	(function (My) {
		var proto = My.prototype;
		able.make_proto_listenable(proto);
		able.make_proto_optionable(proto);
		proto.get_hrange = function(statechart, text, layout) {
			var id = statechart.id, hrange = this.hranges[id];
			if(hrange) {
				hrange.option({
					from_x: layout.x,
					to_x: layout.x + layout.width,
				});
				return hrange;
			} else {
				hrange = this.hranges[id] = new ist.HorizontalRangeDisplay({
					from_x: layout.x,
					to_x: layout.x + layout.width,
					paper: this.paper,
					text: text,
					line_color: "#AAA",
					color: "#999",
					background: "#EEE",
					y: this.option("hrange_y"),
					height: this.option("hrange_height"),
					state: statechart
				});

				hrange.on("add_state", this.forward_event, this);
				hrange.on("make_concurrent", this.forward_event, this);
				hrange.on("reset", this.forward_event, this);

				return hrange;
			}
		};
		proto.on_add_state_click = function() {
			var statecharts = this.option("statecharts"),
				statecharts_val = statecharts.get();
			this._emit("add_state", {
				parent: statecharts_val[0]
			});
		};
		proto.get_state_view = function (state_info, layout) {
			var id = state_info.id,
				object_view = this.object_views[id];
			if (object_view) {
				if (state_info.isStart) {
					object_view.option({
						layout: layout
					});
				} else {
					object_view.option({
						layout: layout
					});
				}
			} else {
				if(state_info.isStart) {
					object_view = new ist.StartStateView({
						state: state_info.state,
						paper: this.paper,
						layout: layout,
						fill_color: this.option("start_state_color"),
						parent: this
					});
				} else {
					object_view = new ist.StateView({
						state: state_info.state,
						paper: this.paper,
						layout: layout,
						font_family: this.option("state_font_family"),
						font_size: this.option("state_font_size"),
						default_stroke: this.option("state_stroke"),
						default_fill: this.option("state_fill"),
						active_stroke: this.option("active_state_stroke"),
						active_fill: this.option("active_state_fill"),
						text_foreground: this.option("state_text_color"),
						active_text_fireground: this.option("active_state_text_color"),
						padding_top: this.option("padding_top"),
						parent: this
					});
					object_view.on("remove_state", this.forward_event, this);
					object_view.on("add_transition", this.forward_event, this);
					object_view.on("add_state", this.forward_event, this);
					object_view.on("make_concurrent", this.forward_event, this);
					object_view.on("rename", this.forward_event, this);
					object_view.on("awaiting_state_selection", this.on_awaiting_state_selection, this);
				}
				this.object_views[id] = object_view;
			}
			return object_view;
			/*
			return this.object_views.get_or_put(obj, function () {
				var rv;
				if (obj instanceof ist.StatechartTransition) {
					rv = new ist.TransitionView({
						paper: this.paper,
						transition: obj,
						from: layout_info.from,
						to: layout_info.to,
						active_color: this.option("active_transition_color"),
						color: this.option("transition_arrow_color"),
						text_background: this.option("transition_text_background_color"),
						text_foreground: this.option("transition_text_color"),
						font_family: this.option("transition_font_family"),
						font_size: this.option("transition_font_size"),
						parent: this
					});
					rv.on("change", function (event) {
						var value = event.value;
						if (value === "") {
							this._emit("remove_transition", {transition: obj});
						} else {
							this._emit("change_transition_event", {transition: obj, str: value});
						}
					}, this);
					rv.on("remove_transition", this.forward_event, this);
					rv.on("awaiting_state_selection", this.on_awaiting_state_selection, this);
					rv.on("set_to", this.forward_event, this);
					rv.on("set_from", this.forward_event, this);
					rv.on("set_str", this.forward_event, this);
				} else if (obj instanceof ist.StartState) {
					rv = new ist.StartStateView({
						state: obj,
						paper: this.paper,
						c: layout_info.center,
						fill_color: this.option("start_state_color"),
						radius: this.option("start_state_radius"),
						parent: this
					});
				} else {
					rv = new ist.StateView({
						state: obj,
						paper: this.paper,
						lws: layout_info.left_wing_start,
						lwe: layout_info.left_wing_end,
						rws: layout_info.right_wing_start,
						rwe: layout_info.right_wing_end,
						c: layout_info.center,
						font_family: this.option("state_font_family"),
						font_size: this.option("state_font_size"),
						default_stroke: this.option("state_stroke"),
						default_fill: this.option("state_fill"),
						active_stroke: this.option("active_state_stroke"),
						active_fill: this.option("active_state_fill"),
						text_foreground: this.option("state_text_color"),
						active_text_fireground: this.option("active_state_text_color"),
						text_background: this.option("state_text_background_color"),
						padding_top: this.option("padding_top"),
						parent: this
					});
					rv.on("remove_state", this.forward_event, this);
					rv.on("add_transition", this.forward_event, this);
					rv.on("add_state", this.forward_event, this);
					rv.on("make_concurrent", this.forward_event, this);
					rv.on("rename", this.forward_event, this);
					rv.on("awaiting_state_selection", this.on_awaiting_state_selection, this);
				}
				return rv;
			}, this);
			*/
		};
		proto.get_transition_view = function (transition_info, layout) {
			var id = transition_info.id,
				object_view = this.object_views[id],
				transition = transition_info.transition;
			if (object_view) {
				object_view.option({
					from: layout.from,
					to: layout.to
				});
				return object_view;
			} else {
				object_view = new ist.TransitionView({
					paper: this.paper,
					transition: transition,
					from: layout.from,
					to: layout.to,
					active_color: this.option("active_transition_color"),
					color: this.option("transition_arrow_color"),
					text_background: this.option("transition_text_background_color"),
					text_foreground: this.option("transition_text_color"),
					font_family: this.option("transition_font_family"),
					font_size: this.option("transition_font_size"),
					parent: this
				});
				object_view.on("change", function (event) {
					var value = event.value;
					if (value === "") {
						this._emit("remove_transition", {transition: transition});
					} else {
						this._emit("change_transition_event", {transition: transition, str: value});
					}
				}, this);
				object_view.on("remove_transition", this.forward_event, this);
				object_view.on("awaiting_state_selection", this.on_awaiting_state_selection, this);
				object_view.on("set_to", this.forward_event, this);
				object_view.on("set_from", this.forward_event, this);
				object_view.on("set_str", this.forward_event, this);
				this.object_views[id] = object_view;
			}
			return object_view;
		};

		proto.pause = function () {
			this.live_layout.pause();
		};
		proto.resume = function () {
			this.live_layout.resume();
			this.live_layout.run();
		};
		proto.on_awaiting_state_selection = function(event) {
			if(this._awaiting_state_selection) {
				this._awaiting_state_selection();
			}
			var states = event.states,
				on_select = event.on_select,
				on_cancel = event.on_cancel;
			var select_obj_text = this.paper.text(this.paper.width/2, 10, "(click a destination state)")
											.attr({
												"font-size": 16,
												"fill": '#777',
												"font-family": "Source Sans Pro"
											});
			var bbox = select_obj_text.getBBox();
			var select_obj_bg = this.paper	.rect(bbox.x-3, bbox.y-3, bbox.width+6, bbox.height+6)
											.attr({
												"stroke": "none",
												"fill": "white",
												"opacity": 0.7
											});
			select_obj_text.appendTo(this.paper);
			var on_keydown = function(e) {
				if(e.keyCode === 27) { //esc
					on_cancel();
					unmake_selectable();
				}
			};
			$(window).on("keydown.awaiting_state_selection", on_keydown);

			var state_views = _	.chain(states)
								.map(function(state) {
									var state_view = this.object_views[state.cobj_id];
									if(state_view) {
										return state_view;
									} else {
										return false;
									}
								}, this)
								.compact()
								.value();

			var unmake_selectable = this._awaiting_state_selection = _.bind(function() {
				select_obj_text.remove();
				select_obj_bg.remove();
				$(window).off("keydown.awaiting_state_selection mousedown.cancel_state_selection");
				_.each(state_views, function(view) {
					view.unmake_selectable();
				});
				on_select = state_views = states = null;
				delete this._awaiting_state_selection;
			}, this);

			_.each(states, function(state, i) {
				state_views[i].make_selectable(function(e) {
					on_select(states[i]);
					unmake_selectable();
				});
			});
			//var this_element = $(this.paper.canvas.parentNode);
			var this_element = $(this.paper.node.parentNode);
			$(window).on("mousedown.cancel_state_selection", function(event) {
				if(this_element.has(event.target).length === 0) {
					on_cancel();
					unmake_selectable();
					event.preventDefault();
					event.stopPropagation();
					return false;
				}
			});
		};
		proto.remove = function () {
		};
		proto.destroy = function () {
			$(window).off("keydown.awaiting_state_selection");
			delete this.statecharts;

			this.live_layout.destroy();
			delete this.live_layout;
			delete this.layout_engine;
			_.each(this.object_views, function(object_view) {
				object_view.destroy();
			});
			delete this.object_views;
			_.each(this.hranges, function(hrange) {
				hrange.destroy();
			});
			delete this.hranges;

			able.destroy_this_listenable(this);
			able.destroy_this_optionable(this);

			this.add_state_shape.remove();
			delete this.add_state_shape;
			this.add_state_button.remove();
			delete this.add_state_button;
		};

	}(ist.RootStatechartView));
}(interstate, jQuery));
