/*jslint nomen: true, vars: true */
/*global red,able,uid,console,jQuery,window */

(function (red, $) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

	red.RaphaelAttachmentInstance = function (options) {
		red.RaphaelAttachmentInstance.superclass.constructor.apply(this, arguments);

		this.type = "raphael";
		this.on_ready();
	};
	(function (my) {
		_.proto_extend(my, red.AttachmentInstance);
		var proto = my.prototype;
		proto.on_ready = function() {
		};
	}(red.RaphaelAttachmentInstance));

	red.RaphaelAttachment = function (options) {
		options = _.extend({
			instance_class: red.RaphaelAttachmentInstance
		}, options);
		red.RaphaelAttachment.superclass.constructor.call(this, options);
		this.type = "raphael";
	};
	(function (My) {
		_.proto_extend(My, red.Attachment);
		var proto = My.prototype;

		red.register_serializable_type("raphael_attachment",
			function (x) {
				return x instanceof My;
			},
			function () {
				return {
					instance_options: red.serialize(this.instance_options)
				};
			},
			function (obj) {
				return new My({
					instance_options: red.deserialize(obj.instance_options)
				});
			});
	}(red.RaphaelAttachment));

	red.define("raphael_attachment", function (options) {
		return new red.RaphaelAttachment(options);
	});

}(red, jQuery));
