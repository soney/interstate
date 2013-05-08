/*jslint nomen: true, vars: true, white: true */
/*jshint scripturl: true */
/*global red,esprima,able,uid,console,window,jQuery,Raphael */

(function (red, $) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

	var display;
    var platform = window.navigator.platform;

	if(platform === "iPhone" || platform === "iPod") {
		display = "phone";
	} else if(platform === "iPad") {
		display = "tablet";
	} else {
		display = "desktop";
	}

	$.widget("red.editor", {
		options: {
			debug_ready: false,
			full_window: true,
			server_window: window.opener,
			client_id: "",
			single_col_navigation: display === "phone" || display === "tablet",
			view_type: display
		},

		_create: function () {
			this.element.addClass(this.option("view_type"));

			if(this.option("full_window")) {
				$("html").addClass("full_window_editor");
			}
			var communication_mechanism;
			if(this.option("server_window") === window) {
				communication_mechanism = new red.SameWindowCommWrapper(this.option("client_id")); 
			} else {
				communication_mechanism = new red.InterWindowCommWrapper(this.option("server_window"), this.option("client_id")); 
			}

			this.client_socket = new red.ProgramStateClient({
				ready_func: this.option("debug_ready"),
				comm_mechanism: communication_mechanism
			}).on("message", function (data) {
				if (data.type === "color") {
					var color = data.value;
				}
			}, this).on("loaded", function (root_client) {
				this.load_viewer(root_client);
			}, this);

			this.element.text("Loading...");
		},

		load_viewer: function (root_client) {
			this.element.html("");
			this.navigator = $("<div />")	.appendTo(this.element)
											.navigator({
												root_client: root_client,
												single_col: this.option("single_col_navigation")
											});


			$(window).on("keydown", _.bind(function (event) {
				if (event.keyCode === 90 && (event.metaKey || event.ctrlKey)) {
					if (event.shiftKey) { this.undo(); }
					else { this.redo(); }
					event.stopPropagation();
					event.preventDefault();
				}
			}, this));
		},

		undo: function() {
			this.client_socket.post_command("undo");
		},
		redo: function() {
			this.client_socket.post_command("redo");
		},

		_destroy: function () {
			this.navigator.navigator("destroy");
			this.client_socket.destroy();
		}
	});

	$.widget("red.pressable", {
		options: {
			touch_move_tolerance: 10
		},

		_create: function() {
			this.$on_touch_start = $.proxy(this.on_touch_start, this);
			this.$on_touch_move = $.proxy(this.on_touch_move, this);
			this.$on_touch_end = $.proxy(this.on_touch_end, this);
			this.$on_click = $.proxy(this.on_click, this);

			this.element.on("touchstart", this.$on_touch_start);
			this.element.on("click", this.$on_click);

			this.active = false;
		},

		_destroy: function() {
			this.element.off("touchstart", this.$on_touch_start);
			this.element.off("click", this.$on_click);

			this.reset();
		},

		on_touch_start: function(jqEvent) {
			var event = jqEvent.originalEvent;
			this.startX = event.touches[0].clientX;
			this.startY = event.touches[0].clientY;
			this.active = true;
			this.element.on("touchend", this.$on_touch_end);
			this.element.on("touchmove", this.$on_touch_move);
		},

		on_touch_move: function(jqEvent) {
			var event = jqEvent.originalEvent;
			if (Math.abs(event.touches[0].clientX - this.startX) > 10 ||
				Math.abs(event.touches[0].clientY - this.startY) > 10) {
				this.reset();
			}
		},

		on_touch_end: function(jqEvent) {
			var event = jqEvent.originalEvent;
			event.stopPropagation();
			event.preventDefault();
			this.reset();
			this.trigger_pressed(event);
		},

		on_click: function(jqEvent) {
			var event = jqEvent.originalEvent;
			event.stopPropagation();
			event.preventDefault();
			this.reset();
			this.trigger_pressed(event);
		},

		trigger_pressed: function(event) {
			this.element.trigger("pressed", event);
		},

		reset: function() {
			if(this.active) {
				this.active = false;
				delete this.startX;
				delete this.startY;
				this.element.off("touchend", this.$on_touch_end);
				this.element.off("touchmove", this.$on_touch_move);
			}
		}
	});
}(red, jQuery));
