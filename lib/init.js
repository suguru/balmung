'use strict';
var Resizer = require('./resize');
var Optimizer = require('./optimize');
var settings = require('./settings');
var express = require('express');
var _ = require('lodash');
var path = require('path');
var async = require('async');
var fs = require('fs');
var mkdirp = require('mkdirp');
var logger = require('proteus-logger').get();
var spawn = require('child_process').spawn;

module.exports = function(app, callback) {

  var config = app.get('config');
  var io = app.get('io');

  // setting file
  var dirs = require('./dirs');
  var resizer = new Resizer(config);
  var optimizer = new Optimizer(config);

  app.set('dirs', dirs);
  app.set('resizer', resizer);
  app.set('optimizer', optimizer);
  app.set('settings', settings);

  // checkout
  var checkoutRepo = function(done) {
    logger.info('Checking out from repository', { type: config.repository.type, url: config.repository.url });

    var command, args;
    if (config.repository.type === 'git') {
      command = 'git';
      args = ['clone', config.repository.url, 'src'];
    } else if (config.repository.type === 'svn') {
      command = 'svn';
      args = ['co', config.repository.url, 'src'];
    }

    var cmd = spawn(command, args, { cwd: config.datadir });
    cmd.stdout.pipe(process.stdout);
    cmd.stderr.pipe(process.stderr);
    cmd.on('close', function(code) {
      if (code !== 0) {
        done(new Error('Command failed ' + code));
      } else {
        done();
      }
    });
  };

  // update and resize
  var updateRepo = function() {
    logger.debug('Updating repository', { type: config.repository.type, url: config.repository.url });
    var command, args;
    if (config.repository.type === 'git') {
      command = 'git';
      args = ['pull', 'origin', 'master'];
    } else if (config.repository.type === 'svn') {
      command = 'svn';
      args = ['update'];
    }
    var next = function() {
      setTimeout(updateRepo, config.repository.update);
    };
    var cmd = spawn(command, args, { cwd: path.join(config.datadir, 'src') });
    cmd.stdout.pipe(process.stdout);
    cmd.stderr.pipe(process.stderr);
    cmd.on('close', function(code) {
      if (code !== 0) {
        logger.error('Failed to update repo', { code: code });
        next();
      } else {
        resizer.resize();
        resizer.once('finish', next);
      }
    });
  };

  async.series([function(done) {
    settings.load(config, done);
  }, function(done) {
    ['src', 'dst', 'work'].forEach(function(name) {
      var dir = dirs.add(name, path.join(config.datadir, name));
      // no-cache
      app.use('/content/' + name, express.static(dir.path, { maxAge: 0 }));
    });
    done();

  }, function(done) {

    // init data directory
    fs.exists(config.datadir, function(exists) {
      if (exists) {
        logger.info('Use data directory', { path: config.datadir });
        done();
      } else {
        logger.info('Making data directory', { path: config.datadir });
        mkdirp(config.datadir, done);
      }
    });

  }, function(done) {

    fs.exists(dirs.src.path, function(exists) {
      // skip if already exists
      if (exists) {
        return done();
      }
      // checking out from repository
      if (config.repository) {
        checkoutRepo(done);
      } else {
        dirs.src.mkdirp(done);
      }
    });

  }, function(done) {

    require('./api')(app);

    app.get('/export', function(req, res) {
      res.json({
        config: _.omit(config, 'logger', 'datadir', 'settings'),
        settings: settings.root()
      });
    });
    done();

  }, function(done) {

    // resizing images in src directory
    resizer.resize();
    if (config.repository.update) {
      resizer.once('finish', function() {
        logger.info('Start continuos updating repository', { interval: config.repository.update/1000 + 'sec' });
        // cron svn update
        setTimeout(updateRepo, config.repository.update);
      });
    }
    done();

  }], callback);

  resizer.on('resize', function(resized) {
    optimizer.optimize(resized.base, resized.file, resized.ratio);
  });

  resizer.on('start', function(task) {
    io.sockets.emit('resize', {
      type: 'start',
      path: task.file.path
    });
  });

  resizer.on('end', function(task) {
    io.sockets.emit('resize', {
      type: 'end',
      path: task.file.path
    });
  });

  optimizer.on('start', function(task) {
    io.sockets.emit('optimize', {
      type: 'start',
      path: task.base.path,
      dst: task.file.path,
      ratio: task.ratio
    });
  });

  optimizer.on('end', function(task) {
    io.sockets.emit('optimize', {
      type: 'end',
      path: task.base.path,
      dst: task.file.path,
      ratio: task.ratio,
      result: task.result
    });
  });
};
