window.Scene = {
    _scene: null,
    _nextScene: null,
    _stopped: false,
    _sceneStarted: false,
    _screenWidth: 480,
    _screenHeight: 272,
    _boxWidth: 480,
    _boxHeight: 272
}

Object.defineProperty(Scene, 'scene', {
    get: function() { return this._scene; }
});

Scene.run = function(sceneClass) {
    // try {
        this.initialize();
        this.goto(sceneClass);
        this.requestUpdate();
    // } catch (e) {
        // this.catchException(e);
    // }
};

Scene.initialize = function() {
    this.initGraphics();
    this.checkFileAccess();
    this.initAudio();
    this.initInput();
    this.initNwjs();
    this.setupErrorHandlers();
};

Scene.initGraphics = function() {
    var type = this.preferableRendererType();
    Graphics.initialize(this._screenWidth, this._screenHeight, type);
    Graphics.boxWidth = this._boxWidth;
    Graphics.boxHeight = this._boxHeight;
    if (Utils.isOptionValid('showfps')) {
        Graphics.showFps();
    }
    if (type === 'webgl') {
        this.checkWebGL();
    }
};

Scene.initAudio = function() {
    var noAudio = Utils.isOptionValid('noaudio');
    if (!WebAudio.initialize(noAudio) && !noAudio) {
        throw new Error('Your browser does not support Web Audio API.');
    }
};

Scene.preferableRendererType = function() {
    return 'auto';
};

Scene.shouldUseCanvasRenderer = function() {
    return Utils.isMobileDevice();
};

Scene.checkWebGL = function() {
    if (!Graphics.hasWebGL()) {
        throw new Error('Your browser does not support WebGL.');
    }
};

Scene.checkFileAccess = function() {
    if (!Utils.canReadGameFiles()) {
        throw new Error('Your browser does not allow to read local files.');
    }
};

Scene.initInput = function() {
    Input.initialize();
};

Scene.initNwjs = function() {
    if (Utils.isNwjs()) {
        var gui = require('nw.gui');
        var win = gui.Window.get();
        if (process.platform === 'darwin' && !win.menu) {
            var menubar = new gui.Menu({ type: 'menubar' });
            var option = { hideEdit: true, hideWindow: true };
            menubar.createMacBuiltin('Game', option);
            win.menu = menubar;
        }
    }
};

Scene.setupErrorHandlers = function() {
    document.addEventListener('keydown', this.onKeyDown.bind(this));
};

Scene.requestUpdate = function() {
    if (!this._stopped) {
        requestAnimationFrame(this.update.bind(this));
    }
};

Scene.update = function() {
    this.tickStart();
    this.updateInputData();
    this.updateMain();
    this.tickEnd();
};

Scene.onKeyDown = function(event) {
    if (!event.ctrlKey && !event.altKey) {
        switch (event.keyCode) {
        case 116:   // F5
            if (Utils.isNwjs()) {
                location.reload();
            }
            break;
        case 119:   // F8
            if (Utils.isNwjs() && Utils.isOptionValid('test')) {
                require('nw.gui').Window.get().showDevTools();
            }
            break;
        }
    }
};

Scene.catchException = function(e) {
    if (e instanceof Error) {
        Graphics.printError(e.name, e.message);
        console.error(e.stack);
    } else {
        Graphics.printError('UnknownError', e);
    }
    this.stop();
};

Scene.tickStart = function() {
    Graphics.tickStart();
};

Scene.tickEnd = function() {
    Graphics.tickEnd();
};

Scene.updateInputData = function() {
    Input.update();
};

Scene.updateMain = function() {
    this.changeScene();
    this.updateScene();
    this.renderScene();
    this.requestUpdate();
};

Scene.changeScene = function() {
    if (this.isSceneChanging()) {
        if (this._scene) {
            this._scene.terminate();
            this._previousClass = this._scene.constructor;
        }
        this._scene = this._nextScene;
        if (this._scene) {
            this._scene.create();
            this._nextScene = null;
            this._sceneStarted = false;
        }
        if (this._exiting) {
            this.terminate();
        }
    }
};

Scene.updateScene = function() {
    if (this._scene) {
        if (!this._sceneStarted && this._scene.isReady()) {
            this._scene.start();
            this._sceneStarted = true;
        }
        if (this.isCurrentSceneStarted()) {
            this._scene.update();
        }
    }
};

Scene.renderScene = function() {
    if (this.isCurrentSceneStarted()) {
        Graphics.render(this._scene);
    }
};

Scene.isSceneChanging = function() {
    return this._exiting || !!this._nextScene;
};

Scene.isCurrentSceneStarted = function() {
    return this._scene && this._sceneStarted;
};

Scene.goto = function(sceneClass) {
    if (sceneClass) {
        this._nextScene = new sceneClass();
    }
    if (this._scene) {
        this._scene.stop();
    }
};

Scene.Base = function() {
    this.initialize.apply(this, arguments);
}

Scene.Base.prototype = Object.create(Stage.prototype);
Scene.Base.prototype.constructor = Scene.Base;

Scene.Base.prototype.initialize = function() {
    Stage.prototype.initialize.call(this);
    this._active = false;
};

Scene.Base.prototype.create = function() {
};

Scene.Base.prototype.isActive = function() {
    return this._active;
};

Scene.Base.prototype.isReady = function() {
    return ImageManager.isReady();
};

Scene.Base.prototype.start = function() {
    this._active = true;
};

Scene.Base.prototype.update = function() {
    this.updateChildren();
};

Scene.Base.prototype.stop = function() {
    this._active = false;
};

Scene.Base.prototype.terminate = function() {
};

Scene.Base.prototype.updateChildren = function() {
    this.children.forEach(function(child) {
        if (child.update) {
            child.update();
        }
    });
};


Scene.SongList = function() {
    this.initialize.apply(this, arguments);
};

Scene.SongList.prototype = Object.create(Scene.Base.prototype);
Scene.SongList.prototype.constructor = Scene.SongList;

Scene.SongList.INDEX_FILENAME = 'data/SONGLIST_INDEX';

Scene.SongList.prototype.songdata = function(offset) {
    if (offset === undefined) { offset = 0; }
    return this._songlist[this.songlistIndex(offset)];
};

Scene.SongList.prototype.create = function() {
    Graphics.resize(480, 272);
    var json = Storage.load(Scene.SongList.INDEX_FILENAME);
    if (json) {
        var data = JSON.parse(json);
        this._index = data[0];
        this._courses = data[1];
    } else {
        this._index = 0;
        this._courses = {};
    }

    Storage.readFile('data/Songs.json', function(e, json) {
        if (e) { throw e; }
        this._songlist = JSON.parse(json).map(function(name) {
            return new Taiko.Songdata(name);
        });

        if (this._songlist.length === 0) {
            throw "no song defined in json";
        }


    }.bind(this));

    this.addChild(new View.SongList);
};

Scene.SongList.prototype.isReady = function() {
    return this._songlist && Scene.Base.prototype.isReady.call(this) &&
        this._songlist.every(function(songdata) { return songdata.isReady(); });
};

Scene.SongList.prototype.start = function() {
    Scene.Base.prototype.start.call(this);
    this._songlist.forEach(function(songdata, index) {
        this.selectCourse(index, this._courses[songdata.name] || 0);
    }, this);
    this.playDemo();
};

Scene.SongList.prototype.terminate = function() {
    Graphics.resize(544, 416);
    Taiko.Song.stop();
};

Scene.SongList.prototype.update = function() {
    Scene.Base.prototype.update.call(this);
    this.updateIndex();
    if (Input.isTriggered("right")) {
        this.updateCourse(1);
    } else if (Input.isTriggered("left")) {
        this.updateCourse(-1);
    }
    if (!Scene.isSceneChanging()) {
        this.updateScene();
    }
};

Scene.SongList.prototype.playDemo = function() {
    var songdata = this.songdata();
    if (songdata.isReady()) {
        Taiko.Song.play(songdata.wave, songdata.songvol, true, songdata.demostart);
    }
};

Scene.SongList.prototype.songlistIndex = function(offset) {
    var index = this._index;
    if (offset) { index += offset; }
    return this.adjustIndex(index);
};

Scene.SongList.prototype.adjustIndex = function(index) {
    index %= this._songlist.length;
    if (index < 0) { index += this._songlist.length; }
    return index;
};

Scene.SongList.prototype.updateIndex = function() {
    var lastIndex = this._index
    if (Input.isRepeated('up')) {
        --this._index;
        this._index = this.adjustIndex(this._index);
    } else if (Input.isRepeated('down')) {
        ++this._index;
        this._index = this.adjustIndex(this._index);
    }
    if (lastIndex !== this._index) {
        Taiko.SE.DONG.play();
        this.playDemo();
        this.saveIndex();
    }
};

Scene.SongList.prototype.saveIndex = function() {
    Storage.save(Scene.SongList.INDEX_FILENAME,
        JSON.stringify([this._index, this._courses]));
};

Scene.SongList.prototype.updateCourse = function(courseDiff) {
    if (this.selectCourse(this._index, courseDiff)) {
        var key = this.songdata().name;
        if (key === undefined) {
            this._courses[key] = 0;
        }
        this._courses[key] += courseDiff;
        this.saveIndex();
    }
};

Scene.SongList.prototype.selectCourse = function(index, courseDiff) {
    var lastData, data;
    lastData = data = this._songlist[index];
    isToNext = courseDiff > 0;
    var times = Math.abs(courseDiff);
    for (var i = 0; i < times; ++i) {
        data = (isToNext ? data.nextCourse : data.prevCourse) || data;
    };
    this._songlist[index] = data;
    return lastData !== data;
};

Scene.SongList.prototype.updateScene = function() {
    if (Input.isTriggered('ok')) {
        Taiko.SE.DONG.play();
        Taiko.setup(this.songdata());
        Scene.goto(Scene.Play);
    }
};


Scene.Play = function() {
    this.initialize.apply(this, arguments);
};

Scene.Play.prototype = Object.create(Scene.Base.prototype);
Scene.Play.prototype.constructor = Scene.Play;

Scene.Play.PendingNote = function(notes, note, frame) {
    this.notes = notes;
    this.note = note;
    this.frame = frame;
};

Scene.Play.PendingNote.prototype.update = function() {
    --this.frame;
    if (this.frame === 0) {
        Taiko.hit(this.note);
        this.notes.shift();
    }
};

Scene.Play.prototype.create = function() {
    this.addChild(new View.Play());
};

Scene.Play.prototype.update = function() {
    Scene.Base.prototype.update.call(this);
    if (Taiko.isStarted()) {
        this.updateAfterStarted();
    } else {
        this.updateBeforeStarted();
    }
    this.updateSE();
    if (!Scene.isSceneChanging()) {
        this.updateScene();
    }
};

Scene.Play.prototype.updateBeforeStarted = function() {
    if (Input.isTriggered('ok')) { Taiko.tryStart(); }
};

Scene.Play.prototype.updateAfterStarted = function() {
    Taiko.updateTime();
    this.updateHit();
    this.checkMiss();
};

Scene.Play.prototype.updateHit = function() {
    if (this._pendingNote) {
        this._pendingNote.update();
    }
    if (Input.isInnerTriggered()) {
        this.updateInner();
    }
    if (Input.isOuterTriggered()) {
        this.updateOuter();
    }
};

Scene.Play.prototype.updateInner = function() {
    this.findRollAndHit(Taiko.fumen.rolls) ||
    this.findRollAndHit(Taiko.fumen.balloons) ||
    this.findNoteAndHit(Taiko.fumen.dons, Input.isBothInnerTriggered());
};

Scene.Play.prototype.updateOuter = function() {
    this.findRollAndHit(Taiko.fumen.rolls) ||
    this.findNoteAndHit(Taiko.fumen.kas, Input.isBothOuterTriggered());
};

Scene.Play.prototype.findNoteAndHit = function(notes, isDouble) {
    var note = notes[0];
    if (!note || !note.performance) {
        return false;
    };
    note.double = isDouble;
    if (this._pendingNote && this._pendingNote.note === note) {
        this._pendingNote = null;
    } else if (note.isBig() && !isDouble) {
        this._pendingNote = new Scene.Play.PendingNote(notes, note, Taiko.DOUBLE_TOLERANCE);
        return false;
    }

    Taiko.hit(note);
    notes.shift();
    return true;
};

Scene.Play.prototype.findRollAndHit = function(notes) {
    var note = notes[0];
    if (!note || !note.isHitting()) {
        return false;
    }
    Taiko.hit(note);
    return true;
};

Scene.Play.prototype.checkMiss = function() {
    this.shiftMissedNotes(Taiko.fumen.dons, true);
    this.shiftMissedNotes(Taiko.fumen.kas, true);
    this.shiftMissedNotes(Taiko.fumen.rolls, false);
    this.shiftMissedNotes(Taiko.fumen.balloons, false);
};

Scene.Play.prototype.shiftMissedNotes = function(notes, isHit) {
    while ((note = notes[0]) && note.isOver()) {
        notes.shift();
        if (isHit) {
            Taiko.hit(note);
        }
    }
};

Scene.Play.prototype.updateSE = function() {
    if (Input.isInnerTriggered()) {
        Taiko.SE.DONG.play();
    }
    if (Input.isOuterTriggered()) {
        Taiko.SE.KA.play();
    }
};

Scene.Play.prototype.updateScene = function() {
    if (Input.isTriggered('escape')) {
        Taiko.stop();
        Scene.goto(Scene.SongList);
    }
};