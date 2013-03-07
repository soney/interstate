(function() {
	var start_chars = ["(", "[", "{", "'", '"'];
	var end_chars =   [")", "]", "}", "'", '"'];

	var is_balanced = function(counts) {
		for(var i = counts.length-1; i>=0; i--) {
			if(counts[i] !== 0) {
				return false;
			}
		}
		return true;
	};

	window.aware_split = function(str) {
		var counts = new Array(start_chars.length);
		for(var i = start_chars.length - 1; i>=0; i--) {
			counts[i] = 0;
		}

		var rv = [];
		var rv_len = 0;
		var str_len = str.length;
		var char;
		var balanced = true;
		var curr_str = "";
		for(var i = 0; i<str_len; i++) {
			char = str[i];

			if(char === " " && balanced) {
				rv[rv_len++] = curr_str;
				curr_str = "";
			} else {
				curr_str += char;
				var endCharIndex = end_chars.indexOf(char);
				if(endCharIndex >= 0) {
					counts[endCharIndex]--;
					if(counts[endCharIndex] === -1 && (char === "'" || char === '"')) {
						counts[endCharIndex] = 1;
						balanced = false;
					}
				} else {
					var startCharIndex = start_chars.indexOf(char);
					if(startCharIndex >= 0) {
						counts[startCharIndex]++;
						balanced = is_balanced(counts);
					}
				}
			}
		}
		rv.push(curr_str);
		return rv;
	};
}());
