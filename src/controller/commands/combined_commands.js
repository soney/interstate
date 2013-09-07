/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
    "use strict";
    var cjs = ist.cjs,
        _ = ist._;

    ist.CombinedCommand = function (options) {
        ist.CombinedCommand.superclass.constructor.apply(this, arguments);
        this._options = options || {};
        if (!this._options.commands) {
            throw new Error("Must specify commands!");
        }
        this._commands = options.commands;
    };
    (function (My) {
        _.proto_extend(My, ist.Command);
        var proto = My.prototype;
    
        proto._execute = function () {
            _.forEach(this._commands, function (command) {
                command._do();
            });
        };
        proto._unexecute = function () {
            _.forEach(this._commands.reverse(), function (command) {
                command._undo();
            });
        };
        proto._do_destroy = function (in_effect) {
			My.superclass._do_destroy.apply(this, arguments);
            _.forEach(this._commands, function (command) {
                command.destroy(in_effect);
            });
			delete this._options;
			delete this._commands;
        };
    
        ist.register_serializable_type("combined_command",
            function (x) {
                return x instanceof My;
            },
            function () {
                var arg_array = _.toArray(arguments);
                return {
                    commands: ist.serialize.apply(ist, ([this._commands]).concat(arg_array))
                };
            },
            function (obj) {
                return new My({
                    commands: ist.deserialize(obj.commands)
                });
            });
    }(ist.CombinedCommand));

}(interstate));
