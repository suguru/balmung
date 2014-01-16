'use strict';


var dirs = require('../dirs');
var flags = require('../flags');
var settings = require('../settings');

var async = require('async');
var _ = require('lodash');

module.exports = function(app) {

  var config = app.get('config');

  return {
    list: function(req, res, callback) {
      var body = req.body;
      var lspath = body.path;
      if (lspath.charAt(0) === '/') {
        lspath = lspath.substr(1);
      }
      async.map(['src','work','dst'], function(target, done) {
        var convert  = function(err, result) {
          if (err) {
            if (err.code === 'ENOENT') {
              done(null, { dirs: [], files: [] });
            } else {
              done(err);
            }
          } else {
            if (Array.isArray(result)) {
              done(null, { dirs: [], files: result });
            } else {
              done(null, result);
            }
          }
        };
        if (body.collect) {
          dirs[target].collect(lspath, convert);
        } else {
          dirs[target].ls(lspath, convert);
        }
      }, function(err, results) {

        if (err) {
          return callback(err);
        }
        var src = results[0];
        var work = results[1];
        var dst = results[2];

        var workmap = {};
        var dstmap = {};
        var workpaths = {};

        var flat = settings.flat(lspath);
        // map work files
        work.files.forEach(function(file) {
          workmap[file.name] = _.pick(file, 'path', 'width', 'height', 'size', 'time');
          workpaths[file.name] = file.path;
        });

        // map dst files
        dst.files.forEach(function(file) {
          dstmap[file.name] = _.pick(file, 'path', 'width', 'height', 'size', 'time');
        });

        src.dirs.forEach(function(dir, i) {
          src.dirs[i] = {
            name: dir,
            settings: dir in flat
          };
        });

        // handle src files to associate dst and work files
        src.files.forEach(function(file) {

          file.dst = {};
          file.work = {};
          file.flags = flags.get(file.path) || {};
          if (file.name in flat) {
            file.settings = file.name in flat;
          }

          config.resize.ratio.forEach(function(ratio) {
            var filename = config.resizeNameResolver(file.name, ratio);
            var dstfile = dstmap[filename];
            var workfile = workmap[filename];
            var workpath = workpaths[filename];

            if (workpath) {
              var workflags = flags.get(workpath);
              if (workflags && workflags.optimize) {
                file.flags.optimize = true;
              }
            }

            file.dst[ratio] = dstfile;
            file.work[ratio] = workfile;

          });

        });

        var byName = function(a, b) {
          if (a.name === b.name) {
            return 0;
          } else if (a.name > b.name) {
            return 1;
          } else {
            return -1;
          }
        };

        src.dirs.sort(byName);
        src.files.sort(byName);

        callback(null, {
          path: lspath,
          dirs: src.dirs,
          files: src.files,
          ratios: config.resize.ratio,
          optimize: {
            concurrency: config.optimize.concurrency
          },
          settings: settings.get(lspath)
        });
      });
    },
  };
};
