(function(red) {
var cjs = red.cjs, _ = red._;

// Red name: CSS name
var changeable_css_props = {
	"width": "width"
	, "height": "height"
	, "backgroundColor": "backgroundColor"
	, "color": "color"
	, "left": "left"
	, "top": "top"
	, "position": "position"
};

var changeable_attributes = {
	"src": "src"
	, "class": "class"
	, "id": "id"
};

var RedDomAttachmentInstance = function(options) {
	RedDomAttachmentInstance.superclass.constructor.apply(this, arguments);
	this.type = "dom";
	if(options.tag) {
		this._dom_obj = document.createElement("div");
	} else {
		this._dom_obj = cjs(undefined);
		var self = this;
		this._tag_change_listener = self.add_tag_change_listener();
		this._css_change_listeners = self.add_css_change_listeners();
		this._attr_change_listeners = self.add_attribute_change_listeners();
	}
	this.on_ready();
};
(function(my) {
	_.proto_extend(my, red.RedAttachmentInstance);
	var proto = my.prototype;
	proto.on_ready = function() { };
	proto.destroy = function() {
		if(this.has("_tag_change_listener")) { this._tag_change_listener.destroy(); }
		if(this.has("_css_change_listeners")) {
			this._css_change_listeners.forEach(function(change_listener) {
				change_listener.destroy();
			});
		}
		if(this.has("_attr_change_listeners")) {
			this._attr_change_listeners.forEach(function(change_listener) {
				change_listener.destroy();
			});
		}
	};
	proto.get_dom_obj = function() {
		return cjs.get(this._dom_obj);
	};

	proto.add_css_change_listeners = function() {
		var listeners = {};
		var self = this;
		_.forEach(changeable_css_props, function(css_prop_name, red_attr_name) {
			listeners[red_attr_name] = self.add_css_change_listener(red_attr_name, css_prop_name);
		});
		return listeners;
	};
	proto.add_attribute_change_listeners = function() {
		var listeners = {};
		var self = this;
		_.forEach(changeable_attributes, function(prop_name, red_attr_name) {
			listeners[red_attr_name] = self.add_attribute_change_listener(red_attr_name, prop_name);
		});
		return listeners;
	};
	proto.add_tag_change_listener = function() {
		var parent = this.get_parent();
		var context = this.get_context();

		var self = this;
		var old_tag = undefined;
		return cjs.liven(function() {
			var tag = parent.prop_val("tag", context);
			if(tag !== old_tag) {
				if(_.isString(tag)) {
					var dom_obj = document.createElement(tag);
					self._dom_obj.set(dom_obj);
				} else {
					self._dom_obj.set(undefined);
				}
				old_tag = tag;
			}
		});
	};
	proto.add_css_change_listener = function(red_attr_name, css_prop_name) {
		var parent = this.get_parent();
		var context = this.get_context();

		var self = this;
		return cjs.liven(function() {
			var dom_obj = self.get_dom_obj();
			if(dom_obj) {
				var val = parent.prop_val(red_attr_name, context);
				dom_obj.style[css_prop_name] = val;
			}
		});
	};
	proto.add_attribute_change_listener = function(red_attr_name, attr_name) {
		var parent = this.get_parent();
		var context = this.get_context();

		var self = this;
		return cjs.liven(function() {
			var dom_obj = self.get_dom_obj();
			if(dom_obj) {
				var val = parent.prop_val(red_attr_name, context);
				dom_obj[attr_name] = val;
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

	proto.serialize = function() {
		return {instance_options: red.serialize(this.instance_options)};
	};
	my.deserialize = function(obj) {
		return new RedDomAttachment({instance_options: red.deserialize(obj.instance_options)});
	};
}(RedDomAttachment));

red.RedDomAttachmentInstance = RedDomAttachmentInstance;
red.RedDomAttachment = RedDomAttachment;
red.define("dom_attachment", function(options) {
	return new RedDomAttachment(options);
});
}(red));
