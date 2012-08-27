(function(red) {
var cjs = red.cjs, _ = cjs._;

var id = 0;
var RedAttachment = function(options) {
	options = options || {};
};

(function(my) {
	var proto = my.prototype;
}(RedAttachment));

red.RedAttachment = RedAttachment;
cjs.define("red_attachment", function(options) {
	var attachment = new RedAttachment(options);
	return attachment;
});
}(red));
