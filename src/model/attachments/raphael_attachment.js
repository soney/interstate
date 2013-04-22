/*jslint nomen: true, vars: true */
/*global red,able,uid,console,jQuery,Raphael,window */

(function (red, $) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;
	var VALID_TYPES = ["path", "image", "rect", "text", "circle", "ellipse"];

	var is_paper = function(x) {
		return x instanceof Raphael._Paper;
	};

	var insert_at = function (child_node, parent_node, index) {
		var paper = parent_node;
		var paper_children = [];
		var child_index;
		paper.forEach(function(child) {
			paper_children.push(child);
		});
		child_index = _.indexOf(paper_children, child_node);
		if(child_index >= 0) {
			move(child_node, child_index, index);
		} else {
			if(paper_children.length <= index) {
				child_node.insertAfter(paper.bottom);
			} else {
				var before_child = paper_children[index]
				child_node.insertBefore(before_child);
			}
		}
	};
	var remove = function (child_node) {
		child_node.remove();
	};
	var move = function (child_node, from_index, to_index) {
		var paper = child_node.paper;
		var paper_children = [];
		paper.forEach(function(child) {
			paper_children.push(child);
		});

		if (from_index < to_index) { //If it's less than the index we're inserting at...
			to_index += 1; //Increase the index by 1, to make up for the fact that we're removing me at the beginning
		}
		var before_child = paper_children[to_index];
		if(to_index >= paper_children.length) {
			before_child = paper.bottom;
		}
		child_node.insertBefore(before_child);
	};

	red.RaphaelAttachmentInstance = function (options) {
		red.RaphaelAttachmentInstance.superclass.constructor.apply(this, arguments);

		this.type = "raphael";
		this.$robj = cjs.$();
		this.$dom_obj = cjs.$();
		this.on_ready();
	};
	(function (my) {
		_.proto_extend(my, red.AttachmentInstance);
		var proto = my.prototype;
		proto.on_ready = function() {
			this.add_type_change_listener();
			this.add_attribute_change_listeners();
			this.add_children_change_listener();
			this.add_paper_size_listener();
		};
		proto.add_type_change_listener = function() {
			var contextual_object = this.get_contextual_object();
			var old_type;
			this._type_change_listener = cjs.liven(function () {
				var type = contextual_object.prop_val("rtype");
				if (type !== old_type) {
					old_type = type;
					if (_.isString(type)) {
						if(type === "paper") {
							var dom_obj = document.createElement("div");
							this.$dom_obj.set(dom_obj);
							this.$robj.set(new Raphael(dom_obj, 1, 1));
						} else if(_.indexOf(VALID_TYPES, type) >= 0) {
							var paper = this.get_paper();
							var obj = paper[type](0,0,0,0,0);
							this.$robj.set(obj);
						}
					}
				}
			}, {
				context: this,
				pause_while_running: true
			});
		};
		proto.add_paper_size_listener = function() {
			var contextual_object = this.get_contextual_object();

			this._paper_size_listener = cjs.liven(function () {
				var robj = this.get_raphael_obj();
				if(is_paper(robj)) {
					var attr = contextual_object.prop("rattr");
					if(attr instanceof red.ContextualDict) {
						var width = attr.prop_val("width"),
							height = attr.prop_val("height");
						robj.setSize(width, height);
					}
				}
			}, {
				context: this
			});
		};
		proto.add_children_change_listener = function () {
			var contextual_object = this.get_contextual_object();
			this.current_children = [];
			this.current_children_srcs = [];

			var cc = cjs.liven(function () {
				var robj = this.get_raphael_obj();
				if(!is_paper(robj)) {
					return;
				}
				var desired_children = [];
				var desired_children_srcs = [];

				var children = contextual_object.children(true);
				_.each(children, function(child_info) {
					var name = child_info.name;
					var value = child_info.value;
					if(_.indexOf(["rattr", "rtype"], name) < 0) {
						if(value instanceof red.ContextualDict) {
							var raphael_attachment = value.get_attachment_instance("raphael");
							if(raphael_attachment) {
								var robj = raphael_attachment.get_raphael_obj();
								if(robj) {
									desired_children.push(robj);
									desired_children_srcs.push(raphael_attachment);
								}
							}
						}
					}
				});

				var diff = _.diff(this.current_children, desired_children);
				_.forEach(diff.removed, function (info) {
					var index = info.from, child = info.from_item;
					var src = this.current_children_srcs[index];

					remove(child);
					if(src instanceof red.RaphaelAttachmentInstance) {
						src.on_remove();
					} else if(_.isElement(src)) {
						var pause_fn = $(src).data("pause");
						if(pause_fn) {
							pause_fn();
						}
					}
				}, this);
				_.forEach(diff.added, function (info) {
					var index = info.to, child = info.item;
					var src = desired_children_srcs[index];

					insert_at(child, robj, index);

					if(src instanceof red.RaphaelAttachmentInstance) {
						src.on_add();
					} else if(_.isElement(src)) {
						var resume_fn = $(src).data("resume");
						if(resume_fn) {
							resume_fn();
						}
					}
				}, this);
				_.forEach(diff.moved, function (info) {
					var from_index = info.from, to_index = info.to, child = info.item;
					move(child, from_index, to_index);
				}, this);

				this.current_children = desired_children;
				this.current_children_srcs = desired_children_srcs;
			}, {
				context: this,
				pause_while_running: true
			});
			return cc;
		};
		proto.on_remove = function() {
		};
		proto.on_add = function() {
		};

		proto.add_attribute_change_listeners = function () {
			var contextual_object = this.get_contextual_object(),
				current_listener_prop_names = [],
				current_listeners = {},
				desired_listener_prop_names;

			this._attr_change_listeners = current_listeners;

			return cjs.liven(function () {
				var attr = contextual_object.prop("rattr");
				var child_vals = {};
				var children;
				if (attr instanceof red.ContextualDict) {
					children = attr.children(true);
					var prop_names = _.pluck(children, "name");
					_.each(children, function (child) {
						child_vals[child.name] = child.value;
					});
					desired_listener_prop_names = prop_names;
				} else {
					children = [];
					desired_listener_prop_names = [];
				}

				var diff = _.diff(current_listener_prop_names, desired_listener_prop_names);
				current_listener_prop_names = desired_listener_prop_names;

				var dom_obj;
				if (diff.removed.length > 0) {
					dom_obj = this.get_dom_obj();
				}

				_.each(diff.removed, function (info) {
					var name = info.from_item;
					var listener = current_listeners[name];
					listener.destroy();
					delete diff.removed[name];
					if (dom_obj) {
						dom_obj.style[name] = "";
						delete dom_obj.style[name];
					}
				}, this);
				_.each(diff.added, function (info) {
					var name = info.item;
					current_listeners[name] = this.add_attribute_change_listener(name, child_vals[name]);
				}, this);
			}, {
				context: this,
				pause_while_running: true
			});
		};
		proto.add_attribute_change_listener = function (name, child_val) {
			var contextual_object = this.get_contextual_object();

			return cjs.liven(function () {
				var robj = this.get_raphael_obj();
				if(robj) {
					if(!is_paper(robj)) {
						var val = child_val.val();
						robj.attr(name, val);
						return;
					}
				}
			}, {
				context: this,
				pause_while_running: true
			});
		};

		proto.get_paper = function() {
			var contextual_object = this.get_contextual_object();
			var ptr = contextual_object.get_pointer();
			var parent_ptr = ptr.slice(0, ptr.length()-1);
			var parent_object = parent_ptr.points_at();
			var parent_cobj = red.find_or_put_contextual_obj(parent_object, parent_ptr);
			var parent_raphael_attachment = parent_cobj.get_attachment_instance("raphael");
			if(parent_raphael_attachment) {
				var parent_robj = parent_raphael_attachment.get_raphael_obj();
				if(is_paper(parent_robj)) {
					return parent_robj;
				}
			}
			return false
		};

		proto.pause = function() { };
		proto.resume = function() { };

		proto.destroy = function () {
			this._type_change_listener.destroy();
		};

		proto.get_raphael_obj = function() {
			return this.$robj.get();
		};
		proto.get_dom_obj = function() {
			return this.$dom_obj.get();
		};
	}(red.RaphaelAttachmentInstance));

	// ========================================================================

	red.RaphaelAttachment = function (options) {
		options = _.extend({
			instance_class: red.RaphaelAttachmentInstance
		}, options);
		red.RaphaelAttachment.superclass.constructor.call(this, options);
		this.type = "raphael";
	};
	(function (My) {
		_.proto_extend(My, red.Attachment);
		var proto = My.prototype;

		red.register_serializable_type("raphael_attachment",
			function (x) {
				return x instanceof My;
			},
			function () {
				return {
					instance_options: red.serialize(this.instance_options)
				};
			},
			function (obj) {
				return new My({
					instance_options: red.deserialize(obj.instance_options)
				});
			});
	}(red.RaphaelAttachment));

	red.define("raphael_attachment", function (options) {
		return new red.RaphaelAttachment(options);
	});

}(red, jQuery));
