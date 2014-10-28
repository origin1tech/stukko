#!/usr/bin/env node
var p = require('path'),
    Stukko = require('../node_modules/stukko'),
    cmd = process.argv[2] || undefined;
if(!Stukko)
    throw new Error('Ensure Stukko is installed in node_modules.');
if(cmd === 'start')
    require(p.join(process.cwd(), '/server.js'));
else
    new Stukko();