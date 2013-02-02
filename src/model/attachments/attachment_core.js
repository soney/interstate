(function(red) {
var cjs = red.cjs, _ = red._;

var RedAttachmentInstance = function(options) {
	options = options || {};
	this._owner = options.owner;
	this._context = options.context;
	this.type = "(generic)";
};
(function(my) {
	var proto = my.prototype;
	proto.destroy = function() { };
	proto.get_type = function() {
		return this.type;
	};
	proto.set_context = function(context) {
		this._context = context;
	};
	proto.get_context = function() { return this._context; };
	proto.get_owner = function() { return this._owner; };
	proto.hash = function() {
		return this._context.hash();
	};
}(RedAttachmentInstance));

var RedAttachment = function(options) {
	options = options || {};
	if(options.multiple_allowed === true) {
		this._multiple_allowed = true;
	} else { this._multiple_allowed = false; }
	this._InstanceClass = options.instance_class || RedAttachmentInstance;
	this.type = "(generic)";
	this.instance_options = options.instance_options || {};
};
(function(my) {
	var proto = my.prototype;
	proto.create_instance = function(owner, context) {
		var options = _.extend({
			owner: owner
			, context: context
		}, this.instance_options);
		var instance = new this._InstanceClass(options);
		return instance;
	};
	proto.destroy_instance = function(instance) {
		instance.destroy();
	};
	proto.set_instance_context = function(instance, context) {
		instance.set_context(context);
	};
	proto.get_type = function() {
		return this.type;
	};
	proto.multiple_allowed = function() { return this._multiple_allowed; };
	proto.hash = function() {
		return this.type;
	};
}(RedAttachment));

red.RedAttachmentInstance = RedAttachmentInstance;
red.RedAttachment = RedAttachment;
red.define("attachment", function(options) {
	var attachment = new RedAttachment(options);
	return attachment;
});
}(red));
