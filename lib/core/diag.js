'use strict';

var os = require('os'),
	_ = require('lodash'),
	nusage = require('usage'),
	wincpu = require('windows-cpu');



module.exports = function diag() {

	var self = this,
		cpuLoad = {
			total: 0,
			process: 0
		};

	function getAddresses(exclude, family) {

		var addresses = [],
			interfaces = os.networkInterfaces(),
			name, ifaces, iface;

		exclude = exclude || /(emulator|vmware)/i;
		family = family || 'IPv4';

		for (name in interfaces) {
			if(interfaces.hasOwnProperty(name)){
				ifaces = interfaces[name];
				if(!exclude.test(name)){
					for (var i = 0; i < ifaces.length; i++) {
						iface = ifaces[i];
						//if (iface.family === 'IPv4' &&  !iface.internal && iface.address !== '127.0.0.1') {
						if (iface.family === family && !iface.internal){
							addresses.push(iface.address);
						}
					}
				}
			}
		}

		return addresses;

	}

	function cpuUsage() {

		if(os.platform() === 'win32'){
			wincpu.processLoad(function(err, results) {
				if(err) {
					log.error(err);
				} else {
					cpuLoad.process = results.found.filter(function(r) {
						return r.pid === process.pid;
					})[0] || undefined;
					if(!cpuLoad.process){
						log.warn('Error looking up cpu load for process ' + process.pid);
					} else {
						cpuLoad.process = cpuLoad.process.load;
					}
				}
			});
			wincpu.totalLoad(function(err, results) {
				if(err){
					log.error(err);
				} else {
					if(!results || !results.length){
						log.warn('Error looking up cpu load');
					} else {
						cpuLoad.total = results[0] || 0;
					}
				}
			});
		} else {

		}

	}

	function formatBytes(bytes) {
		var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'],
			i;
		if (bytes == 0) return '0 Bytes';
		i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
		return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
	}

	function excludeKeys(obj, exclude) {
		var invalidKey;
		_.forEach(obj, function (v, k) {
			invalidKey = _.contains(exclude, k);
			if (_.isObject(v) && !invalidKey) {
				excludeKeys(v, exclude);
			} else {
				if (invalidKey)
					delete obj[k];
			}
		});
		return obj;
	}

	// get initial usage.
	cpuUsage();

	return {

		get: function (key, exclude) {

			//call cpuUsage on each get.
			cpuUsage();

			var memory = process.memoryUsage(),
				addresses = getAddresses(),
				ipAddress = addresses[0] || undefined,
				obj,
				result;

				obj = {
					process: {
						node: process.version,
						memory: memory.rss,
						'heap total': memory.heapTotal,
						'heap used': memory.heapUsed,
						pid: process.pid,
						uptime: process.uptime().toFixed(2),
						'cpu usage': cpuLoad.process
					},
					os: {
						hostname: os.hostname(),
						arch: os.arch(),
						platform: os.platform(),
						type: os.type(),
						cpus: os.cpus(),
						'cpu usage': cpuLoad.total,
						'total memory': os.totalmem(),
						'free memory': os.freemem(),
						uptime: os.uptime().toFixed(2),
                        'used memory' : os.totalmem() - os.freemem(),
						network: os.networkInterfaces()
					},
					server: {
						ip: ipAddress,
						addresses: addresses,
						host: self.options.host,
						port: self.options.port,
						'stukko path': self.rootdir,
						'app path': self.cwd,
						packets: []
					}
				};

			if(!key){
				result = _.clone(obj);
				if(exclude)
					result = excludeKeys(result, exclude);
				return result;
			} else {
				return obj[key];
			}

		},

		format: function (bytes) {
			return formatBytes(bytes);
		},


		address: getAddresses


	}

};