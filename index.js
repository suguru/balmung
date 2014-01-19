
/**
 * Create balmnung server
 */
exports.createServer = function() {
  return require('./balmung-server');
};

/**
 * Create balmung tools
 */
exports.createTools = function(option) {
  return require('./balmung-tools')(option);
};
