(function(ist) {
	var cjs = ist.cjs;

	module("Utilities");

	test("Map diff", function() {
		var md;
		md = ist.get_map_diff(['a'], ['a'], [1], [1]);
		equal(md.set.length, 0);
		equal(md.unset.length, 0);
		equal(md.key_change.length, 0);
		equal(md.value_change.length, 0);

		md = ist.get_map_diff(['a'], ['b'], [1], [1]);
		equal(md.set.length, 0);
		equal(md.unset.length, 0);
		equal(md.key_change.length, 1);
		equal(md.value_change.length, 0);

		md = ist.get_map_diff(['a','b','c'], ['b'], [1,2,3], [2]);
		equal(md.set.length, 0);
		equal(md.unset.length, 2);
		equal(md.key_change.length, 0);
		equal(md.value_change.length, 0);

		md = ist.get_map_diff(['b'], ['a','b','c'], [2], [1,2,3]);
		equal(md.set.length, 2);
		equal(md.unset.length, 0);
		equal(md.key_change.length, 0);
		equal(md.value_change.length, 0);

		md = ist.get_map_diff(['b', 'a', 'c'], ['a','b','c'], [2,1,3], [1,2,3]);
		equal(md.set.length, 0);
		equal(md.unset.length, 0);
		equal(md.key_change.length, 0);
		equal(md.value_change.length, 0);

		md = ist.get_map_diff(['a'], ['b','c','a'], [undefined], [undefined,undefined,undefined]);
		equal(md.set.length, 2);
		equal(md.unset.length, 0);
		equal(md.key_change.length, 0);
		equal(md.value_change.length, 0);

		md = ist.get_map_diff(['a', 'b', 'c'], ['a','b','c'], [2,1,3], [1,2,3]);
		equal(md.set.length, 0);
		equal(md.unset.length, 0);
		equal(md.value_change.length, 2);
		equal(md.key_change.length, 0);

		md = ist.get_map_diff(['c', 'a', 'd'], ['a','b','c'], [2,3,1], [1,2,3]);
		equal(md.set.length, 1);
		equal(md.unset.length, 1);
		equal(md.key_change.length, 0);
		equal(md.value_change.length, 2);
	});
	asyncTest("Remote Constraints", function() {
		expect(3);
		var comm_wrapper1 = new ist.SameWindowCommWrapper();
		var comm_wrapper2 = new ist.SameWindowCommWrapper();
		var x = cjs(1);
		var constraint_server = new ist.RemoteConstraintServer(x);
		var constraint_client = new ist.RemoteConstraintClient(constraint_server.id());
		constraint_server.set_communication_mechanism(comm_wrapper1);
		constraint_client.set_communication_mechanism(comm_wrapper2);
		equal(constraint_client.get(), 1);
		x.set(2);
		equal(constraint_client.get(), 2);
		comm_wrapper1.destroy();
		comm_wrapper2.destroy();
		x.destroy();
		window.setTimeout(function() {
			take_snapshot(["interstate.", "ist."], function(response) {
				ok(true, "Make sure nothing was allocated");
				start();
			});
		}, 50);
	});
	
	asyncTest("State Allocation", function() {
		expect(1);
		var sc = new ist.State();
		sc.addSubstate("state_1");
		sc.addSubstate("state_2");
		//sc.print();
		window.setTimeout(function() {
			//sc.print();
			sc.destroy();
			sc = null;
			take_snapshot(["interstate.", "ist."], function(response) {
				ok(true, "Make sure nothing was allocated");
				start();
			});
		}, 50);
	});
	asyncTest("Environment Collection", function() {
		expect(2);
		var the_div = $("<div />").appendTo(document.body);
		var env = new ist.Environment({builtins: true});
		env	.set("screen", "<stateful>")
			.cd("screen")
				.set("(prototypes)", "(start)", "svg.paper")
				.set("my_circle", "<stateful>")
				.cd("my_circle")
					.add_state("init")
					.add_state("hover")
					.start_at("init")
					.add_transition("init", "hover", "on('mouseover', this)")
					.add_transition("hover", "init", "on('mouseout', this)")
					.set("(prototypes)", "init", "svg.circle");
					env.set("fill")
					.set("fill", "init", "'red'")
					.set("fill", "hover", "'blue'")
		;
		//env.print();
		var root = env.get_root();
		the_div.dom_output({
			root: root,
			editor_url: window.location.protocol + "//" + window.location.host + "/src/view/editor/editor.ejs.html"
		});

		window.setTimeout(function() {
			equal($("circle", the_div).size(), 1);
			the_div.dom_output("destroy");
			env.destroy();
			env = null;
			the_div.remove();
			take_snapshot(["interstate.", "ist."], function(response) {
				ok(!response.illegal_strs, "Make sure nothing was allocated");
				start();
			});
		}, 500);
	});
	asyncTest("Communication Wrapper", function() {
		expect(3);
		var env = new ist.Environment({builtins: true});

		var pss = new ist.ProgramStateServer({
			root: env.get_root(),
			command_stack: env._command_stack
		});

		var comm_wrapper1 = new ist.SameWindowCommWrapper();
		pss.set_communication_mechanism(comm_wrapper1);
		var comm_wrapper2 = new ist.SameWindowCommWrapper();
		var psc = new ist.ProgramStateClient({
			comm_mechanism: comm_wrapper2
		});
		psc.on_loaded();

		var root_client = psc.root_client;

		psc.root_client.async_get("children", function(children) {
			var croot = ist.find_or_put_contextual_obj(env.get_root());
			var env_children = croot.children();

			ok(env_children.length === children.length);
			for(var i = 0; i<children.length; i++) {
				if(env_children[i].name !== children[i].name) {
					throw new Error();
				}
			}
			env.set("x", 20);
			psc.root_client.async_get("children", function(children) {
				var croot = ist.find_or_put_contextual_obj(env.get_root());
				var env_children = croot.children();

				ok(env_children.length === children.length);
				for(var i = 0; i<children.length; i++) {
					if(env_children[i].name !== children[i].name) {
						throw new Error();
					}
				}

				psc.destroy();
				pss.destroy();
				comm_wrapper1.destroy();
				comm_wrapper2.destroy();
				env.destroy();
				root_client = psc = pss = comm_wrapper1 = comm_wrapper2 = env = null;

				take_snapshot(["interstate.", "ist."], function(response) {
					ok(!response.illegal_strs, "Make sure nothing was allocated");
					start();
				});
			});
		});
	});

	asyncTest("Pointer Bucket Collection", function() {
		expect(5);
		ist.__garbage_collect = false;
		var root = new ist.Dict();
		var a_dict = new ist.Dict();
		var b_dict = new ist.Dict();
		var c_dict = new ist.Dict();
		var croot = ist.find_or_put_contextual_obj(root);
		root.set("a", a_dict);
		root.set("b", b_dict);
		root.set("c", c_dict);
		var ca_dict = croot.prop("a");
		var cb_dict = croot.prop("b");
		var cc_dict = croot.prop("c");
		equal(ca_dict.get_object(), a_dict);
		equal(cb_dict.get_object(), b_dict);
		equal(cc_dict.get_object(), c_dict);
		root.unset("a");
		equal(croot.prop("a"), undefined);
		croot.destroy();
		root.destroy();
		a_dict.destroy();
		a_dict = b_dict = croot = c_dict = root = null;
		if(interstate.__debug && interstate._.keys(interstate.cobj_hashes).length>0) {
			debugger;
		}

		take_snapshot(["interstate.", "ist."], function(response) {
			ok(!response.illegal_strs, "Make sure nothing was allocated");
			start();
			ist.__garbage_collect = true;
		});
	});

	/**/
}(interstate));
