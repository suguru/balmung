'use strict';

var fs = require('fs');
var async = require('async');
var im = require('imagemagick');
var path = require('path');
var logger = require('proteus-logger').get();
var util = require('util');
var events = require('events');
var flags = require('./flags');

/**
 * Execute resizer
 */
function Resizer(config) {
  var self = this;
  this.config = config;
  this.queue = async.queue(function(task, callback) {

    var src = task.src;
    var dst = task.dst;
    var file = task.file;

    flags.enable(file, 'resize');

    // create directory to destination
    dst.mkdirp(path.dirname(file.path), function(err, dstdir) {
      if (err) {
        self.errors[file.path] = err;
        return callback(err);
      }
      var base = config.resize.base;
      // get destination directory
      async.eachSeries(config.resize.ratio, function(ratio, done) {

        var width = file.width;
        var height = file.height;
        var dstname = config.resizeNameResolver(file.name, ratio);
        var dstpath = path.join(dstdir, dstname);
        var dstwidth = Math.round(width * ratio / base);
        var dstheight = Math.round(height * ratio / base);

        // get dest path
        fs.stat(dstpath, function(err, stats) {

          if (err && err.code !== 'ENOENT') {
            return done(err);
          }

          // only first or old files should be updated
          if (err || (stats && stats.mtime.getTime() < file.time)) {

            var emitResize = function() {
              self.emit('resize', {
                src: file,
                dst: {
                  name: dstname,
                  path: path.join(path.dirname(file.path), dstname),
                  width: dstwidth,
                  height: dstheight
                },
                ratio: ratio
              });
            };

            // simple copy if width/height are equal
            if (dstwidth === width && dstheight === height) {
              var rs = fs.createReadStream(path.resolve(src.path, file.path));
              var ws = fs.createWriteStream(path.resolve(dstpath));
              rs.pipe(ws);
              ws.on('close', done);
              emitResize();
              return;
            }

            var ext = path.extname(dstpath);
            var args = [path.resolve(src.path, file.path)];

            if (ext === '.gif') {
              args.push('-coalesce');
            }

            args.push('-resize', dstwidth + 'x' + dstheight);

            if (config.resize.unsharp) {
              args.push('-unsharp', config.resize.unsharp);
            }

            if (ext === '.gif') {
              args.push('-deconstruct');
            }

            args.push('-strip');
            args.push(path.resolve(dstpath));
            
            im.convert(args, function(err) {
              if (err) {
                return done(err);
              }
              logger.debug('Resized', { name: dstname, width: dstwidth, height: dstheight });
              emitResize();
              done();
            });
          } else {
            done();
          }
        });
      }, function(err) {
        flags.disable(file, 'resize');
        if (err) {
          logger.error('Resize failed', err);
          self.errors[file.path] = err;
        } else {
          delete self.pendings[file.path];
          delete self.errors[file.path];
        }
        callback();
      });
    });
  }, config.resize.concurrency || 4);
  this.queue.drain = this.emit.bind(this, 'drain');
  this.pendings = {};
  this.errors = {};
}

util.inherits(Resizer, events.EventEmitter);

/**
 * Resize images in directory recursively
 */
Resizer.prototype.resize = function(src, dst) {
  logger.info('Resizing images', { from: src.path, to: dst.path });
  var self = this;
  var queue = self.queue;
  src.collect(function(err, files) {
    files.forEach(function(file) {
      self.pendings[file.path] = true;
      queue.push({
        src: src,
        dst: dst,
        file: file
      });
    });
  });
};

module.exports = Resizer;
