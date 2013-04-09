/*jslint nomen: true  vars: true */
/*global red,esprima,able,uid,console,window,Map */

(function (red) {
    "use strict";
    var cjs = red.cjs,
        _ = red._,
        origin = window.location.protocol + "//" + window.location.host;
    
    var summarize_arg = function (arg) { return arg; };
    var summarize_args = function (args) { return _.map(args, summarize_arg); };
    var chop = function (args) {
        return _.first(args, args.length - 1);
    };
    var last = function (args) {
        return _.last(args);
    };
    
    var pending_responses = {};
    var response_listeners = {};
    var wrapper_clients = {};
    
    var register_response_listener = function (id, listener) {
        if (pending_responses.hasOwnProperty(id)) {
            listener(pending_responses[id]);
            delete pending_responses[id];
        } else {
            response_listeners[id] = listener;
        }
    };
    
    var argeq = function (arg1, arg2) {
        return arg1 === arg2;
    };
    
    var MessageDistributionCenter = function () {
        able.make_this_listenable(this);
        window.addEventListener("message", _.bind(function (event) {
            var client;
            var data = event.data;
            if (data.type === "wrapper_server") {
                this._emit("message", data.message, event.source);
                var client_id = data.client_id;
                var server_message = data.server_message;
    
                var type = server_message.type;
                if (type === "changed") {
                    client = clients[client_id];
                    client.on_change.apply(client, server_message.getting);
                } else if (type === "emit") {
                    client = clients[client_id];
                    client.on_emit.apply(client, ([server_message.event_type]).concat(server_message.args));
                }
            } else if (data.type === "response") {
                data = event.data;
                var request_id = data.request_id,
                    response = data.response;
                if (response_listeners.hasOwnProperty(request_id)) {
                    response_listeners[request_id](response);
                    delete response_listeners[request_id];
                } else {
                    pending_responses[request_id] = response;
                }
            }
        }, this));
    };
    able.make_proto_listenable(MessageDistributionCenter.prototype);
    
    var cdc = new MessageDistributionCenter();
    
    
    var clients = {};
    
    var client_id = 0;
    var message_id = 0;
    
    red.WrapperClient = function (options) {
        able.make_this_listenable(this);
        this.server_window = options.server_window;
        this.cobj_id = options.cobj_id;
        this.obj_id = options.obj_id;
        this._type = options.type;
        this.object_summary = options.object_summary;
    
        this._id = client_id;
		client_id += 1;
        clients[this._id] = this;
    
        this.fn_call_constraints = new Map({
            hash: function (args) {
                return args[0];
            },
            equals: function (args1, args2) {
                var i, len = args1.length;
                if (len !== args2.length) {
                    return false;
                } else {
                    for (i = 0; i < len; i += 1) {
                        if (!argeq(args1[i], args2[i])) {
                            return false;
                        }
                    }
                    return true;
                }
            }
        });
    
        this.post({
            type: "register_listener",
            cobj_id: this.cobj_id
        });
    };
    
    (function (my) {
        var proto = my.prototype;
        able.make_proto_listenable(proto);
    
        proto.destroy = function () { };
        proto.post = function (message) {
            var m_id = message_id;
			message_id += 1;
            this.server_window.postMessage({
                type: "wrapper_client",
                client_id: this.id(),
                message: message,
                message_id: m_id,
                cobj_id: this.cobj_id
            }, origin);
            return m_id;
        };
        proto.id = function () { return this._id; };
        proto.type = function () { return this._type; };
    
        proto.async_get = function () { // doesn't store the value in a constraint; uses a callback when it's ready instead
            var args = summarize_args(_.first(arguments, arguments.length - 1));
            var callback = _.last(arguments);
    
            var request_id = this.post({
                type: "async_get",
                getting: args
            });
            register_response_listener(request_id, _.bind(function (value) {
                var processed_value = this.process_value(value);
                callback(processed_value);
            }, this));
        };
    
        proto.get_$ = function () {
            var args = summarize_args(arguments);
            var to_update = false;
            var constraint = this.fn_call_constraints.get_or_put(args, function () {
                var rv = new cjs.SettableConstraint();
                to_update = true;
                return rv;
            });
            if (to_update) {
                this.update(args);
            }
            return constraint.get();
        };
    
    
        proto.update = function (args) {
            var constraint = this.fn_call_constraints.get_or_put(args, function () {
                return new cjs.SettableConstraint();
            });
    
            var request_id = this.post({
                type: "get_$",
                getting: args
            });
            register_response_listener(request_id, _.bind(function (value) {
                var processed_value = this.process_value(value);
                constraint.set(processed_value);
            }, this));
        };
    
        proto.on_change = function () {
            var args = summarize_args(arguments);
            //var constraint = this.fn_call_constraints.get(args);
            //if (constraint) { constraint.invalidate(); }
            // Why update now when you can update when ready?
            
            this.update(args);
        };
        proto.on_emit = function (event_type) {
            var args = _.rest(arguments);
            args = this.process_value(args);
    
            this._emit.apply(this, ([event_type]).concat(args));
        };
        proto.process_value = function (value) {
            if (value && value.__type__ && value.__type__ === "summarized_obj") {
                var val = value.__value__;
                var object_summary, wrapper_client;
                if (val === "function") {
                    return "(native function)";
                } else if (val === "cjs_object") {
                    return "(native object)";
                } else if (val === "contextual_obj") {
                    object_summary = value.object_summary;
                    wrapper_client = red.get_wrapper_client(object_summary, this.server_window);
                    return wrapper_client;
                } else if (val === "state") {
                    object_summary = value.object_summary;
                    wrapper_client = red.get_wrapper_client(object_summary, this.server_window);
                    return wrapper_client;
                } else if (val === "transition") {
                    object_summary = value.object_summary;
                    wrapper_client = red.get_wrapper_client(object_summary, this.server_window);
                    return wrapper_client;
                } else if (val === "event") {
                    object_summary = value.object_summary;
                    wrapper_client = red.get_wrapper_client(object_summary, this.server_window);
                    return wrapper_client;
                } else if (val === "client_wrapper") {
                    return "(communication wrapper)";
                } else if (val === "constraint") {
                    return "(cjs constraint)";
                }
    
                return val;
            } else if (_.isArray(value)) {
                return _.map(value, _.bind(this.process_value, this));
            } else if (_.isObject(value)) {
                var rv = {};
                _.each(value, function (v, k) { rv[k] = this.process_value(v); }, this);
                return rv;
            } else {
                return value;
            }
        };
    }(red.WrapperClient));
        
    red.get_wrapper_client = function (object_summary, server_window) {
        var cobj_id = object_summary.id;
        if (wrapper_clients.hasOwnProperty(cobj_id)) {
            return wrapper_clients[cobj_id];
        } else {
            var otype = object_summary.type;
            var rv;
    
            var obj_id = object_summary.obj_id;
            rv = new red.WrapperClient({
                server_window: server_window,
                cobj_id: cobj_id,
                obj_id: obj_id,
                type: otype,
                object_summary: object_summary
            });
    
            wrapper_clients[cobj_id] = rv;
            return rv;
        }
    };
}(red));
