/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console */

(function (red) {
    "use strict";
    var cjs = red.cjs,
        _ = red._;

    red.Command = function () {
        this._in_effect = false;
    };
    
    (function (My) {
        var proto = My.prototype;
        proto._do = function () {
            this._in_effect = true;
            this._execute();
        };
        proto._undo = function () {
            this._in_effect = false;
            this._unexecute();
        };
        proto.destroy = function () {
            this._do_destroy(this.in_effect());
        };
        proto.in_effect = function () {
            return this._in_effect;
        };
    
        proto._execute = function () { };
        proto._unexecute = function () { };
        proto._do_destroy = function (in_effect) { };
        proto.to_undo_string = function () {
            return "Undo generic command";
        };
        proto.to_redo_string = function () {
            return "Redo generic command";
        };
    }(red.Command));

}(red));
