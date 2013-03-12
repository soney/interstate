(function(red, $) {
var cjs = red.cjs, _ = red._;

var origin = window.location.protocol + "//" + window.location.host;
$.widget("red.dom_output", {
	
	options: {
		root: undefined,
		show_edit_button: true,
		edit_on_open: false,
		editor_url: origin + "/src/view/editor.ejs.html",
		editor_name: uid.get_prefix() + "red_editor",
		editor_window_options: "toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=yes, resizable=yes, width=800, height=600"
	}

	, _create: function() {
		this._command_stack = red.create("command_stack");
		if(this.option("show_edit_button")) {
			this.$on_message = _.bind(this.on_message, this);
			$(window).on("message", this.$on_message);
			this.button_color = randomColor([0, 1], [0.1, 0.7], [0.4, 0.6]);
			this.edit_button_css = {
					float: "right",
					opacity: 0.7,
					"text-decoration": "none",
					"font-variant": "small-caps",
					padding: "3px",
					"padding-top": "0px",
					position: "fixed",
					top: "0px",
					right: "0px",
					//color: "#900",
					color: this.button_color,
					"background-color": "",
					"font-size": "0.95em",
					"font-family": '"HelveticaNeue-Light", "Helvetica Neue Light", "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif', 
					cursor: "pointer"
				};
			this.edit_hover_css = {
					opacity: 1.0,
					color: "white",
					//"background-color": "#900",
					"background-color": this.button_color,
					cursor: "pointer"
				};
			this.edit_active_css = {
					opacity: 1.0,
					color: "white",
				//	"background-color": "green",
					"background-color": this.button_color,
					cursor: "default"
				};

			this.edit_button = $("<a />")	.attr("href", "javascript:void(0)")
											.text("edit")
											.css(this.edit_button_css)
											.hover(_.bind(function() {
												if(!this.edit_button.hasClass("active")) {
													this.edit_button.addClass("hover").css(this.edit_hover_css);
												}
											}, this), _.bind(function() {
												if(!this.edit_button.hasClass("active")) {
													this.edit_button.removeClass("hover").css(this.edit_button_css);
												}
											}, this))
											.on("click", _.bind(this.open_editor, this));

			var append_interval = window.setInterval(_.bind(function() {
				var parent = $(this.element).parent();
				if(parent) {
					parent.append(this.edit_button);
					window.clearInterval(append_interval);
				}
			}, this), 100);

			if(this.option("edit_on_open")) {
				this.open_editor();
			}
		}
		this._add_change_listeners();
	}

	, _destroy: function() {
		if(this.edit_button) {
			this.edit_button.remove();
		}
		$(window).off("message", this.$on_message);
		this._remove_change_listeners();
		this._remove_state_listeners();
	}

	, _add_change_listeners: function() {
		var root_pointer = this.option("root");
		var root_dict = root_pointer.points_at();

		this._dom_tree_fn = cjs.liven(function() {
			var dom_attachment = root_dict.get_attachment_instance("dom", root_pointer);
			var dom_element = dom_attachment.get_dom_obj();

			if(this.element.children().is(dom_element)) {
				this.element.children().not(dom_element).remove();
			} else {
				this.element.children().remove();
				this.element.append(dom_element);
			}
		}, {
			context: this
			, pause_while_running: true
		});
	}
	, _remove_change_listeners: function() {
		this._dom_tree_fn.destroy();
	}

	, _add_state_listeners: function() {
		var on_transition_fire = _.bind(function(info) {
			var transition = info.target;

			this.post_delta(new red.TransitionFiredDelta({
				transition: transition,
				event: info.event
			}));
		}, this);

		this.register_state = function(state) { };
		this.unregister_state = function(state) { };

		this.register_transition = function(transition) {
			transition.on("fire", on_transition_fire);
		};
		this.unregister_transition = function(transition) {
			transition.off("fire", on_transition_fire);
		};

		this._states = [];
		this._transitions = [];
		red.each_registered_obj(function(obj, uid) {
			if(obj instanceof red.Statechart) {
				this._states.push(obj);
				this.register_state(obj);
			} else if(obj instanceof red.StatechartTransition) {
				this._transitions.push(obj);
				this.register_transition(obj);
			}
		}, this);

		this.$on_uid_registered = function(uid, obj) {
			if(obj instanceof red.Statechart) {
				this._states.push(obj);
				this.register_state(obj);
			} else if(obj instanceof red.StatechartTransition) {
				this._transitions.push(obj);
				this.register_transition(obj);
			}
		};

		this.$on_uid_unregistered = function(uid, obj) {
			if(obj instanceof red.Statechart) {
				var index = this._states.indexOf(obj);
				if(index >= 0) {
					this.unregister_state(obj);
					this._states.splice(index, 1);
				}
			} else if(obj instanceof red.StatechartTransition) {
				var index = this._transitions.indexOf(obj);
				if(index >= 0) {
					this.unregister_transition(obj);
					this._transitions.splice(index, 1);
				}
			}
		}

		red.on("uid_registered", this.$on_uid_registered, this);
		red.on("uid_unregistered", this.$on_uid_unregistered, this);
	}
	, _remove_state_listeners: function() {
		red.off("uid_registered", this.$on_uid_registered);
		red.off("uid_unregistered", this.$on_uid_unregistered);

		if(this._states) {
			for(var i = 0; i<this._states.length; i++) {
				this.unregister_state(this._states[i]);
			}
			delete this._states;
		}

		if(this._transitions) {
			for(var i = 0; i<this._transitions.length; i++) {
				this.unregister_transition(this._transitions[i]);
			}
			delete this._transitions;
		}
	}

	, on_message: function(jq_event) {
		var event = jq_event.originalEvent;
		if(event.source === this.editor_window) {
			var data = event.data;
			if(data === "ready") {
				this.editor_window.postMessage({
					type: "color",
					value: this.button_color
				}, origin);
				this.post_delta(new red.ProgramDelta({
					root_pointer: this.option("root")
				}));
				this._add_state_listeners();
				this.post_delta(new red.CurrentStateDelta({
					states: this._states
				}));
				this.post_delta(new red.CurrentValuesDelta({
					root_pointer: this.option("root")
				}));
			} else {
				var type = data.type;
				if(type === "command") {
					var stringified_command = data.command;
					if(stringified_command === "undo") {
						this._command_stack._undo();
						var delta = new red.CommandDelta({command: stringified_command });
						this.post_delta(delta);
					} else if(stringified_command === "redo") {
						this._command_stack._redo();
						var delta = new red.CommandDelta({command: stringified_command });
						this.post_delta(delta);
					} else if(stringified_command === "reset") {
						var root_pointer = this.option("root"),
							root = root_pointer.points_at(0);
						root.reset();
						var delta = new red.CommandDelta({command: stringified_command });
						this.post_delta(delta);
					} else {
						var command = red.destringify(stringified_command);
						this._command_stack._do(command);
						var delta = new red.CommandDelta({command: command });
						this.post_delta(delta);
					}
				}
			}
		}
	}
	, post_delta: function(delta) {
		var stringified_delta = red.stringify(delta, true);
		this.editor_window.postMessage({
			type: "delta",
			value: stringified_delta
		}, origin);
	}

	, open_editor: function() {
		if(this.editor_window) {
			this.editor_window.focus();
		} else {
			this.editor_window = window.open(this.option("editor_url"), this.option("editor_name"), this.option("editor_window_options"));
			this.edit_button.addClass("active").css(this.edit_active_css);
			$(window).on("beforeunload", _.bind(this.close_editor, this));
			$(this.editor_window).on("beforeunload", _.bind(function() {
				this._remove_state_listeners();
				this.edit_button.removeClass("active").css(this.edit_button_css);
				delete this.editor_window;
			}, this));
		}
	}
	, close_editor: function() {
		if(this.editor_window) {
			this._remove_state_listeners();
			this.edit_button.removeClass("active").css(this.edit_button_css);
			this.editor_window.close();
			delete this.editor_window;
		}
	}
});

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}
function randomColor(hrange, srange, lrange) {
	var h = Math.random()*(hrange[1]-hrange[0]) + hrange[0],
		s = Math.random()*(srange[1]-srange[0]) + srange[0],
		l = Math.random()*(lrange[1]-lrange[0]) + lrange[0];
	var rgb = hslToRgb(h, s, l);
	return rgbToHex.apply(this, rgb);
};

/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   Number  h       The hue
 * @param   Number  s       The saturation
 * @param   Number  l       The lightness
 * @return  Array           The RGB representation
 */
function hslToRgb (h, s, l) {
    var r, g, b;

    if (s == 0){
        r = g = b = l; // achromatic
    } else {
        function hue2rgb (p, q, t) {
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.floor(r * 256), Math.floor(g * 256), Math.floor(b * 256)];
}

}(red, jQuery));
