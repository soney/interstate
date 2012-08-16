(function(red) {
var cjs = red.cjs, _ = cjs._;
var Command = function() {
};
(function(my) {
	var proto = my.prototype;
	proto._do = function() { };
	proto._undo = function() { };
}(Command));

red.Command = Command;
}(red));
