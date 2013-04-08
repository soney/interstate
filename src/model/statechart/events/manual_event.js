/*jslint nomen: true  vars: true */
/*global red,esprima,able,uid,console */

(function (red) {
    "use strict";

    (function (proto) {
        proto.create_shadow = function (parent_statechart, context) {
            var shadow = red.create_event("manual");
            this.on_fire(function () {
                red.event_queue.wait();
                shadow.fire();
                red.event_queue.signal();
            });
            return shadow;
        };
    }(red._create_event_type("manual").prototype));

}(red));
