'use strict';

module.exports = Progress;

/**
 * Constructor for progress bar.
 * @param {string} [prefix] - the message before the progress character (default: 'Please wait.')
 * @param {number} [interval] - the interval at which to show progress (default: 150)
 * @param {string} [append] - append a string to display at the end of progress when cleared (default: 'done!')
 * @param {string} [character] - the char used to display progress (default: '.')
 * @constructor
 */
function Progress(prefix, interval, append, character) {

    var self = this;

    this.prefix = prefix || 'Please wait.';
    this.interval = interval || 150;
    this.character = character || '.';
    this.append = append || 'done!';
    this.running = false;
    this.progress = undefined;

    this.start = function () {
        self.progress = setInterval(function () {
            if(!self.running) {
                prefix += self.character;
                process.stdout.clearLine();
                process.stdout.cursorTo(0);
                process.stdout.write(prefix);
                self.running = true;
            } else {
                process.stdout.write(self.character);
            }
        }, self.interval);
    };

    this.stop = function () {
        if(this.progress) {
            this.running = false;
            clearInterval(this.progress);
            if(append !== false)
                console.log(append || this.append);
        }
    };

}


