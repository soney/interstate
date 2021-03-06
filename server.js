#!/usr/bin/env node

var devel_mode = true;

var express = require('express'),
	fs = require('fs'),
	ejs = require('ejs'),
	sass = require("node-sass"),
	sass_middleware = require("node-sass-middleware"),
	ist_inc = require('./include_libs'),
	http = require("http"),
	child_process = require('child_process');

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

	express.static.mime.define({'application/font-woff': ['woff']});
	express.static.mime.define({'font/truetype': ['ttf']});
	express.static.mime.define({'font/opentype': ['otf']});
	express.static.mime.define({'application/vnd.ms-fontobject': ['eot']});

	//app.use(app.router);
	app.set('view engine', 'ejs');

	app.get("/e/:uid", function(req, res, next) {
		res.redirect("../src/view/editor/editor.ejs.html?comm=socket&client_id="+req.params.uid);
	});
	app.get("/auto_open_editor", function(req, res, next) {
		child_process.exec('open -a /Applications/Google\\ Chrome\\ Canary.app http://'+addresses[0]+':8000/e/'+req.param('client_id'), function callback(error, stdout, stderr){
		});
		var body = "";
		res.writeHead(200, {
			  'Content-Type': 'text/html'
			, 'Content-Length': body.length
		});
		res.end(body);
	});
	app.get("*.ejs.html*|/", function(req, res, next) {
		var relative_url = req.originalUrl.slice(1); //remove the initial '/'
		var filename;
		if(relative_url === "") {
			filename = "index.ejs.html";
		} else {
			filename = text_before(relative_url, ".ejs.html");
		}
		filename = "" + filename;

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
					ist_include: function(files, ignore_css) {
						return ist_inc.include_templates(files.map(function(file) {
							return relative_path+file;
						}), ignore_css);
					},
					ist_inc: ist_inc,
					addr: addresses[0]
				};

				
				var body = ejs.render(str, locals);
				//{cache: false, locals: locals});
				res.writeHead(200, {
					'Content-Type': 'text/html',
					'Content-Length': body.length
				});
				res.end(body);
			}
		});
	});
	app.use(sass_middleware({
		src: __dirname
	}));
	app.use(express.static(__dirname));

var server = http.createServer(app);
server.listen(8000);
process.on('SIGINT', function () {
	console.log("iao...");
	process.exit(0);
});

var filter_regex = /\.(js|html|css|swp)$/; // include swp files because they are added and removed when files get edited...for some reason,
											// edits aren't otherwise detected
/*

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
*/

var get_file_string = function(path, callback) {
	fs.readFile(path, {encoding: 'ascii'}, function(err, data) {
		callback(data);
	});
};

var io = require('socket.io').listen(server);
//io.set("log level", 1);

io.sockets.on('connection', function (socket) {
	socket.on('comm_wrapper', function(client_id, is_server) {
		//console.log(client_id, is_server);
	});
	socket.on('message', function(message) {
		socket.broadcast.emit('message', message);
	});
});

var os = require('os')

var interfaces = os.networkInterfaces();
var addresses = [];
for (k in interfaces) {
    for (k2 in interfaces[k]) {
        var address = interfaces[k][k2];
        if (address.family == 'IPv4' && !address.internal) {
            addresses.push(address.address)
        }
    }
}

console.log("Interactive times at http://" + addresses[0] + ":8000/");
if(process.argv[2] === "dev") {
	var cjs_grunt = child_process.spawn('grunt', ['dev'], {
		cwd: "src/_vendor/cjs"
	});
	cjs_grunt.stdout.on('data', function(data) {
		// relay output to console
		console.log("%s", data)
	});

	var grunt = child_process.spawn('grunt', ['dev']);
	grunt.stdout.on('data', function(data) {
		// relay output to console
		console.log("%s", data)
	});
}
