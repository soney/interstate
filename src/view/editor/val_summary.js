/* jslint nomen: true, vars: true, white: true */
/* jshint scripturl: true */
/*global red,esprima,able,uid,console,window,jQuery,Raphael */

(function (red, $) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

	var round_num = function(num, decimals) {
		var n = Math.pow(10, decimals);
		return Math.round(num*n)/n;
	};
	var NAN = NaN;
	var summarized_val = function(val) {
		if(_.isString(val)) {
			if(val === "(native function)") {
				return val;
			} else {
				return "'" + escapeHtml(val) + "'";
			}
		} else if(_.isNumber(val)) {
			return round_num(val, 2)+"";
		} else if(val === undefined) {
			return "undefined";
		} else if(val === null) {
			return "null";
		} else if(val === NAN) {
			return "NaN";
		} else if(_.isFunction(val)) {
			return "(func)";
		} else if(_.isArray(val)) {
			return "[" + _.map(val, summarized_val).join(", ") + "]";
		} else if(val instanceof red.WrapperClient) {
			return "<span class='cobj_link' data-cobj_id='"+val.cobj_id+"'>" + val.colloquial_name + "</span>";
		} else {
			return val+"";
		}
	};
	var summarized_plain_val = function(val) {
		if(_.isString(val)) {
			if(val === "(native function)") {
				return val;
			} else {
				return "'" + val + "'";
			}
		} else if(_.isNumber(val)) {
			return round_num(val, 2)+"";
		} else if(val === undefined) {
			return "undefined";
		} else if(val === null) {
			return "null";
		} else if(val === NAN) {
			return "NaN";
		} else if(_.isFunction(val)) {
			return "(func)";
		} else if(_.isArray(val)) {
			return "[" + _.map(val, summarized_plain_val).join(", ") + "]";
		} else if(val instanceof red.WrapperClient) {
			return val.colloquial_name;
		} else {
			return val+"";
		}
	};


	$.widget("red.value_summary", {
		options: {
			value: false,
			inherited: false,
			builtin: false
		},
		_create: function() {
			this.element.addClass("value_summary");
			this.element.tooltip({
				position: {
					my: "center bottom-1",
					at: "center top"
				},
				show: {
					effect: "none",
					delay: 800
				}, // no animation
				hide: false, // no animation
				tooltipClass: "val_summary"
			});
			this.summary_span = $("<span />").appendTo(this.element);
			var value = this.option("value");
			if(value instanceof red.WrapperClient) {
				value.signal_interest();
				var client = value;
				var $prop_val;
				var type = client.type();

				if(type === "dict" || type === "stateful") {
					if(type === "dict") {
						this.summary_span.addClass("dict");
					} else {
						this.summary_span.addClass("stateful dict");
					}

					var copies_span = $("<span />").addClass("copies");
					var arrow_span = $("<span />").addClass("expand_arrow").text(">");

					var $is_template = client.get_$("is_template");
					var $copies = client.get_$("instances");
					this.live_copies_fn = cjs.liven(function() {
						var is_template = $is_template.get();
						if(is_template) {
							var copies = $copies.get();

							if(_.isArray(copies)) {
								var num_copies = copies.length;
								copies_span.text("[" + num_copies + "]");
							} else {
								copies_span.text("");
							}
						} else {
							copies_span.text("");
						}
					}, {
						on_destroy: function() {
							$copies.signal_destroy();
							$is_template.signal_destroy();
						}
					});

					this.summary_span.append(copies_span, arrow_span);
				} else if(type === "stateful_prop" || type === "cell") {
					$prop_val = client.get_$("val");

					this.summary_span	.addClass(type)
										.text("");
					var open_cobj = _.bind(this.open_cobj, this);
					this.live_value_fn = cjs.liven(function() {
						var prop_val = $prop_val.get();
						var val = summarized_val(prop_val);
						var plain_val = summarized_plain_val(prop_val);

						this.summary_span.html(val);
						$("span.cobj_link", this.summary_span).on("mousedown", function(event) {
							var cobj_id = $(this).attr("data-cobj_id");
							open_cobj(cobj_id);
							event.preventDefault();
							event.stopPropagation();
						});
						this.element.attr("title", plain_val);
						this.element.tooltip("option", "content", plain_val);
					}, {
						context: this,
						on_destroy: function() {
							$prop_val.signal_destroy();
							open_cobj = null;
						}
					});
				} else {
					console.log(type);
				}
			} else {
				this.summary_span	.addClass("constant")
									.text(summarized_val(value));
			}
		},
		_destroy: function() {
			this._super();
			this.element.tooltip("destroy");
			this.summary_span.remove();
			if(this.live_value_fn) {
				this.live_value_fn.destroy();
			}
			if(this.live_copies_fn) {
				this.live_copies_fn.destroy();
			}
			var value = this.option("value");
			if(value instanceof red.WrapperClient) {
				value.signal_destroy();
			}
		},
		begin_editing: function() {
			this.element.addClass("editing");
			this.summary_span.hide();
			if(this.option("inherited")) {
				this.inherit_button = $("<span />")	.addClass("inherit_button")
													.appendTo(this.element)
													.pressable()
													.on("pressed", function(event) {
														console.log("inherit");
														event.preventDefault();
														event.stopPropagation();
													})
													.text("inherit");
			}
		},
		done_editing: function() {
			this.element.removeClass("editing");
			if(this.inherit_button) {
				this.inherit_button.remove();
			}
			this.summary_span.show();
		},
		open_cobj: function(cobj_id) {
			var event = new $.Event("open_cobj");
			event.cobj_id = cobj_id;

			this.element.trigger(event);
		}
	});
	var entityMap = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': '&quot;',
		"'": '&#39;',
		"/": '&#x2F;'
	};

	function escapeHtml(string) {
		return String(string).replace(/[&<>"'\/]/g, function (s) {
			return entityMap[s];
		});
	}
}(red, jQuery));
