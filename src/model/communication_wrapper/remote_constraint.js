/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console,jQuery,window */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	
	var rc_id = 0,
		CONSTRAINT_SERVER = "constraint_server",
		CONSTRAINT_CLIENT = "constraint_client",
		CHANGED_TYPE = "changed";

	var RemoteConstraintServer = function(comm_mechanism, value) {
		this.comm_mechanism = comm_mechanism;
		this._id = rc_id++;
		if(cjs.isConstraint(value)) {
			this.value = value;
		} else {
			this.value = value;
		}

		this.$onChange = _.bind(this.onChange, this);
		this.$onMessage = _.bind(this.onMessage, this);

		this.comm_mechanism.on("message", this.$on_message);
		this.value.onChange(this.$onChange);
	};
	(function(my) {
		var proto = my.prototype;
		proto.id = function() { return this._id; };
		proto.onChange = function() {
			this.comm_mechanism.post({
				type: CONSTRAINT_SERVER,
				subtype: CHANGED_TYPE,
				server_id: this._id
			});
		};
		proto.onMessage = function(message) {
			if(message.type === CONSTRAINT_CLIENT && message.server_id === this._id) {
			}
		};
	}(RemoteConstraintServer));

	var RemoteConstraintClient = function(comm_mechanism, server_id) {
		this.comm_mechanism = comm_mechanism;
		this.server_id = server_id;
		this.$on_message = _.bind(this.on_message, this);
		this.comm_mechanism.on("message", this.$on_message);
		this.$value = cjs();
	};
	(function(my) {
		var proto = my.prototype;

		proto.on_message = function(message) {
			if(message.type === "wrapper_server") {
				
			}
			if(message.server_id === this.server_id) {
			}
		};
		proto.get = function() {
		};
	}(RemoteConstraintClient));


	ist.RemoveConstraintServer = RemoteConstraintServer;
	ist.RemoteConstraintClient = RemoteConstraintClient;
}(interstate, jQuery));
