(function (red) {
var cjs = red.cjs, _ = red._;

red.ContextualTemplate = function(options) {
	red.ContextualTemplate.superclass.constructor.apply(this, arguments);
	this._type = "template";
};

(function(my) {
	_.proto_extend(my, red.ContextualObject);
	var proto = my.prototype;
	proto.destroy = function() {
		my.superclass.destroy.apply(this, arguments);
	};
    
    proto.instances = function() {
        return [];
    };
}(red.ContextualTemplate));

}(red));