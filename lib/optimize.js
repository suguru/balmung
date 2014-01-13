'use strict';

var fs = require('fs');
var async = require('async');
var path = require('path');
var logger = require('proteus-logger').get();
var util = require('util');
var events = require('events');
var flags = require('./flags');
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

    flags.enable(file, 'optimize');
    // mkdir
    dst.mkdirp(path.dirname(file.path), function(err) {
      if (err) {
        return callback(err);
      }
      // copy file
      var rs = fs.createReadStream(path.join(work.path, file.path));
      var ws = fs.createWriteStream(path.join(dst.path, file.path));
      rs.pipe(ws);
      ws.on('finish', function() {
        // execute optimization
        self._optimize(file.path, function(err) {
          logger.debug('Optimized', { file: file.path });
          flags.disable(file, 'optimize');
          if (err) {
            callback(err);
          } else {
            callback();
          }
        });
      });
    });
  }, config.optimize.concurrency || 2);
}

util.inherits(Optimizer, events.EventEmitter);

/**
 * Optimize target 
 */
Optimizer.prototype.optimize = function(file) {
  this.queue.push({ file: file });
};

/**
 *
 */
Optimizer.prototype._optimize = function(filePath, callback) {
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
  var toolOptions = settings.get(filePath);
  var dstPath = path.join(dst.path, filePath);

  async.eachSeries(tools, function(tool, done) {
    fs.readFile(dstPath, function(err, fileData) {
      if (err) {
        return done(err);
      }
      var originalSize = fileData.length;
      var optimizer = self[tool];
      var options = toolOptions[tool];

      if (optimizer) {
        optimizer(dstPath, fileData, options, function(err) {
          if (err) {
            return done(err);
          }
          // check size
          fs.stat(dstPath, function(err, stats) {
            if (stats.size > originalSize) {
              logger.debug('Optimized file is larger than original', { tool: tool, path: filePath, origin: originalSize, optimized: stats.size });
              // if size is larger than original, revert to original
              var ws = fs.createWriteStream(dstPath);
              ws.end(fileData);
              ws.on('close', done);
            } else {
              logger.debug('Optimization tool complete', { tool: tool, original: originalSize, optimized: stats.size });
              done(err);
            }
          });
        });
      } else {
        done(new Error('No optimization tool for ' + tool));
      }
    });
  }, callback);
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

  var proc = spawn(path.resolve('./node_modules/.bin/zopflipng'), args);
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
