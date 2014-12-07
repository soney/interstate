/*jslint nomen: true, vars: true */
/*global interstate,able,uid,console,jQuery,Raphael,window */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._,
		keyCodes = {"Backspace":8,"Tab":9,"Enter":13,"Shift":16,"Ctrl":17,"Alt":18,"Pause/Break":19,"Caps Lock":20,"Esc":27,"Space":32,"Page Up":33,"Page Down":34,"End":35,"Home":36,"Left":37,"Up":38,"Right":39,"Down":40,"Insert":45,"Delete":46,"0":48,"1":49,"2":50,"3":51,"4":52,"5":53,"6":54,"7":55,"8":56,"9":57,"A":65,"B":66,"C":67,"D":68,"E":69,"F":70,"G":71,"H":72,"I":73,"J":74,"K":75,"L":76,"M":77,"N":78,"O":79,"P":80,"Q":81,"R":82,"S":83,"T":84,"U":85,"V":86,"W":87,"X":88,"Y":89,"Z":90,"Windows":91,"Right Click":93,"Numpad 0":96,"Numpad 1":97,"Numpad 2":98,"Numpad 3":99,"Numpad 4":100,"Numpad 5":101,"Numpad 6":102,"Numpad 7":103,"Numpad 8":104,"Numpad 9":105,"Numpad *":106,"Numpad +":107,"Numpad -":109,"Numpad .":110,"Numpad /":111,"F1":112,"F2":113,"F3":114,"F4":115,"F5":116,"F6":117,"F7":118,"F8":119,"F9":120,"F10":121,"F11":122,"F12":123,"Num Lock":144,"Scroll Lock":145,"My Computer":182,"My Calculator":183,";":186,"=":187,",":188,"-":189,".":190,"/":191,"`":192,"[":219,"\\":220,"]":221,"'":222};

	function keyToCode(key_name) {
		return keyCodes[key_name];
	}

	ist.JSEventAttachment = ist.register_attachment("js_event_attachment", {
			ready: function(contextual_object) {
				this.eventType = this.options.eventType;
				this.enabled = false;

				this._eventListener = _.bind(function(e) {
					if(this.eventType === "keyboard") {
						if(e.type === 'keydown' || e.type === 'keyup' || e.type === 'keypress') {
							if(this.keyCode && this.keyCode !== e.keyCode) { // if it's a keyboard event
								return;
							}
						}
					} else if(this.eventType === "timeout") {
						if(this._timeout_id) {
							clearTimeout(this._timeout_id);
							this._timeout_id = false;
						}
					}

					var event_attachment = contextual_object.get_attachment_instance("event_attachment");
					if(event_attachment) {
						event_attachment.fire(e);
						//var eventObject = event_attachment.getEvent();
						//eventObject.fire(e);
					}
				}, this);
				this._oldType = this._oldTarget = false;
			},
			destroy: function(silent) {
				if(this.eventType === "timeout") {
					if(this._timeout_id) {
						clearTimeout(this._timeout_id);
						this._timeout_id = false;
					}
				} else {
					if(this._oldType) {
						_.each(this._oldTarget, function(target) {
							target.removeEventListener(this._oldType, this._eventListener);
						}, this);
						this._oldType = this._oldTarget = false;
					}
				}
			},
			parameters: {
				type_and_target: function(contextual_object) {
					if(this.eventType === "keyboard" || this.eventType === "mouse") {
						var type = contextual_object.prop_val("type"),
							targets = contextual_object.prop_val("target"),
							computed_targets = _.pluck(get_targets(targets), "dom_obj");

						if(this.eventType === "keyboard") {
							computed_targets = [window];
						}


						if(this.enabled) {
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
						}
						this._oldType = type;
						this._oldTarget = computed_targets;
					}
				},
				key: function(contextual_object) {
					if(this.eventType === "keyboard") {
						var key = contextual_object.prop_val("key"),
							keyCode = keyToCode(key);

						if(this.enabled) {
							this.keyCode = keyCode;
						}
					}
				},

				milliseconds: function(contextual_object) {
					if(this.eventType === "timeout") {
						var milliseconds = contextual_object.prop_val("milliseconds");

						if(this.enabled) {
							var current_time = (new Date()).getTime();

							if(this._timeout_id) {
								clearTimeout(this._timeout_id);
								milliseconds = Math.max(0, milliseconds-(current_time - this._timeout_set_at));
							}

							this._timeout_set_at = current_time;
							this._timeout_id = setTimeout(this._eventListener, milliseconds);
						}
					}
				}
			},
			proto_props: {
				onTransitionEnabled: function() {
					this.enabled = true;
					if(this.eventType === "timeout") {
						var milliseconds = this.contextual_object.prop_val("milliseconds");

						if(this._timeout_id) {
							clearTimeout(this._timeout_id);
						}
						this._timeout_id = setTimeout(this._eventListener, milliseconds);
					} else {
						if(this._oldType) {
							_.each(this._oldTarget, function(target) {
								target.addEventListener(this._oldType, this._eventListener);
							}, this);
						}
					}
				},
				onTransitionDisabled: function() {
					this.enabled = false;
					if(this.eventType === "timeout") {
						if(this._timeout_id) {
							clearTimeout(this._timeout_id);
							this._timeout_id = false;
						}
					} else {
						if(this._oldType) {
							_.each(this._oldTarget, function(target) {
								target.removeEventListener(this._oldType, this._eventListener);
							}, this);
						}
					}
				}
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
