(function(root) {
	root.replayTouches = function(fname) {
		loadFile(fname, function(err, touch_log_str) {
			var touch_log = JSON.parse(touch_log_str),
				len = touch_log.length;
			if(len > 0) {
				var first_touch = touch_log[0],
					starting_time = first_touch.timestamp,
					touches = {},
					touch_targets = {},
					touch_paths = {};

				touch_log.forEach(function(e, touch_index) {
					var type = e.type;

					if(type === "touchstart") {
						e.changedTouches.forEach(function(touch) {
							var i = touch_index + 1,
								j,
								type = e.type,
								event, ct_len, touchj,
								idi = touch.identifier,
								path = [{
									type: type,
									touch: touch
								}];

							while(i<len) {
								event = touch_log[i];
								type = event.type;

								if(type === "touchend" || type === "touchcancel") {
									for(j = 0, ct_len = event.changedTouches.length; j<ct_len; j++) {
										touchj = event.changedTouches[j];
										if(touchj.identifier === idi) {
											path.push({
												type: type,
												touch: touchj
											});
											break;
										}
									}
								} else if(type === "touchmove") {
									for(j = 0, ct_len = event.changedTouches.length; j<ct_len; j++) {
										touchj = event.changedTouches[j];
										if(touchj.identifier === idi) {
											path.push({
												type: type,
												touch: touchj
											});
											break;
										}
									}
								}

								i++;
							}
							touch_paths[touch_index] = path;
						});
					}
				});

				touch_log.forEach(function(e, touch_index) {
					setTimeout(function() {
						var touch_event,
							changedTouches = e.changedTouches,
							firstChangedTouch = changedTouches[0],
							type = e.type,
							target = root;

						if(type === "touchstart") {
							changedTouches.forEach(function(touch) {
								target = document.elementFromPoint(touch.pageX, touch.pageY) || root;
								var new_touch = document.createTouch ? document.createTouch(root, target, touch.identifier, touch.pageX, touch.pageY,
																	  touch.screenX, touch.screenY, touch.clientX, touch.clientY)
																	  : touch;
								touches[touch.identifier] = new_touch;
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

						//try {
							//touch_event = document.createEvent('TouchEvent');
							//touch_event.initTouchEvent(changed_touch_list, target_touch_list, touch_list, e.type, root);
							//touch_event.initTouchEvent(type, true, false, root, 1, {}, firstChangedTouch.screenX, firstChangedTouch.screenY, firstChangedTouch.clientX, firstChangedTouch.clientY, false, false, false, false, touch_list, target_touch_list, changed_touch_list);
							//console.log(touch_event.changedTouches);
							//debugger;
						//} catch(e) {
							touch_event = new CustomEvent(type, {
								bubbles: true,
								cancelable: false,
								detail: {
									touches: touch_list,
									changedTouches: changed_touch_list,
									targetTouches: touch_list,
									touchPath: type === "touchstart" ? touch_paths[touch_index] : false
								}
							});
							touch_event.touches = touch_event.detail.touches;
							touch_event.targetTouches = touch_event.detail.targetTouches;
							touch_event.changedTouches = touch_event.detail.changedTouches;
							touch_event.touchPath = touch_event.detail.touchPath;
						//}

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
		};

		xmlhttp.open("GET", fname, true);
		xmlhttp.send();
	}
}(window));
