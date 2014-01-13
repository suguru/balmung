
module.exports = function (grunt) {

  grunt.initConfig({

    stylus: {
      compile: {
        files: {
          'public/css/balmung.css': ['views/css/balmung.styl']
        }
      }
    },

    watch: {
      express: {
        files: ['lib/**/*.js', 'balmung.js'],
        tasks: ['express:dev'],
        options: {
          spawn: false
        }
      },
      stylus: {
        files: 'views/css/**/*.styl',
        tasks: ['stylus']
      }
    },

    bower: {
      install: {
        options: {
          targetDir: './public/components',
          layout: 'byComponent',
          cleanTargetDir: true,
          bowerOptions: {
            production: true
          }
        }
      }
    },

    express: {
      dev: {
        options: {
          script: './balmung.js',
          output: 'Balmung started.+'
        }
      }
    }

  });

  grunt.loadNpmTasks('grunt-contrib-stylus');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-express-server');
  grunt.loadNpmTasks('grunt-bower-task');

  grunt.registerTask('server', ['express:dev', 'watch']);
};
