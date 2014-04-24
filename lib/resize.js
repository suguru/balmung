'use strict';

var fs = require('fs');
var async = require('async');
var _ = require('lodash');
var path = require('path');
var logger = require('proteus-logger').get();
var util = require('util');
var events = require('events');
var dirs = require('./dirs');
var gm = require('gm');

/**
 * Execute resizer
 */
function Resizer(config) {
  var self = this;
  this.config = config;
  this.queue = async.queue(function(task, callback) {

    var src = dirs.src;
    var work = dirs.work;
    var file = task.file;
    var option = task.option;

    // emit to clients
    self.emit('start', task);

    var base = config.resize.base;

    // get destination directory
    async.eachSeries(config.resize.ratio, function(ratio, done) {

      var resizePath = self.rename(file.path, ratio);
      var resizeDir = path.dirname(resizePath);

      work.mkdirp(resizeDir, function(err, workDir) {

        if (err) {
          return done(err);
        }

        var width = file.width;
        var height = file.height;

        var workName = path.basename(resizePath);
        var workPath = path.join(workDir, workName);
        var workWidth = Math.round(width * ratio / base);
        var workHeight = Math.round(height * ratio / base);

        // get dest path
        fs.stat(workPath, function(err, stats) {

          if (err && err.code !== 'ENOENT') {
            return done(err);
          }

          // only first or old files should be updated
          if (err || (stats && stats.mtime.getTime() < file.time) || option.force) {
            var emitResize = function() {
              self.emit('resize', {
                base: file,
                file: {
                  name: workName,
                  path: resizePath,
                  width: workWidth,
                  height: workHeight
                },
                ratio: ratio,
                option: option
              });
            };

            // simple copy if width/height are equal
            if (workWidth === width && workHeight === height) {
              var errorCallback = function(err) {
                logger.error('File i/o error', err);
              };
              // copy file
              var rs = fs.createReadStream(path.resolve(src.path, file.path));
              var ws = fs.createWriteStream(path.resolve(workPath));
              rs.on('error', errorCallback);
              ws.on('error', errorCallback);
              ws.on('open', function() {
                rs.pipe(ws);
                ws.on('finish', function() {
                  emitResize();
                  done();
                });
              });
              return;
            }

            var ext = path.extname(workPath);
            var unsharp = config.resize.unsharp;
            var convert = gm(path.resolve(src.path, file.path));

            convert.resize(workWidth, workHeight);
            if (unsharp) {
              convert.unsharp(
                unsharp.radius,
                unsharp.sigma,
                unsharp.amount,
                unsharp.threshold
              );
            }
            if (ext === '.gif') {
              convert.coalese().deconstruct();
            }
            convert.strip();

            convert.write(path.resolve(workPath), function(err) {
              if (err) {
                return done(err);
              }
              logger.debug('Resized', {
                path: resizePath,
                width: workWidth,
                height: workHeight
              });
              emitResize();
              done();
            });
          } else {
            done();
          }
        });
      });
    }, function(err) {
      // emit to clients
      self.emit('end', task);
      if (err) {
        logger.error('Resize failed', err);
        self.errors[file.path] = err;
      } else {
        delete self.errors[file.path];
      }
      callback();
    });
  }, 1); // config.resize.concurrency || 1); // TODO high concurrency causes unknown buffer I/O problems
  this.queue.drain = function() {
    self.emit('finish');
  };
  this.errors = {};
}

util.inherits(Resizer, events.EventEmitter);

/**
 * Rename file path with output pattern
 * @param {string} filePath file path
 * @param {number} ratio target ratio to be resized
 */
Resizer.prototype.rename = function(filePath, ratio) {

  var dirPattern = this.config.resize.dirname;
  var filePattern = this.config.resize.filename;

  var dirname = path.dirname(filePath);
  var filename = path.basename(filePath);
  var extname = path.extname(filename);
  var basename = path.basename(filename, extname);

  var args = {
    dirname: dirname,
    extname: extname,
    basename: basename,
    filename: filename,
    ratio: ratio,
    ratiox10: Math.floor(ratio * 10),
  };

  var fileName = filePattern;
  var dirName = dirPattern;

  _.each(args, function(to, from) {
    fileName = fileName.replace('{'+from+'}', to);
    dirName = dirName.replace('{'+from+'}', to);
  });

  return path.join(dirName, fileName);

};

/**
 * Resize images in directory recursively
 */
Resizer.prototype.resize = function(dirPath, option) {
  dirPath = dirPath || '';
  option = option || {};
  var src = dirs.src;
  var work = dirs.work;
  logger.info('Resizing images', { from: src.path, to: work.path , path: dirPath });
  var self = this;
  var queue = self.queue;
  src.collect(dirPath, function(err, files) {
    if (err) {
      logger.error(err);
      return;
    }
    if (files.length === 0) {
      return self.emit('finish');
    }
    files.forEach(function(file) {
      queue.push({
        file: file,
        option: option
      });
    });
  });
};

Resizer.prototype.resizeFile = function(filePath, option) {
  var src = dirs.src;
  var work = dirs.work;
  logger.info('Resizing a image file', { from: src.path, to: work.path , path: filePath });
  var self = this;
  src.file(filePath, function(err, file) {
    if (err) {
      logger.error(err);
      return;
    }
    self.queue.push({
      file: file,
      option: option
    });
  });
};

module.exports = Resizer;
