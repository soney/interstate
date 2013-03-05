(function(red) {
var cjs = red.cjs, _ = red._;

red.CombinedCommand = function(options) {
	red.CombinedCommand.superclass.constructor.apply(this, arguments);
	this._options = options || {};
	this._commands = options.commands;
};
(function(my) {
	_.proto_extend(my, red.Command);
	var proto = my.prototype;

	proto._execute = function() {
		_.forEach(this._commands, function(command) {
			command._do();
		});
	};
	proto._unexecute = function() {
		_.forEach(this._commands.reverse(), function(command) {
			command._undo();
		});
	};
	proto._do_destroy = function(in_effect) {
		_.forEach(this._commands, function(command) {
			command.destroy(in_effect);
		});
	};
}(red.CombinedCommand));

}(red));
