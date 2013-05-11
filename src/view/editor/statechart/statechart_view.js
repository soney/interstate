/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console,RedMap,jQuery,window,Raphael */

(function (red, $) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

	$.widget("red.statechart", {
		options: {
			transition_font_family: "Source Sans Pro",
			transition_font_size: "10px",
			transition_arrow_color: "#000",
			transition_text_background_color: "#FFF",
			transition_text_color: "#000",
			active_transition_color: "#F00",

			state_font_family: "Source Sans Pro",
			state_font_size: "12px",
			state_text_background_color: "#FFF",
			state_text_color: "#000",
			state_fill: "#EEE",
			state_stroke: "#999",
			active_state_fill: "#FFF",
			active_state_stroke: "#F00",
			active_state_text_color: "#F00",
			start_state_color: "#000",
			start_state_radius: 6,
			add_state_width: 50,

			statecharts: [],

			hrange_y: 5,
			hrange_height: 14,

			padding_top: function() {
				return this.option("hrange_y") + this.option("hrange_height");
			}
		},

		_create: function () {
			this.paper = new Raphael(this.element[0], 0, 0);
			var statecharts = this.option("statecharts");
			this.layout_manager = new red.RootStatechartLayoutEngine({
				statecharts: statecharts,
				statecharts_with_add_state_button: [],
				start_state_radius: this.option("start_state_radius"),
				padding_top: this.option("padding_top").call(this),
				add_state_width: this.option("add_state_width")
			});
			this.statechart_view = new red.RootStatechartView(statecharts, this.layout_manager, this.paper, this.options);
		},
		_destroy: function () {
			this._super();
			this.statechart_view.destroy();
			this.paper.remove();
		},

		get_layout_manager: function() {
			return this.layout_manager;
		},

		_setOption: function(key, value) {
			this._super(key, value);
		},
		begin_editing: function() {
			this.layout_manager.option({
				statecharts_with_add_state_button: [this.option("statecharts")[0]]
			});
			this.layout_manager.invalidate();
			this.statechart_view.begin_editing();
		},
		done_editing: function() {
			this.layout_manager.option({
				statecharts_with_add_state_button: []
			});
			this.layout_manager.invalidate();
			this.statechart_view.done_editing();
		}
	});


	red.RootStatechartView = function (statecharts, layout_engine, paper, options) {
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
		this.add_state_shape = this.paper.path("M0,0");
		this.add_state_button = this.paper.text(0,0,"+");
		this.add_state_shape.attr({
			fill: this.option("state_fill"),
			stroke: this.option("state_stroke"),
			opacity: 0.5,
			cursor: "pointer"
		}).click($.proxy(this.on_add_state_click, this)).hide();
		this.add_state_button.attr({
			"font-size": "42px",
			fill: this.option("state_stroke"),
			opacity: 0.5,
			cursor: "pointer"
		}).click($.proxy(this.on_add_state_click, this)).hide();
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
				if (state instanceof red.State) {
					if (_.indexOf(this.statecharts, state) >= 0) {
						if (layout_info.add_state_button_x) {
							this.add_state_button.attr({
								x: layout_info.add_state_button_x,
								y: height / 2
							});
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
							});
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
						}
						return; //it's a root statechart
					}
					if (this.object_views.has(state)) {
						view = this.get_view(state, layout_info);
						if (state instanceof red.StartState) {
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
				} else if (state instanceof red.StatechartTransition) {
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

			_.each(curr_items, function (ci) {
				if (new_items.indexOf(ci) < 0) {
					this.object_views.unset(ci instanceof red.TransitionView ? ci.option("transition") : ci.option("state"));
					ci.remove();
					ci.destroy();
				}
			}, this);
			curr_items = new_items;
		}, {
			context: this
		});
	};

	(function (My) {
		var proto = My.prototype;
		able.make_proto_listenable(proto);
		able.make_proto_optionable(proto);
		proto.get_hrange = function(statechart, text, layout_info) {
			return this.hranges.get_or_put(statechart, function () {
				return new red.HorizontalRangeDisplay({
					from_x: layout_info.left_wing_start.x,
					to_x: layout_info.right_wing_end.x,
					paper: this.paper,
					text: text,
					line_color: "#AAA",
					color: "#999",
					background: "#EEE",
					y: this.option("hrange_y"),
					height: this.option("hrange_height")
				});
			}, this);
		};
		proto.on_add_state_click = function() {
			console.log("ADD A STATE");
		};
		proto.begin_editing = function() {
			this.add_state_button.show();
			this.add_state_shape.show();
			this.object_views.each(function(view) {
				view.begin_editing();
			});
		};
		proto.done_editing = function() {
			this.add_state_button.hide();
			this.add_state_shape.hide();
			this.object_views.each(function(view) {
				view.done_editing();
			});
		};
		proto.get_view = function (obj, layout_info) {
			return this.object_views.get_or_put(obj, function () {
				var rv;
				if (obj instanceof red.StatechartTransition) {
					rv = new red.TransitionView({
						paper: this.paper,
						transition: obj,
						from: layout_info.from,
						to: layout_info.to,
						active_color: this.option("active_transition_color"),
						color: this.option("transition_arrow_color"),
						text_background: this.option("transition_text_background_color"),
						text_foreground: this.option("transition_text_color"),
						font_family: this.option("transition_font_family"),
						font_size: this.option("transition_font_size")
					});
					rv.on("change", function (event) {
						var value = event.value;
						if (value === "") {
							this._emit("remove_transition", {transition: obj});
						} else {
							this._emit("change_transition_event", {transition: obj, str: value});
						}
					}, this);
				} else if (obj instanceof red.StartState) {
					rv = new red.StartStateView({
						state: obj,
						paper: this.paper,
						c: layout_info.center,
						fill_color: this.option("start_state_color"),
						radius: this.option("start_state_radius")
					});
				} else {
					rv = new red.StateView({
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
						padding_top: this.option("padding_top")
					});
					rv.on("change", function (event) {
						var value = event.value;
						if (value === "") {
							this._emit("remove_state", {state: obj});
						} else {
							this._emit("rename_state", {state: obj, str: value});
						}
					}, this);
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
		proto.remove = function () {
		};
		proto.destroy = function () {
			this.live_layout.destroy();
		};

	}(red.RootStatechartView));
	
}(red, jQuery));
