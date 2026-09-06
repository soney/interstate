// Compatibility for existing build commands. New workflows should use npm scripts.
module.exports = function(grunt) {
  grunt.registerTask('default', 'Build the static site', function() {
    const done = this.async();
    require('node:child_process').execFile(process.execPath, ['scripts/build.js'], (error, stdout, stderr) => {
      grunt.log.write(stdout);
      grunt.log.error(stderr);
      done(!error);
    });
  });
  grunt.registerTask('full', ['default']);
  grunt.registerTask('quick', ['default']);
};
