(function(red) {
var cjs = red.cjs, _ = red._;

var match_styles = function(textbox, text) {
	textbox.style.position = "absolute";
	textbox.style.color = text.attr("fill");
	textbox.style.textAlign = text.attr("text-anchor") === "middle" ? "center" : "left";
	textbox.style.fontFamily = text.attr("font-family");
	textbox.style.fontWeight = text.attr("font-weight");
	textbox.style.fontStyle = text.attr("font-style");
	textbox.style.fontSize = text.attr("font-size")+"px";
	var box = text.getBBox();
	textbox.style.top = box.y + "px";
	textbox.style.outline = "none";
	textbox.style.border = "1px solid black";
	textbox.style.padding = "0px";
	textbox.style.margin = "0px";
	textbox.style.boxSizing = "border-box";
	textbox.style.background = "none";
	textbox.value = text.attr("text");
};

var EditableText = function(paper, options) {
	red.make_this_listenable(this);
	this.options = _.extend({
		x: 0
		, y: 0
		, text: ""
		, width: 100
		, text_anchor: "start"
		, animation_duration: 600
	}, options);
	this.text = paper.text(this.options.x, this.options.y, this.options.text);

	this.$onClick = _.bind(this.onClick, this);
	this.$onKeydown = _.bind(this.onKeydown, this);
	this.$onBlur = _.bind(this.onBlur, this);
	this.text.click(this.$onClick);
	this.text.attr("text-anchor", this.options.text_anchor);
	this.paper = paper;
};
(function(my) {
	var proto = my.prototype;
	red.make_proto_listenable(proto);
	proto.onClick = function(event) {
		var textbox = document.createElement("input");
		textbox.type = "text"
		textbox.style.zIndex = 2;
		textbox.style.left = (this.text.attr("text-anchor") === "middle" ? this.options.x - this.options.width/2 : this.options.x) + "px" ;
		textbox.style.width = this.options.width + "px";
		match_styles(textbox, this.text);
		this.paper.canvas.parentNode.insertBefore(textbox, this.paper.canvas);
		textbox.focus();
		textbox.select();

		this.text.hide();
		textbox.addEventListener("keydown", this.$onKeydown);
		textbox.addEventListener("blur", this.$onBlur);
	};
	proto.getBBox = function() {
		return this.text.getBBox();
	};
	proto.onKeydown = function(event) {
		var textbox = event.srcElement;
		if(event.keyCode === 27) { //esc
			this.showText(textbox);
		} else if(event.keyCode === 13) { // enter
			this.onTextChange(textbox.value);
			this.showText(textbox);
		}
	};
	proto.onTextChange = function(value) {
		this.text.attr("text", value);
		this._emit("change", {
			value: value
			, target: this
		});
	};
	proto.onBlur = function(event) {
		var textbox = event.srcElement;
		this.onTextChange(textbox.value);
		this.showText(textbox);
	};
	proto.showText = function(textbox) {
		this.text.show();
		textbox.removeEventListener("keydown", this.$onKeydown);
		textbox.removeEventListener("blur", this.$onBlur);
		textbox.parentNode.removeChild(textbox);
	};
	proto.option = function(key, value, animated) {
		if(arguments.length <= 1) {
			return this.options[key];
		} else {
			this.options[key] = value;
			var animation_duration = animated ? this.options.animation_duration : 0;
			if(key === "x") {
				this.text.animate({
					"x": this.option("x")
				}, animation_duration);
			} else if(key === "y") {
				this.text.animate({
					"y": this.option("y")
				}, animation_duration);
			}
			return this;
		}
	};
	proto.remove = function() {
		this.text.remove();
	};
}(EditableText));
red.define("editable_text", function(a, b) { return new EditableText(a,b); });
}(red));
