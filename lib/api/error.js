
function ApiError(message, statusCode) {
  Error.call(this);
  Error.captureStackTrace(this, this.constructor);
  this.message = message;
  this.statusCode = statusCode || 500;
}

ApiError.prototype = new Error();
ApiError.prototype.constructor = ApiError;
ApiError.prototype.name = 'ApiError';

module.exports = ApiError;
