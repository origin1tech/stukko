'use strict';
var optimist = require('optimist'),
	_ = require('lodash');

module.exports = function commands() {

	var self = this,
		args = optimist.argv,
		cli = /cli.js/.test(args.$0),
		cloneArgs = _.clone(args) || {},
		cmd = args._[0] || undefined,
		cmds = [
			'start',
			'run',
			'create',
			'new',
			'info',
			'help',
			'update',
			'install',
			'uninstall',
			'diagnostics',
			'processes',
			'backup',
			'restore',
			'pids',
			'tasks',
			'diag',
			'kill'
		];

	// normalize the command.
	cmd = cmd === 'run' ? 'start' : cmd;
    cmd = cmd === 'setpath' ? 'setPath' : cmd;
    cmd = cmd === 'new' || cmd === 'create' ? 'generate' : cmd;
    cmd = cmd === 'diag' || cmd === 'diagnostics' ? 'info' : cmd;
    cmd = cmd === 'pids' || cmd === 'tasks' ? 'processes' : cmd;

    // save the called command.
	this.cmd = cmd;

	// save reference to whether Stukko was
	// started using the cli or locally.
	this.cli = cli;

	// update instance with arg obj.
	this.args = args;

    // indicate we are starting Stukko
    // or simply initializing for command helpers.
    this.start = this.cmd === 'start' || !this.cli;

	// save all commands to instance.
	this.commands = args._ || [];

	// delete unneeded args.
	delete cloneArgs._;
	delete cloneArgs.$0;

	// save all the flags to instance.
	this.flags = cloneArgs || {};

	// check for additional packages to install.
	if(cmd === 'create' && this.flags.packages) {
		if(this.flags.packages.indexOf('|') !== -1)
			this.flags.packages = this.flags.packages.split('|');
		else
			this.flags.packages = this.flags.packages.split(',');
	}

	//make sure we have a valid command.
	if(cli && !_.contains(cmds, cmd))
		throw new Error('Stukko could not process command ' + cmd + '. Try stukko help for list of commands.');

    // initialize Stukko.
	this.emit('init');

};