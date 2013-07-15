/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console */

(function (red) {
    "use strict";
    var cjs = red.cjs,
        _ = red._;

    red.AttachmentInstance = function (options) {
        this.options = options || {};
        this.contextual_object = this.options.contextual_object;
		this.creator = this.options.creator;
        this.type = "(generic)";
    };
    
    (function (My) {
        var proto = My.prototype;
        proto.destroy = function () { };
        proto.get_type = function () {
            return this.type;
        };
        proto.get_contextual_object = function () {
            return this.contextual_object;
        };
		proto.get_creator = function() {
			return this.creator;
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
    (function (My) {
        var proto = My.prototype;
        proto.create_instance = function (contextual_object, owner) {
            var options = _.extend({
                contextual_object: contextual_object,
				owner: owner,
				creator: this
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
		proto.do_destroy = function() {};
		proto.destroy = function() {
			this.do_destroy();
		};
    }(red.Attachment));
    
    red.define("attachment", function (options) {
        var attachment = new red.Attachment(options);
        return attachment;
    });

	red.register_attachments = function(object_types) {
		_.each(object_types, function(attachment_specs, attachment_name) {
			var attachment_suffix = "_attachment";

			var InstanceType = function(options) {
				InstanceType.superclass.constructor.apply(this, arguments);

				this.type = attachment_name;
				this.on_ready();
			};
			(function(My) {
				_.proto_extend(My, red.AttachmentInstance);
				var proto = My.prototype;
				proto.on_ready = function() {
					attachment_specs.ready.call(this);
					this._listeners = {};
					var contextual_object = this.get_contextual_object();
					_.each(attachment_specs.parameters, function(parameter_spec, parameter_name) {
						if(_.isFunction(parameter_spec)) {
							this._listeners[parameter_name] = cjs.liven(function() {
								parameter_spec.call(this, contextual_object);
							}, {
								context: this
							});
						} else if(parameter_spec.type === "list") {
							var add_fn = parameter_spec.add,
								remove_fn = parameter_spec.remove,
								move_fn = parameter_spec.move;
							var getter = parameter_spec.getter;
							var curr_val = [];

							this._listeners[parameter_name] = cjs.liven(function() {
								var desired_val = getter.call(this, contextual_object);
								var diff = _.diff(curr_val, desired_val);

								_.forEach(diff.removed, function (info) {
									var index = info.from, child = info.from_item;
									remove_fn.call(this, child, index);
								}, this);
								_.forEach(diff.added, function (info) {
									var index = info.to, child = info.item;
									add_fn.call(this, child, index);
								}, this);
								_.forEach(diff.moved, function (info) {
									var from_index = info.from, to_index = info.to, child = info.item;
									move_fn.call(this, child, from_index, to_index);
								}, this);

								curr_val = desired_val;
							}, {
								context: this
							});
						}
					}, this);
				};
				proto.on_pause = function() {
					_.each(this._listeners, function(listener) {
						listener.pause();
					});
				};
				proto.on_resume = function() {
					_.each(this._listeners, function(listener) {
						listener.resume();
					});
				};
				proto.destroy = function() {
					if(attachment_specs.destroy) {
						attachment_specs.destroy.call(this);
					}
					_.each(attachment_specs.parameters, function(parameter_spec, parameter_name) {
						this._listeners[parameter_name].destroy();
					}, this);
					My.superclass.destroy.apply(this, arguments);
				};
				_.each(attachment_specs.proto_props, function(proto_prop, proto_prop_name) {
					proto[proto_prop_name] = proto_prop;
				});
			}(InstanceType));

			var AttachmentType = function(options) {
				options = _.extend({
					instance_class: InstanceType
				}, options);
				AttachmentType.superclass.constructor.call(this, options);
				this.type = attachment_name;
			};
			(function(My) {
				_.proto_extend(My, red.Attachment);
				var proto = My.prototype;
				if(attachment_specs.attachment_destroy) {
					proto.do_destroy = attachment_specs.attachment_destroy;
				}
				red.register_serializable_type(attachment_name + attachment_suffix,
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
			}(AttachmentType));

			red.define(attachment_name + attachment_suffix, function (options) {
				return new AttachmentType(options);
			});
		});
	};
}(red));
