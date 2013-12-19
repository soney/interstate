/*jslint nomen: true, vars: true, white: true */
/*jshint scripturl: true */
/*global interstate,esprima,able,uid,console,window,jQuery,Raphael,RedMap */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;
	$.widget("interstate.component_list", {
		options: {
			info_servers: false
		},

		_create: function() {
			var info_servers = this.option("info_servers");
			this.$programs = cjs(function() {
				return info_servers.programs.get();
			}, {
				context: this
			});
			this.$components = cjs(function() {
				return info_servers.components.get();
			}, {
				context: this
			});
			window.p = this.$programs;
			window.c = this.$components;
			
			console.log(info_servers);
		},

		_destroy: function() {
			this._super();
		},
		_setOption: function(key, value) {
			this._super(key, value);
		}
	});
}(interstate, jQuery));
