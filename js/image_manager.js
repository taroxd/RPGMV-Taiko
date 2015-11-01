function ImageManager() {
    throw new Error('This is a static class');
}

ImageManager._cache = {};

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
}