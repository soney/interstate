(function(red) {
var jsep = red.jsep, cjs = red.cjs, _ = cjs._;

var extend = function(subClass, superClass) {
    var F = function() {};
    F.prototype = superClass.prototype;
    subClass.prototype = new F();
    subClass.prototype.constructor = subClass;

    subClass.superclass = superClass.prototype;
    if(superClass.prototype.constructor == Object.prototype.constructor) {
        superClass.prototype.constructor = superClass;
    }
};


var RedObject = function() {
	RedObject.superclass.constructor.apply(this, arguments);
	this._properties = red._create_map();
	this.initialize_statechart();
	this._prototypes = [];
};
(function(my) {
	extend(my, red.RedSkeleton);
	var proto = my.prototype;

	proto.initialize_statechart = function() {
		var statechart = red.create_statechart()
							.add_state("INIT")
							.starts_at("INIT");

		var reset_event = red.create_event("manual");
		this.do_reset = _.bind(reset_event.fire, reset_event);

		var init_state = statechart.get_state_with_name("INIT");

		this.own_statechart = red.create_statechart();

		var running_statechart = red.create_statechart()
									.concurrent(true)
									.add_state("own", this.own_statechart);

		statechart	.add_state("running", running_statechart)
					.add_transition("INIT", "running", red.create_event("on_enter", init_state))
					.add_transition("running", "INIT", reset_event);



		this.set_statechart(statechart);
	};

	proto.reset = function() {
		this.do_reset(); // Set in the initialize_statechart function
	};

	(["starts_at", "in_state", "add_state", "remove_state"
		, "get_state_with_name"]).forEach(function(func_name) {
		proto[func_name] = function() {
			return this.own_statechart[func_name].apply(this.own_statechart, arguments);
		};
	});

	proto.add_prototype = function(proto) {
		this._prototypes.push(proto);
	};
	proto.remove_prototype = function(proto) {
		this._prototypes = _.without(this.prototypes, proto);
	};

	proto.adapt_statechart = function(statechart) {
		var new_sc = red.create_statechart();
		console.log(statechart);
		return new_sc;
	};

}(RedObject));

red.create_object = function() {
	return new RedObject();
};


}(red));
