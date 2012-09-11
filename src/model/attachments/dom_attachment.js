(function(red) {
var cjs = red.cjs, _ = cjs._;

var RedDomAttachmentInstance = function(options) {
	RedDomAttachmentInstance.superclass.constructor.apply(this, arguments);
	this.type = "dom";
	if(options.tag) {
		this._dom_obj = document.createElement("div");
	} else {
		this._dom_obj = cjs(undefined);
		this.add_tag_change_listener();
	}
	this.on_ready();
};
(function(my) {
	_.proto_extend(my, red.RedAttachmentInstance);
	var proto = my.prototype;
	proto.on_ready = function() {
	};
	proto.destroy = function() {
		if(this.has("_tag_change_listener")) { this._tag_change_listener.destroy(); }
	};
	proto.get_dom_obj = function() {
		return cjs.get(this._dom_obj);
	};
	proto.add_tag_change_listener = function() {
		var parent = this.get_parent();
		var context = this.get_context();

		var self = this;
		var old_tag = undefined;
		this._tag_change_listener = cjs.liven(function() {
			var tag = parent.prop_val("tag", context);
			if(tag !== old_tag) {
				var dom_obj = document.createElement(tag);
				self._dom_obj.set(dom_obj);
				old_tag = tag;
			}
		});
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
