#!/usr/bin/env node
var p = require('path'),
	Stukko = require('../lib'),
	cmd = process.argv[2] || undefined;
if(cmd === 'start')
	require(p.join(process.cwd(), '/server.js'));
else
	new Stukko();





