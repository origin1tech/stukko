'use strict';

var url = require('url');

function Git() {

    var self = this,
        childProc = require('child_process'),
        module = 'git',
        options = {
            cwd: self.cwd,
            silent: true,
            stdio: 'pipe'
        },
        pkgapp = this.pkgapp,
        git = {},
        commands = _.clone(this.commands),
        flags = _.clone(this.flags),
        lastpipe = null;

    // strips out command if passed
    // within the args.
    function stripCommand(cmd, args){
        var idx;
        if(!args) return;
        function pluck(c) {
            if(args.indexOf(c) !== -1){
                args.splice(args.indexOf(c), 1);
            }
        }
        if(_.isArray(cmd)){
            _.forEach(cmd, function (c) {
                pluck(c);
            });
        } else {
            pluck(cmd);
        }
        //return args;
    }

    function normalizeArgs(cmd, args, strip) {
        var tmp = [];
        cmd = cmd ? [cmd] : [];
        if(_.isString(args))
            args = args.split(',');
        if(_.isPlainObject(args)){
            _.forEach(args, function (v, k) {
                k = k.length === 1 ? '-' + k : '--' + k;
                if(v !== true && v !== false)
                    tmp.push(k, v);
                else
                    tmp.push(k);
            });
            args = tmp;
        }
        if(strip)
            stripCommand(cmd, args);
        return cmd.concat(args);
    }

    // built in aliases for lazy commits.
    git.commit = function commit(args) {
        flags.m = flags.m || flags.message || commands[1];
        flags.a = flags.a || true;
        args = normalizeArgs('commit', args || flags, true);
        this.spawn(args, function () {
            $$LOG.info('commit completed.\n');
            setTimeout(function () {
                git.spawn(['push'], function () {
                    git.exit('push completed...done!');
                });
            },300);
        });
    }

    git.pull = function (args) {
        args = normalizeArgs('pull', args || flags, true);
        this.spawn(args, function () {
            var npm = require('./npm'),
                npmCmd = 'install',
                nopost = flags['no-install'] || flags['no-update'];
            npm = npm.call(self);
            if(flags['with-update'])
                npmCmd = 'update';
            if((lastpipe && /Already up-to-date/g.test(lastpipe)) || nopost)
                git.exit();
            npm[npmCmd]([], function (err, data) {
                if(err){
                    $$LOG.error(err);
                    git.exit();
                } else {
                    git.exit('pull & install completed.');
                }
            });
        });
    };

    git.credentials = function credentials(args) {
        if(!args) {
            flags.u = flags.u || flags.username;
            flags.p = flags.p || flags.password;
            flags.r = flags.r || flags.repo || flags.repository;
            if(!flags.u || !flags.p)
                git.exit('git cannot config credentials using auth ' + flags.u + ':' + flags.p);
            // try to get repo uri from package.json
            if(!flags.r) {
                if(pkgapp && pkgapp.repository)
                    flags.r = pkgapp.repository.url;
            }
            if(!flags.r)
                git.exit('git cannot config credentials for the repository ' + repo, 'warn');
            flags.r = url.parse(flags.r);
            // if auth is present just
            // return the href.
            if(flags.r.auth){
                flags.r = flags.r.href;
            } else {
                // add auth element and format.
                flags.r.auth = flags.u + ':' + flags.p;
                flags.r = url.format(flags.r);
            }
            args = ['remote.origin.url', flags.r];
        }
        args = normalizeArgs('config', args, true);
        this.spawn(args, function () {
            git.exit('config completed.')
        });
    };

    git.generic = function generic(cmd, args) {
        args = normalizeArgs(cmd, args, true);
        this.spawn(args, function () {
            cmd = cmd || args[0] || 'git';
            git.exit(cmd + ' completed.');
        });
    };

    git.spawn = function spawn(args, done) {
        var child;
        // if debugging give child different port.
        if(self.debug)
            options.execArgv = ['--debug-brk'];
        if(!args.length)
            this.exit('Unable to process git the command is invalid.', 'warn');
        // spawn instead of fork to support debugging.
        child = childProc.spawn('git', args, options);
        child.stdout.on('data', function(msg) {
            msg = msg.toString(); //.replace(/(\r\n|\n|\r)/gm, '');
            console.log(msg);
            lastpipe = msg;
        });
        child.stderr.on('data', function (err) {
            err = err.toString(); //.replace(/(\r\n|\n|\r)/m, '');
            console.log(err);
            lastpipe = err;
        });
        child.unexpectedExit = function (code) {
            if(code !== 0 && code !== null && code !== undefined && code !== -1073741510) {
               if(/(nothing to commit|up-to-date)/g.test(lastpipe))
                    git.exit();
                git.exit('Git process terminated with code: ' + code, 'error');
            } else {
                if(!done)
                    git.exit('Git finished.')
                done();
            }
        };
        child.on("exit", child.unexpectedExit);
        // keep track of spawned processes.
        self.children.push(child);
    };

    git.exit = function exit(msg, type) {
        type = type || 'info';
        if(msg)
            $$LOG[type](msg);
        process.exit(0);
    }

    git.help = function help() {
        var	helpStr = '',
            nl = '\n',
            spacer = '   ';
        require('colors');
        helpStr += '\nSTUKKO GIT HELP\n===============================================================\n\n';
        helpStr += 'Usage: stukko git-<command>\n';
        helpStr += nl + 'where git-<command> is listed below:\n';
        helpStr += nl + spacer + 'git-commit:   '.green + ' commits & pulls, requires message. ex: stukko git-commit ' +
            '"my commit message".';
        helpStr += nl + spacer + 'git-pull:     '.green + ' pulls & installs, use --with-update to update. ex: stukko ' +
            'git-pull or git-pull origin master';
        helpStr += nl + spacer + 'git-cred:     '.green + ' configures repo credentials, requres -u USERNAME & -p ' +
            'PASSWORD, -r specifies repo url.\n                  ex: stukko git-cred -u USERNAME -p PASSWORD.';

        helpStr += '\n\nVisit http://www.stukkojs.com. for additional documentation.';
        console.log(helpStr);
        process.exit(0);
    }

    return git;
}

module.exports = Git;