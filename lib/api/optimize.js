'use strict';

var dirs = require('../dirs');

module.exports = function(app) {

  var config = app.get('config');
  var resizer = app.get('resizer');

  return {

    dir: function(req, res, callback) {
      var body = req.body;
      resizer.resize(body.path, { force: true });
      callback(null, true);
    },

    file: function(req, res, callback) {
      callback(null, {});
    }

  };
};

