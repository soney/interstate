/*jslint nomen: true, vars: true */
/*global red,esprima,able,uid,console,window */

(function () {
	"use strict";
	var i;

	var symbols = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c",
					"d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p",
					"q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "A", "B", "C",
					"D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P",
					"Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];

	var time = (new Date()).getTime();

	var prefix_length = 6;
	var random_prefix = "$";
	var sym_length = symbols.length;
	for (i = 0; i < prefix_length - 2; i += 1) {
		var rand_index = Math.floor(Math.random() * sym_length);
		random_prefix += symbols[rand_index];
	}
	random_prefix += "_";
	//prefix_length = 0; random_prefix = "";

	var current_uid = 0;
	window.uid = function () {
		current_uid += 1;
		return random_prefix + current_uid;
	};

	window.uid.strip_prefix = function (uid_str) {
		return uid_str.slice(prefix_length);
	};
	window.uid.get_prefix = function () {
		return random_prefix;
	};
}());
