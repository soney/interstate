/*jslint nomen: true, vars: true */
/*global red,able,uid,console,jQuery,window */

(function (red, $) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;
	red.ThreeAttachmentInstance = function (options) {
		red.ThreeAttachmentInstance.superclass.constructor.apply(this, arguments);

		this.type = "threejs";
		this.on_ready();
	};
	(function (my) {
		_.proto_extend(my, red.AttachmentInstance);
		var proto = my.prototype;
		proto.on_ready = function() {
		};
		proto.destroy = function () {
		};
	}(red.ThreeAttachmentInstance));

	red.ThreeAttachment = function (options) {
		options = _.extend({
			instance_class: red.ThreeAttachmentInstance
		}, options);
		red.ThreeAttachment.superclass.constructor.call(this, options);
		this.type = "three";
	};
	(function (My) {
		_.proto_extend(My, red.Attachment);
		var proto = My.prototype;

		red.register_serializable_type("three_attachment",
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
	}(red.ThreeAttachment));

	red.define("three_attachment", function (options) {
		return new red.ThreeAttachment(options);
	});

}(red, jQuery));
