'use strict';
var util = require('util'),
	events = require('events');
module.exports = Events;
/**
 * Events Emitter for Stukko.
 * @constructor
 */
function Events() {
	events.EventEmitter.call(this);
}
// inherit the event emitter.
util.inherits(Events, events.EventEmitter);

