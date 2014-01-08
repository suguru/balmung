'use strict';
var Resizer = require('./resize');
var Optimizer = require('./optimize');
var express = require('express');
var path = require('path');

module.exports = function(app, callback) {

  var config = app.get('config');

  var dirs = require('./dirs');
  var resizer = new Resizer(config);
  var optimizer = new Optimizer(config);

  app.set('dirs', dirs);
  app.set('resizer', resizer);
  app.set('optimizer', optimizer);

  ['src', 'dst', 'work'].forEach(function(name) {
    var dir = dirs.add(name, config[name]);
    app.use('/content/' + name, express.static(dir.path));
  });

  resizer.resize(dirs.src, dirs.work);
  resizer.on('resize', function(resized) {
    optimizer.optimize(dirs.work, dirs.dst, resized.dst);
  });
  require('./api')(app);
  callback();

};
