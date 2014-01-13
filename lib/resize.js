'use strict';

var fs = require('fs');
var async = require('async');
var im = require('imagemagick');
var path = require('path');
var logger = require('proteus-logger').get();
var util = require('util');
var events = require('events');
var flags = require('./flags');
var dirs = require('./dirs');

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

    flags.enable(file, 'resize');

    // create directory to destination
    work.mkdirp(path.dirname(file.path), function(err, workdir) {
      if (err) {
        self.errors[file.path] = err;
        return callback(err);
      }
      var base = config.resize.base;
      // get destination directory
      async.eachSeries(config.resize.ratio, function(ratio, done) {

        var width = file.width;
        var height = file.height;
        var workname = config.resizeNameResolver(file.name, ratio);
        var workpath = path.join(workdir, workname);
        var workwidth = Math.round(width * ratio / base);
        var workheight = Math.round(height * ratio / base);

        // get dest path
        fs.stat(workpath, function(err, stats) {

          if (err && err.code !== 'ENOENT') {
            return done(err);
          }

          // only first or old files should be updated
          if (err || (stats && stats.mtime.getTime() < file.time) || option.force) {

            var emitResize = function() {
              self.emit('resize', {
                src: file,
                work: {
                  name: workname,
                  path: path.join(path.dirname(file.path), workname),
                  width: workwidth,
                  height: workheight
                },
                ratio: ratio,
                option: option
              });
            };

            // simple copy if width/height are equal
            if (workwidth === width && workheight === height) {
              var rs = fs.createReadStream(path.resolve(src.path, file.path));
              var ws = fs.createWriteStream(path.resolve(workpath));
              rs.pipe(ws);
              ws.on('close', function() {
                emitResize();
                done();
              });
              return;
            }

            var ext = path.extname(workpath);
            var args = [path.resolve(src.path, file.path)];

            if (ext === '.gif') {
              args.push('-coalesce');
            }

            args.push('-resize', workwidth + 'x' + workheight);

            if (config.resize.unsharp) {
              args.push('-unsharp', config.resize.unsharp);
            }

            if (ext === '.gif') {
              args.push('-deconstruct');
            }

            args.push('-strip');
            args.push(path.resolve(workpath));
            
            im.convert(args, function(err) {
              if (err) {
                return done(err);
              }
              logger.debug('Resized', { path: path.join(path.dirname(file.path), workname), width: workwidth, height: workheight });
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
Resizer.prototype.resize = function(dirPath, option) {
  dirPath = dirPath || '';
  option = option || {};
  var src = dirs.src;
  var work = dirs.work;
  logger.info('Resizing images', { from: src.path, to: work.path , path: dirPath });
  var self = this;
  var queue = self.queue;
  src.collect(dirPath, function(err, files) {
    files.forEach(function(file) {
      self.pendings[file.path] = true;
      queue.push({
        file: file,
        option: option
      });
    });
  });
};

module.exports = Resizer;
