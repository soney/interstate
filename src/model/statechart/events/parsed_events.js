(function(red) {
var cjs = red.cjs, _ = red._;
var event_types = {};
var dom_events = ["click", "dblclick", "mousedown", "mouseup", "mouseover", "mousemove", "mouseout",
					"keydown", "keypress", "keyup", "load", "unload", "abort", "error", "resize",
					"scroll", "select", "change", "submit", "reset", "focus", "blur", "DOMFocusIn",
					"DOMFocusOut", "DOMActivate", "DOMSubtreeModified", "DOMNodeInserted", "DOMNodeRemoved",
					"DOMNodeRemovedFromDocument", "DOMNodeInsertedIntoDocument", "DOMAttrModified",
					"DOMCharacterDataModified", "cut", "copy", "paste", "beforecut", "beforecopy",
					"beforepaste", "afterupdate", "beforeupdate", "cellchange", "dataavailable",
					"datasetchanged", "datasetcomplete", "errorupdate", "rowenter", "rowexit", "rowsdelete",
					"rowinserted", "contextmenu", "drag", "dragstart", "dragenter", "dragover", "dragleave",
					"dragend", "drop", "selectstart", "help", "beforeunload", "stop", "beforeeditfocus",
					"start", "finish", "bounce", "beforeprint", "afterprint", "propertychange",
					"filterchange", "readystatechange", "losecapture", "touchstart", "touchend",
					"touchmove", "touchenter", "touchleave", "touchcancel"];
var esprima = window.esprima;

_.forEach(dom_events, function(dom_event) {
	event_types[dom_event] = function(parent) {
		var context = _.last(arguments);
		if(arguments.length === 1) {
			parent = window; // Ex: mouseup() <-> mouseup(window)
		}

		if(!(context instanceof red.RedContext)) {
			context = red.create("context");
		}

		if(parent) {
			var dom_elem;
			if(_.isElement(parent) || parent === window) {
				dom_elem = parent;
			} else if(parent instanceof red.RedDict) {
				var parent_context = parent.get_default_context();
				var manifestations = parent.get_manifestation_objs(parent_context);
				var dom_attachments;

				if(_.isArray(manifestations)) {
					dom_attachments = [];
					_.each(manifestations, function(manifestation) {
						var manifestation_context = parent_context.push(manifestation);
						var dom_attachment = parent.get_attachment_instance("dom", manifestation_context);
						if(dom_attachment) {
							dom_attachments.push(dom_attachment);
						}
					});
				} else {
					var dom_attachment = parent.get_attachment_instance("dom", context);
					if(dom_attachment) {
						dom_attachments = [dom_attachment];
					}
				}

				dom_elem = _.map(dom_attachments, function(dom_attachment) {
					return dom_attachment.get_dom_obj();
				});
			}

			if(dom_elem) {
				return red.create_event("dom_event", dom_event, dom_elem);
			}
		}
	};
});

event_types["on_transition"] = function(sc_obj, event_spec) {
	if(!_.isArray(sc_obj)) {
		sc_obj = [sc_obj];
	}
	sc_obj = _	.chain(sc_obj)
				.map(function(obj) {
					if(obj instanceof red.RedGroup) {
						return obj.get(obj.get_default_context());
					} else {
						return obj;
					}
				})
				.filter(function(obj) {
					return obj instanceof red.RedStatefulObj;
				})
				.map(function(obj) {
					return obj.get_statecharts(obj.get_default_context());
				})
				.flatten()
				.value();
	return red.create_event("statechart", sc_obj, event_spec);
};

var get_event = function(node, parent, context) {
	if(_.isUndefined(node)) { return undefined; }

	var type = node.type;
	if(type === "ExpressionStatement") {
		return get_event(node.expression, parent, context);
	} else if(type === "CallExpression") {
		var callee = get_event(node.callee, parent, context);
		var args = node.arguments;
		
		var args_got = _.map(args, function(arg) {
			var arg_val = get_event(arg, parent, context);
			return red.get_contextualizable(arg_val, context);
		});
		args_got.push(context);
		var callee_got = red.get_contextualizable(callee, context);
		return callee_got.apply(this, args_got);
	} else if(type === "Identifier") {
		var name = node.name;

		if(_.has(event_types, name)) {
			return event_types[name];
		} else if(name === "root") {
			return context.first();
		} else if(name === "window") {
			return window;
		} else {
			var curr_context = context;
			if(!context) { return; }
			var context_item = curr_context.last();
			while(!curr_context.is_empty()) {
				if(context_item instanceof red.RedDict) {
					if(context_item._has_direct_prop(name)) {
						return context_item._get_direct_prop(name, curr_context);
					}
				}
				curr_context = curr_context.pop();
				context_item = curr_context.last();
			}
		}
	} else if(type === "MemberExpression") {
		var object = get_event(node.object, parent, context);
		var object_got = cjs.get(object);
		if(object_got instanceof red.RedDict) {
			// More cases here
			variable_context = red.create("context", {stack: [object_got]});
			if(!variable_context) { return undefined; }
			var property = get_event(node.property, parent, variable_context);
			return property;
		} else {
			return(object_got[node.property.name]);
		}
	} else if(type === "ArrayExpression") {
		return _.map(node.elements, function(element) {
			return eval_tree(element, context, ignore_inherited_in_contexts);
		});
	} else if(type === "ThisExpression") {
		return parent;
	} else if(type === "Literal") {
		return node.value;
	} else if(type === "XXXXXXX") {
	} else {
		//console.log(type, node, parent);
	}
};

var ParsedEvent = red._create_event_type("parsed");
red.ParsedEvent = ParsedEvent;
var id  = 0;
(function(my) {
	var proto = my.prototype;
	proto.on_create = function(options) {
		this.id = id++;
		this.options = options;
		this._str = cjs.is_constraint(options.str) ? options.str : cjs(options.str);
		if(options.inert_super_event !== true) {
			var SOandC = red.find_stateful_obj_and_context(options.context);
			var context = SOandC.context;
			var parent = SOandC.stateful_obj;

			var self = this;
			this._tree = cjs(function() {
				return esprima.parse(self.get_str());
			});

			this.$child_fired = _.bind(this.child_fired, this);

			this._old_event = null;
			this._live_event_creator = cjs.liven(function() {
				if(this._old_event) {
					this._old_event.off_fire(this.$child_fired);
					this._old_event.destroy();
				}

				var tree = this._tree.get();
				cjs.wait();
				var event = get_event(tree.body[0], parent, context);
				cjs.signal();

				if(event) {
					event.on_fire(this.$child_fired);
					//console.log("re-constituted event", event);
				}

				this._old_event = event;
			}, {
				context: this
			});
		}
	};
	proto.child_fired = function() { this.fire.apply(this, arguments); };
	proto.get_str = function() { return this._str.get(); };
	proto.set_str = function(str) { this._str.set(str); };
	proto.create_shadow = function(parent_statechart, context) {
		return red.create_event("parsed", {str: this._str, context: context});
	};
	proto.destroy = function() {
		if(this._live_event_creator) {
			this._live_event_creator.destroy();
		}
	};
	proto.stringify = function() { return "'" + this.get_str() + "'"; };
	proto.serialize = function() { return { str: this.get_str() }; };
	my.deserialize = function(obj) { return red.create_event("parsed", obj.str); };
}(ParsedEvent));
}(red));
