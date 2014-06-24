#!/usr/bin/env node
var Stukko = require('../lib'),
	cmd = process.argv[2] || undefined,
	stukko;
if(cmd === 'start')
	require(process.cwd() + '/server.js');
else
	stukko = new Stukko();




