/*jslint nomen: true, vars: true, white: true */
/*jshint scripturl: true */
/*global interstate,esprima,able,uid,console,window,jQuery,Raphael */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	$.widget("interstate.svg_path", {
		options: {
			cluster: false,
			ctx: false,
			paper: false,
			pathAttributes: {
				fill: "none",
				stroke: "black"
			}
		},
		_create: function () {
			this._super();
			this._addToPaper();
		},
		_destroy: function () {
			this._removeFromPaper();
			this._super();
		},
		_addToPaper: function() {
			var paper = this.option("paper"),
				path = this.option("path"),
				paper_path = paper.path("M0,0").attr(this.option("pathAttributes"));

/*
			if(shape_attachment) {
				if(shape_attachment.shape_type === "path") {
					path = obj.prop_val("path");
				} else if(shape_attachment.shape_type === "circle") {
					var cx = obj.prop_val("cx"),
						cy = obj.prop_val("cy"),
						r = obj.prop_val("r");
					path = "M"+(cx-r)+','+cy+'a'+r+','+r+',0,1,1,0,0.0001Z';
				} else if(shape_attachment.shape_type === "ellipse") {
					var cx = obj.prop_val("cx"),
						cy = obj.prop_val("cy"),
						rx = obj.prop_val("rx"),
						ry = obj.prop_val("ry");

					path = "M"+(cx-rx)+','+cy+'a'+rx+','+ry+',0,1,1,0,0.0001Z';
				} else if(shape_attachment.shape_type === "rect") {
					var x = obj.prop_val("x"),
						y = obj.prop_val("y"),
						width = obj.prop_val("width"),
						height = obj.prop_val("height");

					path = "M"+x+','+y+'h'+width+'v'+height+'h'+(-width)+'Z';
				} else {
					path = false;
				}
			}
			*/

			this.draw_fn = cjs.liven(function() {
				var pathStr;
				if(path instanceof ist.ContextualDict) {
					var obj = path,
						shape_attachment = path.get_attachment_instance("shape");
					if(shape_attachment) {
						if(shape_attachment.shape_type === "path") {
							pathStr = obj.prop_val("path");
						} else if(shape_attachment.shape_type === "circle") {
							var cx = obj.prop_val("cx"),
								cy = obj.prop_val("cy"),
								r = obj.prop_val("r");
							pathStr = "M"+(cx-r)+','+cy+'a'+r+','+r+',0,1,1,0,0.0001Z';
						} else if(shape_attachment.shape_type === "ellipse") {
							var cx = obj.prop_val("cx"),
								cy = obj.prop_val("cy"),
								rx = obj.prop_val("rx"),
								ry = obj.prop_val("ry");

							pathStr = "M"+(cx-rx)+','+cy+'a'+rx+','+ry+',0,1,1,0,0.0001Z';
						} else if(shape_attachment.shape_type === "rect") {
							var x = obj.prop_val("x"),
								y = obj.prop_val("y"),
								width = obj.prop_val("width"),
								height = obj.prop_val("height");

							pathStr = "M"+x+','+y+'h'+width+'v'+height+'h'+(-width)+'Z';
						} else {
							pathStr = false;
						}
					}
				} else if(path instanceof ist.Path) {
					pathStr = path.toString();
				} else if(_.isString(path)) {
					pathStr = path;
				}

				if(!pathStr) {
					path_str = "M0,0";
				}

				paper_path.attr("path", pathStr);
			}, {
				context: this,
				on_destroy: function() {
					paper_path.remove();
				}
			});
		},
		_removeFromPaper: function() {
			if(this.draw_fn) {
				this.draw_fn.destroy();
			}
		}
	});
}(interstate, jQuery));
