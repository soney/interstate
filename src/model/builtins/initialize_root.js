/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	ist.get_default_root = function(builtins) {
		var root = new ist.Dict({has_protos: false, direct_attachments: [new ist.DomAttachment({
																				instance_options: {
																					tag: 'div'
																				}
																			})]});

		ist.initialize_root(root, builtins);

		return root;
	};
	ist.initialize_root = function (root_dict, builtins) {
		if(builtins === false) {
			return;
		}

		if(!_.isArray(builtins) || (_.indexOf(builtins, "svg") >= 0)) {
			var svg = ist.createSvgObject();
			root_dict.set("svg", svg);
		}

		if(!_.isArray(builtins) || (_.indexOf(builtins, "dom") >= 0)) {
			var dom = ist.createDomObject();
			root_dict.set("dom", dom);
		}

		if(!_.isArray(builtins) || (_.indexOf(builtins, "functions") >= 0)) {
			root_dict.set("find", ist.find_fn);
		}

		if(!_.isArray(builtins) || (_.indexOf(builtins, "device") >= 0)) {
			var device = ist.createDevices();
			root_dict	.set("device", device)
						.set("timeout", new ist.Cell({str: "device.timeout"}))
						.set("mouse", new ist.Cell({str: "device.mouse"}))
						.set("key", new ist.Cell({str: "device.keyboard"}))
						.set("touch", new ist.Cell({str: "device.touchscreen.touch"}));
		}
		if(!_.isArray(builtins) || (_.indexOf(builtins, "event") >= 0)) {
			var event = new ist.Dict({has_protos: false, direct_attachments: [new ist.EventAttachment()]});
			event	.set("priority", new ist.Cell({str: "false"}))
					.set("fireDelay", new ist.Cell({str: "false"}))
					.set("eventGroup", new ist.Cell({str: "false"}));
			root_dict.set("event", event);
		}

		if(!_.isArray(builtins) || (_.indexOf(builtins, "physics") >= 0)) {
			var physics = new ist.Dict({has_protos: false});
			root_dict.set("physics", physics);

			var world = new ist.Dict({has_protos: false, direct_attachments: [new ist.WorldAttachment()]});
			physics.set("world", world);
			world.set("gx", new ist.Cell({str: "0.0"}));
			world.set("gy", new ist.Cell({str: "9.8"}));

			var fixture = new ist.Dict({has_protos: false, direct_attachments: [new ist.FixtureAttachment()]});
			physics.set("fixture", fixture);
			fixture.set("fixed", new ist.Cell({str: "true"}));
			fixture.set("restitution", new ist.Cell({str: "0.2"}));
			fixture.set("friction", new ist.Cell({str: "0.5"}));
			fixture.set("density", new ist.Cell({str: "1.0"}));
			fixture.set("world", new ist.Cell({str: "physics.world"}));
		}
	};
}(interstate));
