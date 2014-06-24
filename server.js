(function () {

	'use strict';

	var Stukko = require('stukko'),
		stukko;

	/**
	 * Create the Stukko instance.
	 *
	 * Stukko Constructor - accepts two params, an object of "options"
	 * that can override your loaded config. Great for testing.
	 * The second param "config" accepts a path to a specific config.
	 * Useful to override the config of options to be applied for this instance.	 *
	 */
	stukko = new Stukko({test: true});

	if(process.argv[2] === 'start'){

		/**
		 * Listen - accepts three params. The port, host and a callback.
		 * The callback is optional. It is useful in that it returns the
		 * instance and context so that you may access any of Stukko's objects or
		 * properties.
		 */
		stukko.listen(function() {

			/*
			 * server is now listening and context is available.
			 * Just a few examples below, check source Stukko object
			 * for other properties and objects.
			 ******************************************************************/

			// access express                           ex: this.express.
			// access the express server                ex: this.app.
			// access config options                    ex: this.options.port.
			// access the sessionStore                  ex: this.sessionStore.
			// access your db                           ex: this.db. (or by GLOBAL var DB)
			// access the db connection                 ex: this.db.connection (or by GLOBAL var DB.connection)
			// access the db client/driver              ex this.db.client (this of it as require('mongoose'));
			// disconnect your db                       ex: this.db.destroy() (this will disconnect your db);
			// access all express server connections    ex: this.connections (returns an array).

			console.log(this.options.port);

		});

	}

})();

