/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console,window */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	ist.DOMEvent = function () {
		ist.Event.apply(this, arguments);
		this._initialize();
		this._type = "dom_event";
	};

	(function (My) {
		_.proto_extend(My, ist.Event);
		var proto = My.prototype;
		proto.on_create = function (specified_type, specified_targets) {
			this.get_target_listener = cjs.memoize(function (specified_target) {
				var self = this;
				var listener = function (event) {
					event.preventDefault();

					ist.event_queue.wait();

					event = _.extend({}, event, {
						ist_target: specified_target
					});

					self.fire(event);
					_.defer(function () {
						ist.event_queue.signal();
					});
				};
				listener.destroy = function() {
					self = null;
					delete listener.destroy;
				};
				return listener;
			}, {
				context: this,
				hash: function(args) {
					return _.map(args, function(x) {
						if(x instanceof ist.ContextualObject) {
							return x.hash();
						} else {
							return x+"";
						}
					}).join("");
				}
			});

			this.specified_targets = specified_targets;
			this.specified_type = specified_type;
			this.targets = [];

			this.live_fn = cjs.liven(function () {
				var type = cjs.get(this.specified_type);
				var targets = ist.get_targets(cjs.get(this.specified_targets));
				_.each(targets, function(target) { target.type = type; });

				var diff = _.diff(this.targets, targets, function(a, b) {
					return a.dom_obj === b.dom_obj && a.type === b.type;
				});
				_.each(diff.removed, function(x) { this.remove_listener(x.from_item); }, this);
				_.each(diff.added, function(x) { this.add_listener(x.item); }, this);

				this.targets = targets;
				//this.add_listeners();
			}, {
				context: this,
				run_on_create: false
			});
			//this.live_fn.run(false);
			//console.log(this.is_enabled());
			//debugger;
			//if(this.is_enabled()) {
				this.live_fn.run(false);
			//}
		};
		proto.clone = function () {
			return new My(this.type, this.targets);
		};
		proto.add_listeners = function () {
			_.each(this.targets, this.add_listener, this);
		};
		proto.add_listener = function(target_info) {
			var dom_obj = target_info.dom_obj,
				cobj = target_info.cobj;
			dom_obj.addEventListener(target_info.type, this.get_target_listener(cobj), false); // Bubble
		};
		proto.remove_listeners = function () {
			_.each(this.targets, this.remove_listener, this);
		};
		proto.remove_listener = function(target_info) {
			var dom_obj = target_info.dom_obj,
				cobj = target_info.cobj;
			dom_obj.removeEventListener(target_info.type, this.get_target_listener(cobj), false); // Bubble
		};
		proto.destroy = function () {
			this.live_fn.destroy(true);
			delete this.live_fn;
			this.remove_listeners();
			this.get_target_listener.each(function(target_listener) {
				target_listener.get().destroy();
			});
			this.get_target_listener.destroy(true);
			delete this.get_target_listener;
			delete this.targets;
			delete this.specified_targets;
			delete this.specified_type;
			My.superclass.destroy.apply(this, arguments);
		};

		proto.enable = function () {
			if(!this.is_enabled()) {
				this.add_listeners();
				if(this.live_fn.resume()) {
					this.live_fn.run();
				}
			}
			My.superclass.enable.apply(this, arguments);
		};
		proto.disable = function () {
			if(this.is_enabled()) {
				this.live_fn.pause();
				this.remove_listeners();
			}
			My.superclass.disable.apply(this, arguments);
		};

		ist.get_instance_targs = function(instance) {
			var dom_attachment = instance.get_attachment_instance("dom");
			if (dom_attachment) {
				var dom_obj = dom_attachment.get_dom_obj();
				if (dom_obj) {
					return {dom_obj: dom_obj, cobj: instance};
				}
			} else {
				var raphael_attachment = instance.get_attachment_instance("shape");
				if(raphael_attachment) {
					var robj = raphael_attachment.get_robj();
					if(robj) {
						return {dom_obj: robj[0], cobj: instance};
					}
				} else {
					var group_attachment_instance = instance.get_attachment_instance("group");
					if(group_attachment_instance) {
						return _.map(group_attachment_instance.get_children(), function(raphael_attachment) {
							var robj = raphael_attachment.get_robj();
							if(robj) {
								return {dom_obj: robj[0], cobj: instance};
							} else {
								return false;
							}
						});
					}
				}
			}
			return false;
		};

		ist.get_targets = function(targs) {
			if (!_.isArray(targs)) {
				targs = [targs];
			}
			return _.chain(targs)
					.map(function(targ) {
						if(targ instanceof ist.Query) {
							return targ.value();
						} else {
							return targ;
						}
					})
					.flatten(true)
					.map(function (target_cobj) {
						if (_.isElement(target_cobj) || target_cobj === window) {
							return {dom_obj: target_cobj, cobj: target_cobj};
						} else if (target_cobj instanceof ist.ContextualDict) {
							if (target_cobj.is_template()) {
								return _.chain(target_cobj.instances())
										.map(ist.get_instance_targs)
										.flatten(true)
										.value();
							} else {
								return ist.get_instance_targs(target_cobj);
							}
						} else {
							return false;
						}
					})
					.flatten(true)
					.compact()
					.value();
		};

	}(ist.DOMEvent));
	//var keyCodeToChar = {8:"Backspace",9:"Tab",13:"Enter",16:"Shift",17:"Ctrl",18:"Alt",19:"Pause/Break",20:"Caps Lock",27:"Esc",32:"Space",33:"Page Up",34:"Page Down",35:"End",36:"Home",37:"Left",38:"Up",39:"Right",40:"Down",45:"Insert",46:"Delete",48:"0",49:"1",50:"2",51:"3",52:"4",53:"5",54:"6",55:"7",56:"8",57:"9",65:"A",66:"B",67:"C",68:"D",69:"E",70:"F",71:"G",72:"H",73:"I",74:"J",75:"K",76:"L",77:"M",78:"N",79:"O",80:"P",81:"Q",82:"R",83:"S",84:"T",85:"U",86:"V",87:"W",88:"X",89:"Y",90:"Z",91:"Windows",93:"Right Click",96:"Numpad 0",97:"Numpad 1",98:"Numpad 2",99:"Numpad 3",100:"Numpad 4",101:"Numpad 5",102:"Numpad 6",103:"Numpad 7",104:"Numpad 8",105:"Numpad 9",106:"Numpad *",107:"Numpad +",109:"Numpad -",110:"Numpad .",111:"Numpad /",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"Num Lock",145:"Scroll Lock",182:"My Computer",183:"My Calculator",186:";",187:"=",188:",",189:"-",190:".",191:"/",192:"`",219:"[",220:"\\",221:"]",222:"'"};
	//var keyCharToCode = {"Backspace":8,"Tab":9,"Enter":13,"Shift":16,"Ctrl":17,"Alt":18,"Pause/Break":19,"Caps Lock":20,"Esc":27,"Space":32,"Page Up":33,"Page Down":34,"End":35,"Home":36,"Left":37,"Up":38,"Right":39,"Down":40,"Insert":45,"Delete":46,"0":48,"1":49,"2":50,"3":51,"4":52,"5":53,"6":54,"7":55,"8":56,"9":57,"A":65,"B":66,"C":67,"D":68,"E":69,"F":70,"G":71,"H":72,"I":73,"J":74,"K":75,"L":76,"M":77,"N":78,"O":79,"P":80,"Q":81,"R":82,"S":83,"T":84,"U":85,"V":86,"W":87,"X":88,"Y":89,"Z":90,"Windows":91,"Right Click":93,"Numpad 0":96,"Numpad 1":97,"Numpad 2":98,"Numpad 3":99,"Numpad 4":100,"Numpad 5":101,"Numpad 6":102,"Numpad 7":103,"Numpad 8":104,"Numpad 9":105,"Numpad *":106,"Numpad +":107,"Numpad -":109,"Numpad .":110,"Numpad /":111,"F1":112,"F2":113,"F3":114,"F4":115,"F5":116,"F6":117,"F7":118,"F8":119,"F9":120,"F10":121,"F11":122,"F12":123,"Num Lock":144,"Scroll Lock":145,"My Computer":182,"My Calculator":183,";":186,"=":187,",":188,"-":189,".":190,"/":191,"`":192,"[":219,"\\":220,"]":221,"'":222};
}(interstate));
