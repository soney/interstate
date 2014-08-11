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
			pathAttributes: {}
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

			this.draw_fn = cjs.liven(function() {
				var path_str = path.toString();

				if(path_str === "") {
					path_str = "M0,0";
				}
				paper_path.attr("path", path_str);
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
