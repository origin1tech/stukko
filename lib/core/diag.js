'use strict';

module.exports = Diag;

function Diag() {

	var self = this;

	function formatBytes(bytes) {
		var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'],
			i;
		if (bytes == 0) return '0 Bytes';
		i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
		return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
	}

	return {

		get: function (key) {

			var memory = process.memoryUsage(),
				uptime = process.uptime().toFixed(2),
				obj = {
					node: process.version,
					memory: formatBytes(memory.rss),
					'heap total': formatBytes(memory.heapTotal),
					'heap used': formatBytes(memory.heapUsed),
					platform: process.platform,
					arch: process.arch,
					pid: process.pid,
					uptime: uptime + ' second(s)'
				};

			if(!key)
				return obj;
			return obj[key] || undefined;
		}

	}

}