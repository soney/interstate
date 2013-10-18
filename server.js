#!/usr/bin/env node

var devel_mode = true;

var express = require('express');
var fs = require('fs');
var ejs = require('ejs');
var sass = require("node-sass");
var ist_inc = require('./include_libs');

var app = express();
if(devel_mode) {
	ist_inc.main = ist_inc.main_src;
} else {
	ist_inc.main = ist_inc.main_build;
}
var text_after = function(str, portion) {
	var index = str.lastIndexOf(portion);
	if(index >= 0) {
		return str.slice(index + portion.length);
	} else {
		return null;
	}
};
var text_before = function(str, portion) {
	var index = str.lastIndexOf(portion);
	if(index >= 0) {
		return str.substring(0, index + portion.length);
	} else {
		return null;
	}
};

var callback_map = function(arr, func, callback) {
	var rv = [];
	var waiting_for = arr.length;
	arr.forEach(function(item, index) {
		func(item, function(mapped) {
			rv[index] = mapped;
			waiting_for--;
			if(waiting_for <= 0) {
				callback(rv);
			}
		});
	});
};

app.configure(function() {
	express.static.mime.define({'application/font-woff': ['woff']});
	express.static.mime.define({'font/truetype': ['ttf']});
	express.static.mime.define({'font/opentype': ['otf']});
	express.static.mime.define({'application/vnd.ms-fontobject': ['eot']});

	app.use(app.router);
	app.use(sass.middleware({
		src: __dirname
	}));
	app.use(express.static(__dirname));
	app.set('view engine', 'ejs');

	app.get("*.ejs.html*|/", function(req, res, next) {
		var relative_url = req.originalUrl.slice(1); //remove the initial '/'
		var filename;
		if(relative_url === "") {
			filename = "index.ejs.html";
		} else {
			filename = text_before(relative_url, ".ejs.html");
		}

		get_file_string(filename, function(str) {
			if(!str) {
				next();
			} else {
				var num_slashes = (relative_url.split('/').length-1);
				var relative_path = "";
				for(var i = 0; i<num_slashes; i++) {
					relative_path += "../";
				}
				var locals = {
					ist_include: function(files) {
						return ist_inc.include_templates(files.map(function(file) {
							return relative_path+file;
						}));
					}
					, ist_inc: ist_inc
				};

				
				var body = ejs.render(str, {cache: false, locals: locals});
				res.writeHead(200, {
					  'Content-Type': 'text/html'
					, 'Content-Length': body.length
				});
				res.end(body);
			}
		});
	});
});

app.listen(8000);
console.log("Interactive times at http://localhost:8000/");
process.on('SIGINT', function () {
	console.log("iao...");
	process.exit(0);
});


var filter_regex = /\.(js|html|css|swp)$/; // include swp files because they are added and removed when files get edited...for some reason,
											// edits aren't otherwise detected
var cp = require('child_process');
/*
var watch = require('node-watch');
watch(['src/_vendor/cjs/src'], function(filename) {
	if(filter_regex.test(filename)) {
		var grunt = cp.spawn('grunt', [], {
			cwd: 'src/_vendor/cjs'
		});

		grunt.stdout.on('data', function(data) {
			// relay output to console
			console.log("%s", data)
		});
	}
});
watch(['dist', 'src/model', 'src/controller', 'src/view'], function(filename) {
	if(filter_regex.test(filename)) {
		var grunt = cp.spawn('grunt', ['quick'])

		grunt.stdout.on('data', function(data) {
			// relay output to console
			console.log("%s", data)
		});
	}
});
*/

var spawn_build_cjs = function() {
	var grunt = cp.spawn('grunt', [], {
		cwd: 'src/_vendor/cjs'
	});

	grunt.stdout.on('data', function(data) {
		// relay output to console
		console.log("%s", data)
	});
	grunt.on('close', function() {
		setTimeout(spawn_build, 1000);
	});
};

var spawn_build = function() {
	var grunt = cp.spawn('grunt', ['quick'])

	grunt.stdout.on('data', function(data) {
		// relay output to console
		console.log("%s", data)
	});
	grunt.on('close', function() {
		//setTimeout(spawn_build_cjs, 1000);
		setTimeout(spawn_build, 2000);
	});
};
//spawn_build();

var render_files = function(res, files) {
	concat_files(files, function(str) {
		res.writeHead(200, {
		  'Content-Length': str.length,
		  'Content-Type': 'text/javascript' });
		res.end(str);
	});
};

var concat_files = function(file_list, callback) {
	if(typeof file_list === "string") file_list = [file_list];
	var current_index = 0;
	var rv = "";
	var get_curr = function() {
		get_file_string(file_list[current_index], function(str) {
			rv += str;
			current_index++;
			if(current_index >= file_list.length) {
				callback(rv);
			} else {
				get_curr();
			}
		});
	};
	get_curr();
};

var get_file_string = function(path, callback) {
	fs.readFile(path, 'ascii', function(err, data) {
		callback(data);
	});
};
var io = require('socket.io').listen(80);

io.sockets.on('connection', function (socket) {
});
