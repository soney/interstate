/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
    "use strict";
    var cjs = ist.cjs,
        _ = ist._;
	ist.CommandStack = function () {
        var stack = [],
			index = -1, // Points at the next thing to undo
			transient_stack = [];

		var _add_to_stack = function(command) {
			var discarded_commands = stack.splice(index + 1, stack.length - index);

			_.forEach(discarded_commands, function (discarded_command) {
				if (cjs.isConstraint(discarded_command)) {
					discarded_command.destroy();
				}
			});

			if(command.is_undoable()) {
				stack.push(command);
				index += 1;
			}
			cjs.wait();
			this.$undo_description.invalidate();
			this.$redo_description.invalidate();
			cjs.signal();			

		};

		this.complete_transient = function() {
			var combined_command = new ist.CombinedCommand({commands: transient_stack});
			_add_to_stack.call(this, combined_command);
			transient_stack = [];
		};

		this._do = function(command, transient) {
			command._do();

			if(transient) {
				transient_stack.push(command);
			} else {
				_add_to_stack.call(this, command);
			}
		};

		this._undo = function() {
			if (this.can_undo()) {
				var last_command = stack[index];
				last_command._undo();
				index -= 1;

				cjs.wait();
				this.$undo_description.invalidate();
				this.$redo_description.invalidate();
				cjs.signal();
			}
		};

		this._redo = function() {
			if (this.can_redo()) {
				var last_command = stack[index + 1];
				last_command._do();
				index += 1;

				cjs.wait();
				this.$undo_description.invalidate();
				this.$redo_description.invalidate();
				cjs.signal();
			}
		};


		this.can_undo = function() {
			return index >= 0;
		};

		this.can_redo = function() {
			return index < stack.length - 1;
		};

		this.get_undo_description = function() {
			if(this.can_undo()) {
				var last_command = stack[index];
				return last_command.to_undo_string();
			} else {
				return false;
			}
		};

		this.get_redo_description = function() {
			if(this.can_redo()) {
				var last_command = stack[index + 1];
				return last_command.to_redo_string();
			} else {
				return false;
			}
		};

		this.$undo_description = cjs(this.get_undo_description, {context: this});
		this.$redo_description = cjs(this.get_redo_description, {context: this});

		this.clear = function() {
			for(var i = 0; i<stack.length; i++) {
				stack[i].destroy();
			}
			stack = [];
			index = -1;

			cjs.wait();
			this.$undo_description.invalidate();
			this.$redo_description.invalidate();
			cjs.signal();
		};
		

		this.destroy = function() {
			this.clear();
			this.$undo_description.destroy();
			this.$redo_description.destroy();
		};
	};
}(interstate));
