'use strict';

var _ = require('lodash');
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

  var Resizer = require('./lib/resize');
  var Optimizer = require('./lib/optimize');
  var settings = require('./lib/settings');

  return {
    resizer: new Resizer(config),
    optimizer: new Optimizer(config),
    settings: settings
  };
};
