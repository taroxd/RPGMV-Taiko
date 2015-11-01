function Storage() {
    throw new Error('This is a static class');
}

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
    if (this.isLocalMode()) {
        var fs = require('fs');
        fs.readFile(this.localFilePath(filename), 'utf8', callback);
    } else {
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
    }
};
