(function(red) {
var cjs = red.cjs, _ = red._;

red.ChangeCellCommand = function(options) {
	red.ChangeCellCommand.superclass.constructor.apply(this, arguments);
	this._options = options || {};

	if(!_.has(this._options, "cell")) {
		throw new Error("Must select a cell");
	}

	this._cell = this._options.cell;
	this._to_str = this._options.str;
};

(function(my) {
	_.proto_extend(my, red.Command);
	var proto = my.prototype;

	proto._execute = function() {
		this._from_str = this._cell.get_str();
		this._cell.set_str(this._to_str);
	};

	proto._unexecute = function() {
		this._cell.set_str(this._from_str);
	};

	red.register_serializable_type("change_cell_command",
									function(x) { 
										return x instanceof my;
									},
									function() {
										return {
											cell_uid: this._cell.uid,
											str: this._to_str,
										};
									},
									function(obj) {
										return new my({
											cell: red.find_uid(obj.cell_uid),
											str: obj.str
										});
									});

	proto._do_destroy = function(in_effect) { };
}(red.ChangeCellCommand));


}(red));
