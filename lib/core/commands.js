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
			'create',
			'new',
			'run',
			'info',
			'help',
			'update',
			'install',
			'uninstall',
			'diagnostics',
			'processes',
			'pids',
			'tasks',
			'diag',
			'kill'
		];
	// save the called command.
	cmd = cmd === 'run' ? 'start' : cmd;
	this.cmd = cmd;
	// save reference to whether Stukko was
	// started using the cli or locally.
	this.cli = cli;
	// update instance with arg obj.
	this.args = args;
	// save all commands to instance.
	this.commands = args._;
	// delete unneeded args.
	delete cloneArgs._;
	delete cloneArgs.$0;
	// save all the flags to instance.
	this.flags = cloneArgs;
	// check for additional packages to install.
	if(this.flags.packages) {
		if(this.flags.packages.indexOf('|') !== -1)
			this.flags.packages = this.flags.packages.split('|');
		else
			this.flags.packages = this.flags.packages.split(',');
	}
	//make sure we have a valid command.
	if(cli && !_.contains(cmds, cmd))
		throw new Error('Stukko could not process command ' + cmd + '. Try stukko help for list of commands.');
	if(_.contains(['start', 'run'], cmd)){
		// get the ascii logo.
		var logo = this.utils.io.read(this.rootdir + '/lib/core/icon.txt');
		console.log(logo);
	}
	// build Stukko.
	this.build( function () {
		// install, update uninstall wrapper for npm.
		if(_.contains(['install', 'update', 'uninstall'], self.cmd))
			self.npm(cmd);
		// create a new application.
		if(_.contains(['create', 'new'], self.cmd))
			self.create();
		if(_.contains(['kill'], self.cmd))
			self.kill(self.flags.pid);
		// get application information.
		if(_.contains(['info', 'diag', 'diagnostics'], self.cmd))
			self.info();
		// get application help.
		if(_.contains(['help'], self.cmd))
			self.help();
		if(_.contains(['processes', 'pids', 'tasks'], self.cmd))
			self.processes();
	});

};