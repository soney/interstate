(function(red) {
var cjs = red.cjs, _ = red._;

red.CommandDelta = function(options) {
	red.CommandDelta.superclass.constructor.apply(this, arguments);
	this.command = options.command;
};


(function(my) {
	_.proto_extend(my, red.Delta);
	var proto = my.prototype;
	proto.get_command = function() {
		return this.command;
	};
	proto.get_serialized_command = function() {
		var arg_array = _.toArray(arguments);
		var command = this.get_command();
		if(command === "undo" || command === "redo") {
			return command;
		} else {
			return red.serialize.apply(red, ([command]).concat(arg_array));
		}
	};

	red.register_serializable_type("command_delta",
									function(x) { 
										return x instanceof my;
									},
									function() {
										return {
											command: this.get_serialized_command.apply(this, arguments)
										};
									},
									function(obj) {
										return new red.CommandDelta({
											command: (obj.command === "undo" || obj.command === "redo") ? obj.command : red.deserialize(obj.command)
										});
									});
}(red.CommandDelta));

}(red));
