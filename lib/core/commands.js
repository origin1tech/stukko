'use strict';

var optimist = require('optimist'),
	_ = require('lodash');

module.exports = function () {

	var self = this,
		args = optimist.argv,
		cloneArgs = _.clone(args) || {},
		cmd = args._[0] || undefined,
		cmds = [
			'start',
			'create',
			'new',
			'run',
			'info',
			'help'
		];

	// save the called command.
	cmd = cmd === 'run' || undefined === cmd ? 'start' : cmd;
	this.cmd = cmd;

	// update instance with arg obj.
	this.args = args;

	// save all commands to instance.
	this.commands = args._;

	// delete unneeded args.
	delete cloneArgs._;
	delete cloneArgs.$0;

	// save all the flags to instance.
	this.flags = cloneArgs;

	// make sure we have a valid command.
	if(!_.contains(cmds, cmd))
		throw new Error('Stukko could not process command ' + cmd + '. The command is not valid.');

	// initialize Stukko.
	// don't really need a callback but
	// in case we add a promise in the init
	// here for good measure.
	this.init(function () {

		// start the application.
		if(_.contains(['start', 'run'], cmd))
			self.listen();

		// create a new application.
		if(_.contains(['create', 'new'], cmd))
			self.create();

		// get application information.
		if(_.contains(['info'], cmd))
			self.info();

		// get application help.
		if(_.contains(['help'], cmd))
			self.help();

	});



};