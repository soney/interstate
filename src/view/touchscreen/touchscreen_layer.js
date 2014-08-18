/*jslint nomen: true, vars: true, white: true */
/*jshint scripturl: true */
/*global interstate,esprima,able,uid,console,window,jQuery,Raphael */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	$.widget("interstate.touchscreen_layer", {
		options: {
			highlightTouches: true,
		},
		_create: function () {
			this._super();

			this.element.addClass("hasTouchscreenLayer");

			this.canvasDiv = $("<canvas />").prependTo(document.body).css({
				"pointer_events": "none",
				"position": "absolute"
			});

			this.paper = Snap(0,0);
			this.raphaelDiv = $(this.paper.node);
			this.ctx = this.canvasDiv[0].getContext("2d");
			this.raphaelDiv.prependTo(document.body).css({
				"pointer-events": "none",
				"position": "absolute",
				"z-index": 10
			});

			var onWindowResize = _.bind(function() {
				var width = Math.max(document.body.scrollWidth, window.innerWidth),
					height = Math.max(document.body.scrollHeight, window.innerHeight);
				//this.paper.setSize(window.innerWidth, window.innerHeight);
				this.paper.attr({
					width: width,
					height: height
				});
				this.canvasDiv.css({
					width: width+'px',
					height: height+'px'
				}).attr({
					width: width,
					height: height
				});
			}, this);

			$(window).on('resize.touchscreen_layer', onWindowResize);
			onWindowResize();

			if(this.option("highlightTouches")) {
				this.element.screen_touches({
					ctx: this.ctx,
					paper: this.paper
				});
			}

			this.element.svg_path({
				ctx: this.ctx,
				paper: this.paper,
				pathAttributes: {
					"stroke-dasharray": "5, 5, 1, 5"
				}
			});

			this.element.touch_cluster({
				ctx: this.ctx,
				paper: this.paper
			});

			var tc1 = new ist.TouchCluster({
					numFingers: 1
				}),
				tc2 = new ist.TouchCluster({
					numFingers: 1
				});
			this.addTouchCluster(tc1);
			this.addTouchCluster(tc2);

			cjs.liven(function() {
				if(tc2.isSatisfied()) {
					_.delay(function() {
						tc2.claimTouches();
					}, 1000);
					//tc2.claimTouches();
				} else {
					tc2.disclaimTouches();
				}
			}, {
				context: this
			});
			/**/
		},
		_destroy: function () {
			this.element.removeClass("hasTouchscreenLayer");
			this._super();
			$(window).off('resize.touchscreen_layer');

			if(this.option("highlightTouches")) {
				this.element.screen_touches("destroy");
			}

			this.element.svg_path("destroy");
			this.element.touch_cluster("destroy");

			this.paper.clear();
			this.raphaelDiv.remove();
			this.canvasDiv.remove();
		},
		addPath: function(toAdd) {
			this.element.svg_path("addPathToPaper", toAdd);
		},
		removePath: function(path) {
			this.element.svg_path("removePathFromPaper", path);
		},
		addTouchCluster: function(cluster) {
			this.element.touch_cluster("addClusterToPaper", cluster);
		},
		removeTouchCluster: function(cluster) {
			this.element.touch_cluster("removeClusterFromPaper", cluster);
		}
	});
}(interstate, jQuery));
