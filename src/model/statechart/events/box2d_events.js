/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console,window */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;


	ist.CollisionEvent = function (targa, targb) {
		ist.Event.apply(this, arguments);
		//this._initialize();
		this._type = "collision";
	};

	(function (My) {
		_.proto_extend(My, ist.Event);
		var proto = My.prototype;
		proto.on_create = function (targa, targb) {
			var old_targa = [],
				$notify = _.bind(this.notify, this);

			this.remove_listeners = function() {
				_.each(old_targa, function(ta) {
					var listeners = ist.contact_listeners.get(ta) || [];
					for(var i = listeners.length - 1; i >= 0; i--) {
						if(listeners[i].callback === $notify) { listeners.splice(i, 1); }
					}
					if(listeners.length === 0) { ist.contact_listeners.remove(ta); }
				});
				old_targa = [];
			};

			this.live_fn = cjs.liven(function () {
				var new_targa, new_targb;

				if(targa instanceof ist.ContextualDict && targb instanceof ist.ContextualDict) {
					if(targa.is_template()) {
						new_targa = targa.instances();
					} else {
						new_targa = [targa];
					}

					if(targb.is_template()) {
						new_targb = targb.instances();
					} else {
						new_targb = [targb];
					}
				} else {
					new_targa = new_targb = [];
				}

				this.remove_listeners();

				_.each(new_targa, function(ta) {
					var clisteners = ist.contact_listeners.get_or_put(ta, function() {
						return [];
					});

					clisteners.push.apply(clisteners, _.map(new_targb, function(tb) {
						return {target: tb, callback: $notify};
					}, this));

				}, this);

				old_targa = new_targa;
			}, {
				context: this,
				//run_on_create: false
			});
		};
		proto.notify = function (contact) {
			if(!this.is_enabled()) { return; }
			this.fire({
				type: "collision"
			});
			//ist.event_queue.signal();
		};
		proto.destroy = function () {
			this.disable();
			this.live_fn.destroy();
			this.remove_listeners();
			My.superclass.destroy.apply(this, arguments);
		};

		proto.enable = function () {
			My.superclass.enable.apply(this, arguments);
		};
		proto.disable = function () {
			My.superclass.disable.apply(this, arguments);
		};
	}(ist.CollisionEvent));
}(interstate));
