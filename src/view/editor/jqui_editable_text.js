/*jslint nomen: true, vars: true, white: true */
/*global interstate,esprima,able,uid,console,window,jQuery,Raphael */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;
	
	var editing_text_template = cjs.createTemplate("<textarea cjs-on-blur=on_edit_blur cjs-on-keydown=on_edit_keydown />");

	cjs.registerCustomPartial("editing_text", {
		createNode: function(init_val) {
			var node = editing_text_template({
				on_edit_blur: function(event) {
					event.preventDefault();
					event.stopPropagation();

					var $node = $(node),
						e = new $.Event("confirm_value");

					e.value = $node.val();
					$node.trigger(e);
				},
				on_edit_keydown: function(event) {
					var keyCode = event.keyCode,
						$node = $(node);

					if(keyCode === 27) { //esc
						event.preventDefault();
						event.stopPropagation();

						var e = new $.Event("cancel_value");
						$node.trigger(e);
					} else if(keyCode === 13) { //enter
						if(!event.shiftKey && !event.ctrlKey && !event.metaKey) {
							event.preventDefault();
							event.stopPropagation();

							var e = new $.Event("confirm_value");
							e.value = $node.val();
							$node.trigger(e);
						}
					}
				}
			});
			return node;
		},
		onAdd: function(node, init_val) {
			_.defer(function() { $(node).val(init_val).select().focus(); });
		},
		onRemove: function(node) {
		},
		destroyNode: function(node) {
		}
	});
}(interstate, jQuery));
