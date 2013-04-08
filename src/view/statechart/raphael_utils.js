(function (red) {
var cjs = red.cjs, _ = red._;

var RRaphael = function (paper, options) {
	able.make_this_listenable(this);
	able.make_this_optionable(this, {
		anim_ms: 200
		, anim_easing: "<>"
		, fill: false
		, stroke: false
	}, this._defaults, options);

	this._attrs = this._attrs || ["fill", "stroke", "stroke-width", "stroke-dasharray", "stroke-linecap", "stroke-join"];
};
(function (my) {
	var proto = my.prototype;
	able.make_proto_listenable(proto);
	able.make_proto_optionable(proto);

	proto.initialize = function () {
		if (this.option("stroke")) { this.get_element().attr("stroke", this.option("stroke")); }
		if (this.option("fill")) { this.get_element().attr("fill", this.option("fill")); }
		if (this.option("stroke-width")) { this.get_element().attr("stroke-width", this.option("stroke-width")); }
		if (this.option("stroke-dasharray")) { this.get_element().attr("stroke-dasharray", this.option("stroke-dasharray")); }
	};

	proto._on_options_set = function (values, animated) {
		var attr_values = {};
		_.each(values, function (value, key) {
			if (_.indexOf(this._attrs, key) >= 0) {
				attr_values[key] = value;
			};
		}, this);

		if (animated) {
			var anim_options = _.extend({
				ms: _.isNumber(animated) ? animated : this.option("anim_ms")
				, easing: this.option("anim_easing")
				, params: attr_values
			}, animated);

			var animation = Raphael.animation(anim_options.params, anim_options.ms, anim_options.easing, anim_options.callback);
			var element = this.get_element();
			if (animated.animate_with_el && animated.animate_with_anim) {
				element.animateWith(animated.animate_with_el, animated.animate_with_anim, animation);
			} else {
				element.animate(animation);
			}
			this._latest_animation = animation;
		} else {
			var element = this.get_element();
			element.attr(attr_values);
		}
		/*
			if (_.has(attr_values, "path")) {
				console.log(attr_values.path);
				console.log(element.node);
				console.log(attr_values);
			}
		*/
	};
	proto.get_latest_animation = function () { return this._latest_animation; };

	proto.remove = function () { this.get_element().remove(); return this; };
	proto.hide = function () { this.get_element().hide(); return this; };
	proto.show = function () { this.get_element().show(); return this; };
	proto.get_element = function ()  { return this._element; return this; };
	proto.toFront = function () { this.get_element().toFront(); return this; };
	proto.toBack = function () { this.get_element().toBack(); return this; };

	_.each(["mousedown", "mouseup", "click", "dblclick", "drag", "hover", "mousemove"
			, "mouseover", "mouseout", "touchstart", "touchend", "touchmove", "touchcancel"], function (event) {
		proto[event] = function () {
			var element = this.get_element();
			return element[event].apply(element, arguments);
		};

		proto["un"+event] = function () {
			var element = this.get_element();
			return element["un"+event].apply(element, arguments);
		};
	});
}(RRaphael));

var RRPath = function (paper, options) {
	this._defaults = {
		path: ""
	};
	this._attrs = ["path", "fill", "stroke", "stroke-width", "stroke-dasharray", "stroke-linecap", "stroke-join"];
	RRPath.superclass.constructor.apply(this, arguments);
	this._element = paper.path(this.option("path"));
	this.initialize();
};
(function (my) {
	_.proto_extend(my, RRaphael);
	var proto = my.prototype;
}(RRPath));

var RRCircle = function (paper, options) {
	this._defaults = {
		cx: 10
		, cy: 10
		, r: 5
	};
	this._attrs = ["cx", "cy", "r", "fill", "stroke", "stroke-width", "stroke-dasharray", "stroke-linecap", "stroke-join"];
	RRCircle.superclass.constructor.apply(this, arguments);
	this._element = paper.circle(this.option("cx"), this.option("cy"), this.option("r"));
	this.initialize();
};
(function (my) {
	_.proto_extend(my, RRaphael);
	var proto = my.prototype;
}(RRCircle));

var RRRect = function (paper, options) {
	this._defaults = {
		x: 0
		, y: 0
		, width: 20
		, height: 20
		, r: 5
	};
	this._attrs = ["x", "y", "width", "height", "r", "fill", "stroke", "stroke-width", "stroke-dasharray", "stroke-linecap", "stroke-join"];
	RRRect.superclass.constructor.apply(this, arguments);
	this._element = paper.rect(this.option("x"), this.option("y"), this.option("width"), this.option("height"), this.option("r"));
	this.initialize();
};
(function (my) {
	_.proto_extend(my, RRaphael);
	var proto = my.prototype;
}(RRRect));

var RRCompound = function (paper, options) {
	able.make_this_listenable(this);
	able.make_this_optionable(this, {
		contents: {}
		, attrs: {}
	}, options);

	this._contents = {};
	_.each(this.option("contents"), function (type, name) {
		var rrobj;
		var options = this.option("attrs")[name];
		if (type === "path") {
			rrobj = red.create("rrpath", paper, options);
		} else if (type === "circle") {
			rrobj = red.create("rrcircle", paper, options);
		} else if (type === "etext") {
			rrobj = red.create("editable_text", paper, options);
		}
		this._contents[name] = rrobj;
	}, this);
};
(function (my) {
	var proto = my.prototype;

	able.make_proto_listenable(proto);
	able.make_proto_optionable(proto);

	proto.find = function (name) {
		return this._contents[name];
	};
	proto._on_option_set = function (key, value, animated) {
		if (key === "attrs") {
			var anim;
			var elem;
			_.each(value, function (attrs, name) {
				var obj = this.find(name);
				if (animated) {
					if (anim) {
						animated = _.extend({
							animate_with_el: elem
							, animate_with_anim: anim
						}, animated);
					}
					obj.option(attrs, animated);
				} else {
					obj.option(attrs, false);
				}
				anim = obj.get_latest_animation();
				elem = obj.get_element();
			}, this);
		}
	};
	proto.remove = function () {
		_.each(this._contents, function (obj, name) {
			obj.remove();
		});
	};
}(RRCompound));

red.define("rrcircle", function (paper, options) {
	return new RRCircle(paper,  options);
});
red.define("rrrect", function (paper, options) {
	return new RRRect(paper,  options);
});
red.define("rrpath", function (paper, options) {
	return new RRPath(paper,  options);
});
red.define("rrcompound", function (paper, options) {
	return new RRCompound(paper,  options);
});
red.RRaphael = RRaphael;

var ColumnLayout = function (options) {
	able.make_this_listenable(this);
	able.make_this_optionable(this, {
		own_width: false
		, x: 0
		, parent: undefined
	}, options);

	this.$onChildResize = _.bind(this.onChildResize, this);
	this.children = [];

	this._set_x(this.option("x"), true);
	this._set_width(this.compute_width(), true);
};
(function (my) {
	var proto = my.prototype;
	able.make_proto_listenable(proto);
	able.make_proto_optionable(proto);
	proto.push = function (options) {
		return this.insert_at(null, options);
	};
	proto.insert_at = function (index, options) {
		if (!_.isNumber(index)) { index = this.children.length; }
		index = Math.max(0, Math.min(index, this.children.length));
		if (index > 0) {
			var previous_child = this.children[index - 1];
			options = _.extend(options, {
				x: previous_child.get_x() + previous_child.get_width()
			});
		}
		options = _.extend(options, { parent: this });

		var child = new ColumnLayout(options);
		this.children.splice(index, 0, child);
		this.update_subsequent_children(index);

		var on_remove = function () {
			child	.off("remove", on_remove)
					.off("resize", this.$onChildResize);
		};
		child	.on("resize", this.$onChildResize)
				.on("remove", on_remove);

		this.option("own_width", false);
		this._set_width(this.compute_width());

		return child;
	};
	proto.move = function (child, to_index) {
		var index;
		if (_.isNumber(child)) { index = child; }
		else { index = _.indexOf(this.children, child); }

		if (index >=0 && index < this.children.length) {
			var child = this.children.splice(index, 1)[0];
			this.children.splice(to_index, 0, child);
			this.update_subsequent_children(Math.min(index, to_index));
		}
	};
	proto.remove_child = function (child) {
		var index;
		if (_.isNumber(child)) { index = child; }
		else { index = _.indexOf(this.children, child); }
		var child_arr = this.children.splice(index, 1);
		_.each(child_arr, function (child) {
			child.onRemove();
		});

		this.update_subsequent_children(index);

		for (var i = index; i<this.children.length; i += 1) {
			this.children[i].onIndexChange(i, i+1);
		}

		this.options.own_width = false;
		this._set_width(this.compute_width());
	};
	proto.get_children = function () {
		return this.children;
	};
	proto.remove = function () {
		var parent = this.get_parent();
		if (parent) {
			parent.remove_child(this);
		} else {
			this.onRemove();
		}
	};
	proto.get_parent = function () { return this.options.parent; };
	proto.resize = function (new_width) {
		if (!_.isNumber(new_width)) { new_width = 0; }
		else { new_width = Math.max(new_width, 0); }
		this.options.own_width = new_width;
		this._set_width(this.compute_width());
	};
	proto.update_subsequent_children = function (starting_index) {
		var x = this.get_x();
		if (starting_index > 0) {
			var previous_child = this.children[starting_index-1];
			x = previous_child.get_x() + previous_child.get_width();
		}
		for (var i = starting_index; i<this.children.length; i += 1) {
			var child = this.children[i];
			var old_child_x = child.x;
			child._set_x(x);

			if (old_child_x !== child.x) {
				child.update_subsequent_children(0);
				child.onMove(child.x, old_child_x);
			}
			x += child.get_width();
		}
	};

	proto.compute_width = function () {
		if (_.isNumber(this.option("own_width"))) {
			return this.option("own_width");
		} else {
			var rv = 0;
			_.each(this.children, function (child) {
				rv += child.get_width();
			});
			return rv;
		}
	};
	proto.get_width = function () { return this._width; };
	proto.get_x = function () { return this._x; };
	proto._set_x = function (x, ignore_emit) {
		var old_x = this._x;
		this._x = x;
		if (this._x !== old_x && ignore_emit !== true) {
			this._emit("move", this, this._x, old_x);
			if (this.children.length > 0) {
				this.children[0]._set_x(this.get_x());
				this.update_subsequent_children(1);
			}
		}
	};
	proto._set_width = function (width, ignore_emit) {
		var old_width = this._width;
		this._width = width;
		if (this._width !== old_width && ignore_emit !== true) {
			this._emit("resize", this, this._width, old_width);
			
		}
	};
	proto.onIndexChange = function (to_index, from_index) {
		this._emit("indexChange", to_index, from_index);
	};
	proto.onRemove = function () {
		_.each(this.children, function (child) {
			child.onRemove();
		});
		this._emit("remove");
	};
	proto.onMove = function (old_x, new_x) {
		this._emit("move", old_x, new_x);
	};
	proto.onChildResize = function (child, new_width, old_width) {
		for (var i = 0; i< this.children.length; i += 1) {
			if (this.children[i] === child) {
				this.update_subsequent_children(i);
				this._set_width(this.compute_width());
				break;
			}
		}
	};
	proto.print = function () {
		return this.arrify().join("\n");
	};
	proto.arrify = function () {
		var rv = ["x: " + this.get_x() + ", width: " + this.get_width() + " (" + (_.isNumber(this.option("own_width")) ? "own" : "comp") + ")"];
		_.each(this.children, function (child) {
			rv.push.apply(rv, _.map(child.arrify(), function (arr) {
				return "\t" + arr;
			}));
		});
		return rv;
	};
}(ColumnLayout));
red.ColumnLayout = ColumnLayout;

}(red));
