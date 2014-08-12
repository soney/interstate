(function(root) {
	root.replayTouches = function(fname) {
		loadFile(fname, function(err, touch_log_str) {
			var touch_log = JSON.parse(touch_log_str);
			if(touch_log.length > 0) {
				var first_touch = touch_log[0],
					starting_time = first_touch.timestamp,
					touches = {},
					touch_targets = {};

				touch_log.forEach(function(e) {
					setTimeout(function() {
						var touch_event,
							changedTouches = e.changedTouches,
							firstChangedTouch = changedTouches[0],
							type = e.type,
							target = root;

						if(type === "touchstart") {
							changedTouches.forEach(function(touch) {
								target = document.elementFromPoint(touch.pageX, touch.pageY) || root;
								var touch = document.createTouch ? document.createTouch(root, target, touch.identifier, touch.pageX, touch.pageY,
																	  touch.screenX, touch.screenY, touch.clientX, touch.clientY)
																	  : touch;
								touches[touch.identifier] = touch;
								touch_targets[touch.identifier] = target;
							});
						} else {
							changedTouches.forEach(function(touch) {
								target = document.elementFromPoint(touch.pageX, touch.pageY) || root;
								var old_touch = touches[touch.identifier];
								old_touch.pageX = touch.pageX;
								old_touch.pageY = touch.pageY;
								old_touch.clientX = touch.clientX;
								old_touch.clientY = touch.clientY;
								old_touch.screenX = touch.screenX;
								old_touch.screenY = touch.screenY;
								touch_targets[touch.identifier] = target;
							});
						}

						var i = 0,
							tl = [],
							ctl = [],
							ttl = [],
							key, len, targ;
						for(key in touches) {
							if(touches.hasOwnProperty(key)) {
								tl[i++] = touches[key];
								targ = touch_targets[key];

								if(targ === target) {
									ttl.push(touches[key]);
								}
							}
						}
						for(i = 0, len = changedTouches.length; i<len; i++) {
							ctl[i] = touches[changedTouches[i].identifier];
						}
						
						var touch_list, changed_touch_list, target_touch_list;

						if(document.createTouchList) {
							touch_list = document.createTouchList.apply(document, tl);
							changed_touch_list = document.createTouchList.apply(document, ctl);
							target_touch_list = document.createTouchList.apply(document, ttl);
						} else {
							touch_list = tl;
							changed_touch_list = ctl;
							target_touch_list = ttl;
						}

						if(type === "touchend" || type === "touchcancel") {
							changedTouches.forEach(function(touch) {
								delete touches[touch.identifier];
								delete touch_targets[touch.identifier];
							});
						}

						try {
							touch_event = document.createEvent('TouchEvent');
							touch_event.initTouchEvent(changed_touch_list, target_touch_list, touch_list, e.type, root);
						} catch(e) {
							touch_event = new CustomEvent(type, {
								bubbles: true,
								cancelable: false,
								detail: {
									touches: touch_list,
									changedTouches: changed_touch_list,
									targetTouches: touch_list
								}
							});
							touch_event.touches = touch_event.detail.touches;
							touch_event.targetTouches = touch_event.detail.targetTouches;
							touch_event.changedTouches = touch_event.detail.changedTouches;
						}

						target.dispatchEvent(touch_event);

					}, e.timestamp - starting_time);
				});
			}
		});
	};


	function loadFile(fname, callback) {
		var xmlhttp;

		if (root.XMLHttpRequest) {
			// code for IE7+, Firefox, Chrome, Opera, Safari
			xmlhttp = new XMLHttpRequest();
		} else {
			// code for IE6, IE5
			xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
		}

		xmlhttp.onreadystatechange = function() {
			if (xmlhttp.readyState === 4 ) {
				if(xmlhttp.status === 200) {
					callback(false, xmlhttp.responseText);
				} else {
					callback(xmlhttp.status);
				}
			}
		}

		xmlhttp.open("GET", fname, true);
		xmlhttp.send();
	}
}(window));
