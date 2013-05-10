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
			return "'" + val + "'";
		} else if(_.isNumber(val)) {
			return round_num(val, 2);
		} else if(val === undefined) {
			return "undefined";
		} else if(val === null) {
			return "null";
		} else if(val === NAN) {
			return "NaN";
		} else if(_.isFunction(val)) {
			return "(func)";
		} else {
			return val;
		}
	};

	var select_list_options = {
		"obj": "Object",
		"prop": "Property"
	};

	$.widget("red.value_summary", {
		options: {
			value: false
		},
		_create: function() {
			this.element.addClass("value_summary");
			this.summary_span = $("<span />").appendTo(this.element);
			var value = this.option("value");
			if(value instanceof red.WrapperClient) {
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
					});

					this.summary_span.append(copies_span, arrow_span);
				} else if(type === "cell") {
					$prop_val = client.get_$("val");

					this.summary_span	.addClass("cell")
										.text("");
					this.live_value_fn = cjs.liven(function() {
						this.summary_span.text(summarized_val($prop_val.get()));
					}, {
						context: this
					});
				} else if(type ==="stateful_prop") {
					$prop_val = client.get_$("val");
					this.element.addClass("stateful_prop");

					this.summary_span	.addClass("stateful_prop")
										.text("");
					this.live_value_fn = cjs.liven(function() {
						this.summary_span.text(summarized_val($prop_val.get()));
					}, {
						context: this
					});
				} else {
					console.log(type);
				}
			} else {
				this.summary_span	.addClass("constant")
									.text(value);
			}
		},
		_destroy: function() {
			this.summary_span.remove();
			if(this.live_value_fn) {
				this.live_value_fn.destroy();
			}
			if(this.live_copies_fn) {
				this.live_copies_fn.destroy();
			}
		},
		begin_editing: function() {
			this.element.addClass("editing");
			this.summary_span.hide();
			this.select_type_list = $("<select />").appendTo(this.element); 
			_.each(select_list_options, function(option_text, option_id) {
				var option_item = $("<option />")	.attr("value", option_id)
													.text(option_text)
													.appendTo(this.select_type_list);
			}, this);
			this.select_type_list.on("change", function(event) {
				console.log("changed");
			});
		},
		done_editing: function() {
			this.element.removeClass("editing");
			this.select_type_list.remove();
			this.summary_span.show();
		}
	});
}(red, jQuery));
