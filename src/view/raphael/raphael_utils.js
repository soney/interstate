(function(red) {
var cjs = red.cjs, _ = red._;

var RRaphael = function(paper, options) {
	this.options = _.extend({
		anim_ms: 200
		, anim_easing: "<>"
		, fill: false
		, stroke: false
	}, this._defaults, options);
	this._attrs = this._attrs || ["fill", "stroke"];
};
(function(my) {
	var proto = my.prototype;

	proto.initialize = function() {
		if(this.option("stroke")) {
			var element = this.get_element();
			element.attr("stroke", this.option("stroke"));
		}

		if(this.option("fill")) {
			var element = this.get_element();
			element.attr("fill", this.option("fill"));
		}
	};

	proto.option = function(key, value, animated) {
		if(arguments.length == 1) {
			if(_.isString(key)) {
				return this._get_option(key);
			} else {
				_.each(key, function(v, k) {
					this._set_option(k, v, false);
				}, this);
			}
		} else if(arguments.length > 1) {
			if(!_.isString(key)) {
				animated = value;
			}

			if(_.isNumber(animated)) {
				animated = { ms: animated };
			}
			if(_.isString(key)) {
				this._set_option(key, value, animated);
			} else {
				var anim;
				_.each(key, function(v, k) {
					if(animated) {
						if(anim) {
							anim = this._set_option(k, v, _.extend({
								animate_with_anim: anim
								, animate_with_el: this.get_element()
							}, animated));
						} else {
							anim = this._set_option(k, v, animated);
						}
						this._last_anim = anim;
					} else {
						this._set_option(k, v, animated);
					}
				}, this);
			}
		}
		return this;
	};

	proto._set_option = function(key, value, animated) {
		this.options[key] = value;
		if(_.indexOf(this._attrs, key) >= 0) {
			if(animated) {
				var anim_params = {};
				anim_params[key] = value;
				var anim_options = _.extend({
					ms: this.option("anim_ms")
					, easing: this.option("anim_easing")
					, params: anim_params
				}, animated);
				var animation = Raphael.animation(anim_options.params, anim_options.ms, anim_options.easing, anim_options.callback);
				var element = this.get_element();
				if(animated.animate_with_el && animated.animate_with_anim) {
					element.animateWith(animated.animate_with_el, animated.animate_with_anim, animation);
				} else {
					element.animate(animation);
				}
			} else {
				var element = this.get_element();
				element.attr(key, value);
			}
		}
	};
	proto._get_option = function(key, value, animated) {
		return this.options[key];
	};

	proto.remove = function() {
		var element = this.get_element();
		element.remove();
	};
	proto.get_element = function()  {
		return this._element;
	};

	_.each(["mousedown", "click", "mouseup"], function(event) {
		proto[event] = function() {
			var element = this.get_element();
			return element[event].apply(element, arguments);
		};
	});
}(RRaphael));

var RRPath = function(paper, options) {
	this._defaults = {
		path: ""
	};
	this._attrs = ["path", "fill", "stroke"];
	RRPath.superclass.constructor.apply(this, arguments);
	this._element = paper.path(this.option("path"));
	this.initialize();
};
(function(my) {
	_.proto_extend(my, RRaphael);
	var proto = my.prototype;
}(RRPath));

var RRCircle = function(paper, options) {
	this._defaults = {
		cx: 10
		, cy: 10
		, r: 5
	};
	this._attrs = ["cx", "cy", "r", "fill", "stroke"];
	RRPath.superclass.constructor.apply(this, arguments);
	this._element = paper.circle(this.option("cx"), this.option("cy"), this.option("r"));
	this.initialize();
};
(function(my) {
	_.proto_extend(my, RRaphael);
	var proto = my.prototype;
}(RRCircle));

var RRCompound = function(paper, options) {
	this.options = _.extend({
		contents: {}
		, attrs: {}
	}, options);

	this._contents = {};
	_.each(this.options.contents, function(type, name) {
		var rrobj;
		var options = this.options.attrs[name];
		if(type === "path") {
			rrobj = red.create("rrpath", paper, options);
		} else if(type === "circle") {
			rrobj = red.create("rrcircle", paper, options);
		} else if(type === "etext") {
			rrobj = red.create("editable_text", paper, options);
		}
		this._contents[name] = rrobj;
	}, this);
};
(function(my) {
	_.proto_extend(my, RRaphael);
	var proto = my.prototype;
	proto.find = function(name) {
		return this._contents[name];
	};
	proto._set_option = function(key, value, animated) {
		my.superclass._set_option.apply(this, arguments);
		if(key === "attrs") {
			var anim;
			var elem;
			_.each(value, function(attrs, name) {
				var obj = this.find(name);
				if(animated) {
					if(_.isNumber(animated)) {
						animated = {ms: animated};
					}

					if(anim) {
						animated = _.extend({
							animate_with_el: elem
							, animate_with_anim: anim
						}, animated);
					}
					obj.option(attrs, animated);
				} else {
					obj.option(attrs, false);
				}
				anim = obj._last_anim;
				elem = obj.get_element();
			}, this);
		}
	};
	proto.remove = function() {
		_.each(this._contents, function(obj, name) {
			obj.remove();
		});
	};
}(RRCompound));

red.define("rrcircle", function(paper, options) {
	return new RRCircle(paper,  options);
});
red.define("rrpath", function(paper, options) {
	return new RRPath(paper,  options);
});
red.define("rrcompound", function(paper, options) {
	return new RRCompound(paper,  options);
});
red.RRaphael = RRaphael;

var ColumnLayout = function(options) {
	red.make_this_listenable(this);
	this.options = _.extend({
		own_width: false
		, x: 0
		, parent: undefined
	}, options);

	this.$onChildResize = _.bind(this.onChildResize, this);
	this.children = [];

	this._set_x(this.options.x, true);
	this._set_width(this.compute_width(), true);
};
(function(my) {
	var proto = my.prototype;
	red.make_proto_listenable(proto);
	proto.push = function(options) {
		return this.insert_at(null, options);
	};
	proto.insert_at = function(index, options) {
		if(!_.isNumber(index)) { index = this.children.length; }
		index = Math.max(0, Math.min(index, this.children.length));
		if(index > 0) {
			var previous_child = this.children[index - 1];
			options = _.extend(options, {
				x: previous_child.get_x() + previous_child.get_width()
			});
		}
		options = _.extend(options, { parent: this });

		var child = new ColumnLayout(options);
		this.children.splice(index, 0, child);
		this.update_subsequent_children(index);

		var on_remove = function() {
			child	.off("remove", on_remove)
					.off("resize", this.$onChildResize);
		};
		child	.on("resize", this.$onChildResize)
				.on("remove", on_remove);

		this.options.own_width = false;
		this._set_width(this.compute_width());

		return child;
	};
	proto.remove_child = function(child) {
		var index;
		if(_.isNumber(child)) { index = child; }
		else { index = _.indexOf(this.children, child); }
		var child_arr = this.children.splice(index, 1);
		_.each(child_arr, function(child) {
			child.onRemove();
		});

		this.update_subsequent_children(index);

		for(var i = index; i<this.children.length; i++) {
			this.children[i].onIndexChange(i, i+1);
		}

		this.options.own_width = false;
		this._set_width(this.compute_width());
	};
	proto.remove = function() {
		var parent = this.get_parent();
		if(parent) {
			parent.remove_child(this);
		} else {
			this.onRemove();
		}
	};
	proto.get_parent = function() { return this.options.parent; };
	proto.resize = function(new_width) {
		if(!_.isNumber(new_width)) { new_width = 0; }
		else { new_width = Math.max(new_width, 0); }
		this.options.own_width = new_width;
		this._set_width(this.compute_width());
	};
	proto.update_subsequent_children = function(starting_index) {
		var x = this.get_x();
		if(starting_index > 0) {
			var previous_child = this.children[starting_index-1];
			x = previous_child.get_x() + previous_child.get_width();
		}
		for(var i = starting_index; i<this.children.length; i++) {
			var child = this.children[i];
			var old_child_x = child.x;
			child._set_x(x);

			if(old_child_x !== child.x) {
				child.update_subsequent_children(0);
				child.onMove(child.x, old_child_x);
			}
			x += child.get_width();
		}
	};

	proto.compute_width = function() {
		if(_.isNumber(this.options.own_width)) {
			return this.options.own_width;
		} else {
			var rv = 0;
			_.each(this.children, function(child) {
				rv += child.get_width();
			});
			return rv;
		}
	};
	proto.get_width = function() { return this._width; };
	proto.get_x = function() { return this._x; };
	proto._set_x = function(x, ignore_emit) {
		var old_x = this._x;
		this._x = x;
		if(this._x !== old_x && ignore_emit !== true) {
			this._emit("move", this, this._x, old_x);
			if(this.children.length > 0) {
				this.children[0]._set_x(this.get_x());
				this.update_subsequent_children(1);
			}
		}
	};
	proto._set_width = function(width, ignore_emit) {
		var old_width = this._width;
		this._width = width;
		if(this._width !== old_width && ignore_emit !== true) {
			this._emit("resize", this, this._width, old_width);
			
		}
	};
	proto.onIndexChange = function(to_index, from_index) {
		this._emit("indexChange", to_index, from_index);
	};
	proto.onRemove = function() {
		_.each(this.children, function(child) {
			child.onRemove();
		});
		this._emit("remove");
	};
	proto.onMove = function(old_x, new_x) {
		this._emit("move", old_x, new_x);
	};
	proto.onChildResize = function(child, new_width, old_width) {
		for(var i = 0; i< this.children.length; i++) {
			if(this.children[i] === child) {
				this.update_subsequent_children(i);
				this._set_width(this.compute_width());
				break;
			}
		}
	};
	proto.print = function() {
		return this.arrify().join("\n");
	};
	proto.arrify = function() {
		var rv = ["x: " + this.get_x() + ", width: " + this.get_width() + " (" + (_.isNumber(this.options.own_width) ? "own" : "comp") + ")"];
		_.each(this.children, function(child) {
			rv.push.apply(rv, _.map(child.arrify(), function(arr) {
				return "\t" + arr;
			}));
		});
		return rv;
	};
}(ColumnLayout));
red.ColumnLayout = ColumnLayout;

}(red));
