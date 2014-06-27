(function(ist) {
	module("Performance");

	function getTime() {
		return (new Date()).getTime();
	}
	function median(values) {
		values.sort( function(a,b) {return a - b;} );

		var half = Math.floor(values.length/2);

		if(values.length % 2) {
			return values[half];
		} else {
			return (values[half-1] + values[half]) / 2.0;
		}
	}

	var trials = 1,
		tests = [{
			name: "Number of Copies",
			do_setup: function(env, n) {
				env	.set("obj", "<stateful>")
					.cd("obj")
						.set("(prototypes)", "(start)", "dom.div")
						.set("(copies)", n+"")
						.set("textContent", "(start)", "'not yet set'")
						.top();
			},
			do_test: function(env, n) {
				env	.cd("obj")
					.set("textContent", "(start)", "'target'")
					.top();
			},
			do_cleanup: function(env, n) {
				env	.unset("obj")
					.top();
			},
			verify: function(env, n, out_parent) {
				var output = $("> div > div", out_parent);
				if(output.length === n) {
					for(var i = 0; i<output.length; i++) {
						if($(output[i]).text()!=='target') {
							return false;
						}
					}
					return true;
				}
				return false;
			},
			N: 120,
			trials: trials
		}, {
			name: "Number of Prototypes",
			do_setup: function(env, n) {
				var protos_list = [];
				for(var i = 0; i<n; i++) {
					env	.set("proto_"+i, "<stateful>")
						.cd("proto_"+i)
							//.set("show", "(start)", "false");

					if(i === 0) {
						env.set("(prototypes)", "(start)", "dom.div");
					}

					env.top();
					protos_list.push("proto_" + i);
				}

				var protos_str = "[" + protos_list.join(",") + "]";

				env	.set("obj", "<stateful>")
					.cd("obj")
						.set("(prototypes)", "(start)", protos_str)
						//.set("show", "(start)", "true")
						.top();
			},
			do_test: function(env, n) {
				env	.cd("proto_0")
						.set("textContent", "'target'")
						.top();
			},
			do_cleanup: function(env, n) {
				//env.print();
				env	.unset("obj");
				for(var i = 0; i<n; i++) {
					env.unset("proto_"+i);
				}
				env.top();
			},
			verify: function(env, n, out_parent) {
				var output = $("> div > div", out_parent);
				if(output.length === 2) {
					for(var i = 0; i<output.length; i++) {
						if($(output[i]).text()!=='target') {
							return false;
						}
					}
					return true;
				}
				return false;
			},
			N: 240,
			trials: trials
		}, {
			name: "Prototypes chain",
			do_setup: function(env, n) {
				var protos_list = ["dom.div"];
				for(var i = 0; i<n; i++) {
					env	.set("proto_"+i, "<stateful>")
						.cd("proto_"+i)
							.set("(prototypes)", "(start)", (i===0 ? "dom.div" : ("proto_"+(i-1))))
							.set("show", "(start)", "false")
							.top();
					protos_list.push("proto_" + i);
				}

				var protos_str = "proto_" +(n-1);

				env	.set("obj", "<stateful>")
					.cd("obj")
					.set("(prototypes)", "(start)", protos_str)
						.set("show", "(start)", "true")
						.top();
			},
			do_test: function(env, n) {
				env	.cd("proto_0")
						.set("textContent", "'target'")
						.top();
			},
			do_cleanup: function(env, n) {
				env	.unset("obj");
				for(var i = n-1; i>=0; i--) {
					env.unset("proto_"+i);
				}
				env.top();
			},
			verify: function(env, n, out_parent) {
				var output = $("> div > div", out_parent);
				if(output.length === 1) {
					for(var i = 0; i<output.length; i++) {
						if($(output[i]).text()!=='target') {
							return false;
						}
					}
					return true;
				}
				return false;
			},
			N: 6,
			trials: trials
		}];

		if(QUnit.config.benchmarks) {
			tests.forEach(function(test_info) {
				var i = 0,
					startTime,
					ens,
					time;

				if($.isArray(test_info.N)) {
					ens = test_info.N;
				} else {
					ens = [test_info.N];
				}

				ens.forEach(function(n) {
					var trials = [];
					while(i < test_info.trials) {
						trials.push(i+1);
						i++;
					}
					trials.forEach(function(trial_number) {
						var trial_name = test_info.name + " (N=" + n + ", trial "+ trial_number + ")";

						dt(trial_name, {
							name: trial_name,
							expect: 1,
							steps: [{
								setup: function(env) {
									test_info.do_setup(env, n);
									startTime = getTime();
									if(QUnit.config.profile_benchmarks) {
										console.profile(trial_name);
									}
									test_info.do_test(env, n);
									if(QUnit.config.profile_benchmarks) {
										console.profileEnd(trial_name);
									}
									time = getTime() - startTime;
									$("#perf_results").append(
										$("<span />")	.text(time+"ms")
														.css({
															"padding-left": "3px",
															"padding-right": "3px"
														})
									);
								},

								test: function(env, output) {
									ok(test_info.verify(env, n, output));
									test_info.do_cleanup(env, n);
								}
							}]
						});
					});
				});
			});
		} else {
			$("#perf_results").remove()
		}

	/**/
}(interstate));
