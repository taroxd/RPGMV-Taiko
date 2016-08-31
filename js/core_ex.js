void function() {
    function assign(target, source) {
        for (var key in source) {
            var desc = Object.getOwnPropertyDescriptor(source, key);
            Object.defineProperty(target, key, desc);
        }
    }

    Utils.createClass = function(constructor, methodObj, staticObj) {
        if (methodObj) {
            assign(constructor.prototype, methodObj);
        }
        if (staticObj) {
            assign(constructor, staticObj);
        }
        return constructor;
    };

    Utils.deriveClass = function(superClass, constructor, methodObj, staticObj) {
        if (!constructor) {
            constructor = function() {
                superClass.apply(this, arguments);
            };
        }
        constructor.prototype = Object.create(superClass.prototype);
        Utils.createClass(constructor, methodObj, staticObj);
        constructor.prototype.constructor = constructor;
        return constructor;
    };
}();

Utils.voidFunction = function() {};
Utils.returnTrue = function() { return true; };
Utils.returnFalse = function() { return false; };

PIXI.utils._saidHello = true;

Input.keyMapper = {
    13: 'ok',       // enter
    27: 'escape',   // escape
    32: 'ok',       // space
    37: 'left',     // left arrow
    38: 'up',       // up arrow
    39: 'right',    // right arrow
    40: 'down',     // down arrow
    68: 'outerL',   // D
    70: 'innerL',   // F
    74: 'innerR',   // J
    75: 'outerR',   // K
    88: 'escape',   // X
    90: 'ok',       // Z
    98: 'down',     // numpad 2
    100: 'left',    // numpad 4
    102: 'right',   // numpad 6
    104: 'up',      // numpad 8
    187: 'equal',   // +/=
    189: 'minus'    // -
};

Input.clear = function() {
    this._currentState = {};
};

Input.isInnerTriggered = function() {
    return this.isTriggered('innerL') || this.isTriggered('innerR');
};

Input.isOuterTriggered = function() {
    return this.isTriggered('outerL') || this.isTriggered('outerR');
};

Input.isBothInnerTriggered = function() {
    return Input.isBothTriggered('innerL', 'innerR');
};

Input.isBothOuterTriggered = function() {
    return Input.isBothTriggered('outerL', 'outerR');
};

Input.isBothTriggered = function(key1, key2) {
    var l = this._currentState[key1];
    var r = this._currentState[key2];

    if(!l || !r) { return false; }
    if(l === 1) {
        return r <= Taiko.DOUBLE_TOLERANCE;
    }
    if(r === 1) {
        return l <= Taiko.DOUBLE_TOLERANCE;
    }
    return false;
};


Input.update = function() {
    for (var name in this._currentState) {
        ++this._currentState[name];
    }
};

Input.isPressed = function(keyName) {
    return this._currentState[keyName];
};

Input.isTriggered = function(keyName) {
    return this._currentState[keyName] === 1;
};

Input.isRepeated = function(keyName) {
    var state = this._currentState[keyName];
    return (state === 1 ||
        (state >= this.keyRepeatWait &&
        state % this.keyRepeatInterval === 0));
};


/**
 * @static
 * @method _wrapNwjsAlert
 * @private
 */
Input._wrapNwjsAlert = function() {
    if (Utils.isNwjs()) {
        var _alert = window.alert;
        window.alert = function() {
            var gui = require('nw.gui');
            var win = gui.Window.get();
            _alert.apply(this, arguments);
            win.focus();
            Input.clear();
        };
    }
};

/**
 * @static
 * @method _onKeyDown
 * @param {KeyboardEvent} event
 * @private
 */
Input._onKeyDown = function(event) {
    if (this._shouldPreventDefault(event.keyCode)) {
        event.preventDefault();
    }
    if (event.keyCode === 144) {    // Numlock
        this.clear();
    }
    var buttonName = this.keyMapper[event.keyCode];
    if (buttonName) {
        if(!this._currentState[buttonName]) {
            this._currentState[buttonName] = 0;
        }
    }
};

/**
 * @static
 * @method _onKeyUp
 * @param {KeyboardEvent} event
 * @private
 */
Input._onKeyUp = function(event) {
    var buttonName = this.keyMapper[event.keyCode];
    if (buttonName) {
        delete this._currentState[buttonName];
    }
    if (event.keyCode === 0) {  // For QtWebEngine on OS X
        this.clear();
    }
};

window.Storage = {};

Storage.save = function(filename, json) {
    if (this.isLocalMode()) {
        this.saveToLocalFile(filename, json);
    } else {
        this.saveToWebStorage(filename, json);
    }
};

Storage.load = function(filename) {
    if (this.isLocalMode()) {
        return this.loadFromLocalFile(filename);
    } else {
        return this.loadFromWebStorage(filename);
    }
};

Storage.exists = function(filename) {
    if (this.isLocalMode()) {
        return this.localFileExists(filename);
    } else {
        return this.webStorageExists(filename);
    }
};

Storage.remove = function(filename) {
    if (this.isLocalMode()) {
        this.removeLocalFile(filename);
    } else {
        this.removeWebStorage(filename);
    }
};

Storage.isLocalMode = function() {
    return Utils.isNwjs();
};

Storage.saveToLocalFile = function(filename, data) {
    var fs = require('fs');
    var dirPath = this.localFileDirectoryPath();
    var filePath = this.localFilePath(filename);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath);
    }
    fs.writeFileSync(filePath, data);
};

Storage.loadFromLocalFile = function(filename) {
    var data;
    var fs = require('fs');
    var filePath = this.localFilePath(filename);
    if (fs.existsSync(filePath)) {
        data = fs.readFileSync(filePath, { encoding: 'utf8' });
    }
    return data;
};

Storage.localFileExists = function(filename) {
    var fs = require('fs');
    return fs.existsSync(this.localFilePath(filename));
};

Storage.removeLocalFile = function(filename) {
    var fs = require('fs');
    var filePath = this.localFilePath(filename);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
};

Storage.saveToWebStorage = function(filename, json) {
    var data = LZString.compressToBase64(json);
    localStorage.setItem(filename, data);
};

Storage.loadFromWebStorage = function(filename) {
    var data = localStorage.getItem(filename);
    return LZString.decompressFromBase64(data);
};

Storage.webStorageExists = function(filename) {
    return !!localStorage.getItem(filename);
};

Storage.removeWebStorage = function(filename) {
    localStorage.removeItem(filename);
};

Storage.localFileDirectoryPath = function() {
    var path = window.location.pathname.replace(/(\/www|)\/[^\/]*$/, '/');
    if (path.match(/^\/([A-Z]\:)/)) {
        path = path.slice(1);
    }
    return decodeURIComponent(path);
};

Storage.localFilePath = function(filename) {
    return this.localFileDirectoryPath() + filename;
};

Storage.readFile = function(filename, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', filename);
    xhr.overrideMimeType('text/plain');
    xhr.onload = function() {
        if (xhr.status < 400) {
            callback(null, xhr.response);
        }
    }
    xhr.onerror = callback;
    xhr.send();
};

window.ImageManager = {
    _cache: {}
};

ImageManager.loadBitmap = function(folder, filename) {
    var path = folder + encodeURIComponent(filename) + '.png';
    return ImageManager.load(path, function() {
        return Bitmap.load(path);
    });
};

ImageManager.load = function(key, loadMethod) {
    if (!this._cache[key] && loadMethod) {
        this._cache[key] = loadMethod(key);
    };
    return this._cache[key];
};

ImageManager.clear = function() {
    this._cache = {};
};

ImageManager.isReady = function() {
    for (var key in this._cache) {
        var bitmap = this._cache[key];
        if (bitmap.isError()) {
            throw new Error('Failed to load: ' + bitmap.url);
        }
        if (!bitmap.isReady()) {
            return false;
        }
    }
    return true;
};

ImageManager.skin = function(filename) {
    return ImageManager.loadBitmap('img/', filename);
};

ImageManager.note = function(note) {
    return this.load("note-"+note.type+"-"+note.width, function() {
        return note.bitmap;
    });
};

ImageManager.noteHead = function(type) {
    return this.load("note-"+type+"-"+Taiko.NOTE_SIZE, function() {
        return Taiko.Note(type, {begin: 0, end: 0}, 0).bitmap;
    });
};

ImageManager.clearRolls = function() {
    for (key in this._cache) {

        if(key.startsWith('note-') &&
        // string == number; not ===
        (key[5] == Taiko.ROLL_BIG || key[5] == Taiko.ROLL_SMALL)) {
            delete this._cache[key];
        }
    }
};

ImageManager.toBitmap = function(param) {
    if(typeof(param) === 'string') {
        return ImageManager.skin(param);
    }
    if(param instanceof Bitmap) {
        return param;
    }
    return null;
};

Graphics.resize = function(width, height) {
    this._width = width;
    this._height = height;
    this._boxWidth = width;
    this._boxHeight = height;
    this._updateAllElements();
};
