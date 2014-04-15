/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console,window */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;


	ist.CollisionEvent = function (targa, targb) {
		ist.Event.apply(this, arguments);
		this._initialize();
		this._type = "collision";
	};

	(function (My) {
		_.proto_extend(My, ist.Event);
		var proto = My.prototype;
		proto.on_create = function (targa, targb) {
			var old_targa = [],
				old_targb = [],
				$notify = _.bind(this.notify, this);

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

				_.each(old_targa, function(ta) {
					var clisteners = ist.contact_listeners.get(ta),
						len = clisteners.length,
						cli, i;
					_.each(old_targb, function(tb) {
						for(i = 0; i<len; i++) {
							cli = clisteners[i];
							if(cli.target === tb) {
								if(len === 1) {
									ist.contact_listeners.remove(targa);
								} else {
									clisteners.splice(i, 1);
								}
								len--;
								break;
							}
						}
					}, this);
				}, this);

				_.each(new_targa, function(ta) {
					var clisteners = ist.contact_listeners.get_or_put(ta, function() {
						return [];
					});

					clisteners.push.apply(clisteners, _.map(new_targb, function(tb) {
						return {target: tb, callback: $notify};
					}, this));

				}, this);

				old_targa = new_targa;
				old_targb = new_targb;
			}, {
				context: this,
				//run_on_create: false
			});
		};
		proto.set_transition = function (transition) {
			this._transition = transition;
			if (transition) {
				var from = transition.from();

				from.on("active", this.enter_listener, this);
				from.on("inactive", this.leave_listener, this);
			}
		};
		proto.enter_listener = function() {
		};
		proto.leave_listener = function() {
		};
		proto.notify = function (contact) {
			ist.event_queue.wait();
			this.fire({
				type: "collision"
			});
			ist.event_queue.signal();
		};
		proto.destroy = function () {
			if(this._transition) {
			}
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
