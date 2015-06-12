#Command Line Interface

The command line interface hook allows you to create your own cli commands automatically.

For example you may want to automate some process, perhaps stubbing out an html partial. The cli hook makes
this all possible. You may also create as many files as needed to keep things organized.

An example of a cli file:

```js

'use strict';

module.exports = Commands;

function Commands(cli) {

    // Commands will be bound with the Stukko context.
    // This enables exposing all of Stukko's objects & properties.

    var args, commands, flags;

    // args are all passed params including commands and flags.
    // Stukko uses optimist to parse command params.
    args = this.args;

    // commands filtered from optimist, removes "stukko" path etc.
    // if you wish to access all commands/flags and so on use args.
    // ex: stukko start "start" would be a command.
    commands = this.commands;

    // any flags passed ex: --config development
    // config would be accessible as flags.config;
    flags = this.flags;

    // using "cli" it is possible
    // to bind your method directly
    // however some methods may conflict
    // with Stukko's internal methods.
    // for this reason you should return
    // an object of functions. Stukko
    // will thing prefix those methods
    // with the file name the functions
    // are contained in.
    
    cli._echo = function () {

        // get the second command.
        // the first would be the method "echo" in this case.
        var msg = commands[1];
        msg = 'Hello my name is: ' + msg;
        console.log(msg);
        
    };

}

```

You can also export an object. This is the suggested method as methods will be prefixed
with the file name the object of functions resides in. For example if you had a file
/cli/db.js and returned an object containing the method "create" the command you'd
call from your terminal would be:

**stukko db-create**

This prevents conflicts with Stukko's own internal methods.

```js

'use strict';

module.exports = {

    echo: function echo() {

        // get the second command.
        // the first would be the method "echo" in this case.
        var msg = this.commands[1];
        msg = 'Hello my name is: ' + msg;
        console.log(msg);
        
    }

};

```