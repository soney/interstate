/*jslint nomen: true, vars: true, white: true */
/*jshint scripturl: true */
/*global interstate,esprima,able,uid,console,window,jQuery,Raphael */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	$.widget("interstate.touchscreen_layer", {
		options: {
			highlightTouches: true
		},
		_create: function () {
			this._super();

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

			this.touch_clusters = [];
			this.path_views = [];

			if(this.option("highlightTouches")) {
				this.element.screen_touches({
					ctx: this.ctx,
					paper: this.paper
				});
			}
			/*
			
			var tc1 = new ist.TouchCluster({
					numFingers: 1
				}),
				tc2 = new ist.TouchCluster({
					numFingers: 1
				});
			cjs.liven(function(){ 
				if(tc1.isSatisfied()) {
					//_.defer(function() {
						tc1.claimTouches();
					//});
				} else {
					//_.defer(function() {
						tc1.disclaimTouches();
					//});
				}
			});
			//this.addTouchCluster(tc1);
			this.addTouchCluster(tc2);
			*/
		},
		_destroy: function () {
			this._super();
			$(window).off('resize.touchscreen_layer');

			if(this.option("highlightTouches")) {
				this.element.screen_touches("destroy");
			}

			this.clearTouchClusters();
			this.clearPaths();

			this.paper.clear();
			this.raphaelDiv.remove();
			this.canvasDiv.remove();
		},
		addPath: function(toAdd) {
			var pathView = $(this.element).svg_path({
				path: toAdd,
				ctx: this.ctx,
				paper: this.paper,
				pathAttributes: {
					fill: "red"
				}
			});
			this.path_views.push(pathView);
		},
		removePath: function(path) {
			for(var i = 0; i<this.path_views.length; i++) {
				var pView = this.path_views[i];
				if(pView.option("path") === path) {
					pView.svg_path("destroy");
					this.path_views.splice(i, 1);
					i--;
				}
			}
		},
		clearPaths: function() {
			for(var i = 0; i<this.path_views.length; i++) {
				var pView = this.path_views[i];
				pView.svg_path("destroy");
			}
		},
		addTouchCluster: function(cluster) {
			var touchClusterView = $(this.element).touch_cluster({
				cluster: cluster,
				ctx: this.ctx,
				paper: this.paper
			});
			this.touch_clusters.push(touchClusterView);
		},
		removeTouchCluster: function(cluster) {
			for(var i = 0; i<this.touch_clusters.length; i++) {
				var tcView = this.touch_clusters[i];
				if(tcView.option("cluster") === cluster) {
					tcView.touch_cluster("destroy");
					this.touch_clusters.splice(i, 1);
					i--;
				}
			}
		},
		clearTouchClusters: function() {
			for(var i = 0; i<this.touch_clusters.length; i++) {
				var tcView = this.touch_clusters[i];
				tcView.touch_cluster("destroy");
			}
		}
	});
}(interstate, jQuery));
