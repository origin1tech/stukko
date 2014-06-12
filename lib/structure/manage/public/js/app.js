'use strict';

var app = angular.module('app', [
	'ngRoute',
	'ngSanitize'
]);

app.config(function ($routeProvider, $locationProvider) {
	console.log('hello');
	$routeProvider
		.when('/manage/dashboard', { templateUrl: '/manage/dashboard.html', controller: 'DashController' })
		.otherwise({ redirectTo: '/manage/dashboard'});
	$locationProvider.html5Mode(true);
});


app.controller('DashController', function ($scope) {

});

angular.element(document).ready(function () {
	angular.bootstrap(document, ['app']);
});