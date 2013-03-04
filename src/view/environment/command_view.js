(function(red, $) {
var cjs = red.cjs, _ = red._;

$.widget("red.command_view", {
	
	options: {
	}

	, _create: function() {
		this.pointer = undefined;
		this.logger = this.get_logger();
		this.input = $("<input />").appendTo(this.element)
									.on("keydown", _.bind(function(event) {
										if(event.keyCode === 13) { //Enter
											var val = this.input.val();
											this.on_enter(val);
											this.input.val("");
										}
									}, this));
		this.output = $("<pre />").appendTo(this.element);

		window.addEventListener("message", _.bind(function(event) {
			if(event.source === window.opener) {
				var message = event.data;
				var type = message.type;
				if(type === "delta") {
					var stringified_delta = message.value;
					var delta = red.destringify(stringified_delta);

					this.on_delta(delta);
				}
			}
		}, this));
	}

	, _destroy: function() {
		this.input.remove();
	}

	, on_enter: function(value) {
		var tokens = value.split(" ").map(function(token) {
			return token.trim();
		});

		var command_name = tokens[0];
		if(command_name === "cd") {
			var prop_name = tokens[1];
			this.pointer = this.pointer.call("get_prop_pointer", prop_name);
			this.output.html("");
			print(this.root, this.pointer, this.get_logger());
		}
		console.log(tokens);
	}

	, on_delta: function(delta) {
		if(delta instanceof red.ProgramDelta) {
			var program_str = delta.get_str();
			this.root = red.destringify(program_str);
			this.pointer = red.create("pointer", {stack: [this.root]});
			this.output.html("");
			print(this.root, this.pointer, this.logger);
		}
	}

	, get_logger: function() {
		var current_parent = $(this.output);

		return {
			log: function() {
				var text = _.toArray(arguments).join(", ");
				var div = $("<div />")	.addClass("log")
										.text(text);
				current_parent.append(div);
			},
			group: function() {
				var text = _.toArray(arguments).join(", ");
				var div = $("<div />")	.addClass("group")
											.text(text);
				var children_div = $("<div />")	.addClass("children")
												.appendTo(div);
				current_parent.append(div);
				current_parent = children_div;
			},
			groupCollapsed: function() {
				var text = _.toArray(arguments).join(", ");
				var div = $("<div />")	.addClass("collapsed group")
											.text(text);
				var children_div = $("<div />")	.addClass("children")
												.appendTo(div);
				current_parent.append(div);
				current_parent = children_div;
			},
			groupEnd: function() {
				current_parent = current_parent.parent().parent();
			}
		};
	}
});

var pad = function(str, len) {
	if(str.length > len) {
		return str.substring(0, len-3) + "...";
	} else if(str.length < len) {
		var rv = str;
		while(rv.length < len) {
			rv += " ";
		}
		return rv;
	} else {
		return str;
	}
};


var print = function(root, current_pointer, logging_mechanism) {
	var value_to_value_str = function(val) {
		if(_.isUndefined(val)) {
			return "(undefined)";
		} else if(_.isNull(val)) {
			return "(null)";
		} else if(_.isNumber(val) || _.isBoolean(val)) {
			return val + "";
		} else if(_.isString(val)) {
			return '"' + val + '"';
		} else if(_.isFunction(val)) {
			return '(func)';
		} else if(_.isElement(val)) {
			return "(dom)";
		} else if(val instanceof red.StatefulObj) {
			return "(stateful:"+val.id+")";
		} else if(val instanceof red.Dict) {
			return "(dict:"+val.id+")";
		} else if(val instanceof red.Cell) {
			return "(cell:" + val.id + ")";
		} else if(val instanceof red.StatefulProp) {
			return "(prop:" + val.id + ")";
		} else if(val instanceof red.ParsedFunction) {
			return "(parsed fn)";
		} else if(val instanceof red.Query) {
			return value_to_value_str(val.value());
		} else if(val instanceof red.Pointer) {
			var points_at = val.points_at();
			var special_contexts = val.special_contexts();
			var str = value_to_value_str(points_at);

			var special_contexts_str = _.map(special_contexts, function(sc) { return "" + sc.id(); }).join(",");

			if(special_contexts.length > 0) {
				str = str + " " + special_contexts_str;
			}

			return str;
		} else if(val instanceof red.ManifestationContext) {
			return val.id();
		} else if(_.isArray(val)) {
			return ("[" + _.map(val, function(v) { return value_to_value_str(v);}).join(", ") + "]");
		} else if(val instanceof cjs.ArrayConstraint) {
			var array_got = val.toArray();
			return "$" + value_to_value_str(array_got);
		} else {
			return ("{ " + _.map(val, function(v, k) {
				return k + ": " + v;
			}).join(", ") + " }");
		}
	};

	var value_to_source_str = function(val) {
		if(_.isUndefined(val)) {
			return "(undefined)";
		} else if(_.isNull(val)) {
			return "(null)";
		} else if(_.isString(val)) {
			return '"' + val + '"';
		} else if(_.isNumber(val) || _.isBoolean(val)) {
			return val + "";
		} else if(_.isFunction(val)) {
			return 'function() {...}';
		} else if(val instanceof red.Dict) {
			return "";
		} else if(val instanceof red.Cell) {
			return "=(" + val.id + ")= " + val.get_str();
		} else {
			return val + "";
		}
	};

	var PROP_NAME_WIDTH = 30;
	var PROP_ID_WIDTH = 5;
	var PROP_VALUE_WIDTH = 40;

	var STATE_NAME_WIDTH = 40;
	var STATE_ID_WIDTH = 8;
	var TRANSITION_NAME_WIDTH = 70;
	var TRANSITION_VALUE_WIDTH = 40;
	var STATE_VALUE_WIDTH = 100;

	var tablify = function(pointer) {
		var points_at = pointer.points_at();

		if(points_at instanceof red.Dict || points_at instanceof red.ManifestationContext) {
			var dict = points_at;

			if(points_at instanceof red.Dict) {
				var manifestation_pointers = points_at.get_manifestation_pointers(pointer);
				if(_.isArray(manifestation_pointers)) {
					var is_expanded = current_pointer.has(points_at);
					logging_mechanism[is_expanded ? "group" : "groupCollapsed"]("(manifestations)");
					_.each(manifestation_pointers, function(manifestation_pointer) {
						var scs = manifestation_pointer.special_contexts();
						var manifestation_obj;
						for(var i = 0; i<scs.length; i++) {
							if(scs[i] instanceof red.ManifestationContext) {
								manifestation_obj = scs[i];
								break;
							}
						}
						if(!manifestation_obj) {
							throw new Error("Manifestation object not found");
						}

						
						var is_expanded2 = current_pointer.has(manifestation_obj);
						var context_obj = manifestation_obj.get_context_obj();
						var manifestation_text = pad("" + context_obj.basis_index, PROP_NAME_WIDTH);
						manifestation_text = manifestation_text + pad("("+manifestation_obj.id()+")", PROP_ID_WIDTH)
						manifestation_text = manifestation_text + pad(value_to_value_str(context_obj.basis), PROP_VALUE_WIDTH)

						logging_mechanism[is_expanded2 ? "group" : "groupCollapsed"](manifestation_text);
						tablify(manifestation_pointer);
						logging_mechanism.groupEnd();
					});
					logging_mechanism.groupEnd();
					return;
				}
			}

			if(dict instanceof red.StatefulObj) {
				var state_specs = dict.get_state_specs(pointer);
				logging_mechanism.group("  Statechart:");
				_.each(state_specs, function(state_spec) {
					var state = state_spec.state;
					var state_name;

					if(state instanceof red.State) {
						state_name = pad(state.get_name(), STATE_NAME_WIDTH-2);
					} else if(state instanceof red.StatechartTransition) { //transition
						var from = state.from(),
							to = state.to();
						state_name = pad(from.get_name() + "->" + to.get_name(), TRANSITION_NAME_WIDTH-2);
						state_name = state_name + pad(state.stringify(), TRANSITION_VALUE_WIDTH);
					}

					if(state_spec.active) {
						state_name = "* " + state_name;
					} else {
						state_name = "  " + state_name;
					}

					state_name = pad(state.id() + (state.basis() ? ":" + state.basis().id() : ""), STATE_ID_WIDTH) + state_name;
					logging_mechanism.log(state_name);
				});
				logging_mechanism.groupEnd();
			}

			var prop_names = dict.get_prop_names(pointer);
			_.each(prop_names, function(prop_name) {
				var prop_pointer = dict.get_prop_pointer(prop_name, pointer);
				var is_inherited = red.is_inherited(prop_pointer);
				var prop_points_at = prop_pointer.points_at();

				var is_expanded = current_pointer.has(prop_points_at);
				var is_pointed_at = current_pointer.eq(prop_pointer);

				var prop_text = prop_name;
				if(is_inherited) {
					prop_text = prop_text + " (i)";
				}

				if(is_pointed_at) {
					prop_text = "> " + prop_text;
				} else {
					prop_text = "  " + prop_text;
				}

				if(prop_points_at instanceof red.StatefulProp) {
					prop_text = pad(prop_text, PROP_NAME_WIDTH);
					prop_text = prop_text + pad("(" + prop_points_at.id + ")", PROP_ID_WIDTH);
				} else {
					prop_text = pad(prop_text, PROP_NAME_WIDTH + PROP_ID_WIDTH);
				}

				prop_text = pad(prop_text + value_to_value_str(prop_pointer.val()), PROP_NAME_WIDTH + PROP_ID_WIDTH + PROP_VALUE_WIDTH);

				if((prop_points_at instanceof red.Dict) || (prop_points_at instanceof red.StatefulProp)) {
					logging_mechanism[is_expanded ? "group" : "groupCollapsed"](prop_text);
					tablify(prop_pointer);
					logging_mechanism.groupEnd();
				} else {
					logging_mechanism.log(prop_text + value_to_source_str(prop_points_at));
				}
			});
		} else if(points_at instanceof red.StatefulProp) {
			var value_specs = points_at.get_value_specs(pointer);
			_.each(value_specs, function(value_spec) {
				var value = value_spec.value;
				var source_str = value_to_source_str(value);

				var state = value_spec.state;
				var state_name;
				if(state instanceof red.State) {
					state_name = pad(state.get_name(), STATE_NAME_WIDTH-2);
				} else if(state instanceof red.StatechartTransition) { //transition
					var from = state.from(),
						to = state.to();
					state_name = pad(from.get_name() + "->" + to.get_name(), TRANSITION_NAME_WIDTH-2);
					state_name = state_name + pad(state.stringify(), TRANSITION_VALUE_WIDTH);
				}

				if(value_spec.active) {
					state_name = "*" + state_name;
				} else {
					state_name = " " + state_name;
				}

				if(value_spec.using) {
					state_name = "*" + state_name;
				} else {
					state_name = " " + state_name;
				}

				state_name = pad(state.id(), STATE_ID_WIDTH) + state_name;
				var value_for_state = points_at.get_value_for_state(state, pointer);
				var row = state_name + value_to_source_str(value_for_state);
				logging_mechanism.log(row);
			});
		}
	};

	var root_str;
	if(current_pointer.points_at() === root) {
		root_str = ">root";
	} else {
		root_str = "root";
	}
	logging_mechanism.log(pad(root_str, PROP_NAME_WIDTH)  + value_to_value_str(root));
	tablify(current_pointer.slice(0,1));

	return "ok...";
};

}(red, jQuery));
