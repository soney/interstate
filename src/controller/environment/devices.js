/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	// mouse
	
	// keyboard
	
	// touches
	ist.createTouchListeners = function() {
		var touch_props = ["identifier",
							"screenX", "screenY",
							"clientX", "clientY",
							"pageX", "pageY",
							"radiusX", "radiusY",
							"rotationAngle"],
			touch_infos = {};

		_.each(touch_props, function(prop_name) {
			touch_infos[prop_name] = cjs([]);
		});

		var touch_starts = {},
			touch_ends = {},
			touches = {},
			touch_start_listener = function(event) {
				cjs.wait();

				_.each(event.changedTouches, function(ct) {
					var identifier = ct.identifier,
						touch, touch_start_obj;

					if(touches.hasOwnProperty(identifier)) {
						var index = touch_infos.identifier.indexOf(identifier);

						touch = touches[identifier];

						if(index >= 0) {
							_.each(touch_props, function(prop_name) {
								var arr_constraint = touch_infos[prop_name],
									val = ct[prop_name];

								touch[prop_name].set(val);
								arr_constraint.set(i, val);
							});
						} else {
							console.error("Could not find touch");
						}
					} else {
						touch_start_obj = {};
						touch = {};

						_.each(touch_props, function(prop_name) {
							var arr_constraint = touch_infos[prop_name],
								val = ct[prop_name];

							arr_constraint.push(val);

							touch[prop_name] = cjs(val);
							touch_start_obj[prop_name] = val;
						});

						touches[identifier] = touch;
						touch_starts[identifier] = touch_start_obj;
						touch_ends[identifier] = false;
					}
				});

				event.preventDefault();
				cjs.signal();
			},
			touch_move_listener = function(event) {
				cjs.wait();

				_.each(event.changedTouches, function(ct) {
					var identifier = ct.identifier,
						touch_start_obj = {};

					if(touches.hasOwnProperty(identifier)) {
						var index = touch_infos.identifier.indexOf(identifier),
							touch = touches[identifier];

						if(index >= 0) {
							_.each(touch_props, function(prop_name) {
								var arr_constraint = touch_infos[prop_name],
									val = ct[prop_name];

								arr_constraint.set(i, val);
								touch[prop_name].set(val);
							});
						}
					} else {
						console.error("Could not find changed touch");
					}
				});

				event.preventDefault();
				cjs.signal();
			},
			touchend_listener = function(event) {
				cjs.wait();

				_.each(event.changedTouches, function(ct) {
					var identifier = ct.identifier;

					if(touch_starts.hasOwnProperty(identifier)) {
						var index = touch_infos.identifier.indexOf(identifier);
						if(index >= 0) {
							_.each(touch_props, function(prop_name) {
								var arr_constraint = touch_infos[prop_name],
									val = ct[prop_name];

								arr_constraint.set(i, val);
							});
						}
					} else {
						console.error("Could not find ended touch");
					}
				});

				event.preventDefault();
				cjs.signal();
			},
			addTouchListeners = function() {
				window.addEventListener("touchstart", touchstart_listener);
				window.addEventListener("touchmove", touchmove_listener);
				window.addEventListener("touchend", touchend_listener);
			},
			removeTouchListeners = function() {
				window.removeEventListener("touchstart", touchstart_listener);
				window.removeEventListener("touchmove", touchmove_listener);
				window.removeEventListener("touchend", touchend_listener);
			},
			destroy = function(silent) {
				cjs.wait();

				removeTouchListeners();
				touch_count.destroy(silent);
				touch_points.destroy(silent);
				touch_starts.destroy(silent);

				cjs.signal();
			};
	};
	// accelorometer
	ist.createAccelorometerListeners = function() {
		var accel_infos = cjs({
				x: 0,
				y: 0,
				z: 0
			}),
			motion_listener = function(event) {
				cjs.wait();
				accel_infos.put('x', event.accelerationIncludingGravity.x);
				accel_infos.put('y', event.accelerationIncludingGravity.y);
				accel_infos.put('z', event.accelerationIncludingGravity.z);
				cjs.signal();
			},
			addAccelorometerListeners = function() {
				window.addEventListener("devicemotion", motion_listener);
			},
			removeAccelorometerListeners = function() {
				window.removeEventListener("devicemotion", motion_listener);
			},
			destroy = function(silent) {
				removeAccelorometerListeners();
			};
	};
	// gyroscope
	ist.createGyroscopeListeners = function() {
		var accel_infos = cjs({
				alpha: 0,
				beta:  0,
				gamma: 0,
				heading: 0,
				accuracy: 0
			}),
			motion_listener = function(event) {
				cjs.wait();
				accel_infos.put('alpha', event.alpha);
				accel_infos.put('beta', event.beta);
				accel_infos.put('gamma', event.gamma);
				accel_infos.put('heading', event.heading);
				accel_infos.put('accuracy', event.accuracy);
				cjs.signal();
			},
			addAccelorometerListeners = function() {
				window.addEventListener("deviceorientation", motion_listener);
			},
			removeAccelorometerListeners = function() {
				window.removeEventListener("deviceorientation", motion_listener);
			},
			destroy = function(silent) {
				removeAccelorometerListeners();
			};
	};
	
}(interstate));
