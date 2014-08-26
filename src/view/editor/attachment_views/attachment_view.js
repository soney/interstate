/*jslint nomen: true, vars: true, white: true */
/*global interstate,esprima,able,uid,console,window,jQuery,Raphael */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	
	cjs.registerCustomPartial("attachmentViews", {
		createNode: function(options) {
			return $("<div />").attachment_views(options);
		},
		destroyNode: function(node) {
			$(node).attachment_views("destroy");
		}
	});

	$.widget("interstate.attachment_views", {
		options: {
			client: false,
			attachmentTypes: false
		},
		_create: function() {
			var client = this.option("client"),
				attachmentTypes = this.option("attachmentTypes");

			var old_attachment_types = [];
			this._live_fn = cjs.liven(function() {
				var attachmentTypesValue = _.filter(attachmentTypes.get(), function(x) { return ist.attachmentViews.hasOwnProperty(x); }),
					diff = _.diff(old_attachment_types, attachmentTypesValue);

				_.each(diff.removed, function(info) {
					var item = info.item,
						attachmentViewName = ist.attachmentViews[item];
					this.element[attachmentViewName]("destroy");
				}, this);
				_.each(diff.added, function(info) {
					var item = info.item,
						attachmentViewName = ist.attachmentViews[item];
					this.element[attachmentViewName](this.options);
				}, this);

				old_attachment_types = attachmentTypesValue;
			}, {
				context: this,
				on_destroy: _.bind(function() {
					_.each(old_attachment_types, function(oat) {
						var attachmentViewName = ist.attachmentViews[oat];
						this.element[attachmentViewName]("destroy");
					}, this);
				}, this)
			});
		},
		_destroy: function() {
			var client = this.option("client");
			this._live_fn.destroy();

			this._super();
		},
	});

	ist.attachmentViews = { };
}(interstate, jQuery));
