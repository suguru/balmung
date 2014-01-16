'use strict';
var Resizer = require('./resize');
var Optimizer = require('./optimize');
var settings = require('./settings');
var express = require('express');

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

    require('./api')(app);

    app.get('/export', function(req, res) {
      res.json(settings.root());
    });

    callback();

  });
};
