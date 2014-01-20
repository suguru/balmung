// Directory module
'use strict';

var _ = require('lodash');
var events = require('events');
var util = require('util');
var fs = require('fs');
var async = require('async');
var path = require('path');
var sizeOf = require('image-size');
var logger = require('proteus-logger').get();
var mkdirp = require('mkdirp');

function Dir(dirpath, options) {
  this.path = dirpath; // root path
  this.name = path.basename(dirpath); // dir name
  this.fullpath = path.resolve(dirpath); // full path
  this.extensions = ['.jpg','.gif','.png'];
  this.options = options || {};
}

util.inherits(Dir, events.EventEmitter);

/**
 * Filtering directory or filename
 *
 */
Dir.prototype.filter = function(filepath) {

  if (!filepath) {
    return false;
  }

  var basename = path.basename(filepath);

  if (basename.charAt(0) === '.') {
    return false;
  }

  return true;
};

/**
 * Find child directory by path
 */
Dir.prototype.ls = function(dirpath, callback) {
  var self = this;
  fs.readdir(path.join(this.path, dirpath), function(err, list) {
    if (err) {
      return callback(err);
    }
    var dirs = [];
    var files = [];

    async.eachLimit(list, 4, function(file, done) {
      var filepath = path.join(self.path, dirpath, file);
      if (self.filter(filepath)) {
        fs.stat(filepath, function(err, stats) {
          if (err) {
            return done(err);
          }
          if (stats.isDirectory()) {
            dirs.push(file);
            done();
          } else if (stats.isFile()) {
            // ignore zero size file
            if (stats.size === 0) {
              return done();
            }
            var extname = path.extname(file);
            if (self.extensions.indexOf(extname.toLowerCase()) < 0) {
              return done();
            }
            sizeOf(filepath, function(err, dimensions) {
              if (err) {
                logger.warn('Cannot get dimensions of ' + filepath, err);
                dimensions = { width: 0, height: 0 };
              }
              var filePath = path.join(dirpath, file);
              files.push({
                name: file,
                path: filePath,
                size: stats.size,
                width: dimensions.width,
                height: dimensions.height,
                time: stats.mtime.getTime()
              });
              done();
            });
          } else {
            done();
          }
        });
      } else {
        done();
      }
    }, function(err) {
      if (err) {
        return callback(err);
      } else {
        return callback(null, {
          dirs: dirs,
          files: files
        });
      }
    });
  });
};

Dir.prototype.file = function(filePath, callback) {
  var self = this;
  fs.stat(path.join(self.path, filePath), function(err, stats) {
    if (err) {
      return callback(err);
    }
    if (stats.isDirectory()) {
      return callback(new Error(path + ' is not file.'));
    }
    if (stats.size === 0) {
      return callback(new Error(path + ' is zero-length file'));
    }
    sizeOf(path.join(self.path, filePath), function(err, dimensions) {
      if (err) {
        dimensions = { width: 0, height: 0 };
      }
      callback(null, {
        name: path.basename(filePath),
        path: filePath,
        size: stats.size,
        width: dimensions.width,
        height: dimensions.height,
        time: stats.mtime.getTime()
      });
    });
  });
};

/**
 * Update content from remote repository
 */
Dir.prototype.pull = function() {
};

/**
 * Make directory tree from this directory
 */
Dir.prototype.mkdirp = function(dirpath, callback) {
  dirpath = path.join(this.path, dirpath);
  mkdirp(dirpath, function(err) {
    if (err) {
      callback(err);
    } else {
      callback(null, dirpath);
    }
  });
};

/**
 * Collect all files
 */
Dir.prototype.collect = function(dirPath, callback) {
  if (_.isFunction(dirPath)) {
    callback = dirPath;
    dirPath = '';
  }
  var self = this;
  var list = [];
  var ls = function(loc, callback) {
    self.ls(loc, function(err, result) {
      if (err) {
        return callback(err);
      }
      var dirs = result.dirs;
      var files = result.files;
      list = list.concat(files);
      async.eachSeries(dirs, function(dir, done) {
        ls(path.join(loc, dir), done);
      }, function(err) {
        if (err) {
          callback(err);
        } else {
          callback(null, list);
        }
      });
    });
  };
  ls(dirPath, callback);
};

/**
 * Add directory to this object
 */
exports.add = function(name, path) {
  var dir = new Dir(path);
  dir.on('update', function() {
    // console.log(this);
    logger.info('Directory updated.', { path: path });
  });
  this[name] = dir;
  return dir;
};
