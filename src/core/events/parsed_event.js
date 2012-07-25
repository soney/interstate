(function(red) {
var cjs = red.cjs, _ = cjs._;
var esprima = window.esprima;

var context = {};

var dom_events = ["click", "dblclick", "mousedown", "mouseup", "mouseover", "mousemove", "mouseout", "keydown", "keypress", "keyup", "load", "unload", "abort", "error", "resize", "scroll", "select", "change", "submit", "reset", "focus", "blur", "DOMFocusIn", "DOMFocusOut", "DOMActivate", "DOMSubtreeModified", "DOMNodeInserted", "DOMNodeRemoved", "DOMNodeRemovedFromDocument", "DOMNodeInsertedIntoDocument", "DOMAttrModified", "DOMCharacterDataModified", "cut", "copy", "paste", "beforecut", "beforecopy", "beforepaste", "afterupdate", "beforeupdate", "cellchange", "dataavailable", "datasetchanged", "datasetcomplete", "errorupdate", "rowenter", "rowexit", "rowsdelete", "rowinserted", "contextmenu", "drag", "dragstart", "dragenter", "dragover", "dragleave", "dragend", "drop", "selectstart", "help", "beforeunload", "stop", "beforeeditfocus", "start", "finish", "bounce", "beforeprint", "afterprint", "propertychange", "filterchange", "readystatechange", "losecapture", "touchstart", "touchend", "touchmove", "touchenter", "touchleave", "touchcancel"];


_.forEach(dom_events, function(dom_event) {
	context[dom_event] = function(parent) {
		return parent.addEventListener(dom_event);
	};
});

var get_event = function(node) {
	var type = node.type;
	if(type === "ExpressionStatement") {
		return get_event(node.expression);
	} else if(type === "CallExpression") {
		console.log(node);
	}
};


(function(proto) {
	proto.on_create = function(str) {
		this.set_str(str);
	};
	proto.clone = function() {
		return red.create_event("parsed", this.str);
	};
	proto.set_str = function(str) {
		this._str = str;
		this._update_tree();
		this._update_value();
		return this;
	};
	proto.get_str = function() { return this._str; };
	proto._update_tree = function() {
		this._tree = esprima.parse(this.get_str());
	};
	proto._update_value = function() {
		this._event = get_event(this._tree.body[0]);
	};
}(red._create_event_type("parsed").prototype));
}(red));
