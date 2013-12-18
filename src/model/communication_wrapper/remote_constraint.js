/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console,jQuery,window */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;
	
	var rc_id = 0,
		CONSTRAINT_SERVER = "constraint_server",
		CONSTRAINT_CLIENT = "constraint_client",
		CHANGED_TYPE = "changed",
		GET_TYPE = "get",
		VALUE_TYPE = "value",
		DESTROY_SERVER_TYPE = "destroy_server",
		DESTROY_CLIENT_TYPE = "destroy_client";

	var RemoteConstraintServer = function(comm_mechanism, value) {
		this.comm_mechanism = comm_mechanism;
		this._id = rc_id++;
		this.message_signature = "rc_" + this._id;
		this.value = cjs(function() {
			return ist.summarize_value_for_comm_wrapper(cjs.get(value));
		});

		this.$onChange = _.bind(this.onChange, this);
		this.$onMessage = _.bind(this.onMessage, this);

		this.comm_mechanism.on(this.message_signature, this.$onMessage);
		this.value.onChange(this.$onChange);
	};
	(function(my) {
		var proto = my.prototype;
		proto.id = function() { return this._id; };
		proto.onChange = function() {
			this.comm_mechanism.post({
				type: this.message_signature,
				subtype: CHANGED_TYPE
			});
		};
		proto.onMessage = function(message) {
			if(message.subtype === GET_TYPE) {
				this.comm_mechanism.post({
					type: this.message_signature,
					subtype: VALUE_TYPE,
					value: this.value.get(),
					client_id: message.client_id
				});
			}
		};
		proto.destroy = function() {
			this.comm_mechanism.post({
				type: this.message_signature,
				subtype: DESTROY_SERVER_TYPE
			});
			this.comm_mechanism.off(this.message_signature, this.$on_message);
			this.value.offChange(this.$onChange);
			this.value.destroy(true);
		};
	}(RemoteConstraintServer));

	var client_id = 0;
	var RemoteConstraintClient = function(comm_mechanism, server_id) {
		this.comm_mechanism = comm_mechanism;
		this._id = client_id++;
		this.server_id = server_id;
		this.message_signature = "rc_" + this.server_id;

		this.$onMessage = _.bind(this.onMessage, this);
		this.comm_mechanism.on(this.message_signature, this.$onMessage);
		this.$value = cjs();
		this.requestUpdate();
	};
	(function(my) {
		var proto = my.prototype;

		proto.requestUpdate = function() {
			this.comm_mechanism.post({
				type: this.message_signature,
				subtype: GET_TYPE,
				client_id: this._id
			});
		};

		proto.get = function() {
			if(!this.$value.isValid()) {
				this.requestUpdate();
			}
			return this.$value.get();
		};
		proto.onMessage = function(message) {
			switch(message.subtype) {
				case VALUE_TYPE:
					this.$value.set(message.value);
					break;
				case CHANGED_TYPE:
					this.$value.invalidate();
					break;
			}
		};
		proto.destroy = function() {
			this.comm_mechanism.post({
				type: this.message_signature,
				subtype: DESTROY_CLIENT_TYPE
			});
			this.$value.destroy(true);
			this.comm_mechanism.off(this.message_signature, this.$on_message);
		};
	}(RemoteConstraintClient));

	ist.RemoveConstraintServer = RemoteConstraintServer;
	ist.RemoteConstraintClient = RemoteConstraintClient;

	var summarize_value = ist.summarize_value_for_comm_wrapper = function (value, avoid_dict_followup) {
		var rv;
		if (value instanceof ist.ContextualObject) {
			var id = value.id();
			var type = value.type();
			var object_summary = {
				type: type,
				id: id,
				obj_id: value.get_object().id(),
				colloquial_name: value.get_colloquial_name(),
				name: value.get_name()
			};

			if((type === "dict" || type === "stateful") && avoid_dict_followup !== true) {
				var is_template = value.is_template();
				var is_instance;
				var template, index, instances;

				if(is_template) {
					is_instance = index = template = false;
					instances = value.instances();
				} else {
					instances = false;
					is_instance = value.is_instance();
					if(is_instance) {
						var template_info = value.get_template_info();
						template = template_info.cobj;
						index = template_info.index;
					} else {
						template = index = false;
					}
				}
				object_summary.is_template = is_template;
				object_summary.is_instance = is_instance;
				object_summary.template = summarize_value(template, true);
				object_summary.instances = instances ? _.map(instances, function(x) { return summarize_value(x, true); }) : instances;
				object_summary.index = index;
			}
			rv = {
				__type__: "summarized_obj",
				__value__: "contextual_obj",
				object_summary: object_summary
			};
		} else if (value instanceof ist.StartState) {
			rv = {
				__type__: "summarized_obj",
				__value__: "state",
				object_summary: {
					type: 'start_state',
					id: value.id()
				}
			};
		} else if (value instanceof ist.Statechart) {
			rv = {
				__type__: "summarized_obj",
				__value__: "state",
				object_summary: {
					type: 'statechart',
					id: value.id()
				}
			};
		} else if (value instanceof ist.StatechartTransition) {
			rv = {
				__type__: "summarized_obj",
				__value__: "transition",
				object_summary: {
					type: 'transition',
					id: value.id()
				}
			};
		} else if (value instanceof ist.Event) {
			rv = {
				__type__: "summarized_obj",
				__value__: "event",
				object_summary: {
					type: 'event',
					id: value.id(),
					event_type: value.type()
				}
			};
		} else if (value instanceof ist.Cell) {
			rv = {
				__type__: "summarized_obj",
				__value__: "contextual_obj",
				object_summary: {
					type: 'raw_cell',
					id: value.id()
				}
			};
		} else if (value instanceof ist.WrapperClient) {
			rv = {
				__type__: "summarized_obj",
				__value__: "client_wrapper"
			};
		} else if (cjs.isConstraint(value)) {
			rv = {
				__type__: "summarized_obj",
				__value__: "constraint"
			};
		} else if (_.isArray(value)) {
			rv = _.map(value, summarize_value);
		} else if (_.isFunction(value)) {
			rv = {
				__type__: "summarized_obj",
				__value__: "function"
			};
		} else if (_.isElement(value)) {
			rv = {
				__type__: "summarized_obj",
				__value__: "dom_elem"
			};
		} else if (window.Box2D && value instanceof Box2D.Dynamics.b2World) {
			rv = {
				__type__: "summarized_obj",
				__value__: "box2d_world"
			};
		} else if(value instanceof ist.ParsedFunction) {
			rv = {
				__type__: "summarized_obj",
				__value__: "function"
			};
		} else if (_.isObject(value)) {
			rv = {};
			_.each(value, function (v, k) { rv[k] = summarize_value(v); });
		} else {
			rv = value;
		}
		return rv;
	};
}(interstate, jQuery));
