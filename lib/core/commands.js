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
	// initialize Stukko.
	this.init(function () {
		// install, update uninstall wrapper for npm.
		if(_.contains(['install', 'update', 'uninstall'], cmd))
			self.npm(cmd);
		// create a new application.
		if(_.contains(['create', 'new'], cmd))
			self.create();
		if(_.contains(['kill'], cmd))
			self.kill(self.flags.all);
		// get application information.
		if(_.contains(['info', 'diag', 'diagnostics'], cmd))
			self.info();
		// get application help.
		if(_.contains(['help'], cmd))
			self.help();
	});
};