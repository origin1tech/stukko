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