var defaultChars = '|/-\\';

function Spinner(text, chars, rate, isTTY){
    this.text = text || '';
    this.chars = chars || defaultChars;
    this.rate = rate || 100;
    this.tty = isTTY !== undefined ? isTTY : true;
    return this;
};

Spinner.prototype.start = function() {
    var self = this,
        ctr = 0,
        tmp = 0;
    //if(self.tty && !process.stdout.isTTY) return false;
    this.interval = setInterval(function(){
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write(self.text + self.chars[ctr]);
        ctr = ++ctr % self.chars.length;
    }, self.rate);
};

Spinner.prototype.setText = function(text) {
    this.text = text;
};

Spinner.prototype.stop = function(message, exit) {
    clearInterval(this.interval);
    if(message){
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write(message);
    }
    if(exit)
        process.exit(0);
};


module.exports = Spinner;