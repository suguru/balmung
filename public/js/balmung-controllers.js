/* global angular */
'use strict';
angular
.module('balmung', ['ngRoute','ngAnimate','ui.bootstrap','angular-growl'])
.config(function($routeProvider) {

  $routeProvider
  .when('/browse', {
    controller: 'BalmungBrowseCtrl',
    templateUrl: '/template/browse.html'
  })
  .when('/confirm', {
    controller: 'BalmungConfirmCtrl',
    templateUrl: '/template/confirm.html'
  })
  .otherwise({
    redirectTo: '/browse'
  })
  ;

})
.value('pixelRatio', window.devicePixelRatio || 1)
.controller('BalmungNavCtrl', function($scope, $element, $rootScope, $location) {

  var items = [{
    link: '#/browse',
    label: 'Browse'
  }, {
    link: '#/confirm',
    label: 'Confirmation'
  }];
  $scope.items = items;

  $rootScope.$on('$routeChangeSuccess', function() {
    var path = $location.path();
    items.forEach(function(item) {
      if (item.link === '#' + path) {
        item.active = true;
      } else {
        item.active = false;
      }
    });
  });

})
.controller('BalmungBrowseCtrl', function($scope, $http, $routeParams, $location) {

  var dir = $routeParams.dir || '';

  $http
  .post('/api/browse/list', { path: dir })
  .success(function(data) {
    $scope.path = data.path;
    $scope.paths = [];
    var p = '';
    data.path.split('/').forEach(function(name) {
      p += name;
      $scope.paths.push({
        label: name,
        path: p
      });
      p += '/';
    });

    $scope.dirs = data.dirs;
    $scope.files = data.files;
    $scope.ratios = data.ratios;
    $scope.settings = data.settings;

  })
  .error(function(data, status) {
    // show error on display
    console.error(status, data);
  });

  $scope.selectDir = function(dir) {
    $location.path('browse').search({ dir: dir });
  };

})
.controller('BalmungConfirmCtrl', function($scope, $http, $routeParams, $location) {

  var dir = $routeParams.dir || '';

  $http
  .post('/api/browse/list', { path: dir, collect: true })
  .success(function(data) {
    $scope.path = data.path;
    $scope.paths = [];
    var p = '';
    data.path.split('/').forEach(function(name) {
      p += name;
      $scope.paths.push({
        label: name,
        path: p
      });
      p += '/';
    });

    $scope.files = data.files;
    $scope.ratio = data.ratios[0];
    $scope.ratios = data.ratios;
    $scope.settings = data.settings;
    $scope.background = 'mesh';
    $scope.backgrounds = ['mesh', 'white', 'gray', 'black', 'red', 'green', 'blue'];

  })
  .error(function(data, status) {
    // show error on display
    console.error(status, data);
  });

  $scope.changeRatio = function(ratio) {
    $scope.ratio = ratio;
  };

  $scope.changeBackground = function(bg) {
    $scope.background = bg;
  };

  $scope.browse = function() {
    $location.path('browse').search({ dir: dir });
  };

  $scope.selectDir = function(dir) {
    $location.path('confirm').search({ dir: dir });
  };

})
;
