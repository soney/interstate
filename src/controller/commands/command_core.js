(function(red) {
var cjs = red.cjs, _ = red._;
var Command = function() {
	this._in_effect = false;
};
(function(my) {
	var proto = my.prototype;
	proto._do = function() {
		this._in_effect = true;
		this._execute();
	};
	proto._undo = function() {
		this._in_effect = false;
		this._unexecute();
	};
	proto.destroy = function() {
		this._do_destroy(this.in_effect());
	};
	proto.in_effect = function() {
		return this._in_effect;
	};

	proto._execute = function() { };
	proto._unexecute = function() { };
	proto._do_destroy = function(in_effect) { };
	proto.to_undo_string = function() {
		return "Undo generic command";
	};
	proto.to_redo_string = function() {
		return "Redo generic command";
	};
}(Command));

red.Command = Command;
red._commands = {
};
red.command = function(command_name) {
	var command = red._commands[command_name];
	var args = _.rest(arguments);
	return command.apply(command, args);
};
}(red));
