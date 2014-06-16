'use strict';

var app = angular.module('app', [
	'ngRoute',
	'ngSanitize',
	'app.controllers',
	'app.factories'
]);

app.config(function ($routeProvider, $locationProvider) {
	$routeProvider
		.when('/manage/dashboard', { templateUrl: '/manage/dashboard.html', controller: 'DashCtrl' })
		.when('/manage/config/wizard', { templateUrl: '/manage/wizard.html', controller: 'WizardCtrl' })
		.when('/manage/config/editor', { templateUrl: '/manage/editor.html', controller: 'EditorCtrl' })
		.otherwise({ redirectTo: '/'});
	$locationProvider.html5Mode(true);
});

app.run(function ($rootScope, MenuFact) {
	var _menu = MenuFact;
//	angular.element(document).ready(function () {
//		$rootScope.confirmModal = new ModalFact({
//			title: 'Confirm Delete',
//			content: 'Are you sure you want to delete this record?',
//			okClass: 'btn btn-danger',
//			okText: 'Delete',
//			closeText: 'Cancel',
//			closeIcon: '<i class="glyphicon glyphicon-remove"></i>'
//		});
//	});

	/* on location change */
	$rootScope.$on('$locationChangeStart', function (event, next, current) {

	});

	/* on location change success */
	$rootScope.$on('$locationChangeSuccess', function (event, next, current) {

	});

	/* on route change */
	$rootScope.$on('$routeChangeStart', function (event, next, current) {
		_menu.route.set(next);
		console.log(_menu.route.get())
	});

	/* on route success */
	$rootScope.$on('$routeChangeSuccess', function (event, next, current) {

	});

});


angular.element(document).ready(function () {
	angular.bootstrap(document, ['app']);
});
angular.module('app.factories', [
	'app.factories.menu'
]);
var menu = angular.module('app.factories.menu', []);

menu.factory('MenuFact', function ($rootScope) {

	var factory = {},
		active,
		items;

	items = [
		{ name: 'Dashboard' },
		{ name: 'Overview', link: '/manage/dashboard', glyphicon: 'glyphicon-dashboard', active: true },
		{ name: 'Configurator', link: '/manage/config/wizard', glyphicon: 'glyphicon-cog' },
		{ name: 'Editor', link: '/manage/config/editor', glyphicon: 'glyphicon-pencil' }
	];

	factory.route =  {
		get: function () {
			return active;
		},
		set: function (route) {
			active = route;
		}
	};
	factory.get = function (item) {
		if(!item)
			return items;
		if(angular.isNumber(item))
			return items[item];
		return items[items.indexOf(item)];
	};

	return factory;
});

menu.controller('MenuCtrl', function ($scope, MenuFact) {
	$scope.menu = MenuFact.get();
});
angular.module('app.controllers', [
	'app.controllers.dash',
	'app.controllers.wizard',
	'app.controllers.editor'
]);
var dash = angular.module('app.controllers.dash', []);
dash.controller('DashCtrl', function ($scope, $http) {

	function formatBytes(bytes, append) {
		var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'],
			i;
		if (bytes == 0) {
			if(append) 
				return '0 bytes';
			return 0;
		}
		i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
		if(append)
			return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
		return Math.round(bytes / Math.pow(1024, i), 2);
	}
	
	function calculate(diag) {	
		var memory = {},
			memoryFormat = {};
			
			memory.used = diag.os['used memory'];
			memory.total = diag.os['total memory'];
			memory.free = diag.os['free memory'];
			memory.available =  ((memory.total - memory.free) / memory.total) * 100			
			$scope.memory = memory;	
			
			memoryFormat.used = formatBytes(diag.os['used memory'], true);
			memoryFormat.total = formatBytes(diag.os['total memory'], true);
			memoryFormat.free = formatBytes(diag.os['free memory'], true);
			memoryFormat.available =  ((memory.total - memory.free) / memory.total) * 100 + '%';		
			$scope.memoryFormat = memoryFormat;
	}

	$http.get('/manage/dashboard').then(function(res) {
		$scope.pkg = window._pkg;
		$scope.config = window._config;
		$scope.diag = window._diag;
		calculate(window._diag);
	});
	
	$scope.refresh = function() {
		$http.get('/manage/dashboard/refresh').then(function(res) {
			calculate(res.data);
		});
	};
	
});
var editor = angular.module('app.controllers.editor', []);
editor.controller('EditorCtrl', function ($scope) {

});
var wizard = angular.module('app.controllers.wizard', []);
wizard.controller('WizardCtrl', function ($scope) {

});