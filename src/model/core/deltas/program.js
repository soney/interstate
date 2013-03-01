(function(red) {
var cjs = red.cjs, _ = red._;

red.ProgramDelta = function(options) {
	this.str = options.str;
};


(function(my) {
	_.proto_extend(my, red.Delta);
	var proto = my.prototype;
	proto.get_str = function() {
		return this.str;
	};
	proto.serialize = function() {
		return {
			str: this.str
		};
	};
	my.deserialize = function(info) {
		return new red.ProgramDelta({
			str: info.str
		});
	};
}(red.ProgramDelta));

}(red));
