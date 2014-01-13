'use strict';

var path = require('path');
var dirs = require('../dirs');
var _ = require('lodash');
var settings = require('../settings');

module.exports = function(app) {

  var config = app.get('config');

  return {

    save: function(req, res, callback) {
      settings.set(req.body.path, req.body.settings);
      settings.save(config, function(err) {
        if (err) {
          callback(err);
        } else {
          callback(null, true);
        }
      });
    }

  };

};
