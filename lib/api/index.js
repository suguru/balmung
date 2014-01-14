'use strict';

var _ = require('lodash');
var logger = require('proteus-logger').get();

module.exports = function(app) {

  var register = function(path, action) {
    logger.info('Registering API', path);
    app.post('/api' + path, function(req, res) {
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
  };

  ['browse','settings','optimize'].forEach(function(name) {
    var module = require('./' + name)(app);
    if (_.isFunction(module)) {
      register('/'+name, module);
    } else {
      _.each(module, function(action, method) {
        register('/'+name + '/' + method, action);
      });
    }
  });

};
