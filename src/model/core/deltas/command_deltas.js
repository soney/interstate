(function(red) {
var cjs = red.cjs, _ = red._;

red.CommandDelta = function(options) {
	red.CommandDelta.superclass.constructor.apply(this, arguments);
	this.command = options.command;
	this.reverse = options.reverse === true;
};


(function(my) {
	_.proto_extend(my, red.Delta);
	var proto = my.prototype;
	proto.get_command = function() {
		return this.command;
	};
	proto.is_reverse = function() {
		return this.reverse;
	};
	proto.serialize = function() {
		return {
			command: red.serialize.apply(red, ([this.get_command()]).concat(arguments)),
			reverse: this.is_reverse()
		};
	};
	my.deserialize = function(info) {
		return new red.CommandDelta({
			command: red.deserialize(info.command),
			reverse: info.reverse
		});
	};
}(red.CommandDelta));

}(red));
