(function() {
	var symbols = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
	var time = (new Date()).getTime();


	var prefix_length = 6;
	var random_prefix = "$";
	var sym_length = symbols.length;
	for(var i = 0; i < prefix_length-2; i++) {
		var rand_index = Math.floor(Math.random()*sym_length);
		random_prefix += symbols[rand_index];
	}
	random_prefix += "_";

	var current_uid = 0;
	window.uid = function() {
		current_uid += 1;
		return random_prefix + current_uid;
	};

	window.uid.strip_prefix = function(uid_str) {
		return uid_str.slice(prefix_length);
	};
	window.uid.get_prefix = function() {
		return random_prefix;
	};
}());
