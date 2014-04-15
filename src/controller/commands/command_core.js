/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
    "use strict";
    var cjs = ist.cjs,
        _ = ist._;

    ist.Command = function (options) {
        this._in_effect = options && options.in_effect === true;
		this._undoable = true;
    };
    
    (function (My) {
        var proto = My.prototype;
		proto.is_undoable = function() {
			return this._undoable;
		};
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
        proto._do_destroy = function (in_effect) {};
        proto.to_undo_string = function () {
            return "Undo";
        };
        proto.to_redo_string = function () {
            return "Redo";
        };
    }(ist.Command));

}(interstate));
