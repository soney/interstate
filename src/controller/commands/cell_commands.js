/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console */

(function (red) {
    "use strict";
    var cjs = red.cjs,
        _ = red._;

    red.ChangeCellCommand = function (options) {
        red.ChangeCellCommand.superclass.constructor.apply(this, arguments);
        this._options = options || {};
    
        if (!this._options.cell || !this._options.str) {
            throw new Error("Must select a cell");
        }
    
        this._cell = this._options.cell;
		if(this._cell instanceof red.ContextualCell) {
			this._cell = this._cell.get_object();
		}
        this._to_str = this._options.str;
    };
    
    (function (My) {
        _.proto_extend(My, red.Command);
        var proto = My.prototype;
    
        proto._execute = function () {
            this._from_str = this._cell.get_str();
            this._cell.set_str(this._to_str);
        };
    
        proto._unexecute = function () {
            this._cell.set_str(this._from_str);
        };
    
        red.register_serializable_type("change_cell_command",
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
                    cell: red.find_uid(obj.cell_uid),
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
    }(red.ChangeCellCommand));


}(red));
