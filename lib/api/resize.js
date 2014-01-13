'use strict';

var dirs = require('../dirs');

module.exports = function(app) {

  var config = app.get('config');
  var optimizer = app.get('optimizer');

  return function(req, res, callback) {
    callback(null, {});
  };
};


