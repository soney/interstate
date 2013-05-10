/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console,RedMap,jQuery,window,Raphael */

(function (red, $) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

	red.HorizontalRangeDisplay = function (statecharts, layout_engine, paper, options) {
		able.make_this_optionable(this, {
			font_family: "Source Sans Pro",
			font_size: "12px",
			color: "black",
			background: "white",
			height: "15px",
			top: "0px"
		}, options);
	};

	(function (My) {
		var proto = My.prototype;

	}(red.HorizontalRangeDisplay));
	
}(red, jQuery));
