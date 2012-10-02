(function(red) {
var cjs = red.cjs, _ = red._;

var objs = [];
var descriptors = [];

red._set_descriptor = function(obj, desc) {
	var index = objs.indexOf(obj);
	if(index<0) {
		objs.push(obj);
		descriptors.push(desc);
	} else {
		descriptors[index] = desc;
	}
};
red._get_descriptor = function(obj) {
	var index = objs.indexOf(obj);
	if(index<0) {
		return undefined;
	} else {
		return descriptors[index];
	}
};
}(red));
