/* global angular */
'use strict';
angular
.module('balmung')
.filter('uriencode', function() {
  return encodeURIComponent;
})
.filter('filesize', function() {
  var k = 1024;
  var m = k * 1024;
  var g = m * 1024;
  return function(val) {
    val = Number(val);
    if (val < k) {
      return val + 'B';
    } else if (val < m) {
      return (val/k).toFixed(1) + 'K';
    } else if (val < g) {
      return (val/m).toFixed(1) + 'M';
    } else {
      return (val/g).toFixed(1) + 'G';
    }
    return val;
  };
})
.filter('percentage', function() {
  return function(val) {
    if (isNaN(val)) {
      return '0%';
    }
    val = Number(val);
    val = val * 1000 / 10;
    return val + '%';
  };
})
;

