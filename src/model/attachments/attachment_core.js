/*jslint nomen: true  vars: true */
/*global red,esprima,able,uid,console */

(function (red) {
    "use strict";
    var cjs = red.cjs,
        _ = red._;

red.AttachmentInstance = function (options) {
	options = options || {};
	this.contextual_object = options.contextual_object;
	this.type = "(generic)";
};
(function (my) {
	var proto = my.prototype;
	proto.destroy = function () { };
	proto.get_type = function () {
		return this.type;
	};
	proto.get_contextual_object = function () {
		return this.contextual_object;
	};
	proto.hash = function () {
		return this._context.hash();
	};
}(red.AttachmentInstance));

red.Attachment = function (options) {
	options = options || {};
	if (options.multiple_allowed === true) {
		this._multiple_allowed = true;
	} else { this._multiple_allowed = false; }
	this._InstanceClass = options.instance_class || red.AttachmentInstance;
	this.type = "(generic)";
	this.instance_options = options.instance_options || {};
};
(function (my) {
	var proto = my.prototype;
	proto.create_instance = function (contextual_object) {
		var options = _.extend({
			contextual_object: contextual_object
		}, this.instance_options);
		var instance = new this._InstanceClass(options);
		return instance;
	};
	proto.destroy_instance = function (instance) {
		instance.destroy();
	};
	proto.set_instance_context = function (instance, context) {
		instance.set_context(context);
	};
	proto.get_type = function () {
		return this.type;
	};
	proto.multiple_allowed = function () { return this._multiple_allowed; };
	proto.hash = function () {
		return this.type;
	};
}(red.Attachment));

red.define("attachment", function (options) {
	var attachment = new red.Attachment(options);
	return attachment;
});
}(red));
