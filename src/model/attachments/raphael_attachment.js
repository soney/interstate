/*jslint nomen: true, vars: true */
/*global interstate,able,uid,console,jQuery,Raphael,window */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	var is_paper = function(obj) { return obj instanceof Raphael._Paper; };

	var get_children = function(child_nodes) {
		var children = [];
		_.each(child_nodes, function(child) {
			if(child instanceof ist.ContextualCell || child instanceof ist.ContextualStatefulProp) {
				child = child.val();
			}

			if(child instanceof ist.ContextualDict) {
				if(child.is_template()) {
					var copies = child.instances();
					children.push.apply(children, get_children(copies));
				} else {
					var shape_attachment_instance = child.get_attachment_instance("shape");
					if(shape_attachment_instance) {
						var to_show = child.prop_val("show");
						if(to_show) {
							children.push(shape_attachment_instance);
						}
						children.push.apply(children, shape_attachment_instance.get_children());
					}
					var group_attachment_instance = child.get_attachment_instance("group");
					if(group_attachment_instance) {
						//console.log(group_attachment_instance);
						children.push.apply(children, group_attachment_instance.get_children());
					}
				}
			}
		}, this);
		return children;
	},
	get_cobj_children = function(contextual_object) {
		var show = contextual_object.prop_val("showChildren"),
			children, cobj_children, values;

		if(_.isArray(show)) { // put in order
			cobj_children = contextual_object.children(true);
			children = [];
			_.each(show, function(show_child) {
				var child_index = _.index_where(cobj_children, function(child) {
					return child.value === show_child || child.name === show_child;
				});

				if(child_index >= 0) {
					children.push.apply(children, get_children([cobj_children[child_index].value]));
					cobj_children.splice(child_index, 1);
				}
			});
		} else if(show !== false) {
			cobj_children = contextual_object.children(true);
			children = get_children(_.pluck(cobj_children, "value"));
		} else {
			children = [];
		}

		return children;
	};

	ist.PaperAttachment = ist.register_attachment("paper", {
			ready: function() {
				this.dom_obj = window.document.createElement("span");
				this.paper = new Snap(0,0);
				this.dom_obj.appendChild(this.paper.node);
			},
			destroy: function(silent) {
				this.paper.clear();
				this.paper.remove();
				delete this.paper;
				delete this.dom_obj;
			},
			parameters: {
				width_height: function(contextual_object) {
					var width = contextual_object.prop_val("width"),
						height = contextual_object.prop_val("height");
					//this.paper.setSize(width, height);
					this.paper.attr({
						width: width,
						height: height
					});
				},
				fill: function(contextual_object) {
					var fill = contextual_object.prop_val("fill"),
						dom_obj = this.get_dom_obj();
					$("svg", dom_obj).css("background-color", fill);
				},
				screen: {
					type: "list",
					add: function(shape_attachment_instance, to_index) {
						var shape = shape_attachment_instance.create_robj(this.paper),
							items = this.paper.selectAll(":not(desc):not(defs)"),
							itemi = items[to_index],
							len = items.length;
							/*
							itemi, len,
							index = 0,
							item;
						items.forEach
						//rect,circle,path,ellipse,image,text")[index];
						/*
						.forEach(function(elem) {
							if(index === to_index) {
								itemi = elem;
							}
							len = index;
							index++;
						});
						*/
						if(itemi !== shape) {
							if(to_index >= len) {
								//https://github.com/adobe-webplatform/Snap.svg/issues/121
								//shape.toBack();
								shape.appendTo(this.paper);
							} else {
								shape.before(itemi);
							}
						}
					},
					remove: function(shape_attachment_instance) {
						shape_attachment_instance.remove();
					},
					move: function(item, from_index, to_index) {
						var shape = item.get_robj();
						//var index = 0;
						if (from_index < to_index) { //If it's less than the index we're inserting at...
							to_index += 1; //Increase the index by 1, to make up for the fact that we're removing me at the beginning
						}
						var items = this.paper.selectAll(":not(desc):not(defs)"),
							itemi = items[to_index],
							len = items.length;
							/*
						var itemi, len;
						this.paper.forEach(function(elem) {
							if(index === to_index) {
								itemi = elem;
							}
							len = index;
							index++;
						});
						*/
						if(to_index >= len) {
							//shape.toBack();
							shape.appendTo(this.paper);
						} else {
							shape.insertBefore(itemi);
						}
					},
					getter: function(contextual_object) {
						return get_cobj_children(contextual_object);
					}
				}
			},
			proto_props: {
				get_dom_obj: function() {
					return this.dom_obj;
				}
			}
		});
	var can_animate_parameters = ["r", "cx", "cy", "x", "y", "width", "height", "path", "fill", "stroke", "opacity", "fill_opacity", "stroke_opacity", "transform"];
	var can_animate_dict = {};
	_.each(can_animate_parameters, function(name) {
		can_animate_dict[name] = true;
	});
	ist.ShapeAttachment = ist.register_attachment("shape", {
			ready: function() {
				this.shape_type = this.options.shape_type;
				if(this.shape_type === "rectangle") {
					this.shape_type = "rectangle";
				}
				this.constructor_params = this.options.constructor_params;
				this.$robj = cjs(false);
				this.$children = cjs(this.child_getter, {context: this});

				this.ist_runtime = $(".ist_runtime");
				this.touchscreen_layer = this.ist_runtime.is(".hasTouchscreenLayer");
			},
			destroy: function(silent) {
				if(this.touchscreen_layer) {
					this.ist_runtime.touchscreen_layer("removePath", this.contextual_object);
				}

				var robj = this.get_robj();
				if(robj) {
					robj.remove();
					delete robj.node.__ist_contextual_object__;
				}
				this.$robj.destroy(silent);
				this.$children.destroy(silent);
				delete this.constructor_params;
				delete this.$robj;
				delete this.$children;
			},
			parameters: _.extend({
				debugDraw: function(contextual_object) {
					var debugDraw = contextual_object.prop_val("debugDraw");
					if(debugDraw) {
						if(this.touchscreen_layer) {
							this.ist_runtime.touchscreen_layer("addPath", contextual_object);
						}
					} else {
						if(this.touchscreen_layer) {
							this.ist_runtime.touchscreen_layer("removePath", contextual_object);
						}
					}
				}
			}, (function(infos) {
				var parameters = {};
				_.each(infos, function(euc_name, raph_name) {
					parameters[euc_name] = function(contextual_object) {
						if(contextual_object.has(euc_name)) {
							var prop_val = contextual_object.prop_val(euc_name);
							var robj = this.get_robj();
							if(robj) {
								var animated_properties;
								if(can_animate_dict[euc_name] === true && (animated_properties = contextual_object.prop_val("animated_properties")) &&
										(	animated_properties === true ||
											animated_properties === "*") ||
											(_.isArray(animated_properties) && _.indexOf(animated_properties, euc_name) >= 0)) {
									var duration = contextual_object.prop_val("animation_duration");
									if(!_.isNumber(duration)) {
										duration = 300;
									}
									
									var easing = contextual_object.prop_val("animation_easing");
									if(!_.isString(easing)) {
										easing = "linear";
									}

									var anim_options = { };
									anim_options[raph_name] = cjs.get(prop_val);
									try {
										robj.animate(anim_options, duration, easing);
									} catch(e) {
										if(ist.__log_errors) {
											console.error(e);
										}
									}
								} else {
									try {
										robj.attr(raph_name, cjs.get(prop_val));
									} catch(e) {
										if(ist.__log_errors) {
											console.error(e);
										}
									}
								}
							}
						}
					};
				}, this);
				return parameters;
			}({
				opacity: "opacity", // put opacity first because fill-opacity should be set after opacity (?)
				"arrow-end": "arrow_end",
				"arrow-start": "arrow_start",
				blur: "blur",
				"clip-rect": "clip_rect",
				cursor: "cursor",
				cx: "cx",
				cy: "cy",
				fill: "fill",
				"fill-opacity": "fill_opacity",
				font: "font",
				"font-family": "font_family",
				"font-size": "font_size",
				"font-style": "font_style",
				"font-weight": "font_weight",
				height: "height",
				href: "href",
				"letter-spacing": "letter_spacing",
				path: "path",
				r: "r",
				rx: "rx",
				ry: "ry",
				src: "src",
				stroke: "stroke",
				"stroke-dasharray": "stroke_dasharray",
				"stroke-linecap": "stroke_linecap",
				"stroke-linejoin": "stroke_linejoin",
				"stroke-miterlimit": "stroke_miterlimit",
				"stroke-opacity": "stroke_opacity",
				"stroke-width": "stroke_width",
				target: "target",
				"text-anchor": "text_anchor",
				text: "text",
				title: "title",
				transform: "transform",
				width: "width",
				x: "x",
				y: "y"
			}))),
			proto_props: {
				create_robj: function(paper) {
					var robj = this.get_robj();
					if(robj) {
						return robj;
					} else {
						robj = paper[this.shape_type].apply(paper, this.constructor_params);
						//robj[0].__ist_contextual_object__ = this.get_contextual_object();
						robj.node.__ist_contextual_object__ = this.get_contextual_object();
						this.$robj.set(robj);
						return robj;
					}
				},
				get_robj: function() {
					return cjs.get(this.$robj);
				},
				remove: function() {
					var robj = this.get_robj();
					if(robj) {
						robj.remove();
						delete robj.node.__ist_contextual_object__;
						this.$robj.set(false);
					}
				},
				child_getter: function() {
					var contextual_object = this.get_contextual_object(),
						to_show = contextual_object.prop_val("show"),
						children, cobj_children, values;

					if(_.isArray(to_show) || _.isString(to_show)) {
						if(_.isString(to_show)) {
							to_show = [to_show];
						}
						cobj_children = _.filter(contextual_object.children(true), function(child_info) {
							return _.contains(to_show, child_info.name);
						});
						values = _.pluck(cobj_children, "value");
						values.reverse();
						children = get_children(values);
					} else if(to_show) {
						cobj_children = contextual_object.children(true);
						values = _.pluck(cobj_children, "value");
						values.reverse();
						children = get_children(values);
					} else {
						children = [];
					}
					return children;
				},
				get_children: function() {
					return this.$children.get();
				}
			},
			attachment_destroy: function() { }
		});
	ist.GroupAttachment = ist.register_attachment("group", {
			ready: function() {
				this.$children = cjs(this.child_getter, {context: this});
			},
			destroy: function(silent) {
				this.$children.destroy(silent);
				delete this.$children;
			},
			parameters: {
				children: function(contextual_object) {
				}
			},
			proto_props: {
				child_getter: function() {
					var contextual_object = this.get_contextual_object();
					return get_cobj_children(contextual_object);
				},
				get_children: function() {
					return this.$children.get();
				}
			}
		});
}(interstate, jQuery));
