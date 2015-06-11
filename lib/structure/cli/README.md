#Command Line Interface

The command line interface hook allows you to create your own cli commands automatically.

For example you may want to automate some process, perhaps stubbing out an html partial. The cli hook makes
this all possible. You may also create as many files as needed to keep things organized.

An example of a cli file:

```js

'use strict';

module.exports = Commands;

function Commands(cli) {

    // Commands will be called with the Stukko context.
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

    //wire up a command.
    cli.echo = function () {

        // get the second command.
        // the first would be the method "echo" in this case.
        var msg = commands[1];
        msg = 'Hello my name is: ' + msg;
        console.log(msg);
        
    };

}

```

You can also export an object:

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