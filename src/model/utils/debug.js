(function(red) {
var cjs = red.cjs, _ = red._;

var objs = [];
var descriptors = [];

red._set_descriptor = function(obj, desc) {
	var index = objs.indexOf(obj);
	if(index<0) {
		objs.push(obj);
		descriptors.push(desc);
	} else {
		descriptors[index] = desc;
	}
};
red._get_descriptor = function(obj) {
	var index = objs.indexOf(obj);
	if(index<0) {
		return undefined;
	} else {
		return descriptors[index];
	}
};

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


var print = function(current_pointer, logging_mechanism) {
	logging_mechanism = logging_mechanism || console;
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
			return "(stateful:"+uid.strip_prefix(val.id())+")";
		} else if(val instanceof red.Dict) {
			return "(dict:"+uid.strip_prefix(val.id())+")";
		} else if(val instanceof red.Cell) {
			return "(cell:" + uid.strip_prefix(val.id()) + ")";
		} else if(val instanceof red.StatefulProp) {
			return "(prop:" + uid.strip_prefix(val.id()) + ")";
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
		} else if(val instanceof red.ContextualObject) {
			var ptr = val.get_pointer();
			var points_at = ptr.points_at();
			var special_contexts = ptr.special_contexts();
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
			return "=(" + uid.strip_prefix(val.id()) + ")= " + val.get_str();
		} else {
			return val + "";
		}
	};

	var PROP_NAME_WIDTH = 30;
	var PROP_ID_WIDTH = 5;
	var PROP_VALUE_WIDTH = 40;

	var STATE_NAME_WIDTH = 40;
	var STATE_ID_WIDTH = 8;
	var TRANSITION_NAME_WIDTH = 60;
	var TRANSITION_VALUE_WIDTH = 40;
	var STATE_VALUE_WIDTH = 100;

	var tablify = function(contextual_object) {
		if(contextual_object instanceof red.ContextualDict) {
			if(contextual_object instanceof red.ContextualStatefulObj) {
				var statecharts = contextual_object.get_statecharts();
				var stringified_statecharts = _.map(statecharts, function(sc) {
					return uid.strip_prefix(sc.id()) + ":" + uid.strip_prefix(sc.basis().id());
				}).join(" ");
				logging_mechanism.group("  Statechart " + stringified_statecharts );
				_.each(statecharts, function(statechart) {
					var flattened_statechart = _.without(statechart.flatten_substates(), statechart);

					var flattened_state_and_transitions = _.flatten(_.map(flattened_statechart, function(statechart) {
						return ([statechart]).concat(statechart.get_outgoing_transitions());
					}), true);

					_.each(flattened_state_and_transitions, function(state) {
						var state_name;

						if(state instanceof red.State) {
							state_name = pad(state.get_name(), STATE_NAME_WIDTH-2);
						} else if(state instanceof red.StatechartTransition) { //transition
							var from = state.from(),
								to = state.to();
							state_name = pad(from.get_name() + "->" + to.get_name(), TRANSITION_NAME_WIDTH-2);
							state_name = state_name + pad(state.stringify(), TRANSITION_VALUE_WIDTH);
						}

						if(state.is_active()) {
							state_name = "* " + state_name;
						} else {
							state_name = "  " + state_name;
						}

						state_name = pad(uid.strip_prefix(state.id()) + (state.basis() ? ":" + uid.strip_prefix(state.basis().id()) : ""), STATE_ID_WIDTH) + state_name;
						logging_mechanism.log(state_name);
					});
				});
				logging_mechanism.groupEnd();
			}
			var children = contextual_object.get_children();
			_.each(children, function(child_info) {
				var is_manifestations;
				var c_arr;
				if(_.isArray(child_info.value)) {
					c_arr = child_info.value;
					is_manifestations = true;
				} else {
					c_arr = [child_info.value];
					is_manifestations = false;
				}
				if(is_manifestations) {
					console.group("(" + c_arr.length + " manifestations)");
				}

				var prop_name = child_info.name;
				var is_inherited = child_info.inherited;
				_.each(c_arr, function(child) {
					var prop_pointer = child instanceof red.ContextualObject ? child.get_pointer() : false;
					var prop_points_at = prop_pointer ? prop_pointer.points_at() : child;
					var is_expanded = prop_points_at && current_pointer.has(prop_points_at);
					var is_pointed_at = prop_pointer && current_pointer.eq(prop_pointer);
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
						prop_text = prop_text + pad("(" + uid.strip_prefix(prop_points_at.id()) + ")", PROP_ID_WIDTH);
					} else {
						prop_text = pad(prop_text, PROP_NAME_WIDTH + PROP_ID_WIDTH);
					}

					var pp_val = child instanceof red.ContextualObject ? child.val() : child;
					prop_text = pad(prop_text + value_to_value_str(pp_val), PROP_NAME_WIDTH + PROP_ID_WIDTH + PROP_VALUE_WIDTH);

					if((prop_points_at instanceof red.Dict) || (prop_points_at instanceof red.StatefulProp)) {
						logging_mechanism[is_expanded ? "group" : "groupCollapsed"](prop_text);
						tablify(child);
						logging_mechanism.groupEnd();
					} else {
						logging_mechanism.log(prop_text + value_to_source_str(prop_points_at));
					}
				});
				if(is_manifestations) {
					console.groupEnd();
				}
			});
		} else if(contextual_object instanceof red.ContextualStatefulProp) {
			var value_specs = contextual_object.get_values();
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
					state_name = pad(from.get_name() + "->" + to.get_name(), STATE_NAME_WIDTH-2);
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

				state_name = pad(uid.strip_prefix(state.id()), STATE_ID_WIDTH) + state_name;
				var value_for_state = value_spec.value;
				var row = state_name + value_to_source_str(value_for_state);
				logging_mechanism.log(row);
			});
		}
	};

	var root = current_pointer.points_at(0);
	var root_str;
	if(current_pointer.points_at() === root) {
		root_str = ">root";
	} else {
		root_str = "root";
	}
	logging_mechanism.log(pad(root_str, PROP_NAME_WIDTH)  + value_to_value_str(root));
	var contextual_root = red.find_or_put_contextual_obj(root);
	tablify(contextual_root);

	return "ok...";
};

red.print = print;
}(red));
