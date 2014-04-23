'use strict';

var fs = require('fs');
var async = require('async');
var path = require('path');
var logger = require('proteus-logger').get();
var util = require('util');
var events = require('events');
var dirs = require('./dirs');
var settings = require('./settings');
var pngquant = require('pngquant-bin').path;
var optipng = require('optipng-bin').path;
var jpegtran = require('jpegtran-bin').path;
var gifsicle = require('gifsicle').path;
var spawn = require('child_process').spawn;
var _ = require('lodash');

function Optimizer(config) {
  var self = this;
  self.config = config;
  self.queue = async.queue(function(task, callback) {
    // optimize it
    var work = dirs.work;
    var dst = dirs.dst;
    var file = task.file;
    var base = task.base;

    self.emit('start', task);
    // mkdir
    dst.mkdirp(path.dirname(file.path), function(err) {
      if (err) {
        return callback(err);
      }
      var optimize = function() {
        // execute optimization
        self._optimize(file.path, base.path, function(err, result) {
          logger.debug('Optimized', { file: file.path });
          task.result = result;
          self.emit('end', task);
          if (err) {
            callback(err);
          } else {
            callback();
          }
        });
      };
      // copy file
      if (work.path !== dst.path) {
        fs.readFile(path.join(work.path, file.path), function(err, fileData) {
          if (err) {
            return callback(err);
          }
          fs.writeFile(path.join(dst.path, file.path), fileData, function(err) {
            if (err) {
              return callback(err);
            }
            optimize();
          });
        });
      } else {
        optimize();
      }
    });
  }, config.optimize.concurrency || 2);
  self.queue.drain = function() {
    self.emit('finish');
  };
}

util.inherits(Optimizer, events.EventEmitter);

/**
 * Optimize target 
 */
Optimizer.prototype.optimize = function(base, file, ratio) {
  this.queue.push({ base:base, file: file, ratio: ratio });
};

/**
 *
 */
Optimizer.prototype._optimize = function(filePath, basePath, callback) {
  var self = this;
  var config = self.config;
  var dst = dirs.dst;
  // optimize single file
  var ext = path.extname(filePath).substr(1);
  // get opimization tools
  var tools = config.optimize.tools[ext];
  if (!tools) {
    logger.warn('No optimization tools for', { ext: ext });
    return callback();
  }
  var toolOptions = settings.get(basePath);
  var dstPath = path.join(dst.path, filePath);

  var result = {
    size: {}
  };

  async.eachSeries(tools, function(tool, done) {

    var optimizer = self[tool];
    if (!optimizer) {
      return done(new Error('No optimization tool for ' + tool));
    }

    var options = toolOptions[tool];
    // Skip if disabled the opzimier
    if (options.disabled) {
      return done();
    }

    fs.readFile(dstPath, function(err, fileData) {
      if (err) {
        return done(err);
      }
      var originalSize = fileData.length;
      if (!result.size.origin) {
        result.size.origin = originalSize;
        result.size.last = originalSize;
      }

      optimizer(dstPath, fileData, options, function(err) {
        if (err) {
          return done(err);
        }
        // check size
        fs.stat(dstPath, function(err, stats) {
          if (stats.size > originalSize) {
            logger.debug('Optimized file is larger than original', { tool: tool, path: filePath, origin: originalSize, optimized: stats.size });
            // if size is larger than original, revert to original
            fs.writeFile(dstPath, fileData, done);
          } else {
            logger.debug('Optimization tool complete', { tool: tool, original: originalSize, optimized: stats.size });
            result.size.last = stats.size;
            done(err);
          }
        });
      });
    });
  }, function(err) {
    if (err) {
      return callback(err);
    } else {
      return callback(null, result);
    }
  });
};

Optimizer.prototype.pngquant = function(filePath, fileData, options, callback) {
  // read png data
  var args = [options.color, '--speed', options.speed];
  var proc = spawn(pngquant, args);
  proc.stdout.pipe(fs.createWriteStream(filePath));
  proc.stdin.end(fileData);
  proc.on('exit', function(code) {
    if (code !== 0) {
      callback(new Error('pngquant exited with non-zero code'));
    } else {
      callback();
    }
  });
};

Optimizer.prototype.optipng = function(filePath, fileData, options, callback) {
  // exec optipng
  // var proc = spawn(optipng, ['-o', options.level, '-', '-']);
  // proc.stdout.pipe(fs.createWriteStream(filePath));
  // proc.stdin.end(fileData);
  var proc = spawn(optipng, ['-o', options.level, filePath]);
  proc.on('exit', function(code) {
    if (code !== 0) {
      callback(new Error('optipng exited with non-zero code'));
    } else {
      callback();
    }
  });
};

Optimizer.prototype.zopfli = function(filePath, fileData, options, callback) {
  var args = [filePath, filePath];
  _.each(options, function(flag, name) {
    if (flag) {
      args.push('--'+name);
    }
  });

  var proc = spawn(path.resolve(__dirname, '../node_modules/.bin/zopflipng'), args);
  proc.on('exit', function(code) {
    if (code !== 0) {
      callback(new Error('optipng exited with non-zero code'));
    } else {
      callback();
    }
  });
};

Optimizer.prototype.jpegtran = function(filepath, fileData, options, callback) {

  var args = [];

  if (options.optimize) {
    args.push('-optimize');
  }
  if (options.copy) {
    args.push('-copy', options.copy);
  }
  args.push('-outfile', filepath);

  var proc = spawn(jpegtran, args);
  proc.stdin.end(fileData);
  proc.on('exit', function(code) {
    if (code !== 0) {
      callback(new Error('jpegtran exited with non-zero code'));
    } else {
      callback();
    }
  });
};

Optimizer.prototype.gifsicle = function(filepath, fileData, options, callback) {

  var args = [];

  if (options.level) {
    args.push('-O' + options.level);
  }
  args.push('-o', filepath);

  var proc = spawn(gifsicle, args);
  proc.stdin.end(fileData);
  proc.on('exit', function(code) {
    if (code !== 0) {
      callback(new Error('gifsicle exited with non-zero code'));
    } else {
      callback();
    }
  });

};

module.exports = Optimizer;
