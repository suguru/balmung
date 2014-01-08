'use strict';
// file flags
var _ = require('lodash');
var files = {};

/**
 * Enable a flag
 */
exports.enable = function(file, status) {
  var path = file.path || file;
  var curr = files[path];
  if (!curr) {
    curr = files[path] = {};
  }
  curr[status] = true;
};

/**
 * Disable a flag
 */
exports.disable = function(file, status) {
  var path = file.path || file;
  var curr = files[path];
  if (curr) {
    delete curr[status];
    if (_.isEmpty(curr)) {
      delete files[path];
    }
  }
};

/**
 * Check a flag
 */
exports.has = function(file, status) {
  var path= file.path || file;
  var curr = files[path];
  if (curr) {
    return status in curr;
  }
  return false;
};

/**
 * Get flags
 */
exports.get = function(file) {
  return files[file.path || file];
};

/**
 * Get all flags
 */
exports.all = function() {
  return files;
};
