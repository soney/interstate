(function(red) {
var cjs = red.cjs, _ = cjs._;

var id = 0;
var RedDict = function(options) {
	options = options || {};

	//Properties
	this._direct_props = cjs.create("map");

	// Prototypes
	this._implicit_protos = options.implicit_protos || [];
	if(options.direct_protos) { this._direct_protos = options.direct_protos; }
	else { this._direct_protos = cjs.create("constraint", [], true); }

	this.type = "red_dict";
	this.id = id++;
};

(function(my) {
	var proto = my.prototype;
	
	//
	// === DIRECT PROTOS ===
	//
	proto.set_protos = proto._set_direct_protos = function(protos) {
		this._direct_protos.set(protos);
	};
	proto._get_direct_protos = function() {
		return this._direct_protos.get();
	};
	//
	// === ALL PROTOS ===
	//
	proto.get_protos = proto._get_all_protos = function() {
		var direct_protos = this._get_direct_protos();
		var protos = _.map(direct_protos, function(direct_proto) {
			if(_.isUndefined(direct_proto)) { return false; };
			
			return ([direct_proto]).concat(direct_proto._get_all_protos());
		});
		protos = _.compact(_.flatten(protos, true));
		return protos;
	};
	
	//
	// === DIRECT PROPERTIES ===
	//
	proto.set = proto.set_prop = proto._set_direct_prop = function(name, value, index) {
		this._direct_props.set(name, value, index);
	};
	proto.unset = proto.unset_prop = proto._unset_direct_prop = function(name) {
		this._direct_props.unset(name);
	};
	proto._get_direct_prop = function(name) {
		return this._direct_props.get(name);
	};
	proto._has_direct_prop = function(name) {
		return this._direct_props.has_key(name);
	};
	proto.move = proto.move_prop = proto._move_direct_prop = function(name, to_index) {
		this._direct_props.move(name, to_index);
	};
	proto.index = proto.prop_index = proto._direct_prop_index = function(name) {
		return direct_props.key_index(name);
	};
	proto.rename = proto._rename_direct_prop = function(from_name, to_name) {
		if(this._has_direct_prop(to_name)) {
			throw new Error("Already a property with name " + to_name);
		} else {
			this._direct_props.rename(from_name, to_name);
		}
	};


	//
	// === FULLY INHERITED PROPERTIES ===
	//
	
	proto._get_inherited_prop = function(prop_name) {
		var protos = this._get_all_protos();
		for(var i = 0; i<protos.length; i++) {
			var protoi = protos[i];
			if(protoi._has_direct_prop(prop_name)) {
				return protoi._get_direct_prop(prop_name);
			}
		}
		return undefined;
	};
	proto._get_all_inherited_props = function(prop_name) {
		var rv = [];
		var protos = this._get_all_protos();
		for(var i = 0; i<protos.length; i++) {
			var protoi = protos[i];
			if(protoi._has_direct_prop(prop_name)) {
				rv.push(protoi._get_direct_prop(prop_name));
			}
		}
		return rv;
	};
	proto._has_inherited_prop = function(prop_name) {
		var protos = this._get_all_protos();
		for(var i = 0; i<protos.length; i++) {
			var protoi = protos[i];
			if(protoi._has_direct_prop(prop_name)) {
				return true;
			}
		}
		return false;
	};
	
	
	//
	// === PROPERTIES ===
	//
	proto.get_prop = function(prop_name) {
		if(this._has_direct_prop(prop_name)) {
			return this._get_direct_prop(prop_name);
		} else {
			return this._get_inherited_prop(prop_name);
		}
	};
	proto.has_prop = function(prop_name) {
		if(this._has_direct_prop(prop_name)) {
			return true;
		} else if(this._has_inherited_prop(prop_name)) {
			return true;
		} else {
			return false;
		}
	};
	proto.get = proto.prop_val = function(prop_name, context) {
		var val = this.get_prop(prop_name);
		if(context instanceof red.RedContext) {
			context = context.push(this);
		} else {
			context = cjs.create("red_context", {stack: [this]});
		}
		return red.get_contextualizable(val, context);
	};
}(RedDict));

red.RedDict = RedDict;
cjs.define("red_dict", function(options) {
	var dict = new RedDict(options);
	return dict;
});
}(red));
