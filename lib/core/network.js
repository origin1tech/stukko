'use strict';

/*
 * Monitoring requires WinPcap (Windows) or libpcap and libpcap-dev/libpcap-devel (*NIX systems).
 * see https://github.com/mscdex/cap
 */

var mon = require('cap'),
	_ = require('lodash'),
	Cap = mon.Cap,
	decoders = mon.decoders,
	PROTOCOL = decoders.PROTOCOL,
	moment = require('moment'),
	ip = require('ip');

module.exports = function network() {

	var self = this,
		cap = new Cap(),
		_diag = this.diag.get(),
		_address = _diag.server.ip,
		_filter = '',// TODO look into why filtering (ex: tcp and dst port 80) isn't working properly.
		_size = 10 * 1024 * 1024,
		_packetsTemp = [],
		_packets = [],
		_monitorInterval,
		_monitor;

	function resetPackets() {
		_packets.push(_packetsTemp);
		_packetsTemp = [];
	}

	return {

		interfaces: function interfaces(){
			return Cap.deviceList();
		},

		stop: function stop() {
			clearInterval(_monitorInterval);
			_packetsTemp = [];
			_packets = [];
			cap.close();
		},

		packets: function packets() {

			var result = [],
				total, i, j, ts, pk;

			if(!_monitor){
				this.monitor();
				return [];
			} else {
				total=0;
				for(i = 0; i < _packets.length; i++) {
					pk = _packets[i];
					total = 0;
					if(pk.length && pk[0] && pk[0].ts) {
						// some timestamps might be slightly off
						// use first in collection. this happens
						// because the ts creation may be slightly after
						// the actual reception of the packet.
						ts = pk[0].ts;
						for(j = 0; j < pk.length; j++){
							total += pk[j].bytes;
						}
						// convert to kilobytes return 0 if less than 1024.
						total = total > 1024 ? Math.round(total / 1024) : 0;
						ts =
						result.push([ts.valueOf(), total]);
					}
				}
				_packets = [];
				return result;
			}
		},

		monitor: function monitor(address, filter, size) {

			var buffer, type, device;

			address = address || _address;
			filter = filter || _filter;
			size = size || _size;
			buffer = new Buffer(65535);

			device = Cap.findDevice(address);

			if(device){
				clearInterval(_monitorInterval);
				_monitorInterval = setInterval(resetPackets, 1000);
				_monitor = cap.open(device, filter, size, buffer);
				cap.setMinBytes && cap.setMinBytes(0);
				cap.on('packet', function(nbytes, trunc) {
					var packet = buffer.slice(0, nbytes),
						result = {},
						decoded;
					result.bytes = nbytes;
					result.truncated = trunc ? true : false;
					if (_monitor === 'ETHERNET') {
						decoded = decoders.Ethernet(buffer);
						if (decoded.info.type === PROTOCOL.ETHERNET.IPV4 && nbytes) {
							_packetsTemp.push({ ts: moment(), bytes: nbytes});
						}
					}
				});
			}
		}
	}


};