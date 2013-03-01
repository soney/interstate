(function(red) {
var cjs = red.cjs, _ = red._;

red.ProgramDelta = function(options) {
	this.str = options.str;
};

(function(my) {
	var proto = my.prototype;
	proto.serialize = function() {
		return {
			str: this.str
		};
	};
	my.deserialize = function(info) {
		return new red.ProgramDelta(info.str);
	};
}(red.ProgramDelta);
}(red));
