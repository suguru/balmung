'use strict';
var Resizer = require('./resize');
var Optimizer = require('./optimize');
var settings = require('./settings');
var express = require('express');

module.exports = function(app, callback) {

  var config = app.get('config');

  // setting file
  var dirs = require('./dirs');
  var resizer = new Resizer(config);
  var optimizer = new Optimizer(config);

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
      app.use('/content/' + name, express.static(dir.path));
    });

    resizer.resize();
    resizer.on('resize', function(resized) {
      optimizer.optimize(resized.work);
    });
    require('./api')(app);
    callback();

  });
};
