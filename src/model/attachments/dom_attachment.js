/*jslint nomen: true, vars: true */
/*global interstate,able,uid,console,jQuery,window */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	function isInDOMTree (node) {
		// If the farthest-back ancestor of our node has a "body"
		// property (that node would be the document itself), 
		// we assume it is in the page's DOM tree.
		return !!(findUltimateAncestor(node).body);
	}
	function findUltimateAncestor (node) {
		// Walk up the DOM tree until we are at the top (parentNode 
		// will return null at that point).
		// NOTE: this will return the same node that was passed in 
		// if it has no ancestors.
		var ancestor = node;
		while (ancestor.parentNode) {
			ancestor = ancestor.parentNode;
		}
		return ancestor;
	}

	var insert_at = function (child_node, parent_node, index) {
		var children = parent_node.childNodes;
		if (children.length <= index) {
			parent_node.appendChild(child_node);
		} else {
			var before_child = children[index];
			parent_node.insertBefore(child_node, before_child);
		}
	};
	var remove = function (child_node) {
		var parent_node = child_node.parentNode;
		if (parent_node) {
			parent_node.removeChild(child_node);
		}
	};
	var move = function (child_node, from_index, to_index) {
		var parent_node = child_node.parentNode;
		if (parent_node) {
			if (from_index < to_index) { //If it's less than the index we're inserting at...
				to_index += 1; //Increase the index by 1, to make up for the fact that we're removing me at the beginning
			}
			insert_at(child_node, parent_node, to_index);
		}
	};

	ist.DomAttachmentInstance = function (options) {
		ist.DomAttachmentInstance.superclass.constructor.apply(this, arguments);

		this.type = "dom";
		this.id = _.uniqueId();
		if (options.tag) {
			this._dom_obj = window.document.createElement(options.tag);
			this._dom_obj.__ist_contextual_object__ = this.contextual_object;
		} else {
			this._dom_obj = cjs();
			this._tag_change_listener = this.add_tag_change_listener();
		}

		this._style_change_listener = this.add_style_change_listeners();
		this._attr_change_listener = this.add_attribute_change_listeners();

		this._children_change_listener = this.add_children_change_listener();
		this.current_children_srcs = [];

		//this.pause();
		//this.on_ready();
	};
	(function (my) {
		_.proto_extend(my, ist.AttachmentInstance);
		var proto = my.prototype;
		proto.on_ready = function() {};
		proto.get_owner = function () {
			return this._owner;
		};
		proto.destroy = function () {
			if (_.has(this, "_tag_change_listener")) { this._tag_change_listener.destroy(); delete this._tag_change_listener; }
			if (_.has(this, "_style_change_listener")) { this._style_change_listener.destroy(); delete this._style_change_listener; }
			if (_.has(this, "_attr_change_listener")) { this._attr_change_listener.destroy(); delete this._attr_change_listener; }
			if (_.has(this, "_style_change_listeners")) {
				_.each(this._style_change_listeners, function (x) {
					x.destroy();
				});
			}
			if (_.has(this, "_attr_change_listeners")) {
				_.each(this._attr_change_listeners, function (x) {
					x.destroy();
				});
			}
			//console.log("destroy");
			if (_.has(this, "_children_change_listener")) { this._children_change_listener.destroy(); delete this._children_change_listener; }

			if(this._dom_obj.destroy) {
				var val = this._dom_obj.get();
				if(val) {
					delete val.__ist_contextual_object__;
				}
				this._dom_obj.destroy();
			} else {
				delete this._dom_obj.__ist_contextual_object__;
			}
		};
		proto.get_dom_obj = function () {
			if (_.has(this, "_tag_change_listener")) { this._tag_change_listener.run(); }
			var rv = cjs.get(this._dom_obj);
			return rv;
		};

		proto.add_tag_change_listener = function () {
			//console.log("add tag change listener");
			var contextual_object = this.get_contextual_object();

			var old_tag;
			return cjs.liven(function () {
				var tag = contextual_object.prop_val("tag");
				if (!_.isString(tag)) {
					tag=tag+"";
				}
				tag=tag.replace(/[^a-zA-Z0-9]/g, "");

				if (tag !== old_tag) {
					old_tag = tag;
					var dom_obj = window.document.createElement(tag);
					dom_obj.__ist_contextual_object__ = contextual_object;
					this._dom_obj.set(dom_obj);
				}
			}, {
				context: this,
				pause_while_running: true
			});
		};

		proto.add_style_change_listeners = function () {
			var contextual_object = this.get_contextual_object(),
				current_listener_prop_names = [],
				current_listeners = {},
				desired_listener_prop_names;
			this._style_change_listeners = current_listeners;

			return cjs.liven(function () {
				var children;
				var style = contextual_object.prop("style");
				var child_vals = {};
				if (style instanceof ist.ContextualDict) {
					children = style.children(true);
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
					current_listeners[name] = this.add_style_change_listener(name, child_vals[name]);
				}, this);
			}, {
				context: this,
				pause_while_running: true
			});
		};
		proto.add_style_change_listener = function (name, child_val) {
			var contextual_object = this.get_contextual_object();

			return cjs.liven(function () {
				var dom_obj = this.get_dom_obj();
				if (dom_obj) {
					var val = child_val.val();
					if (val) {
						dom_obj.style[name] = val.toString();
					} else {
						dom_obj.style[name] = "";
						delete dom_obj.style[name];
					}
				}
			}, {
				context: this,
				pause_while_running: true
			});
		};
		proto.add_attribute_change_listeners = function () {
			var contextual_object = this.get_contextual_object(),
				current_listener_prop_names = [],
				current_listeners = {},
				desired_listener_prop_names;

			this._attr_change_listeners = current_listeners;

			return cjs.liven(function () {
				var css = contextual_object.prop("attr");
				var child_vals = {};
				var children;
				if (css instanceof ist.ContextualDict) {
					children = css.children(true);
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
				var dom_obj = this.get_dom_obj();
				if (dom_obj) {
					var val = child_val.val();
					if (val) {
						dom_obj.setAttribute(name, val);
					} else {
						dom_obj.removeAttribute(name);
					}
				}
			}, {
				context: this,
				pause_while_running: true
			});
		};

		var get_dom_obj_and_src = function (contextual_dict) {
			return contextual_dict.get_dom_obj_and_src();
			/*
			var dom_obj,
				dom_attachment = contextual_dict.get_attachment_instance("dom"),
				show;

			if (dom_attachment) {
				show = contextual_dict.prop_val("show");
				show = show===undefined ? true : !!show;

				if(show) {
					dom_obj = dom_attachment.get_dom_obj();
					if(dom_obj) {
						return [dom_attachment, dom_obj];
					}
				}
			} else {
				var raphael_attachment = contextual_dict.get_attachment_instance("paper");
				show = contextual_dict.prop_val("show");
				show = show===undefined ? true : !!show;

				if(show) {
					if(raphael_attachment) {
						dom_obj = raphael_attachment.get_dom_obj();

						if(dom_obj) {
							return [raphael_attachment, dom_obj];
						}
					}
				}
			}
			return false;
			*/
		},
		get_dom_children = function(c) {
			if (c instanceof ist.ContextualDict) {
				return c.get_dom_children();
			} else {
				return false;
			}
		};

		proto.is_paused = function() {
			return this._paused;
		};

		proto.pause = function () {
			//console.log("PAUSE");
			this._paused = true;
			if (_.has(this, "_tag_change_listener")) { this._tag_change_listener.pause(); }
			if (_.has(this, "_style_change_listener")) { this._style_change_listener.pause(); }
			if (_.has(this, "_attr_change_listener")) { this._attr_change_listener.pause(); }
			if (_.has(this, "_style_change_listeners")) {
				_.each(this._style_change_listeners, function (x) {
					x.pause();
				});
			}
			if (_.has(this, "_attr_change_listeners")) {
				_.each(this._attr_change_listeners, function (x) {
					x.pause();
				});
			}
			if (_.has(this, "_children_change_listener")) { this._children_change_listener.pause(); }

			var children_srcs = this.current_children_srcs;
			_.each(children_srcs, function(child_src) {
				if (child_src instanceof ist.DomAttachmentInstance) {
					child_src.pause();
				} else if(_.isElement(child_src)) {
					var pause_fn = $(child_src).data("pause");
					if(pause_fn) {
						pause_fn();
					}
				}
			});
		};

		proto.resume = function () {
			//console.log("RESUME");
			this._paused = false;
			if (_.has(this, "_tag_change_listener")) { this._tag_change_listener.resume(); }
			if (_.has(this, "_style_change_listener")) { this._style_change_listener.resume(); }
			if (_.has(this, "_attr_change_listener")) { this._attr_change_listener.resume(); }
			if (_.has(this, "_style_change_listeners")) {
				_.each(this._style_change_listeners, function (x) {
					x.resume();
					x.run();
				});
			}
			if (_.has(this, "_attr_change_listeners")) {
				_.each(this._attr_change_listeners, function (x) {
					x.resume();
					x.run();
				});
			}
			if (_.has(this, "_children_change_listener")) { this._children_change_listener.resume(); }

			if (_.has(this, "_tag_change_listener")) { this._tag_change_listener.run(); }
			if (_.has(this, "_style_change_listener")) { this._style_change_listener.run(); }
			if (_.has(this, "_attr_change_listener")) { this._attr_change_listener.run(); }

			if (_.has(this, "_children_change_listener")) { this._children_change_listener.run(); }
			var children_srcs = this.current_children_srcs;
			_.each(children_srcs, function(child_src) {
				if (child_src instanceof ist.DomAttachmentInstance) {
					child_src.resume();
				} else if(_.isElement(child_src)) {
					var resume_fn = $(child_src).data("resume");
					if(resume_fn) {
						resume_fn();
					}
				}
			});
		};

		proto.on_remove = function() {
			var dom_obj = this.get_dom_obj();
			//console.log("REMOVE");
			if (!dom_obj || !isInDOMTree(dom_obj)) {
				this.pause();
			}
		};

		proto.on_add = function() {
			var dom_obj = this.get_dom_obj();

			//console.log("ADD");
			if (dom_obj && isInDOMTree(dom_obj)) {
				this.resume();
			}
		};

		proto.add_children_change_listener = function () {
			//console.log("Add children change listener");
			var contextual_object = this.get_contextual_object();

			var cc = cjs.liven(function () {
				var dom_obj = this.get_dom_obj();
				//console.log(dom_obj);
				if (!_.isElement(dom_obj)) {
					return;
				}

				if (contextual_object.has("innerHTML")) {
					dom_obj.innerHTML = contextual_object.prop_val("innerHTML");
					return;
				} else {
					var	children, 
						current_children = _.toArray(dom_obj.childNodes),
						desired_children_srcs = [],
						desired_children = [],
						show = contextual_object.prop_val("showChildren"),
						textContent = contextual_object.prop_val("textContent");
					
					if(textContent) {
						desired_children.push(document.createTextNode(textContent));
						desired_children_srcs.push(false);
					}

					if(show === undefined) { show = true; }

					if(_.isArray(show)) { // put in order
						children = contextual_object.children();
						_.each(show, function(show_child) {
							var child_index = _.index_where(children, function(child) {
								return child.value === show_child || child.name === show_child;
							});

							if(child_index >= 0) {
								var cdc = get_dom_children(children[child_index].value);
								if(cdc) {
									desired_children_srcs.push.apply(desired_children_srcs, cdc.srcs);
									desired_children.push.apply(desired_children, cdc.children);
								}

								children.splice(child_index, 1);
							}
						}, this);
					} else if(show !== false) {
						children = contextual_object.children();
						_.each(children, function (child) {
							if(show===true || show === child.name || show === child.value) {
								var cdc = get_dom_children(child.value);
								if(cdc) {
									desired_children_srcs.push.apply(desired_children_srcs, cdc.srcs);
									desired_children.push.apply(desired_children, cdc.children);
								}
							}
						}, this);
					}

					var len = current_children.length, i, nothing_changed = false;
					if(len === desired_children.length) {
						var found_change = false;
						for(i = 0; i<len; i++){ 
							if(current_children[i] !== desired_children[i]) {
								found_change = true;
								break;
							}
						}
						if(!found_change) {
							nothing_changed = true;
						}
					}

					if(nothing_changed) {
						this.current_children_srcs = desired_children_srcs;
						return;
					}

					var diff = _.diff(current_children, desired_children);
					_.forEach(diff.removed, function (info) {
						var index = info.from, child = info.from_item;
						var src = this.current_children_srcs[index];

						remove(child);
						if(src instanceof ist.DomAttachmentInstance) {
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

						insert_at(child, dom_obj, index);

						if(src instanceof ist.DomAttachmentInstance) {
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
					this.current_children_srcs = desired_children_srcs;
				}
			}, {
				context: this,
				pause_while_running: true
			});
			return cc;
		};
	}(ist.DomAttachmentInstance));

	ist.DomAttachment = function (options) {
		options = _.extend({
			instance_class: ist.DomAttachmentInstance
		}, options);
		ist.DomAttachment.superclass.constructor.call(this, options);
		this.type = "dom";
	};
	(function (My) {
		_.proto_extend(My, ist.Attachment);
		var proto = My.prototype;

		ist.register_serializable_type("dom_attachment",
			function (x) {
				return x instanceof My;
			},
			function () {
				return {
					instance_options: ist.serialize(this.instance_options)
				};
			},
			function (obj) {
				return new My({
					instance_options: ist.deserialize(obj.instance_options)
				});
			});
	}(ist.DomAttachment));

}(interstate, jQuery));
