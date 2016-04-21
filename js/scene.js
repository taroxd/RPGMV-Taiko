window.Scene = {
    _scene: null,
    _nextScene: null,
    _stopped: false,
    _sceneStarted: false,
    _screenWidth: 480,
    _screenHeight: 272,
    _boxWidth: 480,
    _boxHeight: 272,

    get scene() {
        return this._scene;
    },

    run(sceneClass) {
        this.initialize();
        this.goto(sceneClass);
        this.requestUpdate();
    },

    initialize() {
        this.initGraphics();
        this.checkFileAccess();
        this.initAudio();
        this.initInput();
        this.initNwjs();
        this.setupErrorHandlers();
    },

    initGraphics() {
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
    },

    initAudio() {
        var noAudio = Utils.isOptionValid('noaudio');
        if (!WebAudio.initialize(noAudio) && !noAudio) {
            throw new Error('Your browser does not support Web Audio API.');
        }
    },

    preferableRendererType() {
        return 'auto';
    },

    shouldUseCanvasRenderer() {
        return Utils.isMobileDevice();
    },

    checkWebGL() {
        if (!Graphics.hasWebGL()) {
            throw new Error('Your browser does not support WebGL.');
        }
    },

    checkFileAccess() {
        if (!Utils.canReadGameFiles()) {
            throw new Error('Your browser does not allow to read local files.');
        }
    },

    initInput() {
        Input.initialize();
    },

    initNwjs() {
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
    },

    setupErrorHandlers() {
        document.addEventListener('keydown', this.onKeyDown.bind(this));
    },

    requestUpdate() {
        if (!this._stopped) {
            requestAnimationFrame(this.update.bind(this));
        }
    },

    update() {
        this.tickStart();
        this.updateInputData();
        this.updateMain();
        this.tickEnd();
    },

    onKeyDown(event) {
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
    },

    catchException(e) {
        if (e instanceof Error) {
            Graphics.printError(e.name, e.message);
            console.error(e.stack);
        } else {
            Graphics.printError('UnknownError', e);
        }
        this.stop();
    },

    tickStart() {
        Graphics.tickStart();
    },

    tickEnd() {
        Graphics.tickEnd();
    },

    updateInputData() {
        Input.update();
    },

    updateMain() {
        this.changeScene();
        this.updateScene();
        this.renderScene();
        this.requestUpdate();
    },

    changeScene() {
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
    },

    updateScene() {
        if (this._scene) {
            if (!this._sceneStarted && this._scene.isReady()) {
                this._scene.start();
                this._sceneStarted = true;
            }
            if (this.isCurrentSceneStarted()) {
                this._scene.update();
            }
        }
    },

    renderScene() {
        if (this.isCurrentSceneStarted()) {
            Graphics.render(this._scene);
        }
    },

    isSceneChanging() {
        return this._exiting || !!this._nextScene;
    },

    isCurrentSceneStarted() {
        return this._scene && this._sceneStarted;
    },

    goto(sceneClass) {
        if (sceneClass) {
            this._nextScene = new sceneClass();
        }
        if (this._scene) {
            this._scene.stop();
        }
    }
};

Scene.Base = Utils.deriveClass(Stage, function() {
    Stage.call(this);
    this._active = false;
},
{

    create: Utils.voidFunction,

    isActive() {
        return this._active;
    },

    isReady() {
        return ImageManager.isReady();
    },

    start() {
        this._active = true;
    },

    update() {
        this.updateChildren();
    },

    stop() {
        this._active = false;
    },

    terminate: Utils.voidFunction,

    updateChildren() {
        this.children.forEach(function(child) {
            if (child.update) {
                child.update();
            }
        });
    }
});

Scene.SongList = Utils.deriveClass(Scene.Base, null, {

    songdata(offset) {
        if (offset === undefined) { offset = 0; }
        return this._songlist[this.songlistIndex(offset)];
    },

    create() {
        Graphics.resize(480, 272);
        var json = Storage.load(Scene.SongList.INDEX_FILENAME);
        if (json) {
            var data = JSON.parse(json);
            this._index = data.index || 0;
            this._courses = data.courses || {};
            Taiko.offset = data.offset || 0;
        } else {
            this._index = 0;
            this._courses = {};
            Taiko.offset = 0;
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
    },

    isReady() {
        return this._songlist && Scene.Base.prototype.isReady.call(this) &&
            this._songlist.every(function(songdata) { return songdata.isReady(); });
    },

    start() {
        Scene.Base.prototype.start.call(this);
        this._songlist.forEach(function(songdata, index) {
            this.selectCourse(index, this._courses[songdata.name] || 0);
        }, this);
        this.playDemo();
    },

    terminate() {
        Graphics.resize(544, 416);
        Taiko.Song.stop();
    },

    update() {
        Scene.Base.prototype.update.call(this);
        this.updateIndex();
        if (Input.isTriggered("right")) {
            this.updateCourse(1);
        } else if (Input.isTriggered("left")) {
            this.updateCourse(-1);
        } else if (Input.isTriggered("minus")) {
            this.updateOffset(-5);
        } else if (Input.isTriggered("equal")) {
            this.updateOffset(5);
        }
        if (!Scene.isSceneChanging()) {
            this.updateScene();
        }
    },

    playDemo() {
        var songdata = this.songdata();
        if (songdata.isReady()) {
            Taiko.Song.play(songdata.wave, songdata.songvol, true, songdata.demostart);
        }
    },

    songlistIndex(offset) {
        var index = this._index;
        if (offset) { index += offset; }
        return this.adjustIndex(index);
    },

    adjustIndex(index) {
        index %= this._songlist.length;
        if (index < 0) { index += this._songlist.length; }
        return index;
    },

    updateIndex() {
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
    },

    saveIndex() {
        Storage.save(Scene.SongList.INDEX_FILENAME,
            JSON.stringify({
                index: this._index,
                courses: this._courses,
                offset: Taiko.offset
            }));
    },

    updateCourse(courseDiff) {
        if (this.selectCourse(this._index, courseDiff)) {
            var key = this.songdata().name;
            if (!(key in this._courses)) {
                this._courses[key] = 0;
            }
            this._courses[key] += courseDiff;
            this.saveIndex();
        }
    },

    updateOffset(diff) {
        Taiko.offset += diff;
        this.saveIndex();
    },

    selectCourse(index, courseDiff) {
        var lastData, data;
        lastData = data = this._songlist[index];
        isToNext = courseDiff > 0;
        var times = Math.abs(courseDiff);
        for (var i = 0; i < times; ++i) {
            data = (isToNext ? data.nextCourse : data.prevCourse) || data;
        }
        this._songlist[index] = data;
        return lastData !== data;
    },

    updateScene() {
        if (Input.isTriggered('ok')) {
            Taiko.SE.DONG.play();
            var songdata = this.songdata();
            Taiko.setup(songdata);
            Scene.goto(Scene.Play);
        }
    }
},
{
    INDEX_FILENAME: 'data/SONGLIST_INDEX'
});

Scene.Play = Utils.deriveClass(Scene.Base, null, {

    create() {
        this.addChild(new View.Play());
    },

    update() {
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
    },

    updateBeforeStarted() {
        if (Input.isTriggered('ok')) { Taiko.tryStart(); }
    },

    updateAfterStarted() {
        Taiko.updateTime();
        this.updateHit();
        this.checkMiss();
    },

    updateHit() {
        if (this._pendingNote) {
            this._pendingNote.update();
        }
        if (Input.isInnerTriggered()) {
            this.updateInner();
        }
        if (Input.isOuterTriggered()) {
            this.updateOuter();
        }
    },

    updateInner() {
        this.findRollAndHit(Taiko.fumen.rolls) ||
        this.findRollAndHit(Taiko.fumen.balloons) ||
        this.findNoteAndHit(Taiko.fumen.dons, Input.isBothInnerTriggered());
    },

    updateOuter() {
        this.findRollAndHit(Taiko.fumen.rolls) ||
        this.findNoteAndHit(Taiko.fumen.kas, Input.isBothOuterTriggered());
    },

    findNoteAndHit(notes, isDouble) {
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
    },

    findRollAndHit(notes) {
        var note = notes[0];
        if (!note || !note.isHitting()) {
            return false;
        }
        Taiko.hit(note);
        return true;
    },

    checkMiss() {
        this.shiftMissedNotes(Taiko.fumen.dons, true);
        this.shiftMissedNotes(Taiko.fumen.kas, true);
        this.shiftMissedNotes(Taiko.fumen.rolls, false);
        this.shiftMissedNotes(Taiko.fumen.balloons, false);
    },

    shiftMissedNotes(notes, isHit) {
        while ((note = notes[0]) && note.isOver()) {
            notes.shift();
            if (isHit) {
                Taiko.hit(note);
            }
        }
    },

    updateSE() {
        if (Input.isInnerTriggered()) {
            Taiko.SE.DONG.play();
        }
        if (Input.isOuterTriggered()) {
            Taiko.SE.KA.play();
        }
    },

    updateScene() {
        if (Input.isTriggered('escape')) {
            Taiko.stop();
            Scene.goto(Scene.SongList);
        }
    },
});

Scene.Play.PendingNote = Utils.createClass(function(notes, note, frame) {
    this.notes = notes;
    this.note = note;
    this.frame = frame;
},
{
    update() {
        --this.frame;
        if (this.frame === 0) {
            Taiko.hit(this.note);
            this.notes.shift();
        }
    }
});
