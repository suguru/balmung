'use strict';

var _ = require('lodash');

module.exports = function(app) {

  ['browse'].forEach(function(name) {
    var module = require('./' + name)(app);
    _.each(module, function(action, method) {
      app.post('/api/' + name + '/' + method, function(req, res) {
        action(req, res, function(err, result) {
          if (err) {
            var statusCode = err.statusCode || 500;
            res.json(statusCode, {
              id: err.id,
              message: err.message,
              body: err.body
            });
          } else if (result) {
            res.json(result);
          }
        });
      });
    });
  });

};
