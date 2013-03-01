(function(red) {
var cjs = red.cjs, _ = red._;

var delta_id = 0;
red.Delta = function() {
	this.id = delta_id++;
};


(function(my) {
	var proto = my.prototype;
	proto.serialize = function() {
		return {
			type: "delta"
		};
	};
	my.deserialize = function() {
		return new red.Delta();
	};
}(red.Delta);

}(red));
