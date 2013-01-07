(function(red) {
var cjs = red.cjs, _ = red._;

var insert_at = function(child_node, parent_node, index) {
	var children = parent_node.childNodes;
	if(children.length <= index) {
		parent_node.appendChild(child_node);
	} else {
		var before_child = children[index];
		parent_node.insertBefore(child_node, before_child);
	}
};
var remove = function(child_node) {
	var parent_node = child_node.parentNode;
	if(parent_node) {
		parent_node.removeChild(child_node);
	}
};
var move = function(child_node, from_index, to_index) {
	var parent_node = child_node.parentNode;
	if(parent_node) {
		if(from_index < to_index) { //If it's less than the index we're inserting at...
			to_index++; //Increase the index by 1, to make up for the fact that we're removing me at the beginning
		}
		insert_at(child_node, parent_node, to_index);
	}
};

// Red name: CSS name
var changeable_css_props = {
	"width": "width"
	, "height": "height"
	, "backgroundColor": "backgroundColor"
	, "color": "color"
	, "left": "left"
	, "top": "top"
	, "position": "position"
};

var changeable_attributes = {
	"src": "src"
	, "class": "class"
	, "id": "id"
};

var RedDomAttachmentInstance = function(options) {
	RedDomAttachmentInstance.superclass.constructor.apply(this, arguments);
	this.type = "dom";
	this.id = _.uniqueId();
	if(options.tag) {
		this._dom_obj = document.createElement(options.tag);
	} else {
		this._dom_obj = cjs.$();
		this._tag_change_listener = this.add_tag_change_listener();
	}

	this._css_change_listeners = this.add_css_change_listeners();
	this._attr_change_listeners = this.add_attribute_change_listeners();
	this._children_change_listener = this.add_children_change_listener();

	this.on_ready();
};
(function(my) {
	_.proto_extend(my, red.RedAttachmentInstance);
	var proto = my.prototype;
	proto.on_ready = function() { };
	proto.destroy = function() {
		if(_.has(this, "_tag_change_listener")) { this._tag_change_listener.destroy(); }
		if(_.has(this, "_css_change_listeners")) {
			this._css_change_listeners.forEach(function(change_listener) {
				change_listener.destroy();
			});
		}
		if(_.has(this, "_attr_change_listeners")) {
			this._attr_change_listeners.forEach(function(change_listener) {
				change_listener.destroy();
			});
		}
		if(_.has(this, "_children_change_listener")) { this._children_change_listener.destroy(); }
	};
	proto.get_dom_obj = function() {
		return cjs.get(this._dom_obj);
	};

	proto.add_css_change_listeners = function() {
		var listeners = {};
		var self = this;
		_.forEach(changeable_css_props, function(css_prop_name, red_attr_name) {
			listeners[red_attr_name] = self.add_css_change_listener(red_attr_name, css_prop_name);
		});
		return listeners;
	};
	proto.add_attribute_change_listeners = function() {
		var listeners = {};
		var self = this;
		_.forEach(changeable_attributes, function(prop_name, red_attr_name) {
			listeners[red_attr_name] = self.add_attribute_change_listener(red_attr_name, prop_name);
		});
		return listeners;
	};
	proto.add_tag_change_listener = function() {
		var parent = this.get_parent();
		var context = this.get_context();

		var old_tag = undefined;
		return cjs.liven(function() {
			var tag = parent.prop_val("tag", context);
			if(tag !== old_tag) {
				old_tag = tag;
				if(_.isString(tag)) {
					var dom_obj = document.createElement(tag);
					this._dom_obj.set(dom_obj);
				} else {
					this._dom_obj.set(undefined);
				}
			}
		}, {
			context: this
			, pause_while_running: true
			, run_on_create: false
		}).run();
	};
	proto.add_css_change_listener = function(red_attr_name, css_prop_name) {
		var parent = this.get_parent();
		var context = this.get_context();

		return cjs.liven(function() {
			var dom_obj = this.get_dom_obj();
			if(dom_obj) {
				var val = parent.prop_val(red_attr_name, context);
				dom_obj.style[css_prop_name] = val;
			}
		}, {
			context: this
			, pause_while_running: true
		});
	};
	proto.add_attribute_change_listener = function(red_attr_name, attr_name) {
		var parent = this.get_parent();
		var context = this.get_context();

		return cjs.liven(function() {
			var dom_obj = this.get_dom_obj();
			if(dom_obj) {
				var val = parent.prop_val(red_attr_name, context);
				dom_obj[attr_name] = val;
			}
		}, {
			context: this
			, pause_while_running: true
		});
	};
	proto.add_children_change_listener = function() {
		var parent = this.get_parent();
		var context = this.get_context();

		return cjs.liven(function() {
			var dom_obj = this.get_dom_obj();

			var text = parent.prop_val("text", context);
			if(text) {
				dom_obj.textContent = cjs.get(text);
				window.dom_obj = dom_obj;
			} else {
				var children = parent.get_prop("children", children_context);
				var children_context = context.push(children);

				var children_got = red.get_contextualizable(children, children_context);
				var prop_values = [];

				if(children_got instanceof red.RedDict) {
					prop_values = children.get_prop_values(children_context);
				} else if(red.is_contextualizable(children)) {
					prop_values = children_got;
				} else if(_.isArray(children)) {
					prop_values = children;
				}

				var current_children = _.toArray(dom_obj.childNodes);
				var desired_children = [];
				_.each(prop_values, function(prop_value) {
					if(prop_value instanceof red.RedDict) {
						var pv_context = context.push(prop_value);

						var manifestations = prop_value.get_manifestation_objs(pv_context);

						var dom_attachments;

						if(_.isArray(manifestations)) {
							var manifestation_contexts = _.map(manifestations, function(manifestation) {
								return pv_context.push(manifestation);
							});
							dom_attachments = [];
							_.each(manifestation_contexts, function(manifestation_context) {
								var dom_attachment = parent.get_attachment_instance("dom", manifestation_context);
								if(dom_attachment) {
									dom_attachments.push(dom_attachment);
								}
							});
						} else {
							var dom_attachment = prop_value.get_attachment_instance("dom", pv_context);
							if(dom_attachment) {
								dom_attachments = [dom_attachment];
							}
						}

						_.each(dom_attachments, function(dom_attachment) {
							var dom_element = dom_attachment.get_dom_obj();
							if(dom_element) {
								desired_children.push(dom_element);
							}
						});
					}
				});

				var diff = _.diff(current_children, desired_children);
				window.dc = desired_children;
				_.forEach(diff.removed, function(info) {
					var index = info.from, child = info.item;
					remove(child);
				});
				_.forEach(diff.added, function(info) {
					var index = info.to, child = info.item;
					insert_at(child, dom_obj, index);
				});
				_.forEach(diff.moved, function(info) {
					var from_index = info.from, to_index = info.to, child = info.item;
					move(child, from_index, to_index);
				});
			}
		}, {
			context: this
			, pause_while_running: true
		});
	};
}(RedDomAttachmentInstance));

var RedDomAttachment = function(options) {
	options = _.extend({
		instance_class: RedDomAttachmentInstance
	}, options);
	RedDomAttachment.superclass.constructor.call(this, options);
	this.type = "dom";
};
(function(my) {
	_.proto_extend(my, red.RedAttachment);
	var proto = my.prototype;

	proto.serialize = function() {
		return {instance_options: red.serialize(this.instance_options)};
	};
	my.deserialize = function(obj) {
		return new RedDomAttachment({instance_options: red.deserialize(obj.instance_options)});
	};
}(RedDomAttachment));

red.RedDomAttachmentInstance = RedDomAttachmentInstance;
red.RedDomAttachment = RedDomAttachment;
red.define("dom_attachment", function(options) {
	return new RedDomAttachment(options);
});
}(red));
