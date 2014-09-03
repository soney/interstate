/*jslint nomen: true, vars: true, white: true */
/*global interstate,esprima,able,uid,console,window,jQuery,Raphael */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	var name = ist.attachmentViews.shape = "raphael_attachment_view";
	$.widget("interstate." + name, {
		options: {
			client: false,
			maxHeight: 30,
			maxWidth: 50
		},
		_create: function() {
			this._addContentBindings();
			this._addSnapBindings();
		},
		_destroy: function() {
			var client = this.option("client");

			this._removeContentBindings();
			this._removeSnapBindings();
			this._super();
		},
		_addSnapBindings: function() {
			var client = this.option("client");

			this.$shape = client.get_$("prop_val", "shape");
			var attr_constraints = {
				fill: client.get_$("prop_val", "fill"),
				fill_opacity: client.get_$("prop_val", "fill_opacity"),
				stroke: client.get_$("prop_val", "stroke"),
				stroke_opacity: client.get_$("prop_val", "stroke_opacity"),
				stroke_width: client.get_$("prop_val", "stroke_width"),
				opacity: client.get_$("prop_val", "opacity"),
				stroke_dasharray: client.get_$("prop_val", "stroke_dasharray"),
				r: client.get_$("prop_val", "r"),
				rx: client.get_$("prop_val", "rx"),
				ry: client.get_$("prop_val", "ry"),
				width: client.get_$("prop_val", "width"),
				height: client.get_$("prop_val", "height"),
				text: client.get_$("prop_val", "text"),
				src: client.get_$("prop_val", "src"),
				path: client.get_$("prop_val", "path"),
				font_family: client.get_$("prop_val", "font_family"),
				font_size: client.get_$("prop_val", "font_size"),
				font_weight: client.get_$("prop_val", "font_weight")
			};
			this.$shape.get();
			_.each(attr_constraints, function(x) { x.get(); }); // get initial values

			var old_shape_type = false,
				old_shape_value,
				paper = new Snap(0,0);

			this.element.append(paper.node);

			this.defered_fn = _.delay(_.bind(function() {
				this.live_fn = cjs.liven(function() {
					var shape_type = this.$shape.get(),
						attrs = {},
						shape_value = old_shape_value,
						paper_width,
						paper_height,
						bbox;

					_.each(["fill", "fill_opacity", "stroke", "stroke_opacity", "stroke_width", "opacity", "stroke_dasharray"], function(name) {
						var val = attr_constraints[name];
						attrs[name.replace("_", "-")] = val.get();
					});

					if(shape_type === "circle") {
						_.each(["r"], function(name) {
							var val = attr_constraints[name];
							attrs[name.replace("_", "-")] = val.get();
						});
						attrs.cx = attrs.r + attrs["stroke-width"];
						attrs.cy = attrs.r + attrs["stroke-width"];

						paper_width = attrs.cx + attrs.r + 2*attrs["stroke-width"];
						paper_height = attrs.cy + attrs.r + 2*attrs["stroke-width"];
					} else if(shape_type === "ellipse") {
						_.each(["rx", "ry"], function(name) {
							var val = attr_constraints[name];
							attrs[name.replace("_", "-")] = val.get();
						});
						attrs.cx = attrs.rx + attrs["stroke-width"];
						attrs.cy = attrs.ry + attrs["stroke-width"];

						paper_width = attrs.cx + attrs.rx + 2*attrs["stroke-width"];
						paper_height = attrs.cy + attrs.ry + 2*attrs["stroke-width"];
					} else if(shape_type === "text") {
						_.each(["text", "font_family", "font_size", "font_weight"], function(name) {
							var val = attr_constraints[name];
							attrs[name.replace("_", "-")] = val.get();
						});
					} else if(shape_type === "rectangle") {
						_.each(["width", "height"], function(name) {
							var val = attr_constraints[name];
							attrs[name.replace("_", "-")] = val.get();
						});
						paper_width = attrs.width + 2*attrs["stroke-width"];
						paper_height = attrs.height + 2*attrs["stroke-width"];
					} else if(shape_type === "image") {
						_.each(["src", "width", "height"], function(name) {
							var val = attr_constraints[name];
							attrs[name.replace("_", "-")] = val.get();
						});
						paper_width = attrs.width;
						paper_height = attrs.height;
					} else if(shape_type === "path") {
						_.each(["path"], function(name) {
							var val = attr_constraints[name];
							attrs[name.replace("_", "-")] = val.get();
						});
					}

					if(shape_type !== old_shape_type) {
						if(shape_type === "circle") {
							shape_value = paper.circle(attrs.cx,attrs.cy,attrs.r);
						} else if(shape_type === "ellipse") {
							shape_value = paper.ellipse(attrs.cx,attrs.cy,attrs.rx, attrs.ry);
						} else if(shape_type === "text") {
							shape_value = paper.text(0,0,attrs.text);
						} else if(shape_type === "rectangle") {
							shape_value = paper.rect(0,0,attrs.width, attrs.height);
						} else if(shape_type === "image") {
							shape_value = paper.image(attrs.src, 0, 0, attrs.width, attrs.height);
						} else if(shape_type === "path") {
							shape_value = paper.path(attrs.path);
						}

						if(old_shape_value) {
							old_shape_value.remove();
						}

						old_shape_value = shape_value;
					}


					if(shape_value) {
						shape_value.attr(attrs);

						if(shape_type === "text") {
							bbox = shape_value.getBBox();

							shape_value.attr({
								x: 0,
								y: bbox.height 
							});

							paper_width = bbox.width;
							paper_height = bbox.height;
						} else if(shape_type === "path") {
							bbox = shape_value.getBBox();

							paper_width = bbox.width;
							paper_height = bbox.height;
						}

						var maxWidth = this.option("maxWidth"),
							maxHeight = this.option("maxHeight"),
							scale = false;

						if(paper_width > maxWidth || paper_height > maxHeight) {
							scale = Math.min(maxWidth / paper_width,
												maxHeight / paper_height);
							paper_width *= scale;
							paper_height *= scale;
						}

						if(scale) {
							shape_value.transform("scale(" + scale + ")");
						}
					}

					if(paper_width && paper_height) {
						paper.attr({
							width: paper_width,
							height: paper_height
						});
					}
						
					if(shape_value) {
						shape_value.attr(attrs);
					}
				}, {
					context: this
				});
			}, this), 100);

		},
		_removeSnapBindings: function() {
		},
		_addContentBindings: function() {
		},
		_removeContentBindings: function() {
		},
		_addClassBindings: function() {
			this.element.addClass("raphael_attachment_view");
		},
		_removeClassBindings: function() {
			this.element.removeClass("raphael_attachment_view");
		},
	});
}(interstate, jQuery));
