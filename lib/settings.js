'use strict';

var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var logger = require('proteus-logger').get();

var rootSettings = { files: {} };
var defaults;

/**
 * Read settings from JSON file
 */
exports.load = function(config, callback) {

  // default settings from config
  defaults = _.pick(config,
    'optipng',
    'pngquant',
    'zopfli',
    'jpegtran',
    'gifsicle'
  );

  logger.info('Loading settings', { path: config.settings });
  fs.readFile(path.resolve(config.settings), { encoding: 'utf8' }, function(err, data) {
    if (err) {
      if (err.code === 'ENOENT') {
        logger.debug('Settings not found', { path: config.settings });
        return callback(null, rootSettings);
      } else {
        return callback(err);
      }
    }
    try {
      rootSettings = JSON.parse(data);
      callback(null, rootSettings);
    } catch (e) {
      return callback(e);
    }
  });

};

/**
 * Get settings from path
 * @param {string} filepath directory or file path
 * @param {object} [content] set if exists
 */
exports.get = function(filepath) {

  var names = filepath.split(path.sep);
  // default settings
  var sets = _.cloneDeep(defaults);
  // file settings
  var files = rootSettings.files;
  // default
  if (!files) {
    return sets;
  }

  var set = function(values, name) {
    _.each(values, function(value, key) {
      sets[name][key] = value;
    });
  };

  while (names.length > 0) {
    var name = names.shift();
    if (name in files) {
      // get child settings
      files = files[name];
      // merge setting
      if (files.$settings) {
        _.each(files.$settings, set);
      }
    } else {
      return sets;
    }
  }
  return sets;
};

/**
 * Get setting tree from path
 * @param {string} filepath directory or file path
 */
exports.tree = function(filepath) {

  var names = filepath.split(path.sep);
  var files = rootSettings.files;

  if (!files) {
    return {};
  }

  while (names.length > 0) {
    var name = names.shift();
    if (name in files) {
      files = files[name];
    } else {
      return files;
    }
  }
  return files;

};

/**
 * Get setting in flat from path
 * @param {string} filepath directory of path
 */
exports.flat = function(filepath) {

  var tree = this.tree(filepath);
  var flat = {};

  if (tree) {
    _.each(tree, function(file, name) {
      if (name === '$settings') {
        return;
      }
      if (file.$settings) {
        flat[name] = file.$settings;
      }
    });
  }
  return flat;
};

/**
 * Save settings
 */
exports.set = function(filepath, settings) {

  var parentPath = path.normalize(path.join(filepath, '..'));
  var parentSettings = this.get(parentPath);

  var names = filepath.split(path.sep);
  // file settings
  var files = rootSettings.files;
  // default
  if (!files) {
    files = rootSettings.files = {};
  }

  var fileSettings = {};

  // merge setting
  _.each(settings, function(values, name) {
    var parentValues = parentSettings[name];
    var fileValues = fileSettings[name];
    if (!fileValues) {
      fileValues = fileSettings[name] = {};
    }
    _.each(values, function(value, key) {
      var parentValue = parentValues[key];
      if (parentValue !== value) {
        fileValues[key] = value;
      }
    });
  });

  if (!_.isEmpty(fileSettings)) {
    while (names.length > 0) {
      var name = names.shift();
      if (name in files) {
        files = files[name];
      } else {
        files = files[name] = {};
      }
    }
    files.$settings = fileSettings;
  }
};

/**
 * Write settings to JSON file
 */
exports.save = function(config, callback) {

  logger.info('Saving settings', { path: config.settings });

  // remove empty settings
  var removeEmpties = function(obj) {
    _.each(obj, function(value, name) {
      if (_.isObject(value)) {
        if (_.isEmpty(value)) {
          delete obj[name];
        } else {
          removeEmpties(value);
          if (_.isEmpty(value)) {
            delete obj[name];
          }
        }
      }
    });
  };

  removeEmpties(rootSettings);

  var text = JSON.stringify(rootSettings, null, ' ');
  fs.writeFile(
    path.resolve(config.settings),
    text,
    { encoding: 'utf8' },
    callback
  );

};

/**
 * Get root settings
 */
exports.root = function(settings) {
  if (settings) {
    rootSettings = settings;
  }
  return rootSettings;
};

