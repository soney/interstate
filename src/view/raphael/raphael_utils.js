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
		width: 50
		, onMove: function(new_x, old_x) { }
		, onResize: function(new_width, old_width) { }
		, onRemove: function() { }
		, onIndexChange: function(new_index, old_index) { }
		, x: 0
	}, options);
	this.columns = [];
};
(function(my) {
	var proto = my.prototype;
	red.make_proto_listenable(proto);
	proto.push = function(options) {
		var column = this.get_column(options);
		if(this.columns.length > 0) {
			var previous_column = this.columns[this.columns.length - 1];
			options.x = previous_column.x + previous_column.width;
		}
		this.columns.push(options);
	};
	proto.insert_at = function(index, options) {
		index = Math.max(0, Math.min(index, this.columns.length - 1));
		var column = this.get_column(options);
		if(index > 0) {
			var previous_column = this.columns[index - 1];
			options.x = previous_column.x + previous_column.width;
		}
		this.comlumns.splice(index, 0, options);

		this.update_subsequent_columns(options.x + options.width, index+1);
	};
	proto.remove = function(index) {
		var options_arr = this.columns.splice(index, 1);
		_.each(options_arr, function(options) {
			options.onRemove();
		});

		var x = 0;
		if(index > 0) {
			var previous_column = this.columns[index-1];
			x = previous_column.x + previous_column.width;
		}
		this.update_subsequent_columns(x, index);
		for(var i = index; i<this.columns.length; i++) {
			this.columns[i].onIndexChange(i, i+1);
		}
	};
	proto.resize = function(index, new_width) {
		var options = this.columns[index];
		var old_width = options.width;
		options.width = new_width;
		options.onResize(new_width, old_width);

		this.update_subsequent_columns(options.x + options.width, index);
	};
	proto.update_subsequent_columns = function(starting_x, starting_index) {
		var x = starting_x;
		for(var i = starting_index; i<this.columns.length; i++) {
			var column = this.columns[i];
			var old_column_x = column.x;
			column.x = x;

			if(old_column_x !== column.x) {
				column.onMove(column.x, old_column_x);
			}

			x+=column.width;
		}
	};
	proto.get_options = function(options) {
		return _.extend({
			width: this.options.default_column_width
			, onMove: function(new_x, old_x) { }
			, onResize: function(new_width, old_width) { }
			, onRemove: function() { }
			, onIndexChange: function(new_index, old_index) { }
			, x: 0
		}, options);
	};
}(ColumnLayout));
red.ColumnLayout = ColumnLayout;

}(red));
