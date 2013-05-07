/*jslint nomen: true, vars: true, white: true */
/*jshint scripturl: true */
/*global red,esprima,able,uid,console,window,jQuery,Raphael */

(function (red, $) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

	var round_num = function(num, decimals) {
		var n = Math.pow(10, decimals);
		return Math.round(num*n)/n;
	};
	var summarized_val = function(val) {
		if(_.isString(val)) {
			return "'" + val + "'";
		} else if(_.isNumber(val)) {
			return round_num(val, 2);
		} else if(val === undefined) {
			return "undefined";
		} else if(val === null) {
			return "null";
		} else if(isNaN(val)) {
			return "NaN";
		} else {
			return val;
		}
	};

	$.widget("red.value_summary", {
		options: {
			value: false
		},
		_create: function() {
			this.element.addClass("value_summary");
			var value = this.option("value");
			if(value instanceof red.WrapperClient) {
				var client = value;
				var $prop_val;
				var type = client.type();

				if(type === "dict") {
					this.element	.addClass("dict")
									.text(">");
				} else if(type === "stateful") {
					this.element	.addClass("stateful dict")
									.text(">");
				} else if(type === "cell") {
					$prop_val = client.get_$("val");

					this.element	.addClass("cell")
									.text("");
					this.live_value_fn = cjs.liven(function() {
						this.element.text(summarized_val($prop_val.get()));
					}, {
						context: this
					});
				} else if(type ==="stateful_prop") {
					$prop_val = client.get_$("val");

					this.element	.addClass("stateful_prop")
									.text("");
					this.live_value_fn = cjs.liven(function() {
						this.element.text(summarized_val($prop_val.get()));
					}, {
						context: this
					});
				} else {
					console.log(type);
				}
			} else {
				this.element	.addClass("constant")
								.text(value);
			}
		},
		_destroy: function() {
		}
	});
}(red, jQuery));
