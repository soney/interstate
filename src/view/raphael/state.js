(function(red) {
var cjs = red.cjs, _ = red._;

var Antenna = function(paper, options) {
	this.options = _.extend({
		radius: 5
		, height: 40
		, top: 5
		, left: 10
		, animation_duration: 600
		, animate_creation: false
	}, options);


	if(this.options.animate_creation) {
		this.expanded = false;
		this.ellipse = paper.ellipse(this.options.left
									, this.options.top + this.options.height
									, 0
									, 0);
		this.line = paper.path("M" + this.options.left + "," + (this.options.top+this.options.height));
		this.expand();
	} else {
		this.expanded = true;
		this.ellipse = paper.ellipse(this.options.left
									, this.options.top + this.options.radius
									, this.options.radius
									, this.options.radius);
		this.line = paper.path("M"+this.options.left+","+(this.options.top+2*this.options.radius)+
								"L"+this.options.left+","+(this.options.top + this.options.height));
	}
};

(function(my) {
	var proto = my.prototype;

	proto.collapse = function(callback) {
		this.line.animate({
			path: "M" + this.options.left + "," + (this.options.top+this.options.height)
		}, this.options.animation_duration);
		this.ellipse.animate({
			cy: this.options.top + this.options.height
			, ry: 0
			, rx: 0
		}, this.options.animation_duration, "<>", callback);
		this.expanded = false;
	};
	proto.expand = function() {
		this.expanded = true;
		this.line.animate({
			path: "M"+this.options.left+","+(this.options.top+2*this.options.radius)+
							"L"+this.options.left+","+(this.options.top + this.options.height)
		}, this.options.animation_duration);
		this.ellipse.animate({
			cy: this.options.top + this.options.radius
			, ry: this.options.radius
			, rx: this.options.radius
		}, this.options.animation_duration);
	};
	proto.option = function(key, value, animated) {
		if(arguments.length <= 1) {
			return this.options[key];
		} else {
			this.options[key] = value;
			var animation_duration = animated ? this.options.animation_duration : 0;
			if(this.expanded) {
				this.ellipse.animate({
					cy: this.options.top + this.options.radius
					, cx: this.options.left
					, ry: this.options.radius
					, rx: this.options.radius
				}, animation_duration);
				this.line.animate({
					path: "M"+this.options.left+","+(this.options.top+2*this.options.radius)+
									"L"+this.options.left+","+(this.options.top + this.options.height)
				}, animation_duration);
			} else {
				if(key === "left") {
					this.line.animate({
						path: "M"+this.options.left+","+(this.options.top+2*this.options.radius)+
										"L"+this.options.left+","+(this.options.top + this.options.height)
					}, 0);
					this.ellipse.animate({
						cy: this.options.top + this.options.radius
						, cx: this.options.left
						, ry: this.options.radius
						, rx: this.options.radius
					}, 0);
				}
			}
			return this;
		}
	};
	proto.remove = function (animated) {
		if(animated) {
			var self = this;
			this.collapse(function() {
				self.ellipse.remove();
				self.line.remove();
			});
		} else {
			this.ellipse.remove();
			this.line.remove();
		}
	};
}(Antenna));
red.define("antenna", function(a, b) { return new Antenna(a,b); });

var StatechartView = function(statechart, paper, options) {
	this.statechart = statechart;
	this.paper = paper;
	this.options = _.extend({
						root: false
						, parent: null
						, left: 0
						, width: 100
						, state_name: ""
						, height: 50
					}, options);


	if(!this.options.root) {
		this.label = red.create("editable_text", this.paper, {
			x: this.option("left") + this.option("width")/2
			, y: 50
			, text: this.option("state_name")
			, text_anchor: "middle"
			, width: this.option("width")
		});
		this.$onRenameRequested = _.bind(this.onRenameRequested, this);
		this.label.on("change", this.$onRenameRequested);
		var bbox = this.label.getBBox();
		var height = bbox.height;
		this.antenna = red.create("antenna", this.paper, { left: this.option("left") + (this.option("width") / 2)
															, height: this.option("height") - bbox.height
															, animate_creation: true });
	}

	this.substate_views = [];

	this.$substates = this.statechart.$substates;
	this.$onSet = _.bind(this.onSet, this);
	this.$onUnset = _.bind(this.onUnset, this);
	this.$onIndexChange = _.bind(this.onIndexChange, this);
	this.$onMove = _.bind(this.onMove, this);
	this.$onValueChange = _.bind(this.onValueChange, this);
	this.$onKeyChange = _.bind(this.onKeyChange, this);

	this.$substates.each(this.$onSet);

	this.$substates.onSet(this.$onSet);
	this.$substates.onUnset(this.$onUnset);
	this.$substates.onIndexChange(this.$onIndexChange);
	this.$substates.onMove(this.$onMove);
	this.$substates.onKeyChange(this.$onKeyChange);
	this.$substates.onValueChange(this.$onValueChange)
};

(function(my) {
	var proto = my.prototype;
	proto.onSet = function(state, state_name, index) {
		var state_view = red.create("statechart_view", state, this.paper, {
			parent: this
			, left: this.options.left + this.option("width")*index
			, width: this.options.width
			, state_name: state_name
			, height: this.options.height
		});
		this.substate_views.splice(index, 0, state_view);
		//console.log("set", arguments);
	};
	proto.onUnset = function(state, state_name, index) {
		var substate_view = this.substate_views[index];
		this.substate_views.splice(index, 1);
		substate_view.remove(true);
		//console.log("unset", arguments);
	};
	proto.onIndexChange = function(state, state_name, to_index, from_index) {
		var substate_view = this.substate_views[from_index];
		substate_view.option("left", this.options.left + this.option("width")*to_index, true);
		//console.log("index change", arguments);
	};
	proto.onMove = function(state, state_name, insert_at, to_index, from_index) {
		var substate_view = this.substate_views[from_index];
		this.substate_views.splice(from_index, 1);
		this.substate_views.splice(insert_at, 0, substate_view);
		//console.log("move", arguments);
	};
	proto.onValueChange = function(state, state_name, old_state, index) {
		var substate_view = this.substate_views[index];
		substate_view.remove(true);
		var new_substate_view = red.create("statechart_view", state, this.paper, {
			parent: this
			, left: this.options.left + this.option("width")*index
			, width: this.options.width
			, state_name: state_name
			, height: this.options.height
		});
		this.substate_views[index] = new_substate_view;

		console.log("value change", arguments);
	};
	proto.onKeyChange = function(new_state_name, old_state_name, index) {
		var substate_view = this.substate_views[index];
		substate_view.option("state_name", new_state_name);
	};
	proto.option = function(key, value, animated) {
		if(arguments.length <= 1) {
			return this.options[key];
		} else {
			this.options[key] = value;
			if(key === "left") {
				this.antenna.option("left", this.option("left") + (this.option("width") / 2), animated);
				this.label.option("x", this.option("left") + (this.option("width") / 2), animated);
			}
			return this;
		}
	};
	proto.remove = function(animated) {
		if(_.has(this, "antenna")) {
			this.antenna.remove(animated);
		}
		if(_.has(this, "label")) {
			this.label.off("change", this.$onRenameRequested);
			this.label.remove(animated);
		}
	};
	proto.onRenameRequested = function(event) {
		var new_name = event.value;
		var parent_statechart = this.statechart.parent();
		if(parent_statechart) {
			parent_statechart.rename_substate(this.statechart.get_name(parent_statechart), new_name);
		}
	};
}(StatechartView));
red.define("statechart_view", function(a, b, c) { return new StatechartView(a,b,c); });
}(red));
