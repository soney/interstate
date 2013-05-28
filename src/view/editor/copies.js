/*jslint nomen: true, vars: true, white: true */
/*jshint scripturl: true */
/*global red,esprima,able,uid,console,window,jQuery,Raphael */

(function (red, $) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

	$.widget("red.copy", {
		options: {
			curr_copy: false,
			out_of: 0,
			client: false,
			displayed: false
		},

		_create: function () {
			var client = this.option("client");
			client.signal_interest();
			this.left_brace = $("<span />").text(" [").addClass("brace");
			this.content = $("<span />");
			this.right_brace = $("<span />").text("]").addClass("brace");

			this.curr_copy_text = $("<span />")	.addClass("copy_num");
			this.of_text = $("<span />")	.addClass("of_text");

			this.content.append(this.curr_copy_text, this.of_text);

			this.element.addClass("copy");

			if(this.option("displayed")) {
				this.on_displayed();
			}

			this.$on_click = $.proxy(this.on_click, this);
			this.$on_blur = $.proxy(this.on_blur, this);
			this.$on_change = $.proxy(this.on_change, this);
			this.$on_key_down = $.proxy(this.on_key_down, this);
			this.content.on("click", this.$on_click);
			this.add_listener();
		},

		_destroy: function () {
			this.remove_listener();
			var client = this.option("client");
			client.signal_destroy();
		},

		on_click: function() {
			this.copy_num_input = $("<input />").attr({
													type: "number",
													min: 1,
													max: this.option("out_of")
												})
												.val(this.option("curr_copy") + 1)
												.addClass("copy_input")
												.insertBefore(this.content)
												.focus()
												.select()
												.on("blur", this.$on_blur)
												.on("change", this.$on_change)
												.on("keydown", this.$on_key_down);

			this.original_copy_num = this.option("curr_copy");
			this.content.hide();
		},

		on_blur: function() {
			this.copy_num_input	.off("blur", this.$on_blur)
								.off("change", this.$on_change)
								.remove();
			this.content.show();
		},

		on_change: function(event) {
			var value = parseInt(this.copy_num_input.val(), 10);
			this.option("curr_copy", value - 1);
		},

		on_key_down: function(jqEvent) {
			var event = jqEvent.originalEvent;
			if(event.keyCode === 13) { // Enter
				this.on_change();
				this.on_blur();
			} else if(event.keyCode === 27) { // Esc
				this.on_blur();
				this.option("curr_copy", this.original_copy_num);
			}
		},

		add_listener: function() {
			var client = this.option("client");
			var $is_template = client.get_$("is_template");
			var $copies = client.get_$("instances");
			this.copy_listener = cjs.liven(function() {
				var is_template = $is_template.get();
				if(is_template) {
					var copies = $copies.get();
					if(_.isArray(copies)) {
						var len = copies.length;
						this.option({
							displayed: true,
							out_of: len,
							curr_copy: Math.min(this.option("curr_copy"), len)
						});
					} else {
						this.option({
							displayed: false
						});
					}
				} else {
					this.option({
						displayed: false
					});
				}
			}, {
				context: this,
				on_destroy: function() {
					$is_template.signal_destroy();
					$copies.signal_destroy();
				}
			});
		},
		remove_listener: function() {
			if(this.copy_listener) {
				this.copy_listener.destroy();
				delete this.copy_listener;
			}
		},

		update_display: function() {
			if(this.option("curr_copy") === false) {
				this.curr_copy_text.text("");
				this.of_text.text(this.option("out_of"));
			} else  {
				this.curr_copy_text.text(this.option("curr_copy") + 1);
				this.of_text.text(" of " + this.option("out_of"));
			}
		},

		on_displayed: function() {
			this.update_display();
			this.element.append(this.left_brace, this.content, this.right_brace);
		},

		on_not_displayed: function() {
			this.element.children().remove();
		},

		_setOption: function(key, value) {
			var old_value;
			if(key === "curr_copy" || key === "out_of") {
				old_value = this.option(key);
			}
			this._super(key, value);
			if(key === "displayed") {
				if(value) {
					this.on_displayed();
				} else {
					this.on_not_displayed();
				}
			} else if(key === "curr_copy" || key === "out_of") {
				if(old_value !== value) {
					if(key === "curr_copy") {
						this.element.trigger("curr_copy_change", value);
					}
					this.update_display();
				}
			}

		}
	});
}(red, jQuery));
