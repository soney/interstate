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
red.DomAttachmentInstance = function(options) {
	red.DomAttachmentInstance.superclass.constructor.apply(this, arguments);
	var pointer = this.get_pointer();

	this._owner = pointer.points_at();

	this.type = "dom";
	this.id = _.uniqueId();
	if(options.tag) {
		this._dom_obj = document.createElement(options.tag);
		this._dom_obj.__red_pointer__ = this.get_pointer();
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
	_.proto_extend(my, red.AttachmentInstance);
	var proto = my.prototype;
	proto.get_owner = function() {
		return this._owner;
	};
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
		var pointer = this.get_pointer(),
			owner = this.get_owner(),
			current_listener_prop_names = [],
			current_listeners = {},
			desired_listener_prop_names;

		return cjs.liven(function() {
			var css = owner.prop_val("css", pointer);
			if(css instanceof red.PointerValue) {
				var ptr = css.get_pointer();
				var css_dict = ptr.points_at();
				if(css_dict instanceof red.Dict) {
					desired_listener_prop_names = css_dict.get_prop_names(ptr, true);
				} else {
					desired_listener_prop_names = []
				}
			}  else {
				desired_listener_prop_names = []
			}

			var diff = _.diff(current_listener_prop_names, desired_listener_prop_names);
			current_listener_prop_names = desired_listener_prop_names;

			var dom_obj;
			if(diff.removed.length > 0) {
				dom_obj = this.get_dom_obj();
			}

			_.each(diff.removed, function(info) {
				var name = info.from_item;
				var listener = current_listeners[name];
				listener.destroy();
				delete diff.removed[name];
				if(dom_obj) {
					dom_obj.style[name] = "";
					delete dom_obj.style[name];
				}
			}, this);
			_.each(diff.added, function(info) {
				var name = info.item;
				current_listeners[name] = this.add_css_change_listener(name);
			}, this);
		}, {
			context: this
			, pause_while_running: true
		});
	};
	proto.add_attribute_change_listeners = function() {
		var pointer = this.get_pointer(),
			owner = this.get_owner(),
			current_listener_prop_names = [],
			current_listeners = {},
			desired_listener_prop_names;

		return cjs.liven(function() {
			var css = owner.prop_val("attr", pointer);
			if(css instanceof red.PointerValue) {
				var ptr = css.get_pointer();
				var css_dict = ptr.points_at();
				if(css_dict instanceof red.Dict) {
					desired_listener_prop_names = css_dict.get_prop_names(ptr, true);
				} else {
					desired_listener_prop_names = []
				}
			}  else {
				desired_listener_prop_names = []
			}

			var diff = _.diff(current_listener_prop_names, desired_listener_prop_names);
			current_listener_prop_names = desired_listener_prop_names;

			var dom_obj;
			if(diff.removed.length > 0) {
				dom_obj = this.get_dom_obj();
			}

			_.each(diff.removed, function(info) {
				var name = info.from_item;
				var listener = current_listeners[name];
				listener.destroy();
				delete diff.removed[name];
				if(dom_obj) {
					dom_obj.removeAttribute(name);
				}
			}, this);
			_.each(diff.added, function(info) {
				var name = info.item;
				current_listeners[name] = this.add_attribute_change_listener(name);
			}, this);
		}, {
			context: this
			, pause_while_running: true
		});
	};
	proto.add_tag_change_listener = function() {
		var pointer = this.get_pointer();
		var owner = this.get_owner();

		var old_tag = undefined;
		return cjs.liven(function() {
			var tag = owner.prop_val("tag", pointer);
			if(tag !== old_tag) {
				old_tag = tag;
				if(_.isString(tag)) {
					var dom_obj = document.createElement(tag);
					dom_obj.__red_pointer__ = pointer;
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
	proto.add_css_change_listener = function(name) {
		var pointer = this.get_pointer(),
			owner = this.get_owner();

		return cjs.liven(function() {
			var dom_obj = this.get_dom_obj();
			if(dom_obj) {
				var css = owner.prop_val("css", pointer);
				if(css instanceof red.PointerValue) {
					var ptr = css.get_pointer();
					var css_dict = ptr.points_at();
					if(css_dict instanceof red.Dict) {
						var val = css_dict.prop_val(name, ptr);
						if(val) {
							dom_obj.style[name] = val;
						} else {
							dom_obj.style[name] = "";
							delete dom_obj.style[name];
						}
					}
				}
			}
		}, {
			context: this
			, pause_while_running: true
		});
	};
	proto.add_attribute_change_listener = function(name) {
		var pointer = this.get_pointer(),
			owner = this.get_owner();

		return cjs.liven(function() {
			var dom_obj = this.get_dom_obj();
			if(dom_obj) {
				var css = owner.prop_val("attr", pointer);
				if(css instanceof red.PointerValue) {
					var ptr = css.get_pointer();
					var css_dict = ptr.points_at();
					if(css_dict instanceof red.Dict) {
						var val = css_dict.prop_val(name, ptr);
						if(val) {
							dom_obj.setAttribute(name, val);
						} else {
							dom_obj.removeAttribute(name);
						}
					}
				}
			}
		}, {
			context: this
			, pause_while_running: true
		});
	};
	proto.add_children_change_listener = function() {
		var pointer = this.get_pointer();
		var owner = this.get_owner();

		var cc = cjs.liven(function() {
			var dom_obj = this.get_dom_obj();
			if(!_.isElement(dom_obj)) {
				return;
			}

			var text;
			if(red.__debug) {
				text = owner.prop_val("text", pointer);
			} else {
				try {
					text = owner.prop_val("text", pointer);
				} catch(e) {
					if(red.__debug) {
						console.error(e);
					}
				}
			}

			if(text) {
				dom_obj.textContent = text;
			} else {
				var children;
				if(red.__debug) {
					children = owner.prop_val("children", pointer) || [];
				} else {
					try {
						children = owner.prop_val("children", pointer) || [];
					} catch(e) {
						if(red.__debug) {
							console.error(e);
						}
					}
				}

				var current_children = _.toArray(dom_obj.childNodes);
				var desired_children = [];

				if(children) {
					var children_pointers = [];

					if(_.isArray(children)) {
						children_pointers = children;
					} else if(children instanceof red.PointerValue) {
						var ptr = children.get_pointer();
						var dict = ptr.points_at();
						children_pointers = dict.get_prop_pointers(ptr);
					}

					_.each(children_pointers, function(child_pointer) {
						var child = child_pointer.points_at();
						if(child instanceof red.Dict) {
							var manifestation_pointers = child.get_manifestation_pointers(child_pointer);
							var dom_attachments;

							if(_.isArray(manifestation_pointers)) {
								dom_attachments = [];
								_.each(manifestation_pointers, function(manifestation_pointer) {
									var dom_attachment = child.get_attachment_instance("dom", manifestation_pointer);
									if(dom_attachment) {
										dom_attachments.push(dom_attachment);
									}
								});
							} else {
								var dom_attachment = child.get_attachment_instance("dom", child_pointer);
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
				}

				var diff = _.diff(current_children, desired_children);
				_.forEach(diff.removed, function(info) {
					var index = info.from, child = info.from_item;
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
		return cc;
	};
}(red.DomAttachmentInstance));

red.DomAttachment = function(options) {
	options = _.extend({
		instance_class: red.DomAttachmentInstance
	}, options);
	red.DomAttachment.superclass.constructor.call(this, options);
	this.type = "dom";
};
(function(my) {
	_.proto_extend(my, red.Attachment);
	var proto = my.prototype;

	red.register_serializable_type("dom_attachment",
									function(x) { 
										return x instanceof my;
									},
									function() {
										return {
											instance_options: red.serialize(this.instance_options)
										};
									},
									function(obj) {
										return new my({
											instance_options: red.deserialize(obj.instance_options)
										});
									});
}(red.DomAttachment));

red.define("dom_attachment", function(options) {
	return new red.DomAttachment(options);
});
}(red));
