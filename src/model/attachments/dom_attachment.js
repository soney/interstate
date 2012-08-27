(function(red) {
var cjs = red.cjs, _ = cjs._;

var RedDomAttachmentInstance = function(options) {
	RedDomAttachmentInstance.superclass.constructor.apply(this, arguments);
	this.type = "(dom)";
	this._dom_obj = undefined;
};
(function(my) {
	_.proto_extend(my, red.RedAttachmentInstance);
	var proto = my.prototype;
	proto.destroy = function() {
	};
}(RedDomAttachmentInstance));

var RedDomAttachment = function(options) {
	RedDomAttachment.superclass.constructor.apply(this, arguments);
	this.type = "(dom)";
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
