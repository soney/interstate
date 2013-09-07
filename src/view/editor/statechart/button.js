/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console,window */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;


	ist.RaphelButton = function (paper, options) {
		able.make_this_listenable(this);
		able.make_this_optionable(this, {
			text: "",
			x: 0,
			y: 0,
			width: 0,
			height: 0,
			stroke: "none",
			fill: "white",
			color: "black",
			font_family: "Source Sans Pro",
			font_size: "12px",
			checkbox: false
		}, options);
		this.paper = paper;
	};
	(function (my) {
		var proto = my.prototype;
		able.make_proto_listenable(proto);
		able.make_proto_optionable(proto);
		proto.remove = function () {
			this.label_background.remove();
			this.text.remove();
		};
	}(ist.EditableText));
}(interstate));
