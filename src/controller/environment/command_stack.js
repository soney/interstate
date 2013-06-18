/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console */

(function (red) {
    "use strict";
    var cjs = red.cjs,
        _ = red._;
	red.CommandStack = function () {
        var stack = [];
        var index = -1; // Points at the next thing to undo

		this._do = function(command) {
			command._do();

			var discarded_commands = stack.splice(index + 1, stack.length - index);

			_.forEach(discarded_commands, function (discarded_command) {
				if (cjs.is_constraint(discarded_command)) {
					discarded_command.destroy();
				}
			});

			stack.push(command);
			index += 1;
		};

		this._undo = function() {
			if (this.can_undo()) {
				var last_command = stack[index];
				last_command._undo();
				index -= 1;
			}
		};

		this._redo = function() {
			if (this.can_redo()) {
				var last_command = stack[index + 1];
				last_command._do();
				index += 1;
			}
		};

		this.can_undo = function() {
			return index >= 0;
		};

		this.can_redo = function() {
			return index < stack.length - 1;
		};
	};
}(red));
