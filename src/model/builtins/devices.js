/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	function getTime() {
		return (new Date()).getTime();
	}

	// mouse
	ist.createMouseObject = function() {

		// Device events must also work in saved programs predating the event builtins.
		var mouse_event = new ist.StatefulObj({direct_attachments: [new ist.FireableAttachment()]});
		mouse_event.set("fire", new ist.Cell({str: "interstate.fire.bind(this)"}));
		mouse_event .set("target", new ist.Cell({str: "arguments[0]"}))
					.set("type", new ist.Cell({str: "arguments[1]"}))
					.set("arguments", new ist.Cell({str: "[window, 'click']"}))
					.add_state("idle")
					.starts_at("idle")
					.add_transition("idle", "idle", "on(type, target);this.fire()");

		var clientX = cjs(0),
			clientY = cjs(0),
			pageX = cjs(0),
			pageY = cjs(0),
			screenX = cjs(0),
			screenY = cjs(0),
			force = cjs(false),
			move_listener = function(event) {
				cjs.wait();
				clientX.set(event.clientX);
				clientY.set(event.clientY);
				pageX.set(event.pageX);
				pageY.set(event.pageY);
				screenX.set(event.screenX);
				screenY.set(event.screenY);
				cjs.signal();
			},
			force_change_listener = function(event) {
				cjs.wait();
				force.set(event.webkitForce);
				cjs.signal();
			},
			prepare_force_click = function(event) {
				if (event.cancelable !== false) { event.preventDefault(); }
			},
			enter_force_click = function(event) { },
			end_force_click = function(event) { },
			addMouseListeners = function() {
				window.addEventListener("mousemove", move_listener);
				window.addEventListener("webkitmouseforcechanged", force_change_listener);
				window.addEventListener("webkitmouseforcewillbegin", prepare_force_click, false);
				window.addEventListener("webkitmouseforcedown", enter_force_click, false);
				window.addEventListener("webkitmouseforceup", end_force_click, false);
				window.addEventListener("webkitmouseforcechanged", force_change_listener, false);
			},
			removeMouseListeners = function() {
				window.removeEventListener("mousemove", move_listener);
			},
			destroy = function(silent) {
				cjs.wait();

				removeMouseListeners();
				clientX.destroy(silent);
				clientY.destroy(silent);
				pageX.destroy(silent);
				pageY.destroy(silent);
				screenX.destroy(silent);
				screenY.destroy(silent);
				force.destroy(silent);

				cjs.signal();
			},
			device_mouse = new ist.Dict({has_protos: false, value: {
					x: pageX,
					y: pageY,
					clientX: clientX,
					clientY: clientY,
					pageX: pageX,
					pageY: pageY,
					screenX: screenX,
					screenY: screenY,
					force: force,
					mouseEvent: mouse_event,
					click: new ist.Cell({str: "mouseEvent(window, type='click')"}),
					down: new ist.Cell({str: "mouseEvent(window,type='mousedown')"}),
					up: new ist.Cell({str: "mouseEvent(window,type='mouseup')"}),
					move: new ist.Cell({str: "mouseEvent(window,type='mousemove')"}),
					over: new ist.Cell({str: "mouseEvent(window,type='mouseover')"}),
					out: new ist.Cell({str: "mouseEvent(window,type='mouseout')"})
				}
			});
		device_mouse.destroy = function() {
			ist.Dict.prototype.destroy.apply(this, arguments);
			destroy();
		};
		device_mouse.__is_mouse_device__ = true;
		addMouseListeners();
		return device_mouse;
	};
	ist.register_serializable_type("ist_device_mouse",
		function (x) {
			return x.__is_mouse_device__;
		},
		function () {
			return {};
		},
		function (obj) {
			return ist.createMouseObject();
		});

	// keyboard
	ist.createKeyboardObject = function() {
		var key_codes = {
				shift: 16,
				ctrl: 17,
				alt: 18,
				cmd_left: 91,
				cmd_right: 93
			},
			interesting_keycodes = {},
			keyboard_info = {};

		_.each(key_codes, function(code, name) {
			keyboard_info[name] = cjs(false);
			interesting_keycodes[code] = name;
		});

		var keydown_listener = function(event) {
				var keyCode = event.keyCode,
					name = interesting_keycodes[keyCode];
				if(name) {
					keyboard_info[name].set(true);
					if (event.cancelable !== false) { event.preventDefault(); }
				}
			},
			keyup_listener = function(event) {
				var keyCode = event.keyCode,
					name = interesting_keycodes[keyCode];

				if(interesting_keycodes[keyCode]) {
					keyboard_info[name].set(false);
					if (event.cancelable !== false) { event.preventDefault(); }
				}
			},
			addKeyboardListeners = function() {
				window.addEventListener("keydown", keydown_listener);
				window.addEventListener("keyup", keyup_listener);
			},
			removeKeyboardListeners = function() {
				window.removeEventListener("keydown", keydown_listener);
				window.removeEventListener("keyup", keyup_listener);
			},
			destroy = function(silent) {
				cjs.wait();

				removeKeyboardListeners();

				shift.destroy(silent);
				ctrl.destroy(silent);
				alt.destroy(silent);
				cmd_left.destroy(silent);
				cmd_right.destroy(silent);
				cmd.destroy(silent);

				cjs.signal();
			},
			shift = keyboard_info.shift,
			ctrl = keyboard_info.ctrl,
			alt = keyboard_info.alt,
			cmd_left = keyboard_info.cmd_left,
			cmd_right = keyboard_info.cmd_right,
			cmd = cmd_left.or(cmd_right),
			device_keyboard = new ist.Dict({has_protos: false, value: {
					shift: shift,
					ctrl: ctrl,
					alt: alt,
					cmd_left: cmd_left,
					cmd_right: cmd_right,
					cmd: cmd
				}
			});
		device_keyboard.destroy = function() {
			ist.Dict.prototype.destroy.apply(this, arguments);
			destroy();
		};
		device_keyboard.__is_keyboard_device__ = true;
		addKeyboardListeners();
		return device_keyboard;
	};
	ist.register_serializable_type("ist_device_keyboard",
		function (x) {
			return x.__is_keyboard_device__;
		},
		function () {
			return {};
		},
		function (obj) {
			return ist.createKeyboardObject();
		});

	// touches
	ist.createTouchscreenObject = function() {
		var touch_props = ["identifier",
							"screenX", "screenY",
							"clientX", "clientY",
							"pageX", "pageY",
							"radiusX", "radiusY",
							"rotationAngle"],
			alias_props = {
				x: "pageX",
				y: "pageY"
			},
			touch_ids = cjs([]);

		var touches = cjs({}),
			touch_start_listener = function(event) {
				cjs.wait();

				_.each(event.changedTouches, function(ct) {
					var identifier = ct.identifier,
						touch, touch_start_obj;

					if(touches.has(identifier)) {
						touch = touches.get(identifier);

						_.each(touch_props, function(prop_name) {
							var val = ct[prop_name];

							touch.put(prop_name, val);
						});
					} else {
						touch_start_obj = {};
						touch = cjs({});
						touches.put(identifier, touch);

						_.each(touch_props, function(prop_name) {
							var val = ct[prop_name];
							touch.put(prop_name, val);
							touch_start_obj[prop_name] = val;
						});
						_.each(alias_props, function(real_prop_name, alias_prop_name) {
							var val = ct[real_prop_name];
							touch.put(alias_prop_name, val);
							touch_start_obj[alias_prop_name] = val;
						});
						touch	.put('start', touch_start_obj)
								.put('end', false)
								.put('startTime', getTime())
								.put('endTime', false)
								.put('duration', false);

					}
					if(touch_ids.indexOf(identifier) < 0) {
						touch_ids.push(identifier);
					}
				});

				if (event.cancelable !== false) { event.preventDefault(); }
				cjs.signal();
			},
			touch_move_listener = function(event) {
				cjs.wait();

				_.each(event.changedTouches, function(ct) {
					var identifier = ct.identifier;

					if(touches.has(identifier)) {
						var touch = touches.get(identifier);

						_.each(touch_props, function(prop_name) {
							var val = ct[prop_name];
							touch.put(prop_name, val);
						});
						_.each(alias_props, function(real_prop_name, alias_prop_name) {
							var val = ct[real_prop_name];
							touch.put(alias_prop_name, val);
						});
					} else {
						console.error("Could not find changed touch");
					}
				});

				if (event.cancelable !== false) { event.preventDefault(); }
				cjs.signal();
			},
			touch_end_listener = function(event) {
				cjs.wait();

				_.each(event.changedTouches, function(ct) {
					var identifier = ct.identifier;

					if(touches.has(identifier)) {
						var index = touch_ids.indexOf(identifier),
							touch = touches.get(identifier),
							touch_end_obj = {};

						if(index >= 0) {
							_.each(touch_props, function(prop_name) {
								var val = ct[prop_name];

								touch_end_obj[prop_name] = val;
							});
							_.each(alias_props, function(real_prop_name, alias_prop_name) {
								var val = ct[real_prop_name];
								touch_end_obj[alias_prop_name] = val;
							});

							touch_ids.splice(index, 1);

							touch	.put('end', touch_end_obj)
									.put('endTime', getTime())
									.put('duration', touch.get('endTime')-touch.get('startTime'));
						} else {
							console.error("Could not find touch");
						}
					} else {
						console.error("Could not find ended touch");
					}
				});

				if (event.cancelable !== false) { event.preventDefault(); }
				cjs.signal();
			},
			addTouchListeners = function() {
				window.addEventListener("touchstart", touch_start_listener, {passive: false});
				window.addEventListener("touchmove", touch_move_listener, {passive: false});
				window.addEventListener("touchend", touch_end_listener, {passive: false});
				window.addEventListener("touchcancel", touch_end_listener, {passive: false});
			},
			removeTouchListeners = function() {
				window.removeEventListener("touchstart", touch_start_listener);
				window.removeEventListener("touchmove", touch_move_listener);
				window.removeEventListener("touchend", touch_end_listener);
				window.removeEventListener("touchcancel", touch_end_listener);
			},
			destroy = function(silent) {
				cjs.wait();

				removeTouchListeners();
				touch_count.destroy(silent);

				cjs.signal();
			},
			touch_count = cjs(function() {
				return touch_ids.length();
			}),
			getTouch = function(touch_number) {
				var touch_identifier = touch_ids.item(touch_number);
				if(_.isNumber(touch_identifier)) {
					return getTouchByID(touch_identifier);
				} else {
					return false;
				}
			},
			getTouchByID = function(touch_id) {
				var touch = touches.get(touch_id);
				if(touch) {
					return touch;
				} else {
					return false;
				}
			},
			touchCluster = new ist.Dict({has_protos: false, direct_attachments: [new ist.TouchClusterAttachment({
																						})]
																					})
																					/*
				.add_state("inactive")
				.add_state("active")
				.starts_at("inactive")
				.add_transition("inactive", "active", "this.isSatisfied;emit('start', this)")
				.add_transition("active", "inactive", "!this.isSatisfied;emit('end', this)")
*/
				.set("touchCluster_call", new ist.Cell({str: "function(p, prop_name) {" +
					"var tc_attachment = interstate.get_attachment(p, 'touch_cluster');" +
					"var tc = tc_attachment.touchCluster;" +
					"return tc[prop_name]();" +
				"}"}))
				.set("touchCluster_fn", new ist.Cell({str: "function(p, prop_name) {" +
					"var tc_attachment = interstate.get_attachment(p, 'touch_cluster');" +
					"var tc = tc_attachment.touchCluster;" +
					"return tc[prop_name].bind(tc);" +
				"}"}))

				.set("satisfied", new ist.Dict({has_protos: false, direct_attachments: [new ist.FireableAttachment()],
					value: {fire: new ist.Cell({str: "interstate.fire.bind(this)"})}}))
				.set("dissatisfied", new ist.Dict({has_protos: false, direct_attachments: [new ist.FireableAttachment()],
					value: {fire: new ist.Cell({str: "interstate.fire.bind(this)"})}}))
				.set("isSatisfied", new ist.Cell({str: "touchCluster_call(this, 'isSatisfied')"}))
				.set("x", new ist.Cell({str: "touchCluster_call(this, 'getX')"}))
				.set("y", new ist.Cell({str: "touchCluster_call(this, 'getY')"}))
				.set("startX", new ist.Cell({str: "touchCluster_call(this, 'getStartX')"}))
				.set("startY", new ist.Cell({str: "touchCluster_call(this, 'getStartY')"}))
				.set("endX", new ist.Cell({str: "touchCluster_call(this, 'getEndX')"}))
				.set("endY", new ist.Cell({str: "touchCluster_call(this, 'getEndY')"}))
				.set("radius", new ist.Cell({str: "touchCluster_call(this, 'getRadius')"}))
				.set("startRadius", new ist.Cell({str: "touchCluster_call(this, 'getStartRadius')"}))
				.set("endRadius", new ist.Cell({str: "touchCluster_call(this, 'getEndRadius')"}))
				.set("rotation", new ist.Cell({str: "touchCluster_call(this, 'getRotation')"}))
				.set("scale", new ist.Cell({str: "touchCluster_call(this, 'getScale')"}))

				.set("usingFingers", new ist.Cell({str: "touchCluster_call(this, 'getUsingFingers')"}))

				.set("claimTouches", new ist.Cell({str: "touchCluster_fn(this, 'claimTouches')"}))
				.set("disclaimTouches", new ist.Cell({str: "touchCluster_fn(this, 'disclaimTouches')"}))
				.set("downInside", new ist.Cell({str: "false"}))
				.set("downOutside", new ist.Cell({str: "false"}))
				.set("numFingers", new ist.Cell({str: "1"}))
				.set("maxRadius", new ist.Cell({str: "false"}))
				.set("maxTouchInterval", new ist.Cell({str: "500"}))
				.set("debugDraw", new ist.Cell({str: "false"})),
			device_touchscreen = new ist.Dict({has_protos: false, value: {
					finger_count: touch_count,
					getTouch: getTouch,
					getTouchByID: getTouchByID,
					touchCluster: touchCluster
				}
			});

		device_touchscreen.destroy = function() {
			ist.Dict.prototype.destroy.apply(this, arguments);
			destroy();
		};

		device_touchscreen.__is_touchscreen_device__ = true;
		addTouchListeners();
		return device_touchscreen;
	};
	ist.register_serializable_type("ist_device_touchscreen",
		function (x) {
			return x.__is_touchscreen_device__;
		},
		function () {
			return {};
		},
		function (obj) {
			return ist.createTouchscreenObject();
		});

	// Subscribe only when a program reads a sensor value. Ordinary mouse/touch
	// programs should not activate motion sensors merely by loading a device.
	function createSensorObject(type, names, read, marker) {
		var samples = {}, values = {}, listening = false;
		var listener = function(event) {
			var next = read(event);
			if (!next) { return; }
			cjs.wait();
			_.each(names, function(name) {
				samples[name] = next[name] == null ? 0 : next[name];
				values[name].invalidate();
			});
			cjs.signal();
		};
		_.each(names, function(name) {
			samples[name] = 0;
			values[name] = cjs(function() {
				if (!listening) {
					window.addEventListener(type, listener);
					listening = true;
				}
				return samples[name];
			});
		});
		var device = new ist.Dict({has_protos: false, value: values});
		device[marker] = true;
		device.destroy = function(silent) {
			if (listening) { window.removeEventListener(type, listener); }
			ist.Dict.prototype.destroy.apply(this, arguments);
			_.each(values, function(value) { value.destroy(silent); });
		};
		return device;
	}
	ist.createAccelorometerObject = function() {
		return createSensorObject("devicemotion", ["x", "y", "z"], function(event) {
			return event.accelerationIncludingGravity;
		}, "__is_accelorometer_device__");
	};
	ist.createGyroscopeObject = function() {
		return createSensorObject("deviceorientation", ["alpha", "beta", "gamma", "heading", "accuracy"], function(event) {
			return event;
		}, "__is_gyroscope_device__");
	};
	ist.register_serializable_type("ist_device_accelorometer",
		function(x) { return x.__is_accelorometer_device__; },
		function() { return {}; },
		function() { return ist.createAccelorometerObject(); });
	ist.register_serializable_type("ist_device_gyroscope",
		function(x) { return x.__is_gyroscope_device__; },
		function() { return {}; },
		function() { return ist.createGyroscopeObject(); });

	ist.createDevices = function() {
		var width = cjs(window.innerWidth),
			height = cjs(window.innerHeight),
			timestamp = cjs(getTime()),
			intervalID = false,
			orientation = cjs(window.orientation),
			resize_listener = function(event) {
				cjs.wait();
				width.set(window.innerWidth);
				height.set(window.innerHeight);
				cjs.signal();
			},
			orientation_listener = function(event) {
				orientation.set(window.orientation);
			},
			interval_listener = function() {
				timestamp.set(getTime());
			},
			addListeners = function() {
				window.addEventListener("resize", resize_listener);
				window.addEventListener("orientationchange", orientation_listener);
				intervalID = window.setInterval(interval_listener);
			},
			removeListeners = function() {
				window.removeEventListener("resize", resize_listener);
				window.removeEventListener("orientationchange", orientation_listener);
				window.clearInterval(intervalID);
			},
			destroy = function(silent) {
				cjs.wait();
				removeListeners();
				width.destroy(silent);
				height.destroy(silent);
				timestamp.destroy(silent);
				cjs.signal();
			},
			mouse = ist.createMouseObject(),
			keyboard = ist.createKeyboardObject(),
			touchscreen = ist.createTouchscreenObject(),
			accelorometer = ist.createAccelorometerObject(),
			gyroscope = ist.createGyroscopeObject(),
			device = new ist.Dict({has_protos: false, value: {
					mouse: mouse,
					keyboard: keyboard,
					touchscreen: touchscreen,
					accelorometer: accelorometer,
					gyroscope: gyroscope,
					width: width,
					height: height,
					timestamp: timestamp
				}
			});

		device.destroy = function(silent) {
			ist.Dict.prototype.destroy.apply(this, arguments);
			destroy();
		};

		device.__is_device__ = true;
		addListeners();
		return device;
	};
	ist.register_serializable_type("ist_device",
		function (x) {
			return x.__is_device__;
		},
		function () {
			return {};
		},
		function (obj) {
			return ist.createDevices();
		});

}(interstate));
