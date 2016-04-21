
window.Taiko = {
    EXTNAME: '.tja',

    BARLINE: 0,
    DON_SMALL: 1,
    KA_SMALL: 2,
    DON_BIG: 3,
    KA_BIG: 4,
    ROLL_SMALL: 5,
    ROLL_BIG: 6,
    BALLOON: 7,
    END_ROLL: 8,
    NOT_SUPPORT: 9,

    NOTE_SIZE: 60,
    NOTE_SIZE_SMALL: 34,
    NOTE_SIZE_BIG: 52,

    Version: {
        MAJOR: 0,
        MINOR: 0,
        PATCH: 0,

        toString() {
            return Taiko.Version.STRING;
        }
    },

    DOUBLE_TOLERANCE: 2,

    Judgement: {
        PERFECT: 25,
        GREAT: 75,
        MISS: 108
    },

    _offset: 0,

    get offset() {
        return Taiko._offset;
    },
    set offset(value) {
        Taiko._offset = value;
        console.log("Current offset: " + value + "ms");
    },
    get playdata() {
        return Taiko._playdata;
    },
    get lastHit() {
        return Taiko._lastHit;
    },
    get startTime() {
        return Taiko._startTime;
    },
    get combo() {
        return Taiko._combo;
    },
    get fumen() {
        return Taiko._fumen;
    },
    get gauge() {
        return Taiko._gauge;
    },
    get songdata() {
        return Taiko._songdata;
    },
    get playTime() {
        return Taiko._playTime;
    },
    get score() {
        return Taiko._playdata.score;
    },
    get songvol() {
        return Taiko._songdata.songvol;
    },
    get sevol() {
        return Taiko._songdata ? Taiko._songdata.sevol : 1;
    },
    get scoreinit() {
        return Taiko._songdata.scoreinit;
    },
    get scorediff() {
        return Taiko._songdata.scorediff;
    },

    initialize() {
        Taiko.SE.initialize();
    },

    isStarted() {
        return this._startTime;
    },

    isGameover() {
        return this.isStarted() && this._playTime > this._fumen.endTime;
    },

    isGogotime() {
        return this._songdata.gogotimes.some(function(range) {
            return range(this._playTime);
        }, this);
    },

    start() {
        Taiko.Song.play(this._songdata.wave, this.songvol, false, 0);
        this._startTime = this.msec();
        this.updateTime();
    },

    tryStart() {
        if (Taiko.Song.isReady()) {
            Taiko.start();
        }
    },

    setup(songdata) {
        this.clear();
        this._playdata = new Taiko.Playdata();
        this._songdata = songdata;
        this._fumen = new Taiko.Fumen(songdata);
        this._gauge = new Taiko.Gauge(this._fumen);
        Taiko.Song.prepare(songdata.wave);
    },

    clear() {
        this._combo = 0;
        this._hitCallbacks = [];
        this._startTime = null;
        this._playTime = 0;
        this._lastHit = null;
        this._songdata = null;
    },

    stop() {
        ImageManager.clearRolls();
        Taiko.Song.stop();
        if (this.isGameover()) {
            this._playdata.save();
        }
        this.clear();
    },

    hit(note) {
        this._lastHit = note;
        note.hit();
        this.onHit();
        this._hitCallbacks.forEach(function(callback) {
            callback(note);
        });
    },

    addHitListener(callback) {
        this._hitCallbacks.push(callback);
    },

    updateTime() {
        this._playTime = this.msec() - this.startTime + Taiko.offset;
    },

    onHit() {
        var performance = this._lastHit.performance;
        this._playdata.score += this._lastHit.score;
        if (!performance) { return; }
        this._gauge.add(performance);
        switch(performance) {
            case Taiko.Judgement.PERFECT:
            case Taiko.Judgement.GREAT:
                ++this._combo;
                if (this._playdata.maxCombo = this._combo) {
                    this._playdata.maxCombo = this._combo;
                }
                break;
            case Taiko.Judgement.MISS:
                this._combo = 0;
        }
        ++this._playdata[performance];
    },

    msec() {
        return Date.now();
    },

    Note(type, time, speed) {
        return new Taiko.Note.TYPES[type](type, time, speed);
    }
};


Taiko.Version.STRING = [Taiko.Version.MAJOR, Taiko.Version.MINOR, Taiko.Version.PATCH].join(',');
Taiko.Version.toString = function() {
    return Taiko.Version.STRING;
};
Taiko.VERSION = (Taiko.Version.MAJOR << 20) + (Taiko.Version.MINOR << 10) + Taiko.Version.PATCH;

Taiko.SE = Utils.createClass(function(url) {
    this.buffer = new WebAudio(url);
},
{
    play() {
        this.buffer.volume = Taiko.sevol;
        this.buffer.play();
    }
},
{
    initialize() {
        Taiko.SE.DONG = new Taiko.SE('audio/dong.wav');
        Taiko.SE.KA = new Taiko.SE('audio/ka.wav');
        Taiko.SE.BALLOON = new Taiko.SE('audio/balloon.wav');
    }
});

Taiko.Song = {
    play(wave, volume, loop, offset) {
        this.prepare(wave);
        this._song.volume = volume;
        this._song.play(false, offset);
    },
    stop() {
        this._song.stop();
    },
    isReady() {
        return this._song.isReady();
    },
    prepare(wave) {
        if (this._song.url !== wave) {
            this._song.clear();
            this._song = new WebAudio(wave);
        }
    },
    _song: Object.create(WebAudio.prototype)
};


Taiko.Playdata = Utils.createClass(function() {
    this.score = 0;
    this.maxCombo = 0;
    this[Taiko.Judgement.PERFECT] = 0;
    this[Taiko.Judgement.GREAT] = 0;
    this[Taiko.Judgement.MISS] = 0;
    this.normalClear = false;
    this.version = Taiko.VERSION;
},
{
    isEmpty() {
        return this.score === 0;
    },

    save() {
        var name = Taiko.songdata.name;
        var oldData = Taiko.Playdata.load(name);
        var newData;

        if (this.score > oldData.score) {
            newData = JSON.parse(JSON.stringify(this));
        } else {
            newData = oldData;
        }

        newData.normalClear = Taiko.gauge.isNormal() || oldData.normalClear;
        Storage.save(Taiko.Playdata.makeFilename(name), JSON.stringify(newData));
    }
},
{
    makeFilename(name) {
        return name + '.json';
    },

    load(name) {
        var filename = Taiko.Playdata.makeFilename(name);
        var data = Storage.load(filename);
        var ret = new Taiko.Playdata();
        if (data) {
            data = JSON.parse(data)
            for (var key in data) {
                 ret[key] = data[key];
            }
        }
        return ret;
    }
});

Taiko.Songdata = Utils.createClass(function(name) {
    this._name = name;
    this.initData();
},
{
    get name() {
        return this._name;
    },
    get title() {
        return this._title;
    },
    get subtitle() {
        return this._subtitle;
    },
    get wave() {
        return this._wave;
    },
    get balloons() {
        return this._balloons;
    },
    get scoreinit() {
        return this._scoreinit;
    },
    get scorediff() {
        return this._scorediff;
    },
    get songvol() {
        return this._songvol;
    },
    get sevol() {
        return this._sevol;
    },
    get level() {
        return this._level;
    },
    get course() {
        return this._course;
    },
    get gogotimes() {
        return this._gogotimes;
    },
    get prevCourse() {
        return this._prevCourse;
    },
    get demostart() {
        return this._demostart;
    },
    get fumen() {
        if (!this._fumen) { this.parseFumen(); }
        return this._fumen;
    },
    get nextCourse() {
        try {
            if (this._nextCourse !== undefined) { return this._nextCourse; }
            this.readFumenString();
            this._nextCourse = this.clone();
            this._nextCourse.readNextCourse();
            this._nextCourse._prevCourse = this;
            return this._nextCourse;
        } catch (e) {
            if (typeof(e) === "string" && e.startsWith(Taiko.Songdata.EOFError)) {
                this._nextCourse = false;
                return false;
            } else {
                throw e;
            }
        }
    },

    clone() {
        var ret = Object.create(Taiko.Songdata.prototype);
        for (var key in this) {
            if (key.startsWith('_')) {
                ret[key] = this[key];
            }
        }
        return ret;
    },

    initData() {
        this._wave = this._name;
        this._bpm = 120;
        this._time = 0;
        this._measure = [4, 4];
        this._scoreinit = 100;
        this._scorediff = 100;
        this._scroll = 1;
        this._songvol = 1;
        this._sevol = 1;
        this._demostart = 0;
        this._barlineOn = true;
        this._balloons = [];
        this._gogotimes = [];

        this._lastRoll = null

        Storage.readFile(this._name + Taiko.EXTNAME, function(e, data) {
            if (e) { throw e; }
            this._data = data.replace(Taiko.Songdata.COMMENT_RE, '')
            this._ptr = 0;
            this.readHeader();
        }.bind(this))
    },

    readNextCourse() {
        this._fumen = null;
        this._fumenString = null;
        this.readHeader();
    },

    readHeader() {
        try {
            this.readUntil("\n#START").split("\n").forEach(function(line) {
                var match = line.match(Taiko.Songdata.HEADER_RE);
                if (match) {
                    var methodName = "header" + Taiko.Songdata.captialize(match[1]);
                    if (this[methodName]) {
                        this._contents = match[2];
                        this[methodName]();
                    }
                };
            }, this)
        } catch (e) {
            if (typeof(e) === "string" && e.startsWith(Taiko.Songdata.ReadNextHeader)) {
                this.readHeader();
            } else {
                throw e;
            }
        }
    },

    readFumenString() {
        if (!this._fumenString) {
            this._fumenString = this.readUntil("\n#END");
        }
        return this._fumenString;
    },

    parseFumen() {
        this._fumen = [];
        for (var i = 0; i < 8; ++i) {
            this._fumen[i] = {};
        }

        this.readFumenString().split(',').forEach(function(bar) {
            var lines = bar.split("\n").map(function(s) { return s.trim(); });

            // read directives between bars
            while ((this._line = lines[0]) !== undefined) {
                if (!this._line || this.readDirective()) {
                    lines.shift();
                } else {
                    break;
                }
            }

            // add barline
            if (this._barlineOn) {
                this.addNote(Taiko.BARLINE);
            }

            // count notes
            var count = 0;
            lines.forEach(function(line) {
                if (!line.match(Taiko.Songdata.DIRECTIVE_RE)) {
                    // count 0-9
                    var lineMatch = line.match(/\d/g);
                    if (lineMatch) {
                        count += lineMatch.length;
                    }
                }
            })

            // read a bar
            if (count === 0) {
                this._time += this.barLength();
            } else {
                this._interval = this.barLength() / count;
                lines.forEach(function(line) {
                    this._line = line;
                    this.readDirective() || this.readNotes();
                }, this)
                this._interval = null;
            }
        }, this)

        this.setGogoend();
        this.checkValidity();
    },

    barLength() {
        return 240000 / this._bpm * this._measure[0] / this._measure[1];
    },

    readDirective() {
        var match = this._line.match(Taiko.Songdata.DIRECTIVE_RE);
        if (match) {
            var methodName = "directive" + Taiko.Songdata.captialize(match[1]);
            if (this[methodName]) {
                this._contents = match[2];
                this[methodName]();
            }
            return true;
        }
        return false;
    },

    readNotes() {
        var len = this._line.length;
        for (var i = 0; i < len; ++i) {
            var ch = this._line[i];
            if (ch < '0' || ch > '9') { continue; }
            var type = parseInt(ch);
            switch(type) {
                case Taiko.DON_SMALL:
                case Taiko.KA_SMALL:
                case Taiko.DON_BIG:
                case Taiko.KA_BIG:
                    this.addNote(type, false);
                    break;
                case Taiko.ROLL_SMALL:
                case Taiko.ROLL_BIG:
                case Taiko.BALLOON:
                    this.addNote(type, true);
                    break;
                case Taiko.END_ROLL:
                    this.endRoll();
                    break;
                case Taiko.NOT_SUPPORT:
                    this.addNote(Taiko.ROLL_SMALL, true);
                    break;
            }
            this._time += this._interval;
        };
    },

    headerBpm() {
        this.invalidInABar('BPMCHANGE');
        var bpm = parseFloat(this._contents);
        if (bpm) {
            this._bpm = bpm;
            this.updateSpeed();
        }
    },

    headerWave() {
        var dirName = this._name.slice(0, this._name.lastIndexOf('/') + 1);
        this._wave = dirName + this._contents;
    },

    headerMeasure() {
        this.invalidInABar('MEASURE');
        if (this._contents.match(/(\d+)(?:\s+|\s*\/\s*)(\d+)/)) {
            this._measure = [parseInt(RegExp.$1), parseInt(RegExp.$2)];
        }
    },

    headerOffset() {
        var offset = parseFloat(this._contents);
        if (offset) {
            this._time = -1000 * offset;
        }
    },

    headerScroll() {
        var scroll = parseFloat(this._contents);
        if (scroll) {
            this._scroll = scroll;
            this.updateSpeed();
        }
    },

    headerBalloon() {
        var sep = this._contents.indexOf(',') >= 0 ? ',' : ' '
        this._balloons = this._contents.split(sep).map(function(s) {
            return parseInt(s);
        });
    },

    headerStyle() {
        if (this._contents.toLowerCase().indexOf('double') >= 0) {
            // skip
            this.readUntil("\n#END");
            this.readUntil("\n#END");
            throw Taiko.Songdata.ReadNextHeader;
        }
    },

    directiveGogostart() {
        this.setGogostart() || this.tjaerror('unexpected #GOGOSTART');
    },

    directiveGogoend() {
        this.setGogoend() || this.tjaerror('unexpected #GOGOEND');
    },

    directiveBarlineon() {
        this._barlineOn = true;
    },

    directiveBarlineoff() {
        this._barlineOn = false;
    },

    directiveDelay() {
        var delay = parseFloat(this._contents);
        if (delay) {
            this._time += delay * 1000;
        };
    },

    invalidInABar(directive) {
        if (this._interval) {
            this.tjaerror("unexpected #"+directive+" inside a bar")
        };
    },

    updateSpeed() {
        this._speed = this._bpm * this._scroll / 500;
    },

    isInGogotime() {
        return typeof(this._gogotimes[this._gogotimes.length - 1]) === 'number';
    },

    setGogostart() {
        if (!this.isInGogotime()) {
            this._gogotimes.push(this._time);
            return true;
        }
        return false;
    },

    setGogoend() {
        if (this.isInGogotime()) {
            var startTime = this._gogotimes.pop();
            this._gogotimes.push(Taiko.Songdata.Range(startTime, this._time));
            return true;
        }
        return false;
    },

    addNote(type, isRoll) {
        if (this._lastRoll !== null) {
            if (type != Taiko.BARLINE && type != this._lastRoll) {
                this.tjaerror("unexpected note ("+type+"), expecting roll end (8)");
            }
        } else {

            var noteArray = this._fumen[type][this._speed];
            if (!noteArray) {
                noteArray = this._fumen[type][this._speed] = []
            }

            noteArray.push(this._time);

            if (isRoll) {
                this._lastRoll = type;
            }
        }
    },

    endRoll() {
        if (this._lastRoll) {
            var notes = this._fumen[this._lastRoll][this._speed];
            var startTime = notes.pop();
            notes.push(Taiko.Songdata.Range(startTime, this._time));
            this._lastRoll = null;
        } else {
            this.tjaerror('unexpected roll end (8)');
        }
    },

    checkValidity() {
        var balloonsLen = 0;
        var balloons = this._fumen[Taiko.BALLOON]
        for (var time in balloons) {
            balloonsLen += balloons[time].length;
        }

        if (this._balloons.length < balloonsLen) {
            this.tjaerror("wrong number of balloons ("+this._balloons.size+" for "+balloonsLen+")");
        }

        if (this._lastRoll) {
            this.tjaerror("unexpected #END, expecting roll end (8)");
        };
    },

    tjaerror(message) {
        throw(Taiko.Songdata.TJAError + message);
    },

    readUntil(sep) {
        var index = this._data.indexOf(sep, this._ptr);
        if (index < 0) {
            throw Taiko.Songdata.EOFError;
        }
        index += sep.length;
        var ret = this._data.slice(this._ptr, index);
        this._ptr = index;
        return ret;
    },

    isReady() {
        return this._data;
    }
},
{
    HEADER_RE: /#?(\w+) *:?(.*)/m,
    DIRECTIVE_RE: /^# *(\w+) *:?(.*)/m,
    COMMENT_RE: /\/\/.+/g,

    // exceptions
    TJAError: "TJAError ",
    EOFError: "EOFError ",

    Range(begin, end) {
        var ret = function(n) {
            return begin <= n && n <= end;
        };

        ret.begin = begin;
        ret.end = end;

        return ret;
    },

    captialize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }
});

Taiko.Songdata.ReadNextHeader = Taiko.Songdata.TJAError + "ReadNextHeader ";


void function($) {
    function divide100(contents) {
        return parseInt(contents) / 100;
    }
    function defineHeader(name, conversion) {
        var methodName = "header" + Taiko.Songdata.captialize(name);
        var propName = "_" + name;
        // Taiko.Songdata.prototype["headerScoreinit"] = function() {
        //    this._scoreinit = parseInt(this._contents);
        // }
       $[methodName] = function() {
            if (conversion) {
                this._contents = conversion(this._contents);
            }
            if (this._contents) {
                this[propName] = this._contents;
            }
        }
    }
    defineHeader("scoreinit", parseInt);
    defineHeader("scorediff", parseInt);
    defineHeader("level", parseInt);

    defineHeader("demostart", parseFloat);

    defineHeader("title");
    defineHeader("subtitle");
    defineHeader("course");
    defineHeader("songvol", divide100);
    defineHeader("sevol", divide100);

    $.directiveBpm = $.headerBpm;
    $.directiveBpmchange = $.headerBpm;
    $.directiveMeasure = $.headerMeasure;
    $.directiveScroll = $.headerScroll;
}(Taiko.Songdata.prototype);


Taiko.Note.Base = Utils.createClass(function(type, time, speed) {
    this._type = type;
    this._time = time;
    this._speed = speed;
    this._status = 0;
},
{
    get type() {
        return this._type;
    },
    get time() {
        return this._time;
    },
    get startTime() {
        return this._time;
    },
    get endTime() {
        return this._time;
    },
    get speed() {
        return this._speed;
    },
    get status() {
        return this._status;
    },
    score: 0,
    get x() {
        return (this.startTime - Taiko.playTime) * this._speed;
    },
    get z() {
        return Graphics.width - this.x;
    },
    centerX: Taiko.NOTE_SIZE / 2,
    get anchorX() {
        return this.centerX / this.width;
    },
    width: Taiko.NOTE_SIZE,
    get appearTime() {
        return this.startTime - (Graphics.width + this.centerX) / this._speed;
    },
    get bitmap() {
        var ret = new Bitmap(this.width, Taiko.NOTE_SIZE);
        this.draw(ret);
        return ret;
    },

    isOver() {
        return Taiko.playTime > this.endTime;
    },

    isValid() {
        return this._status !== false;
    },

    isNormal: Utils.returnFalse,
    hit: Utils.voidFunction,
    draw: Utils.voidFunction
});

void function($) {
    $.isRoll = $.isNormal;
    $.isBalloon = $.isNormal;
    $.isHitting = $.isNormal;
    $.isBig = $.isNormal;
}(Taiko.Note.Base.prototype);


Taiko.Note.Barline = Utils.deriveClass(Taiko.Note.Base, null,
{
    centerX: 0,
    anchorX: 0,
    width: 1,
    z: 0,

    draw(bitmap) {
        bitmap.fillRect(0, 0, this.width, Taiko.NOTE_SIZE, Taiko.Note.Barline.COLOR);
    }
},
{
    COLOR: '#EEE'
});


Taiko.Note.Normal = Utils.deriveClass(Taiko.Note.Base, null, {

    get score() {
        if (!this._performance || this._performance == Taiko.Judgement.MISS) {
            return 0;
        }
        var score = Taiko.scoreinit + Math.min(Taiko.combo / 10, 10) * Taiko.scorediff;
        if (this.isDoubleScore()) {
            score *= 2;
        }
        if (this.performance == Taiko.Judgement.GREAT) {
            score /= 2;
        }
        if (this.isGogotime()) {
            score *= 1.2;
        }
        return Math.floor(score);
    },

    get performance() {
        if (!this._performance) {
            this._performance = this.judge();
        }
        return this._performance;
    },

    isNormal: Utils.returnTrue,

    hit() {
        if (!this.isOver()) {
            this._status = false;
        };
    },

    isBig() {
        return this._type == Taiko.DON_BIG || this._type == Taiko.KA_BIG;
    },

    isDoubleScore() {
        return this.isBig() && this.double;
    },

    isGogotime() {
        Taiko.songdata.gogotimes.some(function(range) {
            return range(this._time);
        }, this);
    },

    judge() {
        var offset = Math.abs(Taiko.playTime - this._time);
        if (offset < Taiko.Judgement.PERFECT) {
            return Taiko.Judgement.PERFECT;
        }
        if (offset < Taiko.Judgement.GREAT) {
            return Taiko.Judgement.GREAT;
        }
        if (offset < Taiko.Judgement.MISS || this.isOver()) {
            return Taiko.Judgement.MISS;
        }
        return null;
    },

    isOver() {
        return Taiko.playTime - this._time > Taiko.Judgement.MISS;
    },

    draw(bitmap) {
        var src = ImageManager.skin('notes');
        src.addLoadListener(function() {
            bitmap.blt(src,
                (this._type - 1) * Taiko.NOTE_SIZE, 0,
                Taiko.NOTE_SIZE, Taiko.NOTE_SIZE,
                0, 0
            )
        }.bind(this));
    },
});

Taiko.Note.RollBase = Utils.deriveClass(Taiko.Note.Base, null, {
    get startTime() {
        return this._time.begin;
    },
    get endTime() {
        return this._time.end;
    },
    get number() {
        return this._status;
    },

    isHitting() {
        return this._time(Taiko.playTime);
    }
});


Taiko.Note.Roll = Utils.deriveClass(Taiko.Note.RollBase, null, {
    get score() {
        var score = this.isBig() ? 360 : 300;
        if (Taiko.isGogotime()) {
            score *= 1.2;
        }
        return Math.floor(score);
    },
    get bodyWidth() {
        return Math.floor((this._time.end - this._time.begin) * this._speed);
    },
    get width() {
        return Taiko.NOTE_SIZE + this.bodyWidth;
    },
    isRoll: Utils.returnTrue,

    isBig() {
        return this._type == Taiko.ROLL_BIG;
    },

    hit() {
        ++this._status;
    },

    draw(bitmap) {
        var src = ImageManager.skin('notes');
        src.addLoadListener(function() {
            var x = this.isBig() ? 480 : 300;

            if (this.bodyWidth > 0) {
                bitmap.blt(src,
                    x, 0, Taiko.NOTE_SIZE, Taiko.NOTE_SIZE,
                    this.centerX, 0, this.bodyWidth, Taiko.NOTE_SIZE
                );
            }

            x += Taiko.NOTE_SIZE * 1.5;
            bitmap.blt(src,
                x, 0, Taiko.NOTE_SIZE * 1.5, Taiko.NOTE_SIZE,
                this.centerX + this.bodyWidth, 0
            );

            x = this.isBig() ? 780 : 720;
            bitmap.blt(src,
                x, 0, Taiko.NOTE_SIZE, Taiko.NOTE_SIZE,
                0, 0
            );
        }.bind(this));
    }
});


Taiko.Note.Balloon = Utils.deriveClass(Taiko.Note.RollBase, null, {

    get number() {
        return this._status;
    },
    set number(n) {
        this._status = n;
    },
    get x() {
        if (this.isHitting()) {
            return 0;
        }
        if (this.isOver()) {
            return (this.endTime - Taiko.playTime) * this._speed;
        }
        return (this.startTime - Taiko.playTime) * this._speed;
    },
    width: Taiko.NOTE_SIZE * 2,
    get score() {
        var score = this._status !== false ? 300 : 5000;
        if (Taiko.isGogotime) {
            score *= 1.2;
        }
        return Math.floor(score);
    },

    isBalloon: Utils.returnTrue,

    isHitting() {
        return this._status !== false && Taiko.Note.RollBase.prototype.isHitting.call(this);
    },

    hit() {
        --this._status;
        if (this._status <= 0) {
            this._status = false;
            Taiko.SE.BALLOON.play();
        }
    },

    draw(bitmap) {
        src = ImageManager.skin('notes');
        src.addLoadListener(function() {
            bitmap.blt(src, 600, 0, this.width, Taiko.NOTE_SIZE, 0, 0);
        }.bind(this));
    }
});

Taiko.Note.TYPES = [
    Taiko.Note.Barline,
    Taiko.Note.Normal,
    Taiko.Note.Normal,
    Taiko.Note.Normal,
    Taiko.Note.Normal,
    Taiko.Note.Roll,
    Taiko.Note.Roll,
    Taiko.Note.Balloon
];


Taiko.Fumen = Utils.createClass(function(songdata) {
    this._songdata = songdata;
    this._fumen = songdata.fumen;
    this.initNotes();
    this.initNotesForDisplay();
    this.initNoteTypes();
    this.initEndTime();
},
{
    get notes() {
        return this._notes;
    },
    get notesForDisplay() {
        return this._notesForDisplay;
    },
    get dons() {
        return this._dons;
    },
    get kas() {
        return this._kas;
    },
    get rolls() {
        return this._rolls;
    },
    get balloons() {
        return this._balloons;
    },
    get endTime() {
        return this._endTime;
    },
    initNotes() {
        this._notes = this._fumen.map(function(obj, type) {
            var notes = [];
            for (var speed in obj) {
                obj[speed].forEach(function(time) {
                    notes.push(Taiko.Note(type, time, speed));
                });
            }
            return notes;
        });
    },

    initNotesForDisplay() {
        this._notesForDisplay = Array.prototype.concat.apply([], this._notes);
        this._notesForDisplay.sort(function(a, b) {
            return a.appearTime - b.appearTime;
        });
    },

    initNoteTypes() {
        var sortFunc = function(a, b) { return a.startTime - b.startTime; };

        this._dons = this._notes[Taiko.DON_SMALL].concat(this._notes[Taiko.DON_BIG]);
        this._kas = this._notes[Taiko.KA_SMALL].concat(this._notes[Taiko.KA_BIG]);
        this._rolls = this._notes[Taiko.ROLL_SMALL].concat(this._notes[Taiko.ROLL_BIG]);
        this._balloons = this._notes[Taiko.BALLOON].slice(0);
        this._dons.sort(sortFunc);
        this._kas.sort(sortFunc);
        this._rolls.sort(sortFunc);
        this._balloons.sort(sortFunc);

        var len = this._balloons.length;
        for (var i = 0; i < len; ++i) {
            this._balloons[i].number = this._songdata.balloons[i];
        };
    },

    initEndTime() {
        var endTimes = this._notesForDisplay.map(function(note) {
            return note.endTime;
        });
        this._endTime = Math.max.apply(Math, endTimes);
    }
});


Taiko.Gauge = Utils.createClass(function(fumen) {
    this._value = 0;
    this._max = (fumen.dons.length + fumen.kas.length) * 5;
},
{
    get rate() {
        return this._value / this._max;
    },
    add(performance) {
        switch(performance) {
            case Taiko.Judgement.PERFECT:
                this._value += 6;
                break;
            case Taiko.Judgement.GREAT:
                this._value += 3;
                break;
            case Taiko.Judgement.MISS:
                this._value -= 12;
                break;
        }

        if (this._value < 0) {
            this._value = 0;
        } else if (this._value > this._max) {
            this._value = this._max;
        }
    },

    isNormal() {
        return this._value >= this._max * Taiko.Gauge.NORMAL_RATE;
    },

    isMax() {
        return this._value === this._max;
    }
},
{
    NORMAL_RATE: 0.8
});
