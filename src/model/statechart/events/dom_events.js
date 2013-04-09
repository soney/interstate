/*jslint nomen: true  vars: true */
/*global red,esprima,able,uid,console,window */

(function (red) {
    "use strict";
    var cjs = red.cjs,
        _ = red._;

    (function (my) {
        var proto = my.prototype;
        proto.on_create = function (type, targets) {
            var self = this;
            this.get_target_listener = cjs.memoize(_.bind(function (specified_target) {
                var listener = _.bind(function (event) {
                    red.event_queue.wait();
    
                    event = _.extend({}, event, {
                        red_target: specified_target
                    });
    
                    this.fire(event);
                    _.defer(function () {
                        red.event_queue.signal();
                    });
                }, this);
                return listener;
            }, this));
    
    
            this.live_fn = cjs.liven(function () {
                this.remove_listeners();
                this.type = cjs.get(type);
                var targs = cjs.get(targets);
                if (!_.isArray(targs)) {
                    targs = [targs];
                }
                this.targets = _.chain(targs)
                    .map(function (target_cobj) {
                        if (_.isElement(target_cobj) || target_cobj === window) {
                            return {dom_obj: target_cobj, cobj: target_cobj};
                        } else if (target_cobj instanceof red.ContextualDict) {
                            if (target_cobj.is_template()) {
                                var instances = target_cobj.instances();
                                return _.map(instances, function (instance) {
                                    var dom_attachment = instance.get_attachment_instance("dom");
                                    if (dom_attachment) {
                                        var dom_obj = dom_attachment.get_dom_obj();
                                        if (dom_obj) {
                                            return {dom_obj: dom_obj, cobj: instance};
                                        }
                                    }
                                    return false;
                                });
                            } else {
                                var dom_attachment = target_cobj.get_attachment_instance("dom");
                                if (dom_attachment) {
                                    var dom_obj = dom_attachment.get_dom_obj();
                                    if (dom_obj) {
                                        return {dom_obj: dom_obj, cobj: target_cobj};
                                    }
                                }
                            }
                        }
                        return false;
                    }, this)
                    .flatten(true)
                    .compact()
                    .value();
                this.add_listeners();
            }, {
                context: this
            });
        };
        proto.clone = function () {
            return red.create_event("dom", this.type, this.targets);
        };
        proto.add_listeners = function () {
            _.each(this.targets, function (target_info) {
                var dom_obj = target_info.dom_obj,
                    cobj = target_info.cobj;
                dom_obj.addEventListener(this.type, this.get_target_listener(cobj), false); // Bubble
            }, this);
        };
        proto.remove_listeners = function () {
            _.each(this.targets, function (target_info) {
                var dom_obj = target_info.dom_obj,
                    cobj = target_info.cobj;
                dom_obj.removeEventListener(this.type, this.get_target_listener(cobj), false); // Bubble
            }, this);
        };
        proto.destroy = function () {
            this.live_fn.destroy();
            this.remove_listeners();
        };
    
        proto.enable = function () {
            my.superclass.enable.apply(this, arguments);
            this.add_listeners();
            this.live_fn.resume().run();
        };
        proto.disable = function () {
            my.superclass.disable.apply(this, arguments);
            this.remove_listeners();
            this.live_fn.pause();
        };
    }(red._create_event_type("dom")));
}(red));
