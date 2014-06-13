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