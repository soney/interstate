/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console,window */

(function (red, $) {
	"use strict";
	var cjs = red.cjs,
		_ = red._;

	var match_styles = function (textbox, text, options) {
		textbox.style.position = "absolute";
		var anchor = text.attr("text-anchor");
		if (anchor === "start") {
			textbox.style.textAlign = "left";
		} else if (anchor === "middle") {
			textbox.style.textAlign = "center";
		} else {
			textbox.style.textAlign = "right";
		}
		textbox.style.fontFamily = text.attr("font-family");
		textbox.style.fontWeight = text.attr("font-weight");
		textbox.style.fontStyle = text.attr("font-style");
		textbox.style.fontSize = text.attr("font-size");
		var box = text.getBBox();
		textbox.style.top = box.y + "px";
		textbox.style.outline = "none";
		textbox.style.border = "none";
		textbox.style.padding = "0px";
		textbox.style.margin = "0px";
		textbox.style.boxSizing = "border-box";
		textbox.style.background = options.fill;
		textbox.style.color = options.color;
	};

	red.EditableText = function (paper, options) {
		able.make_this_listenable(this);
		able.make_this_optionable(this, {
			x: 0,
			y: 0,
			text: "",
			width: 100,
			"text-anchor": "middle",
			animation_duration: 600,
			"default": "",
			font: "",
			"font-family": "Courier New, Courier",
			"font-size": 14,
			"font-weight": "normal",
			color: "#000000",
			default_color: "#AAAAAA",
			fill: "white",
			"fill-opacity": 0.7,
			textbox_background: "white",
			textbox_color: "black",
			edit_on_click: true
		}, options);

		this.text = paper.text(this.option("x"), this.option("y"), this.get_text())
			.attr({
				font: this.option("font"),
				"font-family": this.option("font-family"),
				"font-size": this.option("font-size"),
				"font-weight": this.option("font-weight"),
				"text-anchor": this.option("text-anchor")
			});

		if (this.show_default()) {
			this.text.attr("fill", this.option("default_color"));
		} else {
			this.text.attr("fill", this.option("color"));
		}
		var bbox = this.getBBox();
		this.label_background = paper.rect(bbox.x, bbox.y, bbox.width, bbox.height).insertBefore(this.text);
		this.label_background.attr({
			fill: this.option("fill"),
			"fill-opacity": this.option("fill-opacity"),
			stroke: "none"
		});
		this.$text = $(this.text[0]);

		this.$text.on("click.onclick", _.bind(this.onClick, this));
		this.paper = paper;
	};
	(function (my) {
		var proto = my.prototype;
		able.make_proto_listenable(proto);
		able.make_proto_optionable(proto);

		proto.destroy = function() {
			this.$text.off("click.onclick");
			delete this.$text;
			this.text.remove();
			delete this.text;
			if(this.textbox) {
				$(this.textbox)	.off("keydown.onkeydown")
								.off("blur.onblur")
								.remove();
				delete this.textbox;
			}
			able.destroy_this_listenable(this);
			able.destroy_this_optionable(this);
		};

		proto.get_raphael_object = function () {
			return this.text;
		};
		proto.toFront = function() {
			this.label_background.toFront();
			this.text.toFront();
		};

		proto.show_default = function () {
			return this.option("text") === "";
		};
		proto.get_text = function () {
			if (this.show_default()) {
				return this.option("default");
			} else {
				return this.option("text");
			}
		};
		proto.onClick = function (event) {
			if(this.option("edit_on_click") !== false) {
				this.edit();
			}
		};
		proto.edit = function () {
			this.textbox = window.document.createElement("input");
			this.textbox.type = "text";
			this.textbox.style.zIndex = 2;
			var bbox = this.getBBox();
			var width = Math.max(bbox.width, this.option("width"));

			var anchor = this.text.attr("text-anchor");
			if (anchor === "start") {
				this.textbox.style.left = this.option("x") + "px";
			} else if (anchor === "middle") {
				this.textbox.style.left = (this.option("x") - width / 2) + "px";
			} else {
				this.textbox.style.left = (this.option("x") - width) + "px";
			}

			this.textbox.style.width = width + "px";
			match_styles(this.textbox, this.text, {
					"color": this.option("textbox_color"),
					"fill": this.option("textbox_background")
				});
			this.paper.canvas.parentNode.insertBefore(this.textbox, this.paper.canvas);
			this.textbox.value = this.option("text");

			this.text.hide();
			this.textbox.focus();
			this.textbox.select();
			$(this.textbox)	.on("keydown.onkeydown", _.bind(this.onKeydown, this))
							.on("blur.onblur", _.bind(this.onBlur, this));
			return this;
		};
		proto.getBBox = function () {
			return this.text.getBBox();
		};
		proto.update_label_background = function () {
			var bbox = this.getBBox();
			if(bbox) {
				this.label_background.attr({
					x: bbox.x - 1,
					y: bbox.y - 1,
					width: bbox.width+2,
					height: bbox.height+2,
					fill: this.option("fill")
				});
			}
		};
		proto.onKeydown = function (event) {
			//var textbox = event.srcElement;
			if (event.keyCode === 27) { //esc
				this.onCancel();
				this.showText();
			} else if (event.keyCode === 13) { // enter
				this.onTextChange(this.textbox.value);
				this.showText();
			}
		};
		proto.onCancel = function() {
			this._emit("cancel");
		};
		proto.onTextChange = function (value) {
			this.option("text", value);
			this.text.attr("text", this.get_text());
			if (this.show_default()) {
				this.text.attr("fill", this.option("default_color"));
			} else {
				this.text.attr("fill", this.option("color"));
			}
			this.update_label_background();
			this._emit("change", {
				value: value,
				target: this
			});
		};
		proto.onBlur = function (event) {
			//var textbox = event.srcElement;
			this.onTextChange(this.textbox.value);
			this.showText();
		};
		proto.showText = function () {
			this.text.show();
			$(this.textbox)	.off("keydown.onkeydown")
							.off("blur.onblur")
							.remove();
			delete this.textbox;
		};
		proto._on_options_set = function (values, animated) {
			if(_.isNumber(animated)) {
				this.text.animate({
					//x: this.option("x"),
					//y: this.option("y"),
					fill: this.show_default() ? this.option("default_color") : this.option("color")
					//text: this.option("text")
				}, animated);
			} else {
				this.text.attr({
					x: this.option("x"),
					y: this.option("y"),
					width: this.option("width"),
					font: this.option("font"),
					"font-family": this.option("font-family"),
					"font-size": this.option("font-size"),
					"font-weight": this.option("font-weight"),
					"text-anchor": this.option("text-anchor"),
					fill: this.show_default() ? this.option("default_color") : this.option("color"),
					text: this.option("text")
				});
				this.update_label_background();
			}
		};
		proto.remove = function () {
			this.label_background.remove();
			this.text.remove();
		};
		proto.hide = function() {
			this.label_background.hide();
			this.text.hide();
			return this;
		};
		proto.show = function() {
			this.label_background.show();
			this.text.show();
			return this;
		};
		proto.focus = function() {
			this.textbox.focus();
			return this;
		};
		proto.select = function() {
			this.textbox.select();
			return this;
		};
	}(red.EditableText));
}(red, jQuery));
