(function(red) {
var cjs = red.cjs, _ = cjs._;

var RedDomAttachmentInstance = function(options) {
	RedDomAttachmentInstance.superclass.constructor.apply(this, arguments);
	this.type = "dom";
	this._dom_obj = undefined;
	//_.defer(_.bind(this.on_ready, this));
	this.on_ready();
};
(function(my) {
	_.proto_extend(my, red.RedAttachmentInstance);
	var proto = my.prototype;
	proto.on_ready = function() {
		console.log("Ready");
	};
	proto.destroy = function() {
	};
	proto.get_dom_obj = function() {
		return this._dom_obj;
	};
}(RedDomAttachmentInstance));

var RedDomAttachment = function(options) {
	options = _.extend({
		instance_class: RedDomAttachmentInstance
	}, options);
	RedDomAttachment.superclass.constructor.call(this, options);
	this.type = "dom";
};
(function(my) {
	_.proto_extend(my, red.RedAttachment);
	var proto = my.prototype;
}(RedDomAttachment));

red.RedDomAttachmentInstance = RedDomAttachmentInstance;
red.RedDomAttachment = RedDomAttachment;
cjs.define("red_dom_attachment", function(options) {
	var attachment = new RedDomAttachment(options);
	return attachment;
});
}(red));
