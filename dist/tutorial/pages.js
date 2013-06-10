var tutorial_pages = (function() {
	return [
		{
			editor: {
				text: "<p>This tutorial will teach you all you need to know to use the Euclase editor.<div class='directive'>Click 'next' to continue.</div></p>",
				on_enter: function($, post) {
					this.editor.hide();
				},
				on_exit: function($, post) {
					this.editor.show();
				}
			},
			runtime: {
			}
		}, {
			editor: {
				text: "<p>This is the <span style='color: #AFA'>editor</span> window. The other window is the <span style='color: #AAF'>runtime</span> window.<div class='directive'>Position these windows so you can see both simultaneously.</div></p>",
				on_enter: function($, post) {
					this.editor.hide();
					$("html").css("background-color", "#9B9");
					this.editor_text = $("<span />")	.text("(editor)")
														.css({
															"font-size": "3em"
														})
														.prependTo(document.body);
				},
				on_exit: function($, post) {
					$("html").css("background-color", "");
					this.editor.show();
					this.editor_text.remove();
					delete this.editor_text;
				}
			},
			runtime: {
				on_enter: function($, post) {
					$("html").css("background-color", "#99B");
					this.runtime_text = $("<span />")	.text("(runtime)")
														.css({
															"font-size": "3em"
														})
														.prependTo(document.body);
				},
				on_exit: function($, post) {
					$("html").css("background-color", "");
					this.runtime_text.remove();
					delete this.runtime_text;
				}
			}
		}, {
			editor: {
				text: "<p>Right now, you are looking at an <em>object</em> named <var>sketch</var> with 5 <em>properties</em>.<br />The value of every property is shown right next to its property name. For instance, <var>width</var> is <code>500</code>. If a property's value is an arrow, that property is another object.<div class='directive'>Click on <var>screen</var>.</div></p>",
				annotations: {
					"sketch": "highlight properties *"
				}
			},
			runtime: {
			}
		}, {
			editor: {
				text: "<p><var>screen</var> is an object represents the contents of the runtime window.<div class='directive'>Add a property to it and call it <var>my_circle</var>.</div><div class='note'>(note: Properties can be re-named by right clicking the property name and selecting 'rename')</div></p>"
			},
			runtime: {
			}
		}, {
			editor: {
				text: "<p>To say that we want <var>my_circle</var> to be a circle, we need to set its <var>prototypes</var> property to <code>shape.circle</code>. This means we <em>inherit</em> from <var>shape.circle</var>. The grey circle next to <var>prototypes</var> means that <var>prototypes</var> is not set.<div class='directive'>Click the grey circle and enter <code>shape.circle</code> into the blank. Press <kbd>enter</kbd> to confirm.</div></p>"
			},
			runtime: {
			}
		}, {
			editor: {
				text: "<p>The greyed out properties are inherited properties. Each of these properties controls some aspect of the circle. To <em>claim</em> an inherited property (make it your object's own), click its name.<div class='directive'>Claim <var>cx</var> and <var>cy</var> for <var>my_circle</var>.</div></p>"
			},
			runtime: {
			}
		}, {
			editor: {
				text: "<p><var>cx</var> and <var>cy</var> represent the center point of our circle. To change their value, edit the <em>cell</em> under the black dot to the right of the object name. Let's put <var>my_circle</var> in the middle of our sketch:<div class='directive'> Set <var>cx</var> to <code>sketch.width/2</code> and <var>cy</var> to <code>sketch.height/2</code>.</div></p>"
			},
			runtime: {
			}
		}, {
			editor: {
				text: "<p><div class='directive'>Change <var>fill</var> to <code>'yellow'</code>. Try with and without quotes.</div><div class='note'>Note: Without quotes, fill is undefined because it's looking for a property named <var>yellow</var>.</div></p>"
			},
			runtime: {
			}
		}, {
			editor: {
				text: "<p>Let's make <var>my_circle</var> red when the user clicks it.<div class='directive'>Add two new <em>states</em> to <var>my_circle</var> by clicking the <code>+</code> button twice.</div></p>"
			},
			runtime: {
			}
		}, {
			editor: {
				text: "<p>To rename a state, click on its name, type a new name, and press <kbd>enter</kbd>.<div class='directive'>Rename <var>state_1</var> to <var>pressed</var>.</div></p>"
			},
			runtime: {
			}
		}, {
			editor: {
				text: "<p>To specify that a property should have a value in a state, click the grey circle for that property's row and that state's column.<div class='directive'>Set <var>fill</var> to <code>'yellow'</code> in <var>init</var> and to <code>'red'</code> in <var>pressed</var>.</div></p>"
			},
			runtime: {
			}
		}, {
			editor: {
				text: "<p>To add a <em>transition</em> to specify when <var>my_circle</var> changes state, right click the state you are transitioning from, select 'Add Transition', and click the state to transition to.<div class='directive'>Add a transition from <var>init</var> to <var>pressed</var>.</p>"
			},
			runtime: {
			}
		}, {
			editor: {
				text: "<p>To set a transition's <em>event</em>, click the transition.<div class='directive'>Change our transition's event to <code>on('mousedown', my_circle)</code> so that it fires when the mouse presses on <var>my_circle</var>.</div></p>"
			},
			runtime: {
			}
		}, {
			editor: {
				text: "<p><div class='directive'>Press the mouse on <var>my_circle</var> in the runtime window. Watch closely what happens to <var>my_circle</var>'s state.</div></p>"
			},
			runtime: {
			}
		}, {
			editor: {
				text: "<p><var>my_circle</var> is stuck in the <var>pressed</var> state!<div class='directive'>Reset <var>my_circle</var>'s state by clicking (options) -> Reset</div></p>"
			},
			runtime: {
			}
		}, {
			editor: {
				text: "<p><div class='directive'>Add a transition from <var>pressed</var> to <var>init</var> with the event <code>on('mouseup')</code>. Play around with your app.</div><div class='note'>Note: that there is no target here, so we could release the mouse anywhere.</div></p>"
			},
			runtime: {
			}
		}, {
			editor: {
				text: "<p><div class='directive'>Make your color changes animated by setting <var>animated_properties</var> to <code>true</code>. Play around with your app.</div></p>"
			},
			runtime: {
			}
		}, {
			editor: {
				text: "<p>Objects can also have any number of copies. <div class='directive'>Make three copies of <var>my_circle</var> by clicking options -> copies, typing <code>['red', 'green', 'blue']</code>, and pressing <kbd>enter</kbd>.</div></p>"
			},
			runtime: {
			}
		}, {
			editor: {
				text: "<p>Note the properties <var>my_copy</var> and <var>copy_num</var> appear. <var>my_copy</var> is the object copy's item. <var>copy_num</var> is that item's index.<div class='directive'>Navigate through every copy by clicking the 1 in [1 of 3] below <var>my_circle</var>.</div></p>"
			},
			runtime: {
			}
		}, {
			editor: {
				text: "<p>Objects can inherit behaviors.<div class='directive'>Try inherititing from <var>hoverable</var> by setting <var>prototypes</var> to <code>[shape.circle, hoverable]</code>.</div> Note that it inherits not only the properties of <var>hoverable</var> but also its state machine.</p>"
			},
			runtime: {
				on_enter: function() {
					var env = this.env;
					env	.top()
						.set("hoverable", "<stateful>")
						.cd("hoverable")
							.add_state("not_hover")
							.start_at("not_hover")
							.add_state("hover")
							.add_transition("not_hover", "hover", "on('mouseover', this)")
							.add_transition("hover", "not_hover", "on('mouseout', this)")
							.set("is_hovering", "not_hover", "false")
							.set("is_hovering", "hover", "true")
							.up();
				}
			}
		}
	];
}());
