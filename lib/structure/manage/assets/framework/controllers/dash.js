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