/*jslint nomen: true  vars: true */
/*global red,esprima,able,uid,console */

(function (red) {
    "use strict";
    var cjs = red.cjs,
        _ = red._;

    (function (my) {
        var proto = my.prototype;
        proto.on_create = function (events) {
            this.events = events;
            _.each(this.events, function (event) {
                event.on_fire(_.bind(function () {
                    this.fire.apply(this, arguments);
                }, this));
            }, this);
        };
    
        proto.destroy = function () {
            var args = arguments;
            _.each(this.events, function (event) {
                event.destroy.apply(event, args);
            });
        };
    
        proto.enable = function () {
            my.superclass.enable.apply(this, arguments);
            _.each(this.events, function (event) {
                event.enable();
            });
        };
        proto.disable = function () {
            my.superclass.disable.apply(this, arguments);
            _.each(this.events, function (event) {
                event.disable();
            });
        };
    }(red._create_event_type("combination")));
}(red));