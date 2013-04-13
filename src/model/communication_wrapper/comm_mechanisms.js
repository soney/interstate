/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console */

(function (red) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;
	
	red.InterWindowCommWrapper = function(remote_window) {
		able.make_this_listenable(this);
		this.remote_window = remote_window;
		window.addEventListener("message", _.bind(function (event) {
		}));
	};

	(function(My) {
		var proto = My.prototype;
		able.make_proto_listenable(proto);
	}(red.InterWindowCommWrapper));


	red.SameWindowCommWrapper = function() {
		able.make_this_listenable(this);
	};

	(function(My) {
		var proto = My.prototype;
		able.make_proto_listenable(proto);
	}(red.SameWindowCommWrapper));
	
}(red));
