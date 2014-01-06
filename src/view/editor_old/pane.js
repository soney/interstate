/*jslint nomen: true, vars: true, white: true */
/*jshint scripturl: true */
/*global interstate,esprima,able,uid,console,window,jQuery,Raphael */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	$.widget("interstate.pane", {
		options: {
			type: "horizontal"
		},
		_create: function() {
			this.children = [];
			this.percentages = [];
			this.handles = [];
			this.element.addClass("pane");
		},
		_destroy: function() {
			this._super();
		},
		add: function() {
			_.each(arguments, function(elem) {
				this.children.push(elem);

				if(this.children.length === 1) {
					this.percentages.push(1.0);
				} else {
					var additional_percentage = 1/this.children.length;
					var percentages_len = this.percentages.length;
					for(var i = 0; i<percentages_len; i++) {
						this.percentages[i] -= additional_percentage / this.percentages[i];
					}
					this.percentages[percentages_len] = additional_percentage;
					var handle = this._get_handle();
					this.handles.push(handle);
					this.element.append(handle);
				}

				this.element.append(elem);
			}, this);
			this._update_heights();
		},
		_get_handle: function() {
			var handle = $("<div />").addClass("horizontal handle");
			handle.on("mousedown.start_drag", $.proxy(function(ev) {
				var handle_index = -1;
				for(var i = 0; i<this.handles.length; i++) {
					if(this.handles[i][0] === handle[0]) {
						handle_index = i;
						break;
					}
				}
				ev.preventDefault();
				ev.stopPropagation();
				$(window).on("mousemove.drag", $.proxy(function (event) {
					this._on_drag_handle(handle_index, event.clientY);
				}, this));
				$(window).on("mouseup.drag", $.proxy(function (event) {
					this._on_drag_handle(handle_index, event.clientY);
					$(window).off("mousemove.drag mouseup.drag");
				}, this));
			}, this));
			return handle;
		},
		_on_drag_handle: function(handle_index, clientY) {
			var percentage = Math.max(0, Math.min(1, clientY/window.innerHeight));
			this.percentages[handle_index] = percentage;
			this.percentages[handle_index+1] = 1-percentage;
			this._update_heights();
		},
		_update_heights: function() {
			_.each(this.children, function(child, index) {
				var percentage = this.percentages[index];
				child.css("height", (this.percentages[index]*100)+"%");
			}, this);
		},
		set_percentage: function(index, percentage) {
			var old_percentage = this.percentages[index];
			var diff = percentage-old_percentage;
			var zeroes = [];
			var sum = 0;
			var i = 0;
			for(i = 0; i<this.percentages.length; i++) {
				if(index === i) {
					this.percentages[i] = percentage;
					sum += percentage;
				} else if(this.percentages[i] <= 0.000001) {
					zeroes.push(i);
				} else {
					this.percentages[i] -= diff*this.percentages[i]/(1-old_percentage);
					sum += this.percentages[i];
				}
			}
			var remaining_space = 1-sum;
			var to_allocate = remaining_space / zeroes.length;
			for(i = 0; i<zeroes.length; i++) {
				this.percentages[zeroes[i]] = to_allocate;
			}
			this._update_heights();
		},
		get_percentage: function(index) {
			return this.percentages[index];
		}
	});

}(interstate, jQuery));
