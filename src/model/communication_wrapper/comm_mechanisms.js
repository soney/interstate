/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console,window */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._,
		origin = window.location.protocol + "//" + window.location.host;
	
	ist.InterWindowCommWrapper = function(remote_window, client_id) {
		able.make_this_listenable(this);
		this.remote_window = remote_window;
		this.client_id = client_id;

		this.$on_message = _.bind(this.on_message, this);
		window.addEventListener("message", this.$on_message);
	};

	(function(My) {
		var proto = My.prototype;
		able.make_proto_listenable(proto);
		proto.on_message = function(event) {
			if(event.source === this.remote_window) {
				var data = event.data;
				if(data.client_id === this.client_id) {
					var message = data.message;
					this._emit(message.type, message);
				}
			}
		};
		proto.post = function(message, callback) {
			this.remote_window.postMessage({
				message: message,
				client_id: this.client_id
			}, origin);
			if(_.isFunction(callback)) {
				callback();
			}
		};
		proto.destroy = function() {
			window.removeEventListener("message", this.$on_messsage);
			delete this.$on_message;
		};
	}(ist.InterWindowCommWrapper));


	var same_window_comm_wrappers = [];
	ist.SameWindowCommWrapper = function(client_id, message_delay) {
		able.make_this_listenable(this);
		this.client_id = client_id;
		this.message_delay = message_delay;
		same_window_comm_wrappers.push(this);
	};

	(function(My) {
		var proto = My.prototype;
		able.make_proto_listenable(proto);

		proto.post = function(message, callback) {
			var len = same_window_comm_wrappers.length;
			var my_client_id = this.client_id;
			
			for(var i = 0; i<len; i++) {
				var same_window_comm_wrapper = same_window_comm_wrappers[i];
				if(this !== same_window_comm_wrapper &&
					same_window_comm_wrapper.client_id === my_client_id) {
					same_window_comm_wrapper.on_message(message);
				}
			}
			if(_.isFunction(callback)) {
				callback();
			}
		};

		proto.on_message = function(message) {
			if(this.message_delay || _.isNumber(this.message_delay)) {
				var message_delay = _.isNumber(this.message_delay) ? this.message_delay : 0;
				_.defer(_.bind(function() {
					this._emit(message.type, message);
				}, this), message_delay);
			} else {
				this._emit(message.type, message);
			}
		};

		proto.destroy = function() {
			for(var i = 0; i<same_window_comm_wrappers.length; i++) {
				if(same_window_comm_wrappers[i] === this) {
					same_window_comm_wrappers.splice(i, 1);
					i--;
				}
			}
		};
	}(ist.SameWindowCommWrapper));

	ist.SocketCommWrapper = function(client_id, is_server) {
		able.make_this_listenable(this);
		this.client_id = client_id;
		this.is_server = is_server;
		this.socket = io.connect(origin);
		this.socket.emit("comm_wrapper", this.client_id, this.is_server);
		this.$on_message = _.bind(this.on_message, this);
		this.socket.on("message", this.$on_message);
	};

	(function(My) {
		var proto = My.prototype;
		able.make_proto_listenable(proto);

		proto.on_message = function(data) {
			if(data.client_id === this.client_id) {
				this._emit(data.type, data.message);
			}
		};
		proto.post = function(message, callback) {
			this.socket.emit("message", {
				type: message.type,
				message: message,
				client_id: this.client_id
			});
			if(_.isFunction(callback)) {
				callback();
			}
		};
		proto.destroy = function() {
			this.socket.disconnect();
			delete this.socket;
		};
	}(ist.SocketCommWrapper));
}(interstate));
