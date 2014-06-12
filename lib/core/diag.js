'use strict';

var os = require('os'),
	_ = require('lodash');

module.exports = Diag;

function Diag() {

	function formatBytes(bytes) {
		var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'],
			i;
		if (bytes == 0) return '0 Bytes';
		i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
		return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
	}

	function excludeKeys(obj, exclude) {
		var invalidKey;
		_.forEach(obj, function(v,k) {
			invalidKey = _.contains(exclude, k);
			if(_.isObject(v) && !invalidKey){
				excludeKeys(v, exclude);
			}else {
				if (invalidKey)
					delete obj[k];
			}
		});
		return obj;
	}

	return {

		get: function (key, format, exclude) {

			format = format || false;

			var memory = process.memoryUsage(),
				obj,
				formatted,
				result;

				obj = {
					process: {
						node: process.version,
						memory: memory.rss,
						'heap total': memory.heapTotal,
						'heap used': memory.heapUsed,
						pid: process.pid,
						uptime: process.uptime().toFixed(2)
					},
					os: {
						hostname: os.hostname(),
						arch: os.arch(),
						platform: os.platform(),
						cpus: os.cpus(),
						loadavg: os.loadavg(),
						'total memory': os.totalmem(),
						'free memory': os.freemem(),
						uptime: os.uptime().toFixed(2)
					}
				};

				formatted = {
					process: {
						node: process.version,
						memory: formatBytes(memory.rss),
						'heap total': formatBytes(memory.heapTotal),
						'heap used': formatBytes(memory.heapUsed),
						pid: process.pid,
						uptime: process.uptime().toFixed(2) + ' second(s)'
					},
					os: {
						hostname: os.hostname(),
						arch: os.arch(),
						platform: os.platform(),
						cpus: os.cpus(),
						loadavg: os.loadavg(),
						'total memory': formatBytes(os.totalmem()),
						'free memory': formatBytes(os.freemem()),
						uptime: os.uptime().toFixed(2) + ' second(s)'
					}
				};

			if(!key){
				if(format)
					result = _.clone(formatted);
				else
					result = _.clone(obj);
				if(exclude)
					result = excludeKeys(result, exclude);
				return result;
			} else {
				if(format)
					return formatted[key];
				return obj[key];
			}

		}



	}

}