/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
    "use strict";
    var cjs = ist.cjs,
        _ = ist._;

    ist.ChangeCellCommand = function (options) {
        ist.ChangeCellCommand.superclass.constructor.apply(this, arguments);
        this._options = options || {};
    
        if (!this._options.cell || !_.isString(this._options.str)) {
            throw new Error("Must select a cell");
        }
    
        this._cell = this._options.cell;
		if(this._cell instanceof ist.ContextualCell) {
			this._cell = this._cell.get_object();
		}
        this._to_str = this._options.str;
    };
    
    (function (My) {
        _.proto_extend(My, ist.Command);
        var proto = My.prototype;
    
        proto._execute = function () {
            this._from_str = this._cell.get_str();
            this._cell.set_str(this._to_str);
			if(!this._cell.is_substantiated()) {
				this._cell.substantiate();
			}
        };
    
        proto._unexecute = function () {
            this._cell.set_str(this._from_str);
        };
    
        ist.register_serializable_type("change_cell_command",
            function (x) {
                return x instanceof My;
            },
            function () {
                return {
                    cell_uid: this._cell.id(),
                    str: this._to_str
                };
            },
            function (obj) {
                return new My({
                    cell: ist.find_uid(obj.cell_uid),
                    str: obj.str
                });
            });
    
        proto._do_destroy = function (in_effect) {
			My.superclass._do_destroy.apply(this, arguments);
			delete this._options;
			delete this._cell;
			delete this._from_str;
			delete this._to_str;
		};
    }(ist.ChangeCellCommand));


}(interstate));
