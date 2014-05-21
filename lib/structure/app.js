'use strict';

var Stukko = require('stukko'),
	stukko;

// NOTE: we call "listen" below as no command is passed to Stukko when starting locally.
// you may also forgo "listen" and start the app by running:
// node app start.

// create a new instance of Stukko
// and expose all the goodness.
stukko = new Stukko().listen();


