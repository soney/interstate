(function() {
var cjs = red.cjs;

module("OBJ Skeleton");

test('Shadow Statecharts', function() {
	expect(0);
	var sc = cjs.create("statechart")
				.add_state("A")
				.add_state("B");
	var shadow = red._shadow_statechart(sc);
	console.log(sc.stringify());
});

}());
