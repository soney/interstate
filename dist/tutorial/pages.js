var tutorial_pages = (function() {
	return [
		{
			editor: {
				text: "<p>This tutorial will teach you the basics of the <em>InterState</em> editor.</p>" +
						"<div class='directive'>Click 'next' to continue.</div>",
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
				text: "<p>This is the <span style='color: #7493a2'>editor</span> window and the other window is the <span style='color: #c1a562'>runtime</span> window.</p>" +
						"<div class='directive'>Position these windows so you can see both simultaneously. Place the <span style='color: #c1a562'>runtime</span> window in the top third of your screen and the <span style='color: #7493a2'>editor</span> window in the bottom two thirds.</div>",
				on_enter: function($, post) {
					this.editor.hide();
					$("html")	.css("background-color", "#7493a2")
								.css("background-image", "none");
					this.editor_text = $("<div />")	.text("editor")
													.css({ "font-size": "3em",
														"text-align": "center",
														"font-family": '"HelveticaNeue-UltraLight", "Helvetica Neue Ultra Light", "Helvetica Neue", Helvetica',
														"font-weight": "100",
														"padding-top": "30px",
														"color": "#f3f0e9"
													})
													.prependTo(document.body);
				},
				on_exit: function($, post) {
					$("html")	.css("background-color", "")
								.css("background-image", "");
					this.editor.show();
					this.editor_text.remove();
					delete this.editor_text;
				}
			},
			runtime: {
				on_enter: function($, post) {
					$("body").css("background-color", "#c1a562");
					this.runtime_text = $("<div />")	.text("runtime")
														.css({
															"font-size": "3em",
															"text-align": "center",
															"font-family": '"HelveticaNeue-UltraLight", "Helvetica Neue Ultra Light", "Helvetica Neue", Helvetica',
															"font-weight": "100",
															"padding-top": "30px",
															"color": "#f3f0e9"
														})
														.prependTo(document.body);
					$("svg").hide();
				},
				on_exit: function($, post) {
					$("body").css("background-color", "");
					$("svg").show();
					this.runtime_text.remove();
					delete this.runtime_text;
				}
			}
		}, {
			editor: {
				text: "<p>Right now, you are looking at an <em>object</em> named <var>sketch</var> with seven <em>properties</em> (highlighted in <span style='color:#d17702'>orange</span>).</p>" +
						"<p>The value of every property is shown right next to its property name. For instance, <var>width</var> is <code>500</code>. If a property's value is an arrow (<code>&gt;</code>), that property is another object. If the value is '(native function)', as it is for <var>on</var>, <var>find</var>, and <var>emit</var>, then the property is built-in and can't be modified.</p>" +
						"<p>You can refer to objects and their properties with the 'dot' syntax, as in: <code>sketch.screen</code></p>" +
						"<div class='directive'>Click on the <var>screen</var> property to view the <var>screen</var> object.</div>",
				on_enter: function($, post) {
					$(".prop_name").css("color", "#d17702");
				},
				on_exit: function($, post) {
					$(".prop_name").css("color", "");
				}
			}
		}, {
			editor: {
				text: "<p><var>screen</var> is an object that represents the contents of the runtime window.</p>" +
						"<div class='directive'>Add a property to it and call it <var>my_circle</var>.</div>" +
						"<div class='note'>note: properties can be re-named by right clicking the property name and selecting 'rename'</div>"
			}
		}, {
			editor: {
				text: "<p>To say that we want <var>my_circle</var> to be a circle, we need to set its <var>prototypes</var> property to <code>shape.circle</code>. This means we <em>inherit</em> from <var>shape.circle</var>. The grey circle next to <var>prototypes</var> means that <var>prototypes</var> is not set.</p>" +
						"<div class='directive'>Click the grey circle and enter <code>shape.circle</code> into the blank. Press <kbd>enter</kbd> to confirm. You should see a circle appear in your runtime window. In the editor, hover your mouse over the <var>my_circle</var> header or property row in <var>screen</var> to highlight it in the runtime window.</div>"
			}
		}, {
			editor: {
				text: "<p>The greyed out properties are <em>inherited</em> properties. These properties are inherited from the <var>shape.circle</var> (which you set <var>prototypes</var> to. You can navigate to <var>shape.circle</var> to see all of these properties' default values by clicking the blue link next to <var>prototypes</var>.</p>" +
						"<div class='directive'>Navigate to <var>shape.circle</var> and then back to <var>sketch.screen.my_circle</var>.</div>"
			}
		}, {
			editor: {
				text: "<p>Each of <var>my_circle</var>'s properties control some aspect of how <var>my_circle</var> is displayed on screen. To <em>override</em> an inherited property (make it your object's own so you can change it), click its name. To cancel overriding a property, right click that property's name and select delete.</p>" +
						"<div class='directive'>Override <var>cx</var>, <var>cy</var>, and <var>r</var> in <var>my_circle</var>. Then, 'delete' <var>r</var> so that it is once again an inherited property.</div>" +
						"<div class='note'>note: you can undo/redo edits by clicking menu in the top right corner of the editor or by pressing <kbd>CTRL+z</kbd> and <kbd>CTRL+SHIFT+Z</kbd> (<kbd>&#8984+Z</kbd> and <kbd>&#8984+SHIFT+Z</kbd> on a Mac)</div>"
			}
		}, {
			editor: {
				text: "<p>You should see three columns under <var>my_circle</var>. The leftmost column shows the property name, while the column immediately to the right of it shows that property's value. To the right of that is the <em>expression</em> that computes the property's value.</p>" +
						"<p><var>cx</var> and <var>cy</var> represent the center point of our circle. To change their value, edit the <em>cell</em> under the black dot to the right of the object name. Let's put <var>my_circle</var> in the middle of our sketch:</p>" +
						"<div class='directive'> Set <var>cx</var> to <code>sketch.width/2</code> and <var>cy</var> to <code>sketch.height/2</code>.</div>"
			}
		}, {
			editor: {
				text: "<div class='directive'>Change <var>fill</var> to <code>'yellow'</code>. Try with and without quotes.</div>" +
						"<div class='note'>note: without quotes, fill is <code>undefined</code> because it's looking for a property named <var>yellow</var> that doesn't exist.</div>"
			}
		}, {
			editor: {
				text: "<p>The space near the top of <var>my_circle</var> is dedicated to maintaining a <em>state machine</em>. A state machine tracks the status of <var>my_circle</var> at any given time. It consists of <em>states</em> to represent different statuses and <em>transitions</em> to specify how to go between states.</p>" +
						"<p>Let's make <var>my_circle</var> red when the user hovers it. We can represent this behavior with two states (one 'not hovering' and one for 'hovering')</p>" +
						"<div class='directive'>Add two <em>states</em> to <var>my_circle</var> by clicking the <code>+</code> button twice.</div>" +
						"<div class='note'>note: the black dot you saw before represents the 'start' transition. It specifies which state to start in and gets run immediately.</div>"
			}
		}, {
			editor: {
				text: "<p>These two states were given their default names. The <var>init</var> state is highlighted because it is the current state. To rename a state, click on its name, type a new name, and press <kbd>enter</kbd>.</p>" +
						"<div class='directive'>Rename <var>init</var> to <var>not_hover</var> and <var>state_1</var> to <var>hover</var>.</div>"
			}
		}, {
			editor: {
				text: "<p>To specify that a property should have a value in a state, click the grey circle for that property's row and that state's column.</p>" + 
						"<div class='directive'>Set <var>fill</var> to <code>'black'</code> in <var>not_hover</var> and to <code>'orange'</code> in <var>hover</var>.</div></p>" +
						"<div class='note'>note: the black dot represents the 'start' transition; it's a transition that gets run immediately to specify which state the state machine starts in. The value of <var>fill</var> in the start transition (black dot) will still be <code>'yellow'</code> but it immediately changes to 'black' when it enters the 'not_hover' state.</div>"
			}
		}, {
			editor: {
				text: "<p>Next, we need to add <em>transitions</em> to specify when <var>my_circle</var> changes state, right click the state you are transitioning from, select 'Add Transition', and click the state to transition to.</p>" +
						"<div class='directive'>Add a transition from <var>not_hover</var> to <var>hover</var>." +
						"<div class='note'>note: a column of grey dots appears under the transition's starting point to allow you to set properties' values for that transition. We won't use that feature in this tutorial (with the exception of the start transition represented by the black dot).</div>"
			}
		}, {
			editor: {
				text: "<p>To set a transition's <em>event</em>, click the transition's event text (currently <code>(event)</code>).</p>" +
						"<div class='directive'>Change our transition's event to <code>on('mouseover', this)</code> so that it fires when the mouse moves over <var>my_circle</var>.</div>"
			}
		}, {
			editor: {
				text: "<div class='directive'>Move your mouse over <var>my_circle</var> in the runtime window. Watch closely what happens to <var>my_circle</var>'s state.</div>" + 
						"<div class='note'>note: you may have to click the runtime window to give it focus.</div>"
			}
		}, {
			editor: {
				text: "<p><var>my_circle</var> is stuck in the <var>hover</var> state!</p>" +
						"<div class='directive'>Reset <var>my_circle</var>'s state by clicking (options) -> Reset under the object name</div>"
			}
		}, {
			editor: {
				text: "<div class='directive'>Add a transition from <var>hover</var> to <var>not_hover</var> with the event <code>on('mouseout', this)</code>. Play around with your app while watching what happens in the editor.</div>"
			}
		}, {
			editor: {
				text: "<div class='directive'>Make your color changes animated by setting <var>animated_properties</var> to <code>true</code>. Play around with your app.</div>"
			}
		}, {
			editor: {
				text: "<p>Events can also call functions on transitions by placing a semicolon after the event action. One useful function is the built-in <code>emit('event_type' [, target])</code> function. When <code>emit</code> is called, it 'emits' an event that can be detected by <code>on</code>.</p>" +
						"<div class='directive'>Change your mouseout event's code so that it says <code>on('mouseout', this) ; emit('hover_out', this)</code>.</div>"
			}
		}, {
			editor: {
				text: "<p>These emitted events can be used by other objects. Let's create a counter display whose number increases every time the user hovers over <var>my_circle</var>.</p>" +
						"<div class='directive'>Create a new object on <var>screen</var> called <var>message</var>. Make it inherit from <var>shape.text</var>, add a variable called <var>counter</var> whose initial value is <code>0</code>. Set the <var>text</var> property to be <code>'hover count: ' + counter</code>. Then, add a new state called <var>init</var> and a transition from <var>init</var> to itself whose event is <code>on('hover_out', my_circle)</code>. Finally, set <var>counter</var> to <code>counter+1</code> on that transition.</div>" +
						"<div class='note'>note 1: you may have to reset the state machine.</div>" +
						"<div class='note'>note 2: you could refer to <var>my_circle</var> as <var>my_circle</var>, <var>screen.my_circle</var>, or even <var>sketch.screen.my_circle</var>.</div>"
			}
		}, {
			editor: {
				text: "<p>Objects can also have any number of <em>copies</em>.</p>" +
						"<div class='directive'>Navigate back to <var>my_circle</var> and make three copies of <var>my_circle</var> by clicking options -> copies, typing <code>['red', 'green', 'blue']</code>, and pressing <kbd>enter</kbd>.</div>"
			}
		}, {
			editor: {
				text: "<p>Now, <var>my_circle</var> represents a set of objects instead of a single object (as indicated by the stack behind <var>my_circle</var>). Because the array that you just entered has three values (<code>'red'</code>, <code>'green'</code>, and <code>'blue'</code>), there are three copies of <var>my_circle</var>. Every copy also has two extra properties: <var>my_copy</var> &amp; <var>copy_num</var>. <var>my_copy</var> represents that copy's item (in this case, <code>'red'</code>, <code>'green'</code>, or <code>'blue'</code>). <var>copy_num</var> is that item's index (in this case, <code>0</code>, <code>1</code>, or <code>2</code>).</p>" +
					"<p>When you make edits to an object with multiple copies (like <var>my_circle</var>), then any edits you make affect <em>every copy</em>. However, you can depend on properties like <var>my_copy</var> or <var>copy_num</var> to make properties have different current values.</p>" +
					"<div class='directive'>Right now, all of the copies of <var>my_circle</var> are stacked on top of each other. Change that by setting <var>cy</var> to <code>20 + 2 * copy_num * r</code>. Then, set <var>fill</var> in <var>not_hover</var> to <code>my_copy</code></div>" +
					"<div class='note'>note: you can make cells larger while editing them by clicking and dragging their bottom right corner.</div>"
			}
		}, {
			editor: {
				text: "<p>Although the edits you make affect every copy of <var>my_circle</var>, you can only view the <em>current values</em> of its properties one copy at a time. Right now, you are looking at the first copy.</p>" +
						"<div class='directive'>Navigate through every copy by clicking the 0 in [0, length 3] below <var>my_circle</var>.</div>"
			}
		}, {
			editor: { // The find function can be used to find objects.
				text: "<p>The built-in <var>find(root)</var> function can be used to query objects. <var>find</var> accepts a <var>root</var> object to start at and returns a special 'query' object. Find uses 'chaining' to filter its query. For example, <code>find(my_circle).in_state('hover').eq(0)</code> returns every copy of <var>my_circle</var> in the <var>hover</var> state and returns the first one. This property will be <code>undefined</code> until you hover over an object.</p>"
						+ "<div class='directive'>Create a new object on screen that inherits from <var>shape.rect</var>. Set its <var>following</var> property to the expression <code>find(my_circle).in_state('hover').eq(0)</code> and make it follow the highlighted object by settings <var>y</var> property to <var>following.cy-following.r</var>.</div>"
			}
		}, {
			editor: {
				text: "<p>That's it for now. Press 'done' to close this overlay</p>"
			}
		}
			/*
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
		}, {
			editor: {
				text: "<p>That's it for now. Press 'done' to close this overlay</p>"
			}
			*/
			// opened up screen type
			// typed in shape.rectangle but didn't get anything, should get an error saying shape.rect is not defined
			// should be shape.rect, not shape.rectangle
			// in reference sheet, have a list of shapes...
			// and also, make topmost items appear on top insetad of bottom
			//
			// doesn't know how to link position to selected thumbnail, may be 
			//
			// want to allow users to click to open new object
			//
			// objects on top in screen should be on top
			// remove spell checking in cells
			// add tutorial on how to make box bigger
	];
}());
