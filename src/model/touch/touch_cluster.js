/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	/*
	 * downInside
	 * downOutside
	 *
	 * numFingers
	 *
	 * maxRadius
	 */
	var average = function(arr) {
			var sum = 0;
			_.each(arr, function(x) { sum += x; });
			return sum / arr.length;
		}, distanceSquared = function(x1, y1, x2, y2) {
			return Math.pow(x1-x2, 2) + Math.pow(y1-y2, 2);
		}, getTime = function() {
			return (new Date()).getTime();
		};
	var touches = cjs({}),
		touchClusters = [];

	function computeTouchDistances() {
		var touchObject = touches.toObject(),
			touchValues = {},
			matrix = {},
			identifiers = touches.keys(),
			len = identifiers.length,
			i, j, touchi, touchj, identifieri, identifierj;

		_.each(touchObject, function(touchMap, identifier) {
			touchValues[identifier] = touchMap.toObject();
			matrix[identifier] = {};
			matrix[identifier][identifier] = 0;
		});

		for(i = 0; i < len-1; i++) {
			identifieri = identifiers[i];
			touchi = touchValues[identifieri];
			if(touchi.pressed) {
				for(j = i+1; j<len; j++) {
					identifierj = identifiers[j];
					touchj = touchValues[identifierj];

					var distance = Math.sqrt(Math.pow(touchi.x - touchj.x, 2) + Math.pow(touchi.y - touchj.y, 2));

					matrix[identifieri][identifierj] = matrix[identifierj][identifieri] = distance;
				}
			}
		}

		return matrix;
	}

	function _onTouchStart(event) {
		var unsatisfiedTouchClusters = _.filter(touchClusters, function(touchCluster) {
				return !touchCluster.isSatisfied();
			}),
			currTime = getTime();

		cjs.wait();

		_.each(touchClusters, function(touchCluster) {
			touchCluster.pruneTimedOutUsableFingers();
			touchCluster.pruneClaimedFingers();

			var downInside = touchCluster.options.downInside,
				downOutside = touchCluster.options.downOutside;

			if(downInside) {
				if(!_.isArray(downInside)) {
					downInside = [downInside];
				}
			}
			if(downOutside) {
				if(!_.isArray(downOutside)) {
					downOutside = [downOutside];
				}
			}
				
			_.each(event.changedTouches, function(touch) {
				var downInsideOK = true,
					downOutsideOK = true;

				if(downInside) {
					downInsideOK = _.every(downInside, function(path) { 
						var pathString = path.toString();
						if(Snap.path.isPointInside(pathString, touch.pageX, touch.pageY)) {
							return true;
						} else {
							return false;
						}
					});
				}

				if(downOutside) {
					downOutsideOK = _.every(downOutside, function(path) { 
						var pathString = path.toString();
						if(!Snap.path.isPointInside(pathString, touch.pageX, touch.pageY)) {
							return true;
						} else {
							return false;
						}
					});
				}

				if(downInsideOK && downOutsideOK) {
					touchCluster.addUsableFinger(touch);
				}
			});
		});

		_.each(event.changedTouches, function(touch) {
			touches.put(parseInt(touch.identifier), cjs({
				x: touch.pageX,
				y: touch.pageY,
				id: touch.identifier,
				startX: touch.clientX,
				startY: touch.clientY,
				downAt: currTime,
				movedAt: currTime,
				pressed: true,
				claimedBy: [],
				usedBy: []
			}));
		});

		updateTouchDistributions(event.changedTouches);

		cjs.signal();

		// Recompute active touches
		event.preventDefault();
		event.stopPropagation();
	};

	function _onTouchMove(event) {
		var currTime = getTime();
		cjs.wait();

		_.each(event.changedTouches, function(touch) {
			var touchMap = touches.get(parseInt(touch.identifier));
			touchMap.put('x', touch.clientX)
					.put('y', touch.clientY)
					.put('movedAt', currTime);
		}, this);

		cjs.signal();

		// radius checking
	
		event.preventDefault();
		event.stopPropagation();
	};

	function _onTouchEnd(event) {
		var currTime = getTime();
		cjs.wait();

		_.each(touchClusters, function(touchCluster) { touchCluster.removeUsableFingers(event.changedTouches); });

		var satisfiedTouchClusters = _.filter(touchClusters, function(touchCluster) {
				return touchCluster.isSatisfied();
			}),
			newlyUnsatisfiedTouchClusters = _.filter(satisfiedTouchClusters, function(touchCluster) {
				return touchCluster.usesAnyTouch(event.changedTouches);
			});


		_.each(newlyUnsatisfiedTouchClusters, function(touchCluster) {
			touchCluster.preUnsatisfied();
		});


		var removedUsingFinger = false;
		_.each(event.changedTouches, function(touch) {
			var touchMap = touches.get(parseInt(touch.identifier));
			touchMap.put('x', touch.clientX)
					.put('y', touch.clientY)
					.put('movedAt', currTime)
					.put('pressed', false);
		});

		updateTouchDistributions(false, event.changedTouches);

		cjs.signal();

		// Recompute active touches
		event.preventDefault();
		event.stopPropagation();
	};

	window.addEventListener("touchstart",  _onTouchStart);
	window.addEventListener("touchmove",   _onTouchMove);
	window.addEventListener("touchend",    _onTouchEnd);
	window.addEventListener("touchcancel", _onTouchEnd);

	function updateTouchDistributions(addedTouches, removedTouches, movedTouches) {
		var distanceMatrix = computeTouchDistances();

		_.each(touchClusters, function(touchCluster) {
			var satisfied = touchCluster.isSatisfied(),
				usableFingers = touchCluster.getUsableFingers(),
				usingFingers = touchCluster.getUsingFingers(),
				usableFingersLength = usableFingers.length,
				usingFingersLength = usingFingers.length,
				numFingers = touchCluster.options.numFingers;

			if(satisfied && removedTouches) { // see if should still be satified
				if(usableFingers.length < numFingers) {
					touchCluster.postUnsatisfied();
				} else {
					var usingFingers = touchCluster.getUsingFingers(),
						usableFingers = touchCluster.getUsableFingers(),
						usingFingersLength = usingFingers.length,
						i;

					for(i = 0; i<usingFingersLength; i++) {
						if(usableFingers.indexOf(usingFingers[i]) < 0) {
							touchCluster.postUnsatisfied();
							break;
						}
					}
				}
			} else if(!satisfied && addedTouches) { // check if now satisfied
				if(usableFingers.length >= numFingers) {
					if(numFingers > 1) {
						var closestTouchArr = _.keys(closestTouchObject),
							radiusOK = false;
						if(usableFingers.length === numFingers) {
							closestTouchArr = usableFingers;
						} else {
							var usableFingersDistances = {},
								identifieri, identifierj,
								i, j, k, smallestDistances = [], largestSmallDistance = false;

							for(i = 0; i<usableFingersLength; i++) {
								identifieri = usableFingers[i];
								for(j = i+1; j<usableFingersLength; j++) {
									identifierj = usableFingers[j];
									var distance = distanceMatrix[identifieri, identifierj];
									if(smallestDistances.length < numFingers || distance < largestSmallDistance) {
										var inserted = false,
											distance_info = {
												identifiers: [identifieri, identifierj],
												distance: distance
											};

										for(k = 0; k < smallestDistances.length; k++) {
											if(distance < smallestDistances[k].distance) {
												smallestDistances.splice(k, 0, distance_info);
												inserted = true;

												break;
											}
										}

										if(!inserted) {
											smallestDistances.push(distance_info);
											largestSmallDistance = distance;
										}

										if(smallestDistances.length > numFingers) {
											smallestDistances.splice(numFingers, numFingers-smallestDistances.length);
										}

										largestSmallDistance = _.last(smallestDistances).distance;
									}
								}
							}

							var closestTouchObject = {};
							_.each(smallestDistances, function(distance) {
								closestTouchObject[distance.identifiers[0]] = 
									closestTouchObject[distance.identifiers[1]] = true;
							});
							closestTouchArr = _.keys(closestTouchObject);
						}

						if(touchCluster.options.maxRadius) {
							radiusOK = true;
							var touches = [];
							_.each(closestTouchObject, function(isTrue, identifier) {
								var touch = touches.get(identifier);
								touches.push(touch.toObject());
							});
							var center = {
									x: average(_.pluck(touches, 'x')),
									y: average(_.pluck(touches, 'y'))
								};
							var maxRadiusSquared = Math.pow(touchCluster.options.maxRadius, 2);
							if(_.every(touches, function(touch) {
									return distanceSquared(touch.x, touch.y, center.x, center.y) <= maxRadiusSquared;
								})) {
								radiusOK = true;
							}
						} else {
							radiusOK = true;
						}

						if(radiusOK) {
							touchCluster.postSatisfied(closestTouchArr);
						}
					} else {
						touchCluster.postSatisfied([usableFingers[0]]);
					}
				}
			}
		});
	}

	var twoPI = 2*Math.PI,
		tc_id = 0;

	ist.TouchCluster = function (options) {
		this.options = _.extend({
			downInside: false,
			downOutside: false,

			numFingers: 1,

			maxRadius: false,
			maxTouchInterval: 500
		}, options);

		this._id = tc_id++;

		this.$usableFingers = cjs([]);
		this.$usingFingers = cjs([]);
		this.$satisfied = cjs(false);

		this.$usingTouchInfo = cjs(function() {
			var touchLocations = [];
			this.$usingFingers.forEach(function(touchID) {
				var touch = touches.get(parseInt(touchID)),
					touchObj = touch.toObject();
				touchLocations.push(touchObj);
			}, this);
			return touchLocations;
		}, {context: this});

		this.$startCenter = cjs.constraint({x: false, y: false});
		/*
		function() {
			var touchLocations = this.$usingTouchInfo.get();

			if(touchLocations.length > 0) {
				var averageX = average(_.pluck(touchLocations, 'startX')),
					averageY = average(_.pluck(touchLocations, 'startY'));
				return { x: averageX, y: averageY };
			} else {
				return { x: false, y: false };
			}
		}, {context: this});
		*/

		this.$center = cjs(function() {
			var touchLocations = this.$usingTouchInfo.get();

			if(touchLocations.length > 0) {
				var averageX = average(_.pluck(touchLocations, 'x')),
					averageY = average(_.pluck(touchLocations, 'y'));
				return { x: averageX, y: averageY };
			} else {
				return { x: false, y: false };
			}
		}, {context: this});

		this.$endCenter = cjs(false);

		this.$startRadius = cjs(function() {
			var touchLocations = this.$usingTouchInfo.get(),
				startCenter = this.$startCenter.get();

			if(touchLocations.length > 0) {
				var maxDistance = false;
				_.each(touchLocations, function(touchLocation) {
					var dSq = distanceSquared(startCenter.x, startCenter.y, touchLocation.startX, touchLocation.startY);
					if(!maxDistance || dSq < maxDistance) {
						maxDistance = dSq;
					}
				});
				var r = Math.sqrt(maxDistance);

				return r;
			} else {
				return false;
			}
		}, {context: this});

		this.$radius = cjs(function() {
			var touchLocations = this.$usingTouchInfo.get(),
				center = this.$center.get();

			if(touchLocations.length > 0) {
				var maxDistance = false;
				_.each(touchLocations, function(touchLocation) {
					var dSq = distanceSquared(center.x, center.y, touchLocation.x, touchLocation.y);
					if(!maxDistance || dSq < maxDistance) {
						maxDistance = dSq;
					}
				});
				var r = Math.sqrt(maxDistance);

				return r;
			} else {
				return false;
			}
		}, {context: this});
		this.$endRadius = cjs(false);

		this.$rotation = cjs(_.bind(function() {
			var usingFingers = this.$usingFingers.toArray();
			if(usingFingers.length > 1) {
				var touchLocations = this.$usingTouchInfo.get(),
					startCenter = this.$startCenter.get(),
					center = this.$center.get();
					
				var angleDiffs = _.map(touchLocations, function(point) {
						var origAngle = Math.atan2(point.y - center.y, point.x - center.x),
							newAngle = Math.atan2(point.startY - startCenter.y, point.startX - startCenter.x);
						while(origAngle < 0) { origAngle += twoPI; }
						while(newAngle < 0) { newAngle += twoPI; }
						var diff = newAngle - origAngle;
						while(diff < 0) { diff += twoPI; }
						return diff;
					});
				var averageDiff = average(angleDiffs);
				while(averageDiff >= Math.PI) {
					averageDiff -= twoPI
				}
				return averageDiff;
			} else {
				return false;
			}
		}, this));
		this.$endRotation = cjs(false);

		this.$scale = cjs(_.bind(function() {
			var usingFingers = this.$usingFingers.toArray();
			if(usingFingers.length > 1) {
				var touchLocations = this.$usingTouchInfo.get(),
					startCenter = this.$startCenter.get(),
					center = this.$center.get();

				var startDistance = average(_.map(touchLocations, function(point) {
						return Math.sqrt(Math.pow(point.startX - startCenter.x, 2) + Math.pow(point.startY - startCenter.y, 2))
					})),
					currentDistance = average(_.map(touchLocations, function(point) {
						return Math.sqrt(Math.pow(point.x - center.x, 2) + Math.pow(point.y - center.y, 2))
					}));

				return currentDistance / startDistance;
			} else {
				return false;
			}
		}, this));
		this.$endScale = cjs(false);

		this.$claimed = cjs(false);

		this.$xConstraint = this.$center.prop('x');
		this.$yConstraint = this.$center.prop('y');
		this.$startXConstraint = this.$startCenter.prop('x');
		this.$startYConstraint = this.$startCenter.prop('y');
		this.$endXConstraint = this.$endCenter.prop('x');
		this.$endYConstraint = this.$endCenter.prop('y');

		touchClusters.push(this);

		this.drawing_fns = [];
		//updateTouchDistributions();
	};

	(function(My) {
		var proto = My.prototype;

		proto.isSatisfied = function() { return this.$satisfied.get(); };
		proto.isSatisfiedConstraint = function() { return this.$satisfied; };

		proto.preUnsatisfied = function() {
			this.$endCenter.set(this.$center.get());
			this.$endRadius.set(this.$radius.get());
			this.$endRotation.set(this.$rotation.get());
			this.$endScale.set(this.$scale.get());
		};
		proto.postUnsatisfied = function() {
			cjs.wait();
			this.$usingFingers.forEach(function(touchID) {
				var touch = touches.get(touchID),
					usedBy = touch.get('usedBy'),
					index = usedBy.indexOf(this);
				if(index >= 0) {
					usedBy.splice(index, 1);
				}
			}, this);
			this.$satisfied.set(false);
			this.$usableFingers.setValue([]);
			this.$usingFingers.setValue([]);
			this.$startCenter.set({ x: false, y: false });
			cjs.signal();
		};

		proto.postSatisfied = function(usingFingers) {
			cjs.wait();

			this.$satisfied.set(true);
			this.$usingFingers.setValue(usingFingers);
			_.each(usingFingers, function(touchID) {
				var touch = touches.get(touchID),
					usedBy = touch.get('usedBy');
				usedBy.push(this);
			}, this);

			var touchLocations = this.$usingTouchInfo.get();
			if(touchLocations.length > 0) {
				var averageX = average(_.pluck(touchLocations, 'startX')),
					averageY = average(_.pluck(touchLocations, 'startY'));
				this.$startCenter.set({ x: averageX, y: averageY });
			} else {
				this.$startCenter.set({ x: false, y: false });
			}

			cjs.signal();
		};

		proto.getX = function() { return this.$xConstraint.get(); };
		proto.getY = function() { return this.$yConstraint.get(); };
		proto.getXConstraint = function() { return this.$xConstraint; };
		proto.getYConstraint = function() { return this.$yConstraint; };
		proto.getStartX = function() { return this.$startXConstraint.get(); };
		proto.getStartY = function() { return this.$startYConstraint.get(); };
		proto.getStartXConstraint = function() { return this.$startXConstraint; };
		proto.getStartYConstraint = function() { return this.$startYConstraint; };

		proto.getEndX = function() { return this.$endXConstraint.get(); };
		proto.getEndY = function() { return this.$endYConstraint.get(); };
		proto.getEndXConstraint = function() { return this.$endXConstraint; };
		proto.getEndYConstraint = function() { return this.$endYConstraint; };

		proto.getRadius = function() { return this.$radius.get(); };
		proto.getRadiusConstraint = function() { return this.$radius; };
		proto.getStartRadius = function() { return this.$startRadius.get(); };
		proto.getStartRadiusConstraint = function() { return this.$radius.get(); };
		proto.getEndRadius = function() { return this.$endRadius.get(); };
		proto.getEndRadiusConstraint = function() { return this.$endRadius; };

		proto.getRotation = function() { return this.$rotation.get(); }
		proto.getRotationConstraint = function() { return this.$rotation; }
		proto.getEndRotation = function() { return this.$endRotation.get(); }
		proto.getEndRotationConstraint = function() { return this.$endRotation; }

		proto.getScale = function() { return this.$scale.get(); }
		proto.getScaleConstraint = function() { return this.$scale; }
		proto.getEndScale = function() { return this.$endScale.get(); }
		proto.getEndScaleConstraint = function() { return this.$endScale; }

		proto.setOption = function(a, b) {
			if(arguments.length === 1) {
				_.extend(this.options, a);
			} else if(arguments.length > 1) {
				this.options[a] = b;
			}
		};

		proto.usesTouch = function(touch) {
			var identifier = touch.identifier;
			return this.$usingFingers.indexOf(identifier) >= 0;
		};
		proto.usesAnyTouch = function(touches) {
			return _.some(touches, this.usesTouch, this);
		};

		proto.removeUsableFinger = function(touch) {
			var index = this.$usableFingers.indexOf(touch.identifier);
			if(index >= 0) {
				this.$usableFingers.splice(index, 1);
			}
		};
		proto.removeUsableFingers = function(touches) {
			_.each(touches, this.removeUsableFinger, this);
		};
		proto.addUsableFinger = function(touch) {
			this.$usableFingers.push(touch.identifier);
		};
		proto.addUsableFingers = function(touches) {
			_.each(touches, this.addUsableFinger, this);
		};
		proto.getUsableFingers = function() {
			return this.$usableFingers.toArray();
		};
		proto.getUsingFingers = function() {
			return this.$usingFingers.toArray();
		};
		proto.pruneClaimedFingers = function() {
			var usableFingers = this.getUsableFingers(),
				len = usableFingers.length,
				i,
				currTime = getTime(),
				toRemoveLen = 0;
			for(i = 0; i<len; i++) {
				var touch = touches.get(usableFingers[i]),
					claimedBy = touch.get('claimedBy');

				if(claimedBy.length > 0 && claimedBy.indexOf(this) < 0) {
					this.$usableFingers.splice(i, 1);
					usableFingers.splice(i, 1);
					i--;
					len--;
				}
			}
		};
		proto.pruneTimedOutUsableFingers = function() {
			if(this.options.maxTouchInterval) {
				var usableFingers = this.getUsableFingers(),
					len = usableFingers.length,
					i,
					currTime = getTime(),
					toRemoveLen = 0;
				for(i = 0; i<len; i++) {
					var touch = touches.get(usableFingers[i]),
						touchdownTime = touch.get('downAt');
					if(currTime - touchdownTime > this.options.maxTouchInterval) {
						toRemoveLen = i;
					} else {
						break;
					}
				}
			}
		};

		proto.setUsingTouches = function(arr) {
			this.$usingTouches.set(arr);
		};
		proto.removeFromPaper = function(paper) {
			for(var i = 0; i<this.drawing_fns.length; i++) {
				var drawing_fn = this.drawing_fns[i];
				if(drawing_fn.paper === paper) {
					drawing_fn.live_draw.destroy();
					drawing_fn.paper_path.remove();
					this.drawing_fns.splice(i, 1);
					i--;
				}
			}
		};

		proto.getTouches = function() {
			return this.$usingTouchInfo.get();
		};

		proto.claimTouches = function() {
			cjs.wait();
			this.$claimed.set(true);
			this.$usingFingers.forEach(function(touchID) {
				var touch = touches.get(touchID),
					claimedBy = touch.get('claimedBy'),
					usedBy = touch.get('usedBy');

				claimedBy.push(this);

				var toRemove = [];
				usedBy.forEach(function(tc, i) {
					if(tc !== this) {
						toRemove[i] = tc;
					}
				}, this);

				toRemove.reverse();
				toRemove.forEach(function(tc, index) {
					if(tc) {
						tc.preUnsatisfied();
						tc.postUnsatisfied();
						usedBy.splice(index, 1);
					}
				});
			}, this);
			cjs.signal();
		};

		proto.disclaimTouches = function() {
			cjs.wait();
			this.$claimed.set(false);
			this.$usingFingers.forEach(function(touchID) {
				var touch = touches.get(touchID),
					claimedBy = touch.get('claimedBy'),
					index = claimedBy.indexOf(this);
				if(index >= 0) {
					claimedBy.splice(index, 1);
				}
			}, this);
			cjs.signal();
		};

		proto.claimsTouches = function() {
			return this.$claimed.get();
		};
		proto.id = proto.sid = function() { return this._id; };
	}(ist.TouchCluster));
}(interstate));
