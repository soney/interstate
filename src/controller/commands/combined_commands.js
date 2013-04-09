/*jslint nomen: true  vars: true */
/*global red,esprima,able,uid,console */

(function (red) {
    "use strict";
    var cjs = red.cjs,
        _ = red._;

    red.CombinedCommand = function (options) {
        red.CombinedCommand.superclass.constructor.apply(this, arguments);
        this._options = options || {};
        if (!this._options.commands) {
            throw new Error("Must specify commands!");
        }
        this._commands = options.commands;
    };
    (function (My) {
        _.proto_extend(My, red.Command);
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
            _.forEach(this._commands, function (command) {
                command.destroy(in_effect);
            });
        };
    
        red.register_serializable_type("combined_command",
            function (x) {
                return x instanceof My;
            },
            function () {
                var arg_array = _.toArray(arguments);
                return {
                    commands: red.serialize.apply(red, ([this._commands]).concat(arg_array))
                };
            },
            function (obj) {
                return new My({
                    commands: red.deserialize(obj.commands)
                });
            });
    }(red.CombinedCommand));

}(red));
