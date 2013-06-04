var tutorial_pages = [
	{
		editor: {
			hide_editor: true,
			text: "This tutorial will teach you all you need to know to use the Euclase editor. Click 'next' to continue.",
		},
		runtime: {
		}
	}, {
		editor: {
			text: "This is the 'editor' window; the other window is the 'running' window. Position these windows so you can see both simultaneously.",
			hide_editor: true,
			body_color: "#9B9",
		},
		runtime: {
			body_color: "#99B"
		}
	}, {
		editor: {
			text: "Right now, you are looking at an object named 'sketch' with 5 properties. The value of every property is shown right next to its property name. Click on 'screen'",
			annotations: {
				"sketch": "highlight properties *"
			}
		},
		runtime: {
		}
	}, {
		editor: {
			text: "'screen' is another object that represents what is shown in the 'running' window. Add a property to it and call it 'my_circle'. (note: Properties can be re-named by right clicking and selecting 'rename')"
		},
		runtime: {
		}
	}, {
		editor: {
			text: "To say that we want my_circle to be a circle, we need to set its prototypes property to 'shape.circle'. This means we inherit from shape.circle. Click the grey circle and enter 'shape.circle' (no quotes) into the blank."
		},
		runtime: {
		}
	}, {
		editor: {
			text: "The greyed out properties are 'inherited' properties. Each of these properties controls some aspect of the circle. To 'claim' an inherited property (make it your object's own), click its name. Claim cx and cy in my_circle."
		},
		runtime: {
		}
	}, {
		editor: {
			text: "cx and cy represent the center point of our circle. To change their value, edit the 'cell' under the black dot. Let's put the circle in the middle of our sketch by setting cx to sketch.width/2 and cy to sketch.height/2."
		},
		runtime: {
		}
	}, {
		editor: {
			text: "While you're at it, change fill to 'yellow'. Try with and without quotes. Without quotes, fill is undefined because it's looking for a property named yellow."
		},
		runtime: {
		}
	}, {
		editor: {
			text: "Let's make our circle red when the user clicks it. Add two new 'states' to my_circle by clicking the + button twice."
		},
		runtime: {
		}
	}, {
		editor: {
			text: "To rename a state, click on its name, type a new name, and press enter. Rename state_1 to pressed."
		},
		runtime: {
		}
	}, {
		editor: {
			text: "To specify that a property should have a value in a state, click the grey circle for that property's row and that state's column. Set fill in init to 'yellow' and 'red' in pressed"
		},
		runtime: {
		}
	}, {
		editor: {
			text: "To add a 'transition' to specify when my_circle changes state, right click the state you are transitioning from, select 'Add Transition', and click the state to transition to. Add a transition from init to pressed."
		},
		runtime: {
		}
	}, {
		editor: {
			text: "To set a transition's event, click the transition. Change our transition's event to on('mousedown', my_circle) so that it fires when the mouse presses on my_circle."
		},
		runtime: {
		}
	}, {
		editor: {
			text: "Press the mouse on my_circle in the running window, watching closely what happens to my_circle's state."
		},
		runtime: {
		}
	}, {
		editor: {
			text: "my_circle is stuck in the pressed state! Reset my_circle's state machine by clicking options -> Reset"
		},
		runtime: {
		}
	}, {
		editor: {
			text: "Add a transition from pressed to init with the event on('mouseup'). Note that there is no target here, so we could release the mouse anywhere. When you are done, play around with your running app."
		},
		runtime: {
		}
	}, {
		editor: {
			text: "Make your color changes animated by setting the animated_properties to true."
		},
		runtime: {
		}
	}, {
		editor: {
			text: "Objects can also have any number of copies. Try making three copies of my_circle by clicking options -> copies, typing ['red', 'green', 'blue'], and pressing enter."
		},
		runtime: {
		}
	}, {
		editor: {
			text: "Note the properties my_copy and copy_num appear. my_copy is the object copy's item. copy_num is that item's index. You can navigate through every copy by clicking the 1 in [1 of 3] below 'my_circle'."
		},
		runtime: {
		}
	}, {
		editor: {
			text: "Finally, objects can inherit behaviors. Try creating another object on screen called my_other_circle. Set its prototypes field to my_circle. Note that it inherits not only the properties of my_circle but also the statechart."
		},
		runtime: {
		}
	}
];
