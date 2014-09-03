module.exports = function(grunt) {

	var ends_with = function (str1, str2) {
		return str1.slice(str1.length-str2.length) == str2;
	};
	var inc_libs = require('./include_libs');

	var runtime_and_editor = inc_libs.runtime.concat(inc_libs.editor);

	var src_js = runtime_and_editor.filter(function(f) { return ends_with(f, ".js");});
	var build_folder = ".build";

	var exclude_regexes = [
		"jquery-.*\\.js",
		"raphael\\.js",
		"underscore\\.js",
		"underscore\\.deferred\\.js",
		"esprima\\.js",
		"ace\\.js"
	];

	var my_src_files = src_js.filter(function(f) { 
		for(var i = 0; i<exclude_regexes.length; i++) {
			var exclude_regex = new RegExp(exclude_regexes[i]);
			if(f.match(exclude_regex)) {
				return false;
			}
		}
		return true;
	});

	var package = grunt.file.readJSON('package.json');
	// Project configuration
	grunt.initConfig({
		pkg: package,
		jshint: {
			build: {
				src: my_src_files
			}
		},
		uglify: {
			build: {
				options: {
					banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
							'<%= grunt.template.today("yyyy-mm-dd h:MM:ss TT") %> */',
					global_defs: {
						DEBUG: false
					},
					sourceMapIn: ".build/interstate.js.map",
					sourceMap: ".build/interstate.min.js.map",
					sourceMappingURL: "interstate.min.js.map"
				},
				src: build_folder + "/interstate.js",
				dest: build_folder + "/interstate.min.js"
			}
		},
		concat: {
			esprima: {
				src: "src/_vendor/esprima/esprima.js",
				dest: build_folder + "/_vendor/esprima.js"
			},
			qrcode: {
				src: "src/_vendor/qrcode.min.js",
				dest: build_folder + "/_vendor/qrcode.min.js"
			}
		},
		concat_sourcemap: {
			js: {
				options: {
					banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
							'<%= grunt.template.today("yyyy-mm-dd h:MM:ss TT") %> */',
					process: {
						data: {
							version: package.version,
							build_time: grunt.template.today("yyyy-mm-dd h:MM:ss TT")
						}
					},
					sourceRoot: '..'
				},
				src: src_js,
				dest: build_folder + "/interstate.js"
			}
		},
		sass: {
			editor_style: {
				files: [{
					dest: build_folder + "/editor/style/editor_style.css",
					src: "src/view/editor/style/editor_style.scss"
				}]
			}, runtime_style: {
				files: [{
					dest: build_folder + "/editor/style/runtime_style.css",
					src: "src/view/editor/style/runtime_style.scss"
				}]
			}
		},
		copy: {
			css: {
				files: [
					{ expand: true, cwd: "src/view/editor/style/images", src: ["**"], dest: build_folder + "/editor/style/images" },
					{ expand: true, cwd: "src/view/editor/style/fonts", src: ["**"], dest: build_folder + "/editor/style/fonts" }
				]
			},
			sample_apps: {
				files: [
					{ expand: true, cwd: "sample_apps/", src: ["**"], dest: build_folder + "/sample_apps" }
				]
			},
			carousel_images: {
				files: [
					{ expand: true, cwd: "carousel_images/", src: ["**"], dest: build_folder + "/carousel_images" }
				]
			},

			ace: {
				files: [
					{ expand: true, cwd: "src/_vendor/ace", src: ["**"], dest: build_folder + "/_vendor/ace" },
				]
			},

			box2d: {
				files: [
					{ expand: true, cwd: "src/_vendor/Box2dWeb-2.1a.3", src: ["**"], dest: build_folder + "/_vendor/Box2dWeb-2.1a.3" },
				]
			},

			dist: {
				files: [
					{ expand: true, cwd: "dist/", src: ["**"], dest: build_folder + "/" }
				]
			}
		},
		clean: {
			build: ["build/"]
		},
		qunit: {
			all: {
				options: {
					urls: ['http://localhost:8000/test/unit_tests/unit_tests.ejs.html']
				}
			}
		},
		watch: {
			dev: {
				files: my_src_files.concat(['test/unit_tests/*.js']),
				tasks: ['jshint', 'qunit']
			},
			jshint: {
				files: my_src_files,
				tasks: ['jshint']
			}
		}
	});

	// Load the plugin that provides the "uglify" task.
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-sass');
	grunt.loadNpmTasks('grunt-contrib-qunit');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-concat-sourcemap');

	// Default task(s).
	grunt.registerTask('full', ['jshint', 'concat', 'concat_sourcemap', 'uglify', 'sass', 'copy']);
	grunt.registerTask('default', ['concat', 'concat_sourcemap', 'uglify', 'sass', 'copy']);
	grunt.registerTask('quick', ['jshint', 'concat', 'concat_sourcemap', 'sass', 'copy']);
	grunt.registerTask('test', ['jshint', 'qunit']);
	grunt.registerTask('dev', ['jshint', 'qunit', 'watch']);
};
