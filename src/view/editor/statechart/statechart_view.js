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
			start_state_radius: 6,
			add_state_width: 50,

			statecharts: [],

			hrange_y: 5,
			hrange_height: 14,

			client: false,

			padding_top: function() {
				return this.option("hrange_y") + this.option("hrange_height");
			}
		},

		_create: function () {
			this.element.addClass("statechart");
			this.paper = new Raphael(this.element[0], 0, 0);
			var statecharts = this.option("statecharts");
			this.layout_manager = new ist.RootStatechartLayoutEngine({
				statecharts: statecharts,
				statecharts_with_add_state_button: [statecharts[0]],
				start_state_radius: this.option("start_state_radius"),
				padding_top: this.option("padding_top").call(this),
				add_state_width: this.option("add_state_width")
			});
			this.statechart_view = new ist.RootStatechartView(statecharts, this.layout_manager, this.paper, this.options);
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
		_destroy: function () {
			this._super();
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
			this.statechart_view.destroy();

			delete this.statechart_view;

			this.paper.remove();

			this.element.removeClass("statechart");
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
			if(key === "statecharts") {
				this.layout_manager.option("statecharts_with_add_state_button", [value[0]]);
				this.layout_manager.invalidate();
			}
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
			event.client = this.option("client");
			this.element.trigger(event);
		}
	});


	ist.RootStatechartView = function (statecharts, layout_engine, paper, options) {
		able.make_this_listenable(this);
		able.make_this_optionable(this, {}, options);

		this.statecharts = statecharts;
		this.layout_engine = layout_engine;
		this.object_views = new RedMap({
			hash: "hash"
		});
		this.hranges = new RedMap({
			hash: "hash"
		});
		this.paper = paper;
		this.add_state_shape = this.paper.path("M0,0").hide();
		this.add_state_button = this.paper.text(0,0,"+").hide();
		this.add_state_shape	.attr({
									fill: this.option("state_fill"),
									stroke: this.option("state_stroke"),
									opacity: 0.5,
									cursor: "pointer"
								})
								.click(_.bind(this.on_add_state_click, this));

		this.add_state_button	.attr({
									"font-size": "42px",
									fill: this.option("state_stroke"),
									opacity: 0.5,
									cursor: "pointer"
								})
								.click(_.bind(this.on_add_state_click, this));

		var curr_items = [];
		this.live_layout = cjs.liven(function () {
			var layout_info = this.layout_engine.get_layout();
			var width = layout_info.width,
				height = layout_info.height,
				layout = layout_info.locations;
			this.paper.setSize(width, height);
			var new_items = [];
			layout.each(function (layout_info, state) {
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
		}, {
			context: this
		});
		this.editing = false;
	};

	(function (My) {
		var proto = My.prototype;
		able.make_proto_listenable(proto);
		able.make_proto_optionable(proto);
		proto.get_hrange = function(statechart, text, layout_info) {
			return this.hranges.get_or_put(statechart, function () {
				return new ist.HorizontalRangeDisplay({
					from_x: layout_info.left_wing_start.x,
					to_x: layout_info.right_wing_end.x,
					paper: this.paper,
					text: text,
					line_color: "#AAA",
					color: "#999",
					background: "#EEE",
					y: this.option("hrange_y"),
					height: this.option("hrange_height"),
					state: statechart
				});
			}, this);
		};
		proto.on_add_state_click = function() {
			this._emit("add_state", {
				parent: this.statecharts[0]
			});
		};
		proto.get_view = function (obj, layout_info) {
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
			select_obj_text.toFront();
			var on_keydown = function(e) {
				if(e.keyCode === 27) { //esc
					on_cancel();
					unmake_selectable();
				}
			};
			$(window).on("keydown.awaiting_state_selection", on_keydown);

			var state_views = _.map(states, this.get_view, this);

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
				state_views[i].make_selectable(function() {
					on_select(states[i]);
					unmake_selectable();
				});
			});
			var this_element = $(this.paper.canvas.parentNode);
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
			this.object_views.each(function(object_view) {
				object_view.destroy();
			});
			this.object_views.destroy();
			delete this.object_views;
			this.hranges.each(function(hrange) {
				hrange.destroy();
			});
			this.hranges.destroy();
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
