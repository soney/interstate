/* jslint nomen: true, vars: true, white: true */
/* jshint scripturl: true */
/*global interstate,esprima,able,uid,console,window,jQuery,Raphael */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	cjs.registerCustomPartial("valueSummary", {
		createNode: function(options) {
			return $("<td />").value_summary(options);
		},
		destroyNode: function(node) {
			$(node).value_summary("destroy");
		}
	});

	var value_summary_template = cjs.createTemplate(
		"{{#if type ==='dict' || type === 'stateful'}}" + 
			"{{#if is_template}}" + 
				"<span class='copies'>" +
					"[{{num_instances}}]" +
				"</span>" +
			"{{/if}}" +
			"<span class='expand_arrow'>></span>" +
		"{{#else}}" +
			"<span>{{{ summarize_val(value, is_primary) }}}</span>" +
		"{{/if}}"
	);

	var round_num = function(num, decimals) {
		var n = Math.pow(10, decimals);
		return Math.round(num*n)/n;
	};
	var NAN = NaN;
	var summarize_val = function(val, is_primary) {
		if(_.isString(val)) {
			if(val === "(native function)") {
				return val;
			} else {
				return "'" + escapeHtml(val) + "'";
			}
		} else if(_.isArray(val)) {
			return "[" + _.map(val, function(v) { return summarize_val(v, is_primary); }).join(", ") + "]";
		} else if(val instanceof ist.WrapperClient) {
			if(is_primary) {
				return "<span class='cobj_link' data-cobj_id='"+val.cobj_id+"'>" + val.colloquial_name + "</span>";
			} else {
				return "";
			}
		} else {
			return summarize_plain_val.apply(this, arguments);
		}
	};
	var summarize_plain_val = function(val) {
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
			return "[" + _.map(val, summarize_plain_val).join(", ") + "]";
		} else if(val instanceof ist.WrapperClient) {
			return val.colloquial_name;
		} else {
			return val+"";
		}
	};

	$.widget("interstate.value_summary", {
		options: {
			client: false,
			is_primary: true,
			itemClass: "",
			char_limit: 200
		},
		_create: function() {
			var client = this.option("client");

			if(client instanceof ist.WrapperClient) {
				this.$type = client.type();
				this.$value = ist.indirectClient(client, "val");
			} else if(client instanceof ist.RemoteConstraintClient) {
				this.$type = "remote_constraint";
				this.$value = cjs(function() {
					return client.get();
				});
			} else {
				this.$type = false;
				this.$value = client;
			}

			this.$client_info = ist.indirectClient(client, "is_template", "instances", "val");
			this.$is_template = this.$client_info.itemConstraint("is_template");
			this.$instances = this.$client_info.itemConstraint("instances");
			this.$num_instances = this.$instances.prop("length");

			this._add_content_bindings();
			this._add_class_bindings();
			this._add_tooltip();
			this.element.on("click.navigate", _.bind(function(event) {
				var cobj_id = $(event.target).attr("data-cobj_id");
				if(cobj_id) {
					if(this.element.parents().is(".col.curr_col")) {
						this.open_cobj(cobj_id);
						event.preventDefault();
						event.stopPropagation();
					}
				}
			}, this));
		},
		_destroy: function() {
			this._remove_tooltip();
			this._remove_content_bindings();
			this._remove_class_bindings();

			this.$num_instances.destroy();
			this.$instances.destroy();
			this.$is_template.destroy();
			this.$client_info.destroy();
			if(this.$value && this.$value.destroy) {
				this.$value.destroy();
			}

			this._super();
		},
		_add_content_bindings: function() {
			var val_summary = value_summary_template({
					is_dict: this.$is_dict,
					is_template: this.$is_template,
					num_instances: this.$num_instances,
					summarize_val: summarize_val,
					value: this.$value,
					type: this.$type,
					is_primary: this.option("is_primary")
				}, this.element);
		},
		_remove_content_bindings: function() {
			cjs.destroyTemplate(this.element);
		},
		_add_class_bindings: function() {
			this.element.addClass("value_summary " + this.option("itemClass"));
		},
		_remove_class_bindings: function() {
			this.element.removeClass("value_summary");
		},
		open_cobj: function(cobj_id) {
			var event = new $.Event("open_cobj");
			event.cobj_id = cobj_id;

			this.element.trigger(event);
		},
		_add_tooltip: function() {
			this.element.tooltip({
				position: {
					my: "center bottom-1",
					at: "center top"
				},
				show: false,
				hide: false,
				content: ""
			});
			var enable_tooltip = _.bind(function() { this.element.tooltip("enable"); }, this);
			var disable_tooltip = _.bind(function() { this.element.tooltip("disable"); }, this);
			this._tooltip_live_fn = cjs.liven(function() {
				var type = this.$type;
				if(type === "stateful_prop" || type === "cell" || type === "remote_constraint") {
					var str = summarize_plain_val(cjs.get(this.$value));

					if(str.length > this.option("char_limit")) {
						str = str.slice(0, this.option("char_limit")-3)+"...";
					}

					this.element.attr("title", str)
								.tooltip("option", {
									tooltipClass: "val_summary",
									content: str
								});
				}
			}, {
				context: this,
				on_destroy: function() {
					this.element.tooltip("destroy");
				}
			});
		},
		_remove_tooltip: function() {
			this._tooltip_live_fn.destroy();
			delete this._tooltip_live_fn;
		},
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
}(interstate, jQuery));
