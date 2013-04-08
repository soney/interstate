(function (red) {
var cjs = red.cjs, _ = red._;

var match_styles = function (textbox, text) {
	textbox.style.position = "absolute";
	var anchor = text.attr("text-anchor");
	if (anchor === "start") {
		textbox.style.textAlign = "left";
	} else if (anchor === "middle") {
		textbox.style.textAlign = "center";
	} else {
		textbox.style.textAlign = "right";
	 + this.option("state_label_height")/2}
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
	textbox.style.background = "rgba(255, 255, 255, 0.7)";
};

red.EditableText = function (paper, options) {
	able.make_this_listenable(this);
	able.make_this_optionable(this, {
		x: 0
		, y: 0
		, text: ""
		, width: 100
		, "text-anchor": "middle"
		, animation_duration: 600
		, default: ""
		, font: ""
		, "font-family": "Courier New, Courier"
		, "font-size": 14
		, "font-weight": "normal"
		, color: "#000000"
		, default_color: "#AAAAAA"
		, fill: "white"
		, "fill-opacity": 0.7
	}, options);

	this.text = paper	.text(this.option("x"), this.option("y"), this.get_text())
						.attr({
							font: this.option("font")
							, "font-family": this.option("font-family")
							, "font-size": this.option("font-size")
							, "font-weight": this.option("font-weight")
							, "text-anchor": this.option("text-anchor")
						});

	if (this.show_default()) {
		this.text.attr("fill", this.option("default_color"))
	} else {
		this.text.attr("fill", this.option("color"))
	}
	var bbox = this.getBBox();
	this.label_background = paper.rect(bbox.x, bbox.y, bbox.width, bbox.height).insertBefore(this.text);
	this.label_background.attr({
		fill: this.option("fill"),
		"fill-opacity": this.option("fill-opacity"),
		stroke: "none"
	});

	this.$onClick = _.bind(this.onClick, this);
	this.$onKeydown = _.bind(this.onKeydown, this);
	this.$onBlur = _.bind(this.onBlur, this);

	this.text.click(this.$onClick);
	this.paper = paper;
};
(function (my) {
	var proto = my.prototype;
	able.make_proto_listenable(proto);
	able.make_proto_optionable(proto);

	proto.get_raphael_object = function () {
		return this.text;
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
		this.edit();
	};
	proto.edit = function () {
		var textbox = document.createElement("input");
		textbox.type = "text"
		textbox.style.zIndex = 2;
		var bbox = this.getBBox();
		var width = Math.max(bbox.width, this.option("width"));

		var anchor = this.text.attr("text-anchor");
		if (anchor === "start") {
			textbox.style.left = this.option("x") + "px";
		} else if (anchor === "middle") {
			textbox.style.left = (this.option("x") - width/2) + "px";
		} else {
			textbox.style.left = (this.option("x") - width) + "px";
		}

		textbox.style.width = width + "px";
		match_styles(textbox, this.text);
		this.paper.canvas.parentNode.insertBefore(textbox, this.paper.canvas);
		textbox.value = this.option("text");
		textbox.style.color = this.option("color");
		textbox.focus();
		textbox.select();

		this.text.hide();
		textbox.addEventListener("keydown", this.$onKeydown);
		textbox.addEventListener("blur", this.$onBlur);
	};
	proto.getBBox = function () {
		return this.text.getBBox();
	};
	proto.update_label_background = function () {
		var bbox = this.getBBox();
		this.label_background.attr({
			x: bbox.x,
			y: bbox.y,
			width: bbox.width,
			height: bbox.height
		});
	};
	proto.onKeydown = function (event) {
		var textbox = event.srcElement;
		if (event.keyCode === 27) { //esc
			this.showText(textbox);
		} else if (event.keyCode === 13) { // enter
			this.onTextChange(textbox.value);
			this.showText(textbox);
		}
	};
	proto.onTextChange = function (value) {
		this.option("text", value);
		this.text.attr("text", this.get_text());
		if (this.show_default()) {
			this.text.attr("fill", this.option("default_color"))
		} else {
			this.text.attr("fill", this.option("color"))
		}
		this.update_label_background();
		this._emit("change", {
			value: value
			, target: this
		});
	};
	proto.onBlur = function (event) {
		var textbox = event.srcElement;
		this.onTextChange(textbox.value);
		this.showText(textbox);
	};
	proto.showText = function (textbox) {
		this.text.show();
		textbox.removeEventListener("keydown", this.$onKeydown);
		textbox.removeEventListener("blur", this.$onBlur);
		textbox.parentNode.removeChild(textbox);
	};
	proto._on_options_set = function (values, animated) {
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
	};
	proto.remove = function () {
		this.label_background.remove();
		this.text.remove();
	};
}(red.EditableText));
}(red));
