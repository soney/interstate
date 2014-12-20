(function(ist) {
	module("Queries");

	function simulateClick(type, elem) {
		var evt = document.createEvent("MouseEvents");
			evt.initMouseEvent(type, true, true, window,
			0, 0, 0, 0, 0, false, false, false, false, 0, null);
		elem.dispatchEvent(evt);
	}


	var _ = ist._,
		tests = [
		{
			name: "Multi-copy queries",
			expect: 3,
			create_builtins: ["functions"],
			steps: [{
				setup: function(env) {
					env	.set("on", ist.on_event)
						.set("obj", "<stateful>")
						.cd("obj")
							.add_state("state1")
							.add_state("state2")
							.set_copies("5")
							.add_transition("state1", "state2", "on('ev'+my_copy)")
							.start_at("state1")
							.up()
						.set("query1", "find(obj).in_state('state1')");
				},
				test: function(env, runtime) {
					var cobj = ist.find_or_put_contextual_obj(env.get_pointer_obj(), env.pointer);
					equal(cobj.prop_val("query1").size(), 5);
					ist.emit('ev0');
					equal(cobj.prop_val("query1").size(), 4);
					ist.emit('ev3');
					equal(cobj.prop_val("query1").size(), 3);
				}
			}]
		},
		{
			name: "Query Inherits From",
			expect: 32,
			//expect: 2,
			create_builtins: ["functions"],
			steps: [{
				setup: function(env) {
					env	.set("A", "<stateful>")
						.cd("A")
							.set("obj", "<stateful>")
							.up()
						.set("B", "<stateful>")
						.cd("B")
							.set("(prototypes)", "(start)", "A")
							.up()
						.set("C", "<stateful>")
						.set("D", "<stateful>")
						.cd("D")
							.set("(prototypes)", "(start)", "B.obj")
							.up()
						.set("query", "find().inheritsFrom(A)")
						.set("query2", "find().inheritsFrom(B)")
						.set("query3", "find().inheritsFrom(A.obj)")
						.set("query4", "find().inheritsFrom(B.obj)")
						;
				},
				test: function(env, runtime) {
					ist.__log_errors = false;
					var cobj = ist.find_or_put_contextual_obj(env.get_pointer_obj(), env.pointer),
						A = cobj.prop_val("A"),
						B = cobj.prop_val("B"),
						C = cobj.prop_val("C"),
						D = cobj.prop_val("D"),
						getQ1Val = function() { return cobj.prop_val("query").value(); },
						getQ2Val = function() { return cobj.prop_val("query2").value(); },
						getQ3Val = function() { return cobj.prop_val("query3").value(); },
						getQ4Val = function() { var x = cobj.prop_val("query4"); return x ? x.value() : []; };
					//var c = ist.cjs(getQ4Val);
					//console.log(c);


					deepEqual(getQ1Val(), [B]);
					deepEqual(getQ2Val(), []);
					equal(getQ3Val().length, 0);
					equal(getQ4Val().length, 1);
					//console.log(getQ4Val());
					//equal(getQ4Val().length, 1);
					//var b_obj = B.prop_val("obj");

					//var afrom = ist.cjs(function() {
						//return B.get_all_protos();
					//});
					//var bfrom = ist.cjs(function() {
						//return D.inherits_from(b_obj);
					//});

					//var inheritsFromObj = x.inherits_from(cobj);

					//window.dbg1 = true;
					//console.log(c.get());
					//console.log("(before)");
					//console.log(afrom.get());
					//console.log(bfrom.get());
					env	.cd("B")
						.set("(prototypes)", "(start)", "")
						.top();
					//console.log("(after)");
					//console.log(c.get());
					//console.log(afrom.get());
					//console.log(bfrom.get());
					//window.dbg1 = false;

					deepEqual(getQ1Val(), []);
					deepEqual(getQ2Val(), []);
					equal(getQ3Val().length, 0);
					equal(getQ4Val().length, 0);

					env	.cd("C")
						.set("(prototypes)", "(start)", "B")
						.top();

					deepEqual(getQ1Val(), []);
					deepEqual(getQ2Val(), [C]);
					equal(getQ3Val().length, 0);
					equal(getQ4Val().length, 0);

					env	.cd("B")
						.set("(prototypes)", "(start)", "[A]")
						.top();

					deepEqual(getQ1Val(), [B, C]);
					deepEqual(getQ2Val(), [C]);
					equal(getQ3Val().length, 0);
					equal(getQ4Val().length, 1);

					env	.cd("C")
						.set("(prototypes)", "(start)", "[B, A]")
						.top();

					deepEqual(getQ1Val(), [B, C]);
					deepEqual(getQ2Val(), [C]);
					equal(getQ3Val().length, 0);
					equal(getQ4Val().length, 1);

					env	.cd("B")
						.set("(prototypes)", "(start)", "[]")
						.top();

					deepEqual(getQ1Val(), [C]);
					deepEqual(getQ2Val(), [C]);
					equal(getQ3Val().length, 0);
					equal(getQ4Val().length, 0);

					env	.cd("C")
						.set("(prototypes)", "(start)", "B")
						.top();

					deepEqual(getQ1Val(), []);
					deepEqual(getQ2Val(), [C]);
					equal(getQ3Val().length, 0);
					equal(getQ4Val().length, 0);

					env	.cd("C")
						.set("(prototypes)", "(start)", "")
						.top();

					deepEqual(getQ1Val(), []);
					deepEqual(getQ2Val(), []);
					equal(getQ3Val().length, 0);
					equal(getQ4Val().length, 0);
					ist.__log_errors = true;
					/**/
				}
			}]
		},
	];
	tests.forEach(function(test) {
		dt(test.name, test);
	});
}(interstate));
