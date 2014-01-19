'use strict';
var Resizer = require('./resize');
var Optimizer = require('./optimize');
var settings = require('./settings');
var express = require('express');
var _ = require('lodash');

module.exports = function(app, callback) {

  var config = app.get('config');
  var io = app.get('io');

  // setting file
  var dirs = require('./dirs');
  var resizer = new Resizer(config, io);
  var optimizer = new Optimizer(config, io);

  app.set('dirs', dirs);
  app.set('resizer', resizer);
  app.set('optimizer', optimizer);
  app.set('settings', settings);

  settings.load(config, function(err) {

    if (err) {
      return callback(err);
    }

    ['src', 'dst', 'work'].forEach(function(name) {
      var dir = dirs.add(name, config[name]);
      // no-cache
      app.use('/content/' + name, express.static(dir.path, { maxAge: 0 }));
    });

    resizer.resize();
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

    require('./api')(app);

    app.get('/export', function(req, res) {
      res.json({
        config: _.omit(config, 'logger', 'src', 'work', 'dst', 'settings'),
        settings: settings.root()
      });
    });

    callback();

  });
};
