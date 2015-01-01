/*jslint nomen: true, vars: true */
/*global interstate,able,uid,console,jQuery,Raphael,window */

(function (ist, $) {
	//"use strict";
	var cjs = ist.cjs,
		_ = ist._,
		keyCodes = {"Backspace":8,"Tab":9,"Enter":13,"Shift":16,"Ctrl":17,"Alt":18,"Pause/Break":19,"Caps Lock":20,"Esc":27,"Space":32,"Page Up":33,"Page Down":34,"End":35,"Home":36,"Left":37,"Up":38,"Right":39,"Down":40,"Insert":45,"Delete":46,"0":48,"1":49,"2":50,"3":51,"4":52,"5":53,"6":54,"7":55,"8":56,"9":57,"A":65,"B":66,"C":67,"D":68,"E":69,"F":70,"G":71,"H":72,"I":73,"J":74,"K":75,"L":76,"M":77,"N":78,"O":79,"P":80,"Q":81,"R":82,"S":83,"T":84,"U":85,"V":86,"W":87,"X":88,"Y":89,"Z":90,"Windows":91,"Right Click":93,"Numpad 0":96,"Numpad 1":97,"Numpad 2":98,"Numpad 3":99,"Numpad 4":100,"Numpad 5":101,"Numpad 6":102,"Numpad 7":103,"Numpad 8":104,"Numpad 9":105,"Numpad *":106,"Numpad +":107,"Numpad -":109,"Numpad .":110,"Numpad /":111,"F1":112,"F2":113,"F3":114,"F4":115,"F5":116,"F6":117,"F7":118,"F8":119,"F9":120,"F10":121,"F11":122,"F12":123,"Num Lock":144,"Scroll Lock":145,"My Computer":182,"My Calculator":183,";":186,"=":187,",":188,"-":189,".":190,"/":191,"`":192,"[":219,"\\":220,"]":221,"'":222};

	function keyToCode(key_name) {
		var keyCode;
		if(_.isString(key_name)) {
			keyCode = keyCodes[key_name] || keyCodes[key_name.toUpperCase()] || key_name.charCodeAt(0);
		} else if(_.isNumber(key_name)) {
			keyCode = key_name;
		} else {
			keyCode = false;
		}
		return keyCode;
	}

	ist.get_instance_targs = function(instance) {
		var dom_objs = instance.get_dom_obj();
		if(dom_objs) {
			if(_.isArray(dom_objs)) {
				return _.map(dom_objs, function(dom_obj) {
					return {dom_obj: dom_obj, cobj: instance};
				});
			} else {
				return {dom_obj: dom_objs, cobj: instance};
			}
		} else {
			return false;
		}
	};

	ist.JSEventAttachment = ist.register_attachment("js_event_attachment", {
			ready: function(contextual_object) {
				this.eventType = this.options.eventType;
				//this.enabled = false;

				this.bubble_timeouts = {};
				//window.signal_listeners = window.signal_listeners || [];
				//window.target_listeners = window.target_listeners || [];

				this.get_bubble_listener = cjs.memoize(function (specified_target) {
					var listener = _.bind(function(event) {
						//console.log("signal", this.contextual_object.sid());
						var event_attachment = this.contextual_object.get_attachment_instance("event_attachment"),
							eventSignature = event.type+event.timeStamp+specified_target.sid();

						if(this.eventType === "keyboard") {
							if(e.type === 'keydown' || e.type === 'keyup' || e.type === 'keypress') {
								var key = this.contextual_object.prop_val("key"),
									keyCode = keyToCode(key);

								if(keyCode && keyCode !== e.keyCode) { // if it's a keyboard event
									return;
								}
							}
						} else if(this.eventType === "timeout") {
							if(this._timeout_id) {
								if(this._timeout_type === "frame") {
									cancelAnimationFrame(this._timeout_id);
								} else {
									clearTimeout(this._timeout_id);
								}
								this._timeout_id = false;
							}
						}
						//var event_attachment = this.contextual_object.get_attachment_instance("event_attachment");
						if(event_attachment) {
							event_attachment.fire(event);
						}

						if(this.bubble_timeouts[eventSignature]) {
							//console.log("clear", eventSignature);
							clearTimeout(this.bubble_timeouts[eventSignature]);
							delete this.bubble_timeouts[eventSignature];
						}
						if(event_attachment) {
							event_attachment.signal();
						}
						ist.event_queue.signal();
						/*

						if(this.eventType === "keyboard" || this.eventType === "mouse") {
							var stopPropagation = this.contextual_object.prop_val("stopPropagation"),
								preventDefault = this.contextual_object.prop_val("preventDefault");
							console.log("signal", stopPropagation,preventDefault, event);

							if(stopPropagation) { event.stopPropagation(); }
							if(preventDefault) { event.preventDefault(); }
						}
						/**/
					}, this);
					//if(signal_listeners.length === 3) debugger;
					//bubble_listeners.push(listener);

					return listener;
				}, {
					context: this,
					hash: function(args) {
						var cobj = args[0];
						if(cobj instanceof ist.ContextualObject) {
							return cobj.hash();
						} else {
							return cobj + "";
						}
					},
					equals: function(args1, args2) {
						return args1[0]===args2[0];
					}
				});
				this.get_capture_listener = cjs.memoize(function (specified_target) {
					var listener = _.bind(function (event) {
						//console.log("wait", this.contextual_object.sid());
						var event_attachment = this.contextual_object.get_attachment_instance("event_attachment"),
							eventSignature = event.type+event.timeStamp+specified_target.sid();
						if(event_attachment) {
							event_attachment.wait();
						}
						ist.event_queue.wait();

						//console.log("set", eventSignature);
						// If default is prevented, make sure to clear the hold on the event queue
						this.bubble_timeouts[eventSignature] = setTimeout(_.bind(function() {
							//console.log("TIMEOUT1");
							//console.log("run", eventSignature, specified_target.sid());
							if(event_attachment) { event_attachment.signal(); }
							ist.event_queue.signal();
							delete this.bubble_timeouts[eventSignature];
						}, this), 0);
						//console.log("target listener", event);
					}, this);
					//target_listeners.push(listener);
					return listener;
				}, {
					context: this,
					hash: function(args) {
						var cobj = args[0];
						if(cobj instanceof ist.ContextualObject) {
							return cobj.hash();
						} else {
							return cobj + "";
						}
					},
					equals: function(args1, args2) {
						return args1[0]===args2[0];
					}
				});

				this._eventListener = _.bind(function(event) {
					var event_attachment = this.contextual_object.get_attachment_instance("event_attachment");
					if(event_attachment) {
						event_attachment.fire(event);
					}
				}, this);
				this._oldType = this._oldTarget = false;
			},
			destroy: function(silent) {
				if(this.eventType === "timeout") {
					if(this._timeout_id) {
						if(this._timeout_type === "frame") {
							cancelAnimationFrame(this._timeout_id);
						} else {
							clearTimeout(this._timeout_id);
						}
						this._timeout_id = false;
					}
				} else {
					if(this._oldType) {
						_.each(this._oldTarget, function(dom_obj) {
							//console.log("disable", this._oldType, dom_obj);
							//dom_obj.removeEventListener(this._oldType, this.get_wait_listener(this.contextual_object), true); // Capture
							dom_obj.removeEventListener(this._oldType, this.get_capture_listener(this.contextual_object), true); // Capture
							dom_obj.removeEventListener(this._oldType, this.get_bubble_listener(this.contextual_object), false); // Bubble
						}, this);
						this._oldType = this._oldTarget = false;
					}
				}
				this.get_capture_listener.destroy(true);
				//this.get_wait_listener.destroy(true);
				this.get_bubble_listener.destroy(true);

				//delete this.get_wait_listener;
				delete this.get_capture_listener;
				delete this.get_bubble_listener;
			},
			parameters: {
				type_and_target: function(contextual_object) {
					//console.log(this.eventType);
					if(this.eventType === "keyboard" || this.eventType === "mouse") {
						var type, targets;

						try {
							type = this.contextual_object.prop_val("type");
							targets = this.contextual_object.prop_val("target");
						} catch(e) {
							type = false;
							targets = [];
							//console.log(this.contextual_object);
							console.log(e);
						}

						var computed_targets = _.pluck(get_targets(targets), "dom_obj");

						if(this.eventType === "keyboard") {
							computed_targets = [window];
						}
						//console.log(type, computed_targets);

						//if(this.enabled) {
							if(this._oldType) {
								_.each(this._oldTarget, function(dom_obj) {
									//console.log("disable", this._oldType, dom_obj);
									//target.removeEventListener(this._oldType, this._eventListener);
									//dom_obj.removeEventListener(this._oldType, this.get_wait_listener(this.contextual_object), true); // Capture
									dom_obj.removeEventListener(this._oldType, this.get_capture_listener(this.contextual_object), true); // Capture
									dom_obj.removeEventListener(this._oldType, this.get_bubble_listener(this.contextual_object), false); // Bubble
								}, this);
							}

							//console.log(type, targets);

							if(type) {
								//console.log(computed_targets);
								_.each(computed_targets, function(dom_obj) {
									//console.log(dom_obj, this.contextual_object.sid());
									//console.log("enable", type, dom_obj);
									//dom_obj.addEventListener(type, this.get_wait_listener(this.contextual_object), true); // Capture
									dom_obj.addEventListener(type, this.get_capture_listener(this.contextual_object), true); // Capture
									dom_obj.addEventListener(type, this.get_bubble_listener(this.contextual_object), false); // Bubble
									//target.addEventListener(type, this._eventListener);
								}, this);
							}
						//}
						this._oldType = type;
						this._oldTarget = computed_targets;
					}
				},

				milliseconds: function(contextual_object) {
					if(this.eventType === "timeout") {
						var milliseconds = this.contextual_object.prop_val("milliseconds");

						this.milliseconds = milliseconds;
						//console.log(milliseconds);

						//if(this.enabled) {
							var current_time = (new Date()).getTime();

							if(this._timeout_id) {
								if(this._timeout_type === "frame") {
									cancelAnimationFrame(this._timeout_id);
								} else {
									clearTimeout(this._timeout_id);
								}

								if(this._timeout_set_at) {
									milliseconds -= (current_time - this._timeout_set_at);
								}

								if(milliseconds < 0) {
									milliseconds = 0;
								}
							}


							if(!milliseconds || milliseconds === 'frame') {
								this._timeout_id = requestAnimationFrame(this._eventListener);
								this._timeout_type = "frame";
							} else {
								this._timeout_set_at = current_time;
								this._timeout_id = setTimeout(this._eventListener, milliseconds);
								this._timeout_type = "delay";
							}
						}
					//}
				}
			},
			proto_props: {
				onTransitionEnabled: function() {
					//var contextual_object = this.get_contextual_object();
					//this.enabled = true;
					if(this.eventType === "timeout") {
						var milliseconds = this.milliseconds,
							current_time = (new Date()).getTime();

						if(this._timeout_id) {
							if(this._timeout_type === "frame") {
								cancelAnimationFrame(this._timeout_id);
							} else {
								clearTimeout(this._timeout_id);
							}
						}

						if(!milliseconds || milliseconds === 'frame') {
							this._timeout_id = requestAnimationFrame(this._eventListener);
							this._timeout_type = "frame";
						} else {
							this._timeout_set_at = current_time;
							this._timeout_id = setTimeout(this._eventListener, milliseconds);
							this._timeout_type = "delay";
						}
					} else {
					/*
						if(this._oldType) {
							_.each(this._oldTarget, function(dom_obj) {
								//console.log("enable", this._oldType, dom_obj);
								//target.addEventListener(this._oldType, this._eventListener);
								dom_obj.addEventListener(this._oldType, this.get_wait_listener(this.contextual_object), true); // Capture
								dom_obj.addEventListener(this._oldType, this.get_target_listener(this.contextual_object), true); // Capture
								dom_obj.addEventListener(this._oldType, this.get_signal_listener(this.contextual_object), false); // Bubble
							}, this);
						}
						*/
					}
				},
				onTransitionDisabled: function() {
					//var contextual_object = this.get_contextual_object();
					//this.enabled = false;
					if(this.eventType === "timeout") {
						if(this._timeout_id) {
							if(this._timeout_type === "frame") {
								cancelAnimationFrame(this._timeout_id);
							} else {
								clearTimeout(this._timeout_id);
							}
							this._timeout_id = false;
						}
					} else {
					/*
						if(this._oldType) {
							_.each(this._oldTarget, function(dom_obj) {
								//console.log("disable", this._oldType, dom_obj);
								//target.removeEventListener(this._oldType, this._eventListener);
								dom_obj.removeEventListener(this._oldType, this.get_wait_listener(this.contextual_object), true); // Capture
								dom_obj.removeEventListener(this._oldType, this.get_target_listener(this.contextual_object), true); // Capture
								dom_obj.removeEventListener(this._oldType, this.get_signal_listener(this.contextual_object), false); // Bubble
							}, this);
						}
						*/
					}
				},
				onTransitionFired: function(event) {
					if(this.eventType === "keyboard" || this.eventType === "mouse") {
						var preventDefault = this.contextual_object.prop_val("preventDefault");
						//var stopPropagation = this.contextual_object.prop_val("stopPropagation"),

						//if(stopPropagation) {
							//console.log("stopPropagation", this.contextual_object.sid());
							//debugger;
							//event.stopPropagation();
						//}

						//if(stopPropagation) { event.stopImmediatePropagation(); }
						//if(stopPropagation) { event.stopPropagation(); }
						if(preventDefault) { event.preventDefault(); }
					}
				},
				onTransitionNotFired: function(event) { },
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
