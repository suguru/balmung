'use strict';

var settings = require('../settings');

module.exports = function(app) {

  var config = app.get('config');

  return {

    save: function(req, res, callback) {
      var targetPath = req.body.path;
      settings.set(targetPath, req.body.settings);
      settings.save(config, function(err) {
        if (err) {
          callback(err);
        } else {
          callback(null, true);
        }
      });
    },

    load: function(req, res, callback) {
      callback(null, settings.get(req.body.path));
    }

  };

};
