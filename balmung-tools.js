'use strict';

var _ = require('lodash');
var path = require('path');
var loggers = require('proteus-logger');

module.exports = function(opts) {

  opts = opts || {};

  var config = require('./balmung-config.js');
  if (opts.config) {

    if (typeof opts.config === 'string') {
      _.each(require(opts.config), function(value, name) {
        config[name] = value;
      });
    } else {
      _.each(opts.config, function(value, name) {
        config[name] = value;
      });
    }
  }

  // configure logger
  if (config.logger) {
    loggers.configure(config.logger);
  }

  var dirs = require('./lib/dirs');
  var datadir = config.datadir;
  // configure directories
  dirs.add('src', path.join(datadir, 'src'));
  // work and dst are same in tools
  dirs.add('work', path.join(datadir, 'dst'));
  dirs.add('dst', path.join(datadir, 'dst'));

  // settings
  var Resizer = require('./lib/resize');
  var Optimizer = require('./lib/optimize');
  var settings = require('./lib/settings');

  return {
    resizer: new Resizer(config),
    optimizer: new Optimizer(config),
    settings: settings,
    config: config,
    dirs: dirs
  };
};
