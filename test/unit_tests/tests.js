/*
test( "Cell", function() {
	var c = new red.Cell({str: "1+1"});
	var val = c.get_value();
	console.log(c);
});
*/
console.log("Tests");

window.postMessage({ type: "FROM_PAGE", command: "snapshot" }, "*");

