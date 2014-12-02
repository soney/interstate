/*jslint nomen: true, vars: true */
/*global interstate,able,uid,console,jQuery,Raphael,window */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	ist.JSEventAttachment = ist.register_attachment("js_event_attachment", {
			ready: function(contextual_object) {
				this._eventListener = _.bind(function(e) {
					var fireable_attachment = contextual_object.get_attachment_instance("fireable_attachment");
					if(fireable_attachment) {
						var eventObject = fireable_attachment.getEvent();
						eventObject.fire(e);
					}
				}, this);
				this._oldType = this._oldTarget = false;
			},
			destroy: function(silent) {
				if(this._oldType) {
					_.each(this._oldTarget, function(target) {
						target.removeEventListener(this._oldType, this._eventListener);
					}, this);
					this._oldType = this._oldTarget = false;
				}
			},
			parameters: {
				type_and_target: function(contextual_object) {
					var type = contextual_object.prop_val("type"),
						targets = contextual_object.prop_val("target"),
						computed_targets = _.pluck(get_targets(targets), "dom_obj");

					if(this._oldType) {
						_.each(this._oldTarget, function(target) {
							target.removeEventListener(this._oldType, this._eventListener);
						}, this);
					}

					if(type) {
						_.each(computed_targets, function(target) {
							target.addEventListener(type, this._eventListener);
						}, this);
					}
					this._oldType = type;
					this._oldTarget = computed_targets;
				}
			},
			proto_props: {
			}
		});

	function get_target_cobjs(targs) {
		if (!_.isArray(targs)) {
			targs = [targs];
		}

		var rv = _	.chain(targs)
					.map(function(targ) {
						if(targ instanceof ist.Query) {
							return targ.value();
						} else {
							return targ;
						}
					})
					.flatten(true)
					.value();
		return rv;
	}

	function get_dom_targets(target_cobjs) {
		var rv = _	.chain(target_cobjs)
					.map(function (target_cobj) {
						if (_.isElement(target_cobj) || target_cobj === window) {
							return {dom_obj: target_cobj, cobj: target_cobj};
						} else if (target_cobj instanceof ist.ContextualDict) {
							if (target_cobj.is_template()) {
								return _.chain(target_cobj.instances())
										.map(ist.get_instance_targs)
										.flatten(true)
										.value();
							} else {
								return ist.get_instance_targs(target_cobj);
							}
						}
						return false;
					})
					.flatten(true)
					.compact()
					.value();
		return rv;
	}

	function get_targets(targs) {
		return get_dom_targets(get_target_cobjs(targs));
	}
}(interstate, jQuery));
