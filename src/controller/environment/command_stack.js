(function(red) {
var cjs = red.cjs, _ = cjs._;

var command_stack_factory = function() {
	var stack = [];
	var index = -1; // Points at the next thing to undo

	var can_undo = function() {
		return index >= 0;
	};
	var can_redo = function() {
		return index < stack.length - 1;
	};

	return {
		_do: function(command) {
			var discarded_commands = stack.splice(index + 1, stack.length - index);

			command._do();
			_.forEach(discarded_commands, function(discarded_command) {
				if(cjs.is_constraint(discarded_command)) {
					discarded_command.destroy();
				}
			});

			stack.push(command);
			index++;
		}
		, _undo: function() {
			if(can_undo()) {
				var last_command = stack[index];
				last_command._undo();
				index--;
			}
		}
		, _redo: function() {
			if(can_redo()) {
				var last_command = stack[index+1];
				last_command._do()
				index++;
			}
		}
		, print: function() {
			console.log(stack, index);
		}
		, can_undo: can_undo
		, can_redo: can_redo
	};
};

cjs.define("command_stack", command_stack_factory);

}(red));
