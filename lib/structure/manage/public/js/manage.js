'use strict';

var app = angular.module('app', [
	'ngRoute',
	'ngSanitize',
	'app.controllers',
	'app.factories',
	'app.directives',
	'app.modules'
]);

app.config(function ($routeProvider, $locationProvider) {
	$routeProvider
		.when('/manage/dashboard', { templateUrl: '/manage/dashboard.html', controller: 'DashCtrl' })
		.when('/manage/wizard', { templateUrl: '/manage/wizard.html', controller: 'WizardCtrl' })
		.when('/manage/editor', { templateUrl: '/manage/editor.html', controller: 'EditorCtrl' })
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
	});

	/* on route success */
	$rootScope.$on('$routeChangeSuccess', function (event, next, current) {

	});

});


angular.element(document).ready(function () {
	angular.bootstrap(document, ['app']);
});
angular.module('app.controllers', [
	'app.controllers.dash',
	'app.controllers.wizard',
	'app.controllers.editor'
]);
var dash = angular.module('app.controllers.dash', []);
dash.controller('DashCtrl', function ($scope, $http, UtilsFact) {

	var _utils = UtilsFact,
		multiplier = 1000,
		networkInterval = 1000,
		now = new Date().getTime(),
		networkChart,
		networkTimeout,
		networkOptions,
		packets = [],
		tempPackets = [],
		dashInterval;


	function dummyData() {
		packets.shift();
		while (packets.length < 60) {
			var y = Math.random() * 50,
				temp = [now += networkInterval, y];
			packets.push(temp);
		}
		return packets;
	}

	// create network options.
	networkOptions = {
		grid: {
			borderColor: '#ccc'
		},
		series: {
			lines: {
				show: true,
				lineWidth: 1.2,
				fill: true
			}
		},
		xaxis: {
			mode: "time",
			tickSize: [2, "second"],
			tickFormatter: function (v, axis) {
				var date = new Date(v);

				if (date.getSeconds() % 20 == 0) {
					var hours = date.getHours() < 10 ? "0" + date.getHours() : date.getHours();
					var minutes = date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes();
					var seconds = date.getSeconds() < 10 ? "0" + date.getSeconds() : date.getSeconds();

					return hours + ":" + minutes + ":" + seconds;
				} else {
					return "";
				}
			},
			axisLabel: "Time",
			axisLabelUseCanvas: true,
			axisLabelFontSizePixels: 12,
			axisLabelFontFamily: 'Verdana, Arial',
			axisLabelPadding: 10
		},
		yaxis: {
			min: 0,
			max: 100,
			tickSize: 20,
//			tickFormatter: function (v, axis) {
//				if (v % 10 == 0) {
//					return v;
//				} else {
//					return "";
//				}
//			},
			axisLabel: "Kilobytes per sec.",
			axisLabelUseCanvas: true,
			axisLabelFontSizePixels: 12,
			axisLabelFontFamily: 'Verdana, Arial',
			axisLabelPadding: 6
		},
		legend: {
			labelBoxBorderColor: "#fff"
		}
	};

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

	function barColor(percentage) {
		if(percentage <= 65)
			return '#5CB85C';
		if(percentage <= 85)
			return '#F0AD4E';
		return '#D9534F';
	}
	
	function calculate(diag) {

		var charts = {},
			sysInfo = '',
			osUsed, osTotal, osFree, procMemory, procHeapTotal, procHeapUsed;

		osUsed = diag.os['used memory'];
		osTotal = diag.os['total memory'];
		osFree = diag.os['free memory'];

		procMemory = diag.process.memory;
		procHeapTotal = diag.process['heap total'];
		procHeapUsed = diag.process['heap used'];

		charts.os = {};
		charts.os.used =  Math.round((osUsed / osTotal) * 100);
		charts.os.usedOptions = { barColor: barColor };
		charts.os.usage = diag.os['cpu usage'];
		charts.os.usageOptions = { barColor: barColor };

		charts.process = {};
		charts.process.heap =  Math.round((procHeapUsed / procHeapTotal) * 100);
		charts.process.heapOptions = { barColor: barColor };
		charts.process.usage = diag.process['cpu usage'];
		charts.process.usageOptions = { barColor: barColor };

		$scope.charts = charts;

		$scope.diag = diag;
		$scope.diag.os.cpu = diag.os.cpus[0];
		$scope.diag.os.totalMemory = formatBytes(osTotal, true);
	}

	function drawNetwork() {
		var dataset = [
			{ label: "Kbps", data: dummyData() }
		];
		if(!networkChart){
			networkChart = $.plot('#network', dataset, networkOptions);
		} else {
			// redraw the network chart.
			networkChart.setData(dataset);
			networkChart.draw();

		}
		networkTimeout = setTimeout(drawNetwork, networkInterval);
	}

	function refresh() {
		var ts = Math.round(+new Date()/1000);
		$http.get('/manage/dashboard/refresh?ts=' + ts + '&interval=' + $scope.interval).then(function(res) {
			_utils.diag = res.data.diag;
			calculate(res.data.diag);
		}, function (res) {
			clearInterval(dashInterval);
		});
	}

	function changeInterval() {
		clearInterval(dashInterval);
		if($scope.interval > 0)
			dashInterval = setInterval(refresh, $scope.interval * multiplier);
	}

	// calculate initial values.
	calculate(_utils.diag);

	$scope.refreshToggle = true;
	$scope.interval = 5;
	$scope.refresh = refresh;
	$scope.changeInterval = changeInterval;
	$scope.config = _utils.config;
	$scope.pkg = _utils.pkg;
	$scope.pkg.dependencyCount = Object.keys(_utils.pkg.dependencies).length;


	// initialize the interval.
	changeInterval();

	// start demo network monitor.
	drawNetwork();

	
});
var editor = angular.module('app.controllers.editor', []);

editor.controller('EditorCtrl', function ($scope, $http, UtilsFact) {

	var _utils = UtilsFact,
		editor, session;

	require("ace/ext/spellcheck");

	editor = ace.edit("editor", {});
	editor.setTheme("ace/theme/chrome");
	session = editor.getSession();
	session.setMode("ace/mode/json");

	$http.get('/manage/editor/show').then(function(res) {
		var data = JSON.stringify(res.data || {}, null, '\t');
		session.setValue(data);
	});


});
var wizard = angular.module('app.controllers.wizard', []);
wizard.controller('WizardCtrl', function ($scope) {

});
angular.module('app.directives', [

]);
angular.module('app.factories', [
	'app.factories.menu',
	'app.factories.utils'
]);
var menu = angular.module('app.factories.menu', []);

menu.factory('MenuFact', function ($rootScope) {

	var factory = {},
		active,
		items;

	items = [
		{ name: 'Dashboard' },
		{ name: 'Overview', link: '/manage/dashboard', glyphicon: 'glyphicon-dashboard', active: true },
		{ name: 'Configurator', link: '/manage/wizard', glyphicon: 'glyphicon-cog' },
		{ name: 'Editor', link: '/manage/editor', glyphicon: 'glyphicon-pencil' }
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
var utils = angular.module('app.factories.utils', []);

utils.factory('UtilsFact', function ($location) {

	var factory = {};

	factory.location = $location;
	factory.relativeUrl = $location.path();
	factory.pkg = window._pkg;
	factory.config = window._config;
	factory.diag = window._diag;

	factory.find = function (query, element) {
		element = element || document;
		element = element.querySelector(query) || undefined;
		if(element)
			return angular.element(element);
		return undefined;
	};
	factory.findAll = function (query, element) {
		element = element || document;
		element = element.querySelectorAll(query);
		if(element)
			return angular.element(element);
		return undefined;
	};



	return factory;
});
/**!
 * easyPieChart
 * Lightweight plugin to render simple, animated and retina optimized pie charts
 *
 * @license 
 * @author Robert Fleischmann <rendro87@gmail.com> (http://robert-fleischmann.de)
 * @version 2.1.5
 **/

(function(root, factory) {
    if(typeof exports === 'object') {
        module.exports = factory(require('angular'));
    }
    else if(typeof define === 'function' && define.amd) {
        define(['angular'], factory);
    }
    else {
        factory(root.angular);
    }
}(this, function(angular) {

(function (angular) {

	'use strict';

	return angular.module('easypiechart', [])

		.directive('easypiechart', [function() {
			return {
				restrict: 'A',
				require: '?ngModel',
				scope: {
					percent: '=',
					options: '='
				},
				link: function (scope, element, attrs) {

					scope.percent = scope.percent || 0;

					/**
					 * default easy pie chart options
					 * @type {Object}
					 */
					var options = {
						barColor: '#ef1e25',
						trackColor: '#888888',
						scaleColor: '#333333',
						scaleLength: 5,
						lineCap: 'square',
						lineWidth: 12,
						size: 125,
						rotate: 0,
						animate: {
							duration: 1000,
							enabled: true
						}
					};
					scope.options = angular.extend(options, scope.options);

					var pieChart = new EasyPieChart(element[0], options);

					scope.$watch('percent', function(newVal, oldVal) {
						pieChart.update(newVal);
					});
				}
			};
		}]);

})(angular);
/**
 * Renderer to render the chart on a canvas object
 * @param {DOMElement} el      DOM element to host the canvas (root of the plugin)
 * @param {object}     options options object of the plugin
 */
var CanvasRenderer = function(el, options) {
	var cachedBackground;
	var canvas = document.createElement('canvas');

	el.appendChild(canvas);

	if (typeof(G_vmlCanvasManager) !== 'undefined') {
		G_vmlCanvasManager.initElement(canvas);
	}

	var ctx = canvas.getContext('2d');

	canvas.width = canvas.height = options.size;

	// canvas on retina devices
	var scaleBy = 1;
	if (window.devicePixelRatio > 1) {
		scaleBy = window.devicePixelRatio;
		canvas.style.width = canvas.style.height = [options.size, 'px'].join('');
		canvas.width = canvas.height = options.size * scaleBy;
		ctx.scale(scaleBy, scaleBy);
	}

	// move 0,0 coordinates to the center
	ctx.translate(options.size / 2, options.size / 2);

	// rotate canvas -90deg
	ctx.rotate((-1 / 2 + options.rotate / 180) * Math.PI);

	var radius = (options.size - options.lineWidth) / 2;
	if (options.scaleColor && options.scaleLength) {
		radius -= options.scaleLength + 2; // 2 is the distance between scale and bar
	}

	// IE polyfill for Date
	Date.now = Date.now || function() {
		return +(new Date());
	};

	/**
	 * Draw a circle around the center of the canvas
	 * @param {strong} color     Valid CSS color string
	 * @param {number} lineWidth Width of the line in px
	 * @param {number} percent   Percentage to draw (float between -1 and 1)
	 */
	var drawCircle = function(color, lineWidth, percent) {
		percent = Math.min(Math.max(-1, percent || 0), 1);
		var isNegative = percent <= 0 ? true : false;

		ctx.beginPath();
		ctx.arc(0, 0, radius, 0, Math.PI * 2 * percent, isNegative);

		ctx.strokeStyle = color;
		ctx.lineWidth = lineWidth;

		ctx.stroke();
	};

	/**
	 * Draw the scale of the chart
	 */
	var drawScale = function() {
		var offset;
		var length;

		ctx.lineWidth = 1;
		ctx.fillStyle = options.scaleColor;

		ctx.save();
		for (var i = 24; i > 0; --i) {
			if (i % 6 === 0) {
				length = options.scaleLength;
				offset = 0;
			} else {
				length = options.scaleLength * 0.6;
				offset = options.scaleLength - length;
			}
			ctx.fillRect(-options.size/2 + offset, 0, length, 1);
			ctx.rotate(Math.PI / 12);
		}
		ctx.restore();
	};

	/**
	 * Request animation frame wrapper with polyfill
	 * @return {function} Request animation frame method or timeout fallback
	 */
	var reqAnimationFrame = (function() {
		return  window.requestAnimationFrame ||
				window.webkitRequestAnimationFrame ||
				window.mozRequestAnimationFrame ||
				function(callback) {
					window.setTimeout(callback, 1000 / 60);
				};
	}());

	/**
	 * Draw the background of the plugin including the scale and the track
	 */
	var drawBackground = function() {
		if(options.scaleColor) drawScale();
		if(options.trackColor) drawCircle(options.trackColor, options.lineWidth, 1);
	};

  /**
    * Canvas accessor
   */
  this.getCanvas = function() {
    return canvas;
  };
  
  /**
    * Canvas 2D context 'ctx' accessor
   */
  this.getCtx = function() {
    return ctx;
  };

	/**
	 * Clear the complete canvas
	 */
	this.clear = function() {
		ctx.clearRect(options.size / -2, options.size / -2, options.size, options.size);
	};

	/**
	 * Draw the complete chart
	 * @param {number} percent Percent shown by the chart between -100 and 100
	 */
	this.draw = function(percent) {
		// do we need to render a background
		if (!!options.scaleColor || !!options.trackColor) {
			// getImageData and putImageData are supported
			if (ctx.getImageData && ctx.putImageData) {
				if (!cachedBackground) {
					drawBackground();
					cachedBackground = ctx.getImageData(0, 0, options.size * scaleBy, options.size * scaleBy);
				} else {
					ctx.putImageData(cachedBackground, 0, 0);
				}
			} else {
				this.clear();
				drawBackground();
			}
		} else {
			this.clear();
		}

		ctx.lineCap = options.lineCap;

		// if barcolor is a function execute it and pass the percent as a value
		var color;
		if (typeof(options.barColor) === 'function') {
			color = options.barColor(percent);
		} else {
			color = options.barColor;
		}

		// draw bar
		drawCircle(color, options.lineWidth, percent / 100);
	}.bind(this);

	/**
	 * Animate from some percent to some other percentage
	 * @param {number} from Starting percentage
	 * @param {number} to   Final percentage
	 */
	this.animate = function(from, to) {
		var startTime = Date.now();
		options.onStart(from, to);
		var animation = function() {
			var process = Math.min(Date.now() - startTime, options.animate.duration);
			var currentValue = options.easing(this, process, from, to - from, options.animate.duration);
			this.draw(currentValue);
			options.onStep(from, to, currentValue);
			if (process >= options.animate.duration) {
				options.onStop(from, to);
			} else {
				reqAnimationFrame(animation);
			}
		}.bind(this);

		reqAnimationFrame(animation);
	}.bind(this);
};

var EasyPieChart = function(el, opts) {
	var defaultOptions = {
		barColor: '#ef1e25',
		trackColor: '#f9f9f9',
		scaleColor: '#dfe0e0',
		scaleLength: 5,
		lineCap: 'round',
		lineWidth: 3,
		size: 110,
		rotate: 0,
		animate: {
			duration: 1000,
			enabled: true
		},
		easing: function (x, t, b, c, d) { // more can be found here: http://gsgd.co.uk/sandbox/jquery/easing/
			t = t / (d/2);
			if (t < 1) {
				return c / 2 * t * t + b;
			}
			return -c/2 * ((--t)*(t-2) - 1) + b;
		},
		onStart: function(from, to) {
			return;
		},
		onStep: function(from, to, currentValue) {
			return;
		},
		onStop: function(from, to) {
			return;
		}
	};

	// detect present renderer
	if (typeof(CanvasRenderer) !== 'undefined') {
		defaultOptions.renderer = CanvasRenderer;
	} else if (typeof(SVGRenderer) !== 'undefined') {
		defaultOptions.renderer = SVGRenderer;
	} else {
		throw new Error('Please load either the SVG- or the CanvasRenderer');
	}

	var options = {};
	var currentValue = 0;

	/**
	 * Initialize the plugin by creating the options object and initialize rendering
	 */
	var init = function() {
		this.el = el;
		this.options = options;

		// merge user options into default options
		for (var i in defaultOptions) {
			if (defaultOptions.hasOwnProperty(i)) {
				options[i] = opts && typeof(opts[i]) !== 'undefined' ? opts[i] : defaultOptions[i];
				if (typeof(options[i]) === 'function') {
					options[i] = options[i].bind(this);
				}
			}
		}

		// check for jQuery easing
		if (typeof(options.easing) === 'string' && typeof(jQuery) !== 'undefined' && jQuery.isFunction(jQuery.easing[options.easing])) {
			options.easing = jQuery.easing[options.easing];
		} else {
			options.easing = defaultOptions.easing;
		}

		// process earlier animate option to avoid bc breaks
		if (typeof(options.animate) === 'number') {
			options.animate = {
				duration: options.animate,
				enabled: true
			};
		}

		if (typeof(options.animate) === 'boolean' && !options.animate) {
			options.animate = {
				duration: 1000,
				enabled: options.animate
			};
		}

		// create renderer
		this.renderer = new options.renderer(el, options);

		// initial draw
		this.renderer.draw(currentValue);

		// initial update
		if (el.dataset && el.dataset.percent) {
			this.update(parseFloat(el.dataset.percent));
		} else if (el.getAttribute && el.getAttribute('data-percent')) {
			this.update(parseFloat(el.getAttribute('data-percent')));
		}
	}.bind(this);

	/**
	 * Update the value of the chart
	 * @param  {number} newValue Number between 0 and 100
	 * @return {object}          Instance of the plugin for method chaining
	 */
	this.update = function(newValue) {
		newValue = parseFloat(newValue);
		if (options.animate.enabled) {
			this.renderer.animate(currentValue, newValue);
		} else {
			this.renderer.draw(newValue);
		}
		currentValue = newValue;
		return this;
	}.bind(this);

	/**
	 * Disable animation
	 * @return {object} Instance of the plugin for method chaining
	 */
	this.disableAnimation = function() {
		options.animate.enabled = false;
		return this;
	};

	/**
	 * Enable animation
	 * @return {object} Instance of the plugin for method chaining
	 */
	this.enableAnimation = function() {
		options.animate.enabled = true;
		return this;
	};

	init();
};


}));

angular.module('app.modules', [
	'easypiechart'
]);