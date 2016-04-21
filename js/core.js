
window.Utils = {
    RPGMAKER_NAME: 'MV'
};

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

Utils.isOptionValid = function(name) {
    return location.search.slice(1).split('&').indexOf(name) >= 0;
};

Utils.isNwjs = function() {
    return typeof require === 'function' && typeof process === 'object';
};

Utils.isMobileDevice = function() {
    var r = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    return !!navigator.userAgent.match(r);
};

Utils.isMobileSafari = function() {
    var agent = navigator.userAgent;
    return !!(agent.match(/iPhone|iPad|iPod/) && agent.match(/AppleWebKit/) &&
              !agent.match('CriOS'));
};

Utils.isAndroidChrome = function() {
    var agent = navigator.userAgent;
    return !!(agent.match(/Android/) && agent.match(/Chrome/));
};

Utils.canReadGameFiles = function() {
    var scripts = document.getElementsByTagName('script');
    var lastScript = scripts[scripts.length - 1];
    var xhr = new XMLHttpRequest();
    try {
        xhr.open('GET', lastScript.src);
        xhr.overrideMimeType('text/javascript');
        xhr.send();
        return true;
    } catch (e) {
        return false;
    }
};

Utils.rgbToCssColor = function(r, g, b) {
    r = Math.round(r);
    g = Math.round(g);
    b = Math.round(b);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
};

Utils.clamp = function(a, b, n) {
    if(a > n) {
        return a;
    }
    if(n > b) {
        return b;
    }
    return n;
};

window.Point = PIXI.Point;
window.Rectangle = PIXI.Rectangle;
Rectangle.emptyRectangle = PIXI.EmptyRectangle;

function Bitmap() {
    this.initialize.apply(this, arguments);
}

Bitmap.prototype.initialize = function(width, height) {
    this._canvas = document.createElement('canvas');
    this._context = this._canvas.getContext('2d');
    this._canvas.width = Math.max(width || 0, 1);
    this._canvas.height = Math.max(height || 0, 1);
    this._baseTexture = new PIXI.BaseTexture(this._canvas);
    this._baseTexture.scaleMode = PIXI.scaleModes.NEAREST;
    this._image = null;
    this._url = '';
    this._paintOpacity = 255;
    this._smooth = false;
    this._loadListeners = [];
    this._isLoading = false;
    this._hasError = false;

    /**
     * The face name of the font.
     *
     * @property fontFace
     * @type String
     */
    this.fontFace = 'GameFont';

    /**
     * The size of the font in pixels.
     *
     * @property fontSize
     * @type Number
     */
    this.fontSize = 28;

    /**
     * Whether the font is italic.
     *
     * @property fontItalic
     * @type Boolean
     */
    this.fontItalic = false;

    /**
     * The color of the text in CSS format.
     *
     * @property textColor
     * @type String
     */
    this.textColor = '#ffffff';

    /**
     * The color of the outline of the text in CSS format.
     *
     * @property outlineColor
     * @type String
     */
    this.outlineColor = 'rgba(0, 0, 0, 0.5)';

    /**
     * The width of the outline of the text.
     *
     * @property outlineWidth
     * @type Number
     */
    this.outlineWidth = 4;
};

/**
 * Loads a image file and returns a new bitmap object.
 *
 * @static
 * @method load
 * @param {String} url The image url of the texture
 * @return Bitmap
 */
Bitmap.load = function(url) {
    var bitmap = new Bitmap();
    bitmap._image = new Image();
    bitmap._image.src = url;
    bitmap._image.onload = Bitmap.prototype._onLoad.bind(bitmap);
    bitmap._image.onerror = Bitmap.prototype._onError.bind(bitmap);
    bitmap._url = url;
    bitmap._isLoading = true;
    return bitmap;
};

/**
 * Takes a snapshot of the game screen and returns a new bitmap object.
 *
 * @static
 * @method snap
 * @param {Stage} stage The stage object
 * @return Bitmap
 */
Bitmap.snap = function(stage) {
    var width = Graphics.width;
    var height = Graphics.height;
    var bitmap = new Bitmap(width, height);
    var context = bitmap._context;
    var renderTexture = new PIXI.RenderTexture(width, height);
    if (stage) {
        renderTexture.render(stage);
        stage.worldTransform.identity();
    }
    if (Graphics.isWebGL()) {
        var gl =  renderTexture.renderer.gl;
        var webGLPixels = new Uint8Array(4 * width * height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, renderTexture.textureBuffer.frameBuffer);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, webGLPixels);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        var canvasData = context.getImageData(0, 0, width, height);
        canvasData.data.set(webGLPixels);
        context.putImageData(canvasData, 0, 0);
    } else {
        context.drawImage(renderTexture.textureBuffer.canvas, 0, 0);
    }
    bitmap._setDirty();
    return bitmap;
};

/**
 * Checks whether the bitmap is ready to render.
 *
 * @method isReady
 * @return {Boolean} True if the bitmap is ready to render
 */
Bitmap.prototype.isReady = function() {
    return !this._isLoading;
};

/**
 * Checks whether a loading error has occurred.
 *
 * @method isError
 * @return {Boolean} True if a loading error has occurred
 */
Bitmap.prototype.isError = function() {
    return this._hasError;
};

/**
 * [read-only] The url of the image file.
 *
 * @property url
 * @type String
 */
Object.defineProperty(Bitmap.prototype, 'url', {
    get: function() {
        return this._url;
    },
    configurable: true
});

/**
 * [read-only] The base texture that holds the image.
 *
 * @property baseTexture
 * @type PIXI.BaseTexture
 */
Object.defineProperty(Bitmap.prototype, 'baseTexture', {
    get: function() {
        return this._baseTexture;
    },
    configurable: true
});

/**
 * [read-only] The bitmap canvas.
 *
 * @property canvas
 * @type HTMLCanvasElement
 */
Object.defineProperty(Bitmap.prototype, 'canvas', {
    get: function() {
        return this._canvas;
    },
    configurable: true
});

/**
 * [read-only] The 2d context of the bitmap canvas.
 *
 * @property context
 * @type CanvasRenderingContext2D
 */
Object.defineProperty(Bitmap.prototype, 'context', {
    get: function() {
        return this._context;
    },
    configurable: true
});

/**
 * [read-only] The width of the bitmap.
 *
 * @property width
 * @type Number
 */
Object.defineProperty(Bitmap.prototype, 'width', {
    get: function() {
        return this._isLoading ? 0 : this._canvas.width;
    },
    configurable: true
});

/**
 * [read-only] The height of the bitmap.
 *
 * @property height
 * @type Number
 */
Object.defineProperty(Bitmap.prototype, 'height', {
    get: function() {
        return this._isLoading ? 0 : this._canvas.height;
    },
    configurable: true
});

/**
 * [read-only] The rectangle of the bitmap.
 *
 * @property rect
 * @type Rectangle
 */
Object.defineProperty(Bitmap.prototype, 'rect', {
    get: function() {
        return new Rectangle(0, 0, this.width, this.height);
    },
    configurable: true
});

/**
 * Whether the smooth scaling is applied.
 *
 * @property smooth
 * @type Boolean
 */
Object.defineProperty(Bitmap.prototype, 'smooth', {
    get: function() {
        return this._smooth;
    },
    set: function(value) {
        if (this._smooth !== value) {
            this._smooth = value;
            if (this._smooth) {
                this._baseTexture.scaleMode = PIXI.scaleModes.LINEAR;
            } else {
                this._baseTexture.scaleMode = PIXI.scaleModes.NEAREST;
            }
        }
    },
    configurable: true
});

/**
 * The opacity of the drawing object in the range (0, 255).
 *
 * @property paintOpacity
 * @type Number
 */
Object.defineProperty(Bitmap.prototype, 'paintOpacity', {
    get: function() {
        return this._paintOpacity;
    },
    set: function(value) {
      if (this._paintOpacity !== value) {
          this._paintOpacity = value;
          this._context.globalAlpha = this._paintOpacity / 255;
      }
    },
    configurable: true
});

/**
 * Resizes the bitmap.
 *
 * @method resize
 * @param {Number} width The new width of the bitmap
 * @param {Number} height The new height of the bitmap
 */
Bitmap.prototype.resize = function(width, height) {
    width = Math.max(width || 0, 1);
    height = Math.max(height || 0, 1);
    this._canvas.width = width;
    this._canvas.height = height;
    this._baseTexture.width = width;
    this._baseTexture.height = height;
};

/**
 * Performs a block transfer.
 *
 * @method blt
 * @param {Bitmap} source The bitmap to draw
 * @param {Number} sx The x coordinate in the source
 * @param {Number} sy The y coordinate in the source
 * @param {Number} sw The width of the source image
 * @param {Number} sh The height of the source image
 * @param {Number} dx The x coordinate in the destination
 * @param {Number} dy The y coordinate in the destination
 * @param {Number} [dw=sw] The width to draw the image in the destination
 * @param {Number} [dh=sh] The height to draw the image in the destination
 */
Bitmap.prototype.blt = function(source, sx, sy, sw, sh, dx, dy, dw, dh) {
    dw = dw || sw;
    dh = dh || sh;
    if (sx >= 0 && sy >= 0 && sw > 0 && sh > 0 && dw > 0 && dh > 0 &&
            sx + sw <= source.width && sy + sh <= source.height) {
        this._context.globalCompositeOperation = 'source-over';
        this._context.drawImage(source._canvas, sx, sy, sw, sh, dx, dy, dw, dh);
        this._setDirty();
    }
};

/**
 * Returns pixel color at the specified point.
 *
 * @method getPixel
 * @param {Number} x The x coordinate of the pixel in the bitmap
 * @param {Number} y The y coordinate of the pixel in the bitmap
 * @return {String} The pixel color (hex format)
 */
Bitmap.prototype.getPixel = function(x, y) {
    var data = this._context.getImageData(x, y, 1, 1).data;
    var result = '#';
    for (var i = 0; i < 3; i++) {
        result += data[i].toString(16).padZero(2);
    }
    return result;
};

/**
 * Returns alpha pixel value at the specified point.
 *
 * @method getAlphaPixel
 * @param {Number} x The x coordinate of the pixel in the bitmap
 * @param {Number} y The y coordinate of the pixel in the bitmap
 * @return {String} The alpha value
 */
Bitmap.prototype.getAlphaPixel = function(x, y) {
    var data = this._context.getImageData(x, y, 1, 1).data;
    return data[3];
};

/**
 * Clears the specified rectangle.
 *
 * @method clearRect
 * @param {Number} x The x coordinate for the upper-left corner
 * @param {Number} y The y coordinate for the upper-left corner
 * @param {Number} width The width of the rectangle to clear
 * @param {Number} height The height of the rectangle to clear
 */
Bitmap.prototype.clearRect = function(x, y, width, height) {
    this._context.clearRect(x, y, width, height);
    this._setDirty();
};

/**
 * Clears the entire bitmap.
 *
 * @method clear
 */
Bitmap.prototype.clear = function() {
    this.clearRect(0, 0, this.width, this.height);
};

/**
 * Fills the specified rectangle.
 *
 * @method fillRect
 * @param {Number} x The x coordinate for the upper-left corner
 * @param {Number} y The y coordinate for the upper-left corner
 * @param {Number} width The width of the rectangle to clear
 * @param {Number} height The height of the rectangle to clear
 * @param {String} color The color of the rectangle in CSS format
 */
Bitmap.prototype.fillRect = function(x, y, width, height, color) {
    var context = this._context;
    context.save();
    context.fillStyle = color;
    context.fillRect(x, y, width, height);
    context.restore();
    this._setDirty();
};

/**
 * Fills the entire bitmap.
 *
 * @method fillAll
 * @param {String} color The color of the rectangle in CSS format
 */
Bitmap.prototype.fillAll = function(color) {
    this.fillRect(0, 0, this.width, this.height, color);
};

/**
 * Draws the rectangle with a gradation.
 *
 * @method gradientFillRect
 * @param {Number} x The x coordinate for the upper-left corner
 * @param {Number} y The y coordinate for the upper-left corner
 * @param {Number} width The width of the rectangle to clear
 * @param {Number} height The height of the rectangle to clear
 * @param {String} color1 The start color of the gradation
 * @param {String} color2 The end color of the gradation
 * @param {Boolean} vertical Whether it draws a vertical gradient
 */
Bitmap.prototype.gradientFillRect = function(x, y, width, height, color1,
                                             color2, vertical) {
    var context = this._context;
    var grad;
    if (vertical) {
        grad = context.createLinearGradient(x, y, x, y + height);
    } else {
        grad = context.createLinearGradient(x, y, x + width, y);
    }
    grad.addColorStop(0, color1);
    grad.addColorStop(1, color2);
    context.save();
    context.fillStyle = grad;
    context.fillRect(x, y, width, height);
    context.restore();
    this._setDirty();
};

/**
 * Draw the filled circle.
 *
 * @method drawCircle
 * @param {Number} x The x coordinate of the center of the circle
 * @param {Number} y The y coordinate of the center of the circle
 * @param {Number} radius The radius of the circle
 * @param {String} color The color of the circle in CSS format
 */
Bitmap.prototype.drawCircle = function(x, y, radius, color) {
    var context = this._context;
    context.save();
    context.fillStyle = color;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2, false);
    context.fill();
    context.restore();
    this._setDirty();
};

/**
 * Draws the outline text to the bitmap.
 *
 * @method drawText
 * @param {String} text The text that will be drawn
 * @param {Number} x The x coordinate for the left of the text
 * @param {Number} y The y coordinate for the top of the text
 * @param {Number} maxWidth The maximum allowed width of the text
 * @param {Number} lineHeight The height of the text line
 * @param {String} align The alignment of the text
 */
Bitmap.prototype.drawText = function(text, x, y, maxWidth, lineHeight, align) {
    // Note: Firefox has a bug with textBaseline: Bug 737852
    //       So we use 'alphabetic' here.
    if (text !== undefined) {
        var tx = x;
        var ty = y + lineHeight - (lineHeight - this.fontSize * 0.7) / 2;
        var context = this._context;
        var alpha = context.globalAlpha;
        maxWidth = maxWidth || 0xffffffff;
        if (align === 'center') {
            tx += maxWidth / 2;
        }
        if (align === 'right') {
            tx += maxWidth;
        }
        context.save();
        context.font = this._makeFontNameText();
        context.textAlign = align;
        context.textBaseline = 'alphabetic';
        context.globalAlpha = 1;
        this._drawTextOutline(text, tx, ty, maxWidth);
        context.globalAlpha = alpha;
        this._drawTextBody(text, tx, ty, maxWidth);
        context.restore();
        this._setDirty();
    }
};

/**
 * Returns the width of the specified text.
 *
 * @method measureTextWidth
 * @param {String} text The text to be measured
 * @return {Number} The width of the text in pixels
 */
Bitmap.prototype.measureTextWidth = function(text) {
    var context = this._context;
    context.save();
    context.font = this._makeFontNameText();
    var width = context.measureText(text).width;
    context.restore();
    return width;
};

/**
 * Changes the color tone of the entire bitmap.
 *
 * @method adjustTone
 * @param {Number} r The red strength in the range (-255, 255)
 * @param {Number} g The green strength in the range (-255, 255)
 * @param {Number} b The blue strength in the range (-255, 255)
 */
Bitmap.prototype.adjustTone = function(r, g, b) {
    if ((r || g || b) && this.width > 0 && this.height > 0) {
        var context = this._context;
        var imageData = context.getImageData(0, 0, this.width, this.height);
        var pixels = imageData.data;
        for (var i = 0; i < pixels.length; i += 4) {
            pixels[i + 0] += r;
            pixels[i + 1] += g;
            pixels[i + 2] += b;
        }
        context.putImageData(imageData, 0, 0);
        this._setDirty();
    }
};

/**
 * Rotates the hue of the entire bitmap.
 *
 * @method rotateHue
 * @param {Number} offset The hue offset in 360 degrees
 */
Bitmap.prototype.rotateHue = function(offset) {
    function rgbToHsl(r, g, b) {
        var cmin = Math.min(r, g, b);
        var cmax = Math.max(r, g, b);
        var h = 0;
        var s = 0;
        var l = (cmin + cmax) / 2;
        var delta = cmax - cmin;

        if (delta > 0) {
            if (r === cmax) {
                h = 60 * (((g - b) / delta + 6) % 6);
            } else if (g === cmax) {
                h = 60 * ((b - r) / delta + 2);
            } else {
                h = 60 * ((r - g) / delta + 4);
            }
            s = delta / (255 - Math.abs(2 * l - 255));
        }
        return [h, s, l];
    }

    function hslToRgb(h, s, l) {
        var c = (255 - Math.abs(2 * l - 255)) * s;
        var x = c * (1 - Math.abs((h / 60) % 2 - 1));
        var m = l - c / 2;
        var cm = c + m;
        var xm = x + m;

        if (h < 60) {
            return [cm, xm, m];
        } else if (h < 120) {
            return [xm, cm, m];
        } else if (h < 180) {
            return [m, cm, xm];
        } else if (h < 240) {
            return [m, xm, cm];
        } else if (h < 300) {
            return [xm, m, cm];
        } else {
            return [cm, m, xm];
        }
    }

    if (offset && this.width > 0 && this.height > 0) {
        offset = ((offset % 360) + 360) % 360;
        var context = this._context;
        var imageData = context.getImageData(0, 0, this.width, this.height);
        var pixels = imageData.data;
        for (var i = 0; i < pixels.length; i += 4) {
            var hsl = rgbToHsl(pixels[i + 0], pixels[i + 1], pixels[i + 2]);
            var h = (hsl[0] + offset) % 360;
            var s = hsl[1];
            var l = hsl[2];
            var rgb = hslToRgb(h, s, l);
            pixels[i + 0] = rgb[0];
            pixels[i + 1] = rgb[1];
            pixels[i + 2] = rgb[2];
        }
        context.putImageData(imageData, 0, 0);
        this._setDirty();
    }
};

/**
 * Applies a blur effect to the bitmap.
 *
 * @method blur
 */
Bitmap.prototype.blur = function() {
    for (var i = 0; i < 2; i++) {
        var w = this.width;
        var h = this.height;
        var canvas = this._canvas;
        var context = this._context;
        var tempCanvas = document.createElement('canvas');
        var tempContext = tempCanvas.getContext('2d');
        tempCanvas.width = w + 2;
        tempCanvas.height = h + 2;
        tempContext.drawImage(canvas, 0, 0, w, h, 1, 1, w, h);
        tempContext.drawImage(canvas, 0, 0, w, 1, 1, 0, w, 1);
        tempContext.drawImage(canvas, 0, 0, 1, h, 0, 1, 1, h);
        tempContext.drawImage(canvas, 0, h - 1, w, 1, 1, h + 1, w, 1);
        tempContext.drawImage(canvas, w - 1, 0, 1, h, w + 1, 1, 1, h);
        context.save();
        context.fillStyle = 'black';
        context.fillRect(0, 0, w, h);
        context.globalCompositeOperation = 'lighter';
        context.globalAlpha = 1 / 9;
        for (var y = 0; y < 3; y++) {
            for (var x = 0; x < 3; x++) {
                context.drawImage(tempCanvas, x, y, w, h, 0, 0, w, h);
            }
        }
        context.restore();
    }
    this._setDirty();
};

/**
 * Add a callback function that will be called when the bitmap is loaded.
 *
 * @method addLoadListener
 * @param {Function} listner The callback function
 */
Bitmap.prototype.addLoadListener = function(listner) {
    if (this._isLoading) {
        this._loadListeners.push(listner);
    } else {
        listner();
    }
};

/**
 * @method _makeFontNameText
 * @private
 */
Bitmap.prototype._makeFontNameText = function() {
    return (this.fontItalic ? 'Italic ' : '') +
            this.fontSize + 'px ' + this.fontFace;
};

/**
 * @method _drawTextOutline
 * @param {String} text
 * @param {Number} tx
 * @param {Number} ty
 * @param {Number} maxWidth
 * @private
 */
Bitmap.prototype._drawTextOutline = function(text, tx, ty, maxWidth) {
    var context = this._context;
    context.strokeStyle = this.outlineColor;
    context.lineWidth = this.outlineWidth;
    context.lineJoin = 'round';
    context.strokeText(text, tx, ty, maxWidth);
};

/**
 * @method _drawTextBody
 * @param {String} text
 * @param {Number} tx
 * @param {Number} ty
 * @param {Number} maxWidth
 * @private
 */
Bitmap.prototype._drawTextBody = function(text, tx, ty, maxWidth) {
    var context = this._context;
    context.fillStyle = this.textColor;
    context.fillText(text, tx, ty, maxWidth);
};

/**
 * @method _onLoad
 * @private
 */
Bitmap.prototype._onLoad = function() {
    this._isLoading = false;
    this.resize(this._image.width, this._image.height);
    this._context.drawImage(this._image, 0, 0);
    this._setDirty();
    this._callLoadListeners();
};

/**
 * @method _callLoadListeners
 * @private
 */
Bitmap.prototype._callLoadListeners = function() {
    while (this._loadListeners.length > 0) {
        var listener = this._loadListeners.shift();
        listener();
    }
};

/**
 * @method _onError
 * @private
 */
Bitmap.prototype._onError = function() {
    this._hasError = true;
};

/**
 * @method _setDirty
 * @private
 */
Bitmap.prototype._setDirty = function() {
    this._baseTexture.dirty();
};

//-----------------------------------------------------------------------------
/**
 * The static class that carries out graphics processing.
 *
 * @class Graphics
 */
window.Graphics = {
    frameCount: 0,

    BLEND_NORMAL: 0,
    BLEND_ADD: 1,
    BLEND_MULTIPLY: 2,
    BLEND_SCREEN: 3
};

/**
 * Initializes the graphics system.
 *
 * @static
 * @method initialize
 * @param {Number} width The width of the game screen
 * @param {Number} height The height of the game screen
 * @param {String} type The type of the renderer.
 *                 'canvas', 'webgl', or 'auto'.
 */
Graphics.initialize = function(width, height, type) {
    this._width = width || 800;
    this._height = height || 600;
    this._rendererType = type || 'auto';
    this._boxWidth = this._width;
    this._boxHeight = this._height;

    this._scale = 1;
    this._realScale = 1;

    this._errorPrinter = null;
    this._canvas = null;
    this._video = null;
    this._upperCanvas = null;
    this._renderer = null;
    this._fpsMeter = null;
    this._modeBox = null;
    this._skipCount = 0;
    this._maxSkip = 3;
    this._rendered = false;
    this._loadingImage = null;
    this._loadingCount = 0;
    this._fpsMeterToggled = false;
    this._stretchEnabled = this._defaultStretchMode();

    this._canUseDifferenceBlend = false;
    this._canUseSaturationBlend = false;
    this._hiddenCanvas = null;

    this._testCanvasBlendModes();
    this._modifyExistingElements();
    this._updateRealScale();
    this._createAllElements();
    this._disableTextSelection();
    this._disableContextMenu();
    this._setupEventHandlers();
};



/**
 * Marks the beginning of each frame for FPSMeter.
 *
 * @static
 * @method tickStart
 */
Graphics.tickStart = function() {
    if (this._fpsMeter) {
        this._fpsMeter.tickStart();
    }
};

/**
 * Marks the end of each frame for FPSMeter.
 *
 * @static
 * @method tickEnd
 */
Graphics.tickEnd = function() {
    if (this._fpsMeter && this._rendered) {
        this._fpsMeter.tick();
    }
};

Graphics.resize = function(width, height) {
    this._width = width;
    this._height = height;
    this._boxWidth = width;
    this._boxHeight = height;
    this._updateAllElements();
};

/**
 * Renders the stage to the game screen.
 *
 * @static
 * @method render
 * @param {Stage} stage The stage object to be rendered
 */
Graphics.render = function(stage) {
    if (this._skipCount === 0) {
        var startTime = Date.now();
        if (stage) {
            this._renderer.render(stage);
        }
        var endTime = Date.now();
        var elapsed = endTime - startTime;
        this._skipCount = Math.min(Math.floor(elapsed / 15), this._maxSkip);
        this._rendered = true;
    } else {
        this._skipCount--;
        this._rendered = false;
    }
    this.frameCount++;
};

/**
 * Checks whether the renderer type is WebGL.
 *
 * @static
 * @method isWebGL
 * @return {Boolean} True if the renderer type is WebGL
 */
Graphics.isWebGL = function() {
    return this._renderer && this._renderer.type === PIXI.WEBGL_RENDERER;
};

/**
 * Checks whether the current browser supports WebGL.
 *
 * @static
 * @method hasWebGL
 * @return {Boolean} True if the current browser supports WebGL.
 */
Graphics.hasWebGL = function() {
    try {
        var canvas = document.createElement('canvas');
        return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) {
        return false;
    }
};

/**
 * Checks whether the canvas blend mode 'difference' is supported.
 *
 * @static
 * @method canUseDifferenceBlend
 * @return {Boolean} True if the canvas blend mode 'difference' is supported
 */
Graphics.canUseDifferenceBlend = function() {
    return this._canUseDifferenceBlend;
};

/**
 * Checks whether the canvas blend mode 'saturation' is supported.
 *
 * @static
 * @method canUseSaturationBlend
 * @return {Boolean} True if the canvas blend mode 'saturation' is supported
 */
Graphics.canUseSaturationBlend = function() {
    return this._canUseSaturationBlend;
};

/**
 * Sets the source of the "Now Loading" image.
 *
 * @static
 * @method setLoadingImage
 */
Graphics.setLoadingImage = function(src) {
    this._loadingImage = new Image();
    this._loadingImage.src = src;
};

/**
 * Initializes the counter for displaying the "Now Loading" image.
 *
 * @static
 * @method startLoading
 */
Graphics.startLoading = function() {
    this._loadingCount = 0;
};

/**
 * Increments the loading counter and displays the "Now Loading" image if necessary.
 *
 * @static
 * @method updateLoading
 */
Graphics.updateLoading = function() {
    this._loadingCount++;
    this._paintUpperCanvas();
    this._upperCanvas.style.opacity = 1;
};

/**
 * Erases the "Now Loading" image.
 *
 * @static
 * @method endLoading
 */
Graphics.endLoading = function() {
    this._clearUpperCanvas();
    this._upperCanvas.style.opacity = 0;
};

/**
 * Displays the error text to the screen.
 *
 * @static
 * @method printError
 * @param {String} name The name of the error
 * @param {String} message The message of the error
 */
Graphics.printError = function(name, message) {
    if (this._errorPrinter) {
        this._errorPrinter.innerHTML = this._makeErrorHtml(name, message);
    }
    this._applyCanvasFilter();
    this._clearUpperCanvas();
};

/**
 * Shows the FPSMeter element.
 *
 * @static
 * @method showFps
 */
Graphics.showFps = function() {
    if (this._fpsMeter) {
        this._fpsMeter.show();
        this._modeBox.style.opacity = 1;
    }
};

/**
 * Hides the FPSMeter element.
 *
 * @static
 * @method hideFps
 */
Graphics.hideFps = function() {
    if (this._fpsMeter) {
        this._fpsMeter.hide();
        this._modeBox.style.opacity = 0;
    }
};

/**
 * Loads a font file.
 *
 * @static
 * @method loadFont
 * @param {String} name The face name of the font
 * @param {String} url The url of the font file
 */
Graphics.loadFont = function(name, url) {
    var style = document.createElement('style');
    var head = document.getElementsByTagName('head');
    var rule = '@font-face { font-family: "' + name + '"; src: url("' + url + '"); }';
    style.type = 'text/css';
    head.item(0).appendChild(style);
    style.sheet.insertRule(rule, 0);
    this._createFontLoader(name);
};

/**
 * Checks whether the font file is loaded.
 *
 * @static
 * @method isFontLoaded
 * @param {String} name The face name of the font
 * @return {Boolean} True if the font file is loaded
 */
Graphics.isFontLoaded = function(name) {
    if (!this._hiddenCanvas) {
        this._hiddenCanvas = document.createElement('canvas');
    }
    var context = this._hiddenCanvas.getContext('2d');
    var text = 'abcdefghijklmnopqrstuvwxyz';
    var width1, width2;
    context.font = '40px ' + name + ', sans-serif';
    width1 = context.measureText(text).width;
    context.font = '40px sans-serif';
    width2 = context.measureText(text).width;
    return width1 !== width2;
};

/**
 * Starts playback of a video.
 *
 * @static
 * @method playVideo
 * @param {String} src
 */
Graphics.playVideo = function(src) {
    this._video.src = src;
    this._video.onloadeddata = this._onVideoLoad.bind(this);
    this._video.onerror = this._onVideoError.bind(this);
    this._video.onended = this._onVideoEnd.bind(this);
    this._video.load();
};

/**
 * Checks whether the video is playing.
 *
 * @static
 * @method isVideoPlaying
 * @return {Boolean} True if the video is playing
 */
Graphics.isVideoPlaying = function() {
    return this._video && this._isVideoVisible();
};

/**
 * Checks whether the browser can play the specified video type.
 *
 * @static
 * @method canPlayVideoType
 * @param {String} type The video type to test support for
 * @return {Boolean} True if the browser can play the specified video type
 */
Graphics.canPlayVideoType = function(type) {
    return this._video && this._video.canPlayType(type);
};

/**
 * Converts an x coordinate on the page to the corresponding
 * x coordinate on the canvas area.
 *
 * @static
 * @method pageToCanvasX
 * @param {Number} x The x coordinate on the page to be converted
 * @return {Number} The x coordinate on the canvas area
 */
Graphics.pageToCanvasX = function(x) {
    if (this._canvas) {
        var left = this._canvas.offsetLeft;
        return Math.round((x - left) / this._realScale);
    } else {
        return 0;
    }
};

/**
 * Converts a y coordinate on the page to the corresponding
 * y coordinate on the canvas area.
 *
 * @static
 * @method pageToCanvasY
 * @param {Number} y The y coordinate on the page to be converted
 * @return {Number} The y coordinate on the canvas area
 */
Graphics.pageToCanvasY = function(y) {
    if (this._canvas) {
        var top = this._canvas.offsetTop;
        return Math.round((y - top) / this._realScale);
    } else {
        return 0;
    }
};

/**
 * Checks whether the specified point is inside the game canvas area.
 *
 * @static
 * @method isInsideCanvas
 * @param {Number} x The x coordinate on the canvas area
 * @param {Number} y The y coordinate on the canvas area
 * @return {Boolean} True if the specified point is inside the game canvas area
 */
Graphics.isInsideCanvas = function(x, y) {
    return (x >= 0 && x < this._width && y >= 0 && y < this._height);
};

/**
 * The width of the game screen.
 *
 * @static
 * @property width
 * @type Number
 */
Object.defineProperty(Graphics, 'width', {
    get: function() {
        return this._width;
    },
    set: function(value) {
        if (this._width !== value) {
            this._width = value;
            this._updateAllElements();
        }
    },
    configurable: true
});

/**
 * The height of the game screen.
 *
 * @static
 * @property height
 * @type Number
 */
Object.defineProperty(Graphics, 'height', {
    get: function() {
        return this._height;
    },
    set: function(value) {
        if (this._height !== value) {
            this._height = value;
            this._updateAllElements();
        }
    },
    configurable: true
});

/**
 * The width of the window display area.
 *
 * @static
 * @property boxWidth
 * @type Number
 */
Object.defineProperty(Graphics, 'boxWidth', {
    get: function() {
        return this._boxWidth;
    },
    set: function(value) {
        this._boxWidth = value;
    },
    configurable: true
});

/**
 * The height of the window display area.
 *
 * @static
 * @property boxHeight
 * @type Number
 */
Object.defineProperty(Graphics, 'boxHeight', {
    get: function() {
        return this._boxHeight;
    },
    set: function(value) {
        this._boxHeight = value;
    },
    configurable: true
});

/**
 * The zoom scale of the game screen.
 *
 * @static
 * @property scale
 * @type Number
 */
Object.defineProperty(Graphics, 'scale', {
    get: function() {
        return this._scale;
    },
    set: function(value) {
        if (this._scale !== value) {
            this._scale = value;
            this._updateAllElements();
        }
    },
    configurable: true
});

/**
 * @static
 * @method _createAllElements
 * @private
 */
Graphics._createAllElements = function() {
    this._createErrorPrinter();
    this._createCanvas();
    this._createVideo();
    this._createUpperCanvas();
    this._createRenderer();
    this._createFPSMeter();
    this._createModeBox();
    this._createGameFontLoader();
};

/**
 * @static
 * @method _updateAllElements
 * @private
 */
Graphics._updateAllElements = function() {
    this._updateRealScale();
    this._updateErrorPrinter();
    this._updateCanvas();
    this._updateVideo();
    this._updateUpperCanvas();
    this._updateRenderer();
    this._paintUpperCanvas();
};

/**
 * @static
 * @method _updateRealScale
 * @private
 */
Graphics._updateRealScale = function() {
    if (this._stretchEnabled) {
        var h = window.innerWidth / this._width;
        var v = window.innerHeight / this._height;
        this._realScale = Math.min(h, v);
    } else {
        this._realScale = this._scale;
    }
};

/**
 * @static
 * @method _makeErrorHtml
 * @param {String} name
 * @param {String} message
 * @return {String}
 * @private
 */
Graphics._makeErrorHtml = function(name, message) {
    return ('<font color="yellow"><b>' + name + '</b></font><br>' +
            '<font color="white">' + message + '</font><br>');
};

/**
 * @static
 * @method _defaultStretchMode
 * @private
 */
Graphics._defaultStretchMode = function() {
    return Utils.isNwjs() || Utils.isMobileDevice();
};

/**
 * @static
 * @method _testCanvasBlendModes
 * @private
 */
Graphics._testCanvasBlendModes = function() {
    var canvas, context, imageData1, imageData2;
    canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    context = canvas.getContext('2d');
    context.globalCompositeOperation = 'source-over';
    context.fillStyle = 'white';
    context.fillRect(0, 0, 1, 1);
    context.globalCompositeOperation = 'difference';
    context.fillStyle = 'white';
    context.fillRect(0, 0, 1, 1);
    imageData1 = context.getImageData(0, 0, 1, 1);
    context.globalCompositeOperation = 'source-over';
    context.fillStyle = 'black';
    context.fillRect(0, 0, 1, 1);
    context.globalCompositeOperation = 'saturation';
    context.fillStyle = 'white';
    context.fillRect(0, 0, 1, 1);
    imageData2 = context.getImageData(0, 0, 1, 1);
    this._canUseDifferenceBlend = imageData1.data[0] === 0;
    this._canUseSaturationBlend = imageData2.data[0] === 0;
};

/**
 * @static
 * @method _modifyExistingElements
 * @private
 */
Graphics._modifyExistingElements = function() {
    var elements = document.getElementsByTagName('*');
    for (var i = 0; i < elements.length; i++) {
        if (elements[i].style.zIndex > 0) {
            elements[i].style.zIndex = 0;
        }
    }
};

/**
 * @static
 * @method _createErrorPrinter
 * @private
 */
Graphics._createErrorPrinter = function() {
    this._errorPrinter = document.createElement('p');
    this._errorPrinter.id = 'ErrorPrinter';
    this._updateErrorPrinter();
    document.body.appendChild(this._errorPrinter);
};

/**
 * @static
 * @method _updateErrorPrinter
 * @private
 */
Graphics._updateErrorPrinter = function() {
    this._errorPrinter.width = this._width * 0.9;
    this._errorPrinter.height = 40;
    this._errorPrinter.style.textAlign = 'center';
    this._errorPrinter.style.textShadow = '1px 1px 3px #000';
    this._errorPrinter.style.fontSize = '20px';
    this._errorPrinter.style.zIndex = 99;
    this._centerElement(this._errorPrinter);
};

/**
 * @static
 * @method _createCanvas
 * @private
 */
Graphics._createCanvas = function() {
    this._canvas = document.createElement('canvas');
    this._canvas.id = 'GameCanvas';
    this._updateCanvas();
    document.body.appendChild(this._canvas);
};

/**
 * @static
 * @method _updateCanvas
 * @private
 */
Graphics._updateCanvas = function() {
    this._canvas.width = this._width;
    this._canvas.height = this._height;
    this._canvas.style.zIndex = 1;
    this._centerElement(this._canvas);
};

/**
 * @static
 * @method _createVideo
 * @private
 */
Graphics._createVideo = function() {
    this._video = document.createElement('video');
    this._video.id = 'GameVideo';
    this._video.style.opacity = 0;
    this._updateVideo();
    document.body.appendChild(this._video);
};

/**
 * @static
 * @method _updateVideo
 * @private
 */
Graphics._updateVideo = function() {
    this._video.width = this._width;
    this._video.height = this._height;
    this._video.style.zIndex = 2;
    this._centerElement(this._video);
};

/**
 * @static
 * @method _createUpperCanvas
 * @private
 */
Graphics._createUpperCanvas = function() {
    this._upperCanvas = document.createElement('canvas');
    this._upperCanvas.id = 'UpperCanvas';
    this._updateUpperCanvas();
    document.body.appendChild(this._upperCanvas);
};

/**
 * @static
 * @method _updateUpperCanvas
 * @private
 */
Graphics._updateUpperCanvas = function() {
    this._upperCanvas.width = this._width;
    this._upperCanvas.height = this._height;
    this._upperCanvas.style.zIndex = 3;
    this._centerElement(this._upperCanvas);
};

/**
 * @static
 * @method _clearUpperCanvas
 * @private
 */
Graphics._clearUpperCanvas = function() {
    var context = this._upperCanvas.getContext('2d');
    context.clearRect(0, 0, this._width, this._height);
};

/**
 * @static
 * @method _paintUpperCanvas
 * @private
 */
Graphics._paintUpperCanvas = function() {
    this._clearUpperCanvas();
    if (this._loadingImage && this._loadingCount >= 20) {
        var context = this._upperCanvas.getContext('2d');
        var dx = (this._width - this._loadingImage.width) / 2;
        var dy = (this._height - this._loadingImage.height) / 2;
        var alpha = Utils.clamp(0, 1, (this._loadingCount - 20) / 30);
        context.save();
        context.globalAlpha = alpha;
        context.drawImage(this._loadingImage, dx, dy);
        context.restore();
    }
};

/**
 * @static
 * @method _createRenderer
 * @private
 */
Graphics._createRenderer = function() {
    PIXI.dontSayHello = true;
    var width = this._width;
    var height = this._height;
    var options = { view: this._canvas };
    try {
        switch (this._rendererType) {
        case 'canvas':
            this._renderer = new PIXI.CanvasRenderer(width, height, options);
            break;
        case 'webgl':
            this._renderer = new PIXI.WebGLRenderer(width, height, options);
            break;
        default:
            this._renderer = PIXI.autoDetectRenderer(width, height, options);
            break;
        }
    } catch (e) {
        this._renderer = null;
    }
};

/**
 * @static
 * @method _updateRenderer
 * @private
 */
Graphics._updateRenderer = function() {
    if (this._renderer) {
        this._renderer.resize(this._width, this._height);
    }
};

/**
 * @static
 * @method _createFPSMeter
 * @private
 */
Graphics._createFPSMeter = function() {
    var options = { graph: 1, decimals: 0, theme: 'transparent', toggleOn: null };
    this._fpsMeter = new FPSMeter(options);
    this._fpsMeter.hide();
};

/**
 * @static
 * @method _createModeBox
 * @private
 */
Graphics._createModeBox = function() {
    var box = document.createElement('div');
    box.id = 'modeTextBack';
    box.style.position = 'absolute';
    box.style.left = '5px';
    box.style.top = '5px';
    box.style.width = '119px';
    box.style.height = '58px';
    box.style.background = 'rgba(0,0,0,0.2)';
    box.style.zIndex = 9;
    box.style.opacity = 0;

    var text = document.createElement('div');
    text.id = 'modeText';
    text.style.position = 'absolute';
    text.style.left = '0px';
    text.style.top = '41px';
    text.style.width = '119px';
    text.style.fontSize = '12px';
    text.style.fontFamily = 'monospace';
    text.style.color = 'white';
    text.style.textAlign = 'center';
    text.style.textShadow = '1px 1px 0 rgba(0,0,0,0.5)';
    text.innerHTML = this.isWebGL() ? 'WebGL mode' : 'Canvas mode';

    document.body.appendChild(box);
    box.appendChild(text);

    this._modeBox = box;
};

/**
 * @static
 * @method _createGameFontLoader
 * @private
 */
Graphics._createGameFontLoader = function() {
    this._createFontLoader('GameFont');
};

/**
 * @static
 * @method _createFontLoader
 * @param {String} name
 * @private
 */
Graphics._createFontLoader = function(name) {
    var div = document.createElement('div');
    var text = document.createTextNode('.');
    div.style.fontFamily = name;
    div.style.fontSize = '0px';
    div.style.color = 'transparent';
    div.style.position = 'absolute';
    div.style.margin = 'auto';
    div.style.top = '0px';
    div.style.left = '0px';
    div.style.width = '1px';
    div.style.height = '1px';
    div.appendChild(text);
    document.body.appendChild(div);
};

/**
 * @static
 * @method _centerElement
 * @param {HTMLElement} element
 * @private
 */
Graphics._centerElement = function(element) {
    var width = element.width * this._realScale;
    var height = element.height * this._realScale;
    element.style.position = 'absolute';
    element.style.margin = 'auto';
    element.style.top = 0;
    element.style.left = 0;
    element.style.right = 0;
    element.style.bottom = 0;
    element.style.width = width + 'px';
    element.style.height = height + 'px';
};

/**
 * @static
 * @method _disableTextSelection
 * @private
 */
Graphics._disableTextSelection = function() {
    var body = document.body;
    body.style.userSelect = 'none';
    body.style.webkitUserSelect = 'none';
    body.style.msUserSelect = 'none';
    body.style.mozUserSelect = 'none';
};

/**
 * @static
 * @method _disableContextMenu
 * @private
 */
Graphics._disableContextMenu = function() {
    var elements = document.body.getElementsByTagName('*');
    var oncontextmenu = function() { return false; };
    for (var i = 0; i < elements.length; i++) {
        elements[i].oncontextmenu = oncontextmenu;
    }
};

/**
 * @static
 * @method _applyCanvasFilter
 * @private
 */
Graphics._applyCanvasFilter = function() {
    if (this._canvas) {
        this._canvas.style.opacity = 0.5;
        this._canvas.style.filter = 'blur(8px)';
        this._canvas.style.webkitFilter = 'blur(8px)';
    }
};

/**
 * @static
 * @method _onVideoLoad
 * @private
 */
Graphics._onVideoLoad = function() {
    this._video.play();
    this._updateVisibility(true);
};

/**
 * @static
 * @method _onVideoError
 * @private
 */
Graphics._onVideoError = function() {
    this._updateVisibility(false);
};

/**
 * @static
 * @method _onVideoEnd
 * @private
 */
Graphics._onVideoEnd = function() {
    this._updateVisibility(false);
};

/**
 * @static
 * @method _updateVisibility
 * @param {Boolean} videoVisible
 * @private
 */
Graphics._updateVisibility = function(videoVisible) {
    this._video.style.opacity = videoVisible ? 1 : 0;
    this._canvas.style.opacity = videoVisible ? 0 : 1;
};

/**
 * @static
 * @method _isVideoVisible
 * @return {Boolean}
 * @private
 */
Graphics._isVideoVisible = function() {
    return this._video.style.opacity > 0;
};

/**
 * @static
 * @method _setupEventHandlers
 * @private
 */
Graphics._setupEventHandlers = function() {
    window.addEventListener('resize', this._onWindowResize.bind(this));
    document.addEventListener('keydown', this._onKeyDown.bind(this));
};

/**
 * @static
 * @method _onWindowResize
 * @private
 */
Graphics._onWindowResize = function() {
    this._updateAllElements();
};

/**
 * @static
 * @method _onKeyDown
 * @param {KeyboardEvent} event
 * @private
 */
Graphics._onKeyDown = function(event) {
    if (!event.ctrlKey && !event.altKey) {
        switch (event.keyCode) {
        case 113:   // F2
            event.preventDefault();
            this._switchFPSMeter();
            break;
        case 114:   // F3
            event.preventDefault();
            this._switchStretchMode();
            break;
        case 115:   // F4
            event.preventDefault();
            this._switchFullScreen();
            break;
        }
    }
};

/**
 * @static
 * @method _switchFPSMeter
 * @private
 */
Graphics._switchFPSMeter = function() {
    if (this._fpsMeter.isPaused) {
        this.showFps();
        this._fpsMeter.showFps();
        this._fpsMeterToggled = false;
    } else if (!this._fpsMeterToggled) {
        this._fpsMeter.showDuration();
        this._fpsMeterToggled = true;
    } else {
        this.hideFps();
    }
};

/**
 * @static
 * @method _switchStretchMode
 * @return {Boolean}
 * @private
 */
Graphics._switchStretchMode = function() {
    this._stretchEnabled = !this._stretchEnabled;
    this._updateAllElements();
};

/**
 * @static
 * @method _switchFullScreen
 * @private
 */
Graphics._switchFullScreen = function() {
    if (this._isFullScreen()) {
        this._requestFullScreen();
    } else {
        this._cancelFullScreen();
    }
};

/**
 * @static
 * @method _isFullScreen
 * @return {Boolean}
 * @private
 */
Graphics._isFullScreen = function() {
    return ((document.fullScreenElement && document.fullScreenElement !== null) ||
            (!document.mozFullScreen && !document.webkitFullscreenElement &&
             !document.msFullscreenElement));
};

/**
 * @static
 * @method _requestFullScreen
 * @private
 */
Graphics._requestFullScreen = function() {
    var element = document.body;
    if (element.requestFullScreen) {
        element.requestFullScreen();
    } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
    } else if (element.webkitRequestFullScreen) {
        element.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
    } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
    }
};

/**
 * @static
 * @method _cancelFullScreen
 * @private
 */
Graphics._cancelFullScreen = function() {
    if (document.cancelFullScreen) {
        document.cancelFullScreen();
    } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
    } else if (document.webkitCancelFullScreen) {
        document.webkitCancelFullScreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    }
};

//-----------------------------------------------------------------------------
/**
 * The static class that handles input data from the keyboard and gamepads.
 *
 * @class Input
 */
window.Input = {
    keyRepeatWait: 24,
    keyRepeatInterval: 6
};

/**
 * Initializes the input system.
 *
 * @static
 * @method initialize
 */
Input.initialize = function() {
    this.clear();
    this._wrapNwjsAlert();
    this._setupEventHandlers();
};

/**
 * A hash table to convert from a virtual key code to a mapped key name.
 *
 * @static
 * @property keyMapper
 * @type Object
 */
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

/**
 * Clears all the input data.
 *
 * @static
 * @method clear
 */
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

/**
 * Updates the input data.
 *
 * @static
 * @method update
 */
Input.update = function() {
    for (var name in this._currentState) {
        ++this._currentState[name];
    }
};

/**
 * Checks whether a key is currently pressed down.
 *
 * @static
 * @method isPressed
 * @param {String} keyName The mapped name of the key
 * @return {Boolean} True if the key is pressed
 */
Input.isPressed = function(keyName) {
    return this._currentState[keyName];
};

/**
 * Checks whether a key is just pressed.
 *
 * @static
 * @method isTriggered
 * @param {String} keyName The mapped name of the key
 * @return {Boolean} True if the key is triggered
 */
Input.isTriggered = function(keyName) {
    return this._currentState[keyName] === 1;
};

/**
 * Checks whether a key is just pressed or a key repeat occurred.
 *
 * @static
 * @method isRepeated
 * @param {String} keyName The mapped name of the key
 * @return {Boolean} True if the key is repeated
 */
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
 * @method _setupEventHandlers
 * @private
 */
Input._setupEventHandlers = function() {
    document.addEventListener('keydown', this._onKeyDown.bind(this));
    document.addEventListener('keyup', this._onKeyUp.bind(this));
    window.addEventListener('blur', this._onLostFocus.bind(this));
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
 * @method _shouldPreventDefault
 * @param {Number} keyCode
 * @private
 */
Input._shouldPreventDefault = function(keyCode) {
    switch (keyCode) {
    case 8:     // backspace
    case 33:    // pageup
    case 34:    // pagedown
    case 37:    // left arrow
    case 38:    // up arrow
    case 39:    // right arrow
    case 40:    // down arrow
        return true;
    }
    return false;
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

/**
 * @static
 * @method _onLostFocus
 * @private
 */
Input._onLostFocus = function() {
    this.clear();
};


//-----------------------------------------------------------------------------
/**
 * The basic object that is rendered to the game screen.
 *
 * @class Sprite
 * @constructor
 * @param {Bitmap} bitmap The image for the sprite
 */
function Sprite() {
    this.initialize.apply(this, arguments);
}

Sprite.prototype = Object.create(PIXI.Sprite.prototype);
Sprite.prototype.constructor = Sprite;

Sprite.prototype.initialize = function(bitmap) {
    var texture = new PIXI.Texture(new PIXI.BaseTexture());

    PIXI.Sprite.call(this, texture);

    this._bitmap = null;
    this._frame = new Rectangle();
    this._realFrame = new Rectangle();
    this._offset = new Point();
    this._blendColor = [0, 0, 0, 0];
    this._colorTone = [0, 0, 0, 0];
    this._canvas = null;
    this._context = null;
    this._tintTexture = null;

    this.spriteId = Sprite._counter++;
    this.opaque = false;

    this.bitmap = bitmap;
};

// Number of the created objects.
Sprite._counter = 0;

/**
 * The image for the sprite.
 *
 * @property bitmap
 * @type Bitmap
 */
Object.defineProperty(Sprite.prototype, 'bitmap', {
    get: function() {
        return this._bitmap;
    },
    set: function(value) {
        if (this._bitmap !== value) {
            this._bitmap = value;
            if (this._bitmap) {
                this.setFrame(0, 0, 0, 0);
                this._bitmap.addLoadListener(this._onBitmapLoad.bind(this));
            } else {
                this.texture.setFrame(Rectangle.emptyRectangle);
            }
        }
    },
    configurable: true
});

/**
 * The width of the sprite without the scale.
 *
 * @property width
 * @type Number
 */
Object.defineProperty(Sprite.prototype, 'width', {
    get: function() {
        return this._frame.width;
    },
    set: function(value) {
        this._frame.width = value;
        this._refresh();
    },
    configurable: true
});

/**
 * The height of the sprite without the scale.
 *
 * @property height
 * @type Number
 */
Object.defineProperty(Sprite.prototype, 'height', {
    get: function() {
        return this._frame.height;
    },
    set: function(value) {
        this._frame.height = value;
        this._refresh();
    },
    configurable: true
});

/**
 * The opacity of the sprite (0 to 255).
 *
 * @property opacity
 * @type Number
 */
Object.defineProperty(Sprite.prototype, 'opacity', {
    get: function() {
        return this.alpha * 255;
    },
    set: function(value) {
        this.alpha = Utils.clamp(0, 255, value) / 255;
    },
    configurable: true
});

/**
 * Updates the sprite for each frame.
 *
 * @method update
 */
Sprite.prototype.update = function() {
    this.children.forEach(function(child) {
        if (child.update) {
            child.update();
        }
    });
};

/**
 * Sets the x and y at once.
 *
 * @method move
 * @param {Number} x The x coordinate of the sprite
 * @param {Number} y The y coordinate of the sprite
 */
Sprite.prototype.move = function(x, y) {
    this.x = x;
    this.y = y;
};

/**
 * Sets the rectagle of the bitmap that the sprite displays.
 *
 * @method setFrame
 * @param {Number} x The x coordinate of the frame
 * @param {Number} y The y coordinate of the frame
 * @param {Number} width The width of the frame
 * @param {Number} height The height of the frame
 */
Sprite.prototype.setFrame = function(x, y, width, height) {
    var frame = this._frame;
    if (x !== frame.x || y !== frame.y ||
            width !== frame.width || height !== frame.height) {
        frame.x = x;
        frame.y = y;
        frame.width = width;
        frame.height = height;
        this._refresh();
    }
};

/**
 * Gets the blend color for the sprite.
 *
 * @method getBlendColor
 * @return {Array} The blend color [r, g, b, a]
 */
Sprite.prototype.getBlendColor = function() {
    return this._blendColor.clone();
};

/**
 * Sets the blend color for the sprite.
 *
 * @method setBlendColor
 * @param {Array} color The blend color [r, g, b, a]
 */
Sprite.prototype.setBlendColor = function(color) {
    if (!(color instanceof Array)) {
        throw new Error('Argument must be an array');
    }
    if (!this._blendColor.equals(color)) {
        this._blendColor = color.clone();
        this._refresh();
    }
};

/**
 * Gets the color tone for the sprite.
 *
 * @method getColorTone
 * @return {Array} The color tone [r, g, b, gray]
 */
Sprite.prototype.getColorTone = function() {
    return this._colorTone.clone();
};

/**
 * Sets the color tone for the sprite.
 *
 * @method setColorTone
 * @param {Array} tone The color tone [r, g, b, gray]
 */
Sprite.prototype.setColorTone = function(tone) {
    if (!(tone instanceof Array)) {
        throw new Error('Argument must be an array');
    }
    if (!this._colorTone.equals(tone)) {
        this._colorTone = tone.clone();
        this._refresh();
    }
};

/**
 * @method _onBitmapLoad
 * @private
 */
Sprite.prototype._onBitmapLoad = function() {
    if (this._frame.width === 0 && this._frame.height === 0) {
        this._frame.width = this._bitmap.width;
        this._frame.height = this._bitmap.height;
    }
    this._refresh();
};

/**
 * @method _refresh
 * @private
 */
Sprite.prototype._refresh = function() {
    var frameX = Math.floor(this._frame.x);
    var frameY = Math.floor(this._frame.y);
    var frameW = Math.floor(this._frame.width);
    var frameH = Math.floor(this._frame.height);
    var bitmapW = this._bitmap ? this._bitmap.width : 0;
    var bitmapH = this._bitmap ? this._bitmap.height : 0;
    var realX = Utils.clamp(0, bitmapW, frameX);
    var realY = Utils.clamp(0, bitmapH, frameY);
    var realW = Utils.clamp(0, bitmapW - realX, frameW - realX + frameX);
    var realH = Utils.clamp(0, bitmapH - realY, frameH - realY + frameY);

    this._realFrame.x = realX;
    this._realFrame.y = realY;
    this._realFrame.width = realW;
    this._realFrame.height = realH;
    this._offset.x = realX - frameX;
    this._offset.y = realY - frameY;

    if (realW > 0 && realH > 0) {
        if (this._needsTint()) {
            this._createTinter(realW, realH);
            this._executeTint(realX, realY, realW, realH);
            this._tintTexture.dirty();
            this.texture.baseTexture = this._tintTexture;
            this.texture.setFrame(new Rectangle(0, 0, realW, realH));
        } else {
            if (this._bitmap) {
                this.texture.baseTexture = this._bitmap.baseTexture;
            }
            this.texture.setFrame(this._realFrame);
        }
    } else if (this._bitmap) {
        this.texture.setFrame(Rectangle.emptyRectangle);
    } else {
        this.texture.trim = this._frame;
        this.texture.setFrame(this._frame);
        this.texture.trim = null;
    }
};

/**
 * @method _isInBitmapRect
 * @param {Number} x
 * @param {Number} y
 * @param {Number} w
 * @param {Number} h
 * @return {Boolean}
 * @private
 */
Sprite.prototype._isInBitmapRect = function(x, y, w, h) {
    return (this._bitmap && x + w > 0 && y + h > 0 &&
            x < this._bitmap.width && y < this._bitmap.height);
};

/**
 * @method _needsTint
 * @return {Boolean}
 * @private
 */
Sprite.prototype._needsTint = function() {
    var tone = this._colorTone;
    return tone[0] || tone[1] || tone[2] || tone[3] || this._blendColor[3] > 0;
};

/**
 * @method _createTinter
 * @param {Number} w
 * @param {Number} h
 * @private
 */
Sprite.prototype._createTinter = function(w, h) {
    if (!this._canvas) {
        this._canvas = document.createElement('canvas');
        this._context = this._canvas.getContext('2d');
    }

    this._canvas.width = w;
    this._canvas.height = h;

    if (!this._tintTexture) {
        this._tintTexture = new PIXI.BaseTexture(this._canvas);
    }

    this._tintTexture.width = w;
    this._tintTexture.height = h;
    this._tintTexture.scaleMode = this._bitmap.baseTexture.scaleMode;
};

/**
 * @method _executeTint
 * @param {Number} x
 * @param {Number} y
 * @param {Number} w
 * @param {Number} h
 * @private
 */
Sprite.prototype._executeTint = function(x, y, w, h) {
    var context = this._context;
    var tone = this._colorTone;
    var color = this._blendColor;

    context.globalCompositeOperation = 'copy';
    context.drawImage(this._bitmap.canvas, x, y, w, h, 0, 0, w, h);

    if (Graphics.canUseSaturationBlend()) {
        var gray = Math.max(0, tone[3]);
        context.globalCompositeOperation = 'saturation';
        context.fillStyle = 'rgba(255,255,255,' + gray / 255 + ')';
        context.fillRect(0, 0, w, h);
    }

    var r1 = Math.max(0, tone[0]);
    var g1 = Math.max(0, tone[1]);
    var b1 = Math.max(0, tone[2]);
    context.globalCompositeOperation = 'lighter';
    context.fillStyle = Utils.rgbToCssColor(r1, g1, b1);
    context.fillRect(0, 0, w, h);

    if (Graphics.canUseDifferenceBlend()) {
        context.globalCompositeOperation = 'difference';
        context.fillStyle = 'white';
        context.fillRect(0, 0, w, h);

        var r2 = Math.max(0, -tone[0]);
        var g2 = Math.max(0, -tone[1]);
        var b2 = Math.max(0, -tone[2]);
        context.globalCompositeOperation = 'lighter';
        context.fillStyle = Utils.rgbToCssColor(r2, g2, b2);
        context.fillRect(0, 0, w, h);

        context.globalCompositeOperation = 'difference';
        context.fillStyle = 'white';
        context.fillRect(0, 0, w, h);
    }

    var r3 = Math.max(0, color[0]);
    var g3 = Math.max(0, color[1]);
    var b3 = Math.max(0, color[2]);
    var a3 = Math.max(0, color[3]);
    context.globalCompositeOperation = 'source-atop';
    context.fillStyle = Utils.rgbToCssColor(r3, g3, b3);
    context.globalAlpha = a3 / 255;
    context.fillRect(0, 0, w, h);

    context.globalCompositeOperation = 'destination-in';
    context.globalAlpha = 1;
    context.drawImage(this._bitmap.canvas, x, y, w, h, 0, 0, w, h);
};

/**
 * @method updateTransform
 * @private
 */
Sprite.prototype.updateTransform = function() {
    PIXI.Sprite.prototype.updateTransform.call(this);
    this.worldTransform.tx += this._offset.x;
    this.worldTransform.ty += this._offset.y;
};

/**
 * @method _renderCanvas
 * @param {Object} renderSession
 * @private
 */
Sprite.prototype._renderCanvas = function(renderSession) {
    if (this.visible && this.alpha > 0) {
        if (this.texture.crop.width <= 0 || this.texture.crop.height <= 0) {
            if (this._mask) {
                renderSession.maskManager.pushMask(this._mask, renderSession);
            }
            for (var i = 0, j = this.children.length; i < j; i++) {
                this.children[i]._renderCanvas(renderSession);
            }
            if (this._mask) {
                renderSession.maskManager.popMask(renderSession);
            }
        } else {
            PIXI.Sprite.prototype._renderCanvas.call(this, renderSession);
        }
    }
};

/**
 * @method _renderWebGL
 * @param {Object} renderSession
 * @private
 */
Sprite.prototype._renderWebGL = function(renderSession) {
    if (this.visible && this.alpha > 0) {
        var spriteBatch =  renderSession.spriteBatch;
        if (this._filters) {
            spriteBatch.flush();
            renderSession.filterManager.pushFilter(this._filterBlock);
            if (this.opaque) {
                // Required for a bug in Firefox on Windows
                renderSession.gl.clearColor(0, 0, 0, 1);
                renderSession.gl.clear(renderSession.gl.COLOR_BUFFER_BIT);
            }
        }
        if (this._mask) {
            spriteBatch.stop();
            renderSession.maskManager.pushMask(this.mask, renderSession);
            spriteBatch.start();
        }
        spriteBatch.render(this);
        for (var i = 0, j = this.children.length; i < j; i++) {
            this.children[i]._renderWebGL(renderSession);
        }
        if (this._mask) {
            spriteBatch.stop();
            renderSession.maskManager.popMask(this._mask, renderSession);
            spriteBatch.start();
        }
        if (this._filters) {
            spriteBatch.stop();
            renderSession.filterManager.popFilter();
            spriteBatch.start();
        }
    }
};

function Stage() {
    this.initialize.apply(this, arguments);
}

Stage.prototype = Object.create(PIXI.Stage.prototype);
Stage.prototype.constructor = Stage;

Stage.prototype.initialize = function() {
    PIXI.Stage.call(this);

    // The interactive flag causes a memory leak.
    this.interactive = false;
};


//-----------------------------------------------------------------------------
/**
 * The audio object of Web Audio API.
 *
 * @class WebAudio
 * @constructor
 * @param {String} url The url of the audio file
 */
function WebAudio() {
    this.initialize.apply(this, arguments);
}

WebAudio.prototype.initialize = function(url) {
    if (!WebAudio._initialized) {
        WebAudio.initialize();
    }
    this.clear();
    this._load(url);
    this._url = url;
};

WebAudio._context        = null;
WebAudio._masterGainNode = null;
WebAudio._initialized    = false;
WebAudio._unlocked       = false;

/**
 * Initializes the audio system.
 *
 * @static
 * @method initialize
 * @param {Boolean} noAudio Flag for the no-audio mode
 * @return {Boolean} True if the audio system is available
 */
WebAudio.initialize = function(noAudio) {
    if (!this._initialized) {
        if (!noAudio) {
            this._createContext();
            this._detectCodecs();
            this._createMasterGainNode();
            this._setupEventHandlers();
        }
        this._initialized = true;
    }
    return !!this._context;
};

/**
 * Checks whether the browser can play ogg files.
 *
 * @static
 * @method canPlayOgg
 * @return {Boolean} True if the browser can play ogg files
 */
WebAudio.canPlayOgg = function() {
    if (!this._initialized) {
        this.initialize();
    }
    return !!this._canPlayOgg;
};

/**
 * Checks whether the browser can play m4a files.
 *
 * @static
 * @method canPlayM4a
 * @return {Boolean} True if the browser can play m4a files
 */
WebAudio.canPlayM4a = function() {
    if (!this._initialized) {
        this.initialize();
    }
    return !!this._canPlayM4a;
};

/**
 * @static
 * @method _createContext
 * @private
 */
WebAudio._createContext = function() {
    try {
        if (typeof AudioContext !== 'undefined') {
            this._context = new AudioContext();
        } else if (typeof webkitAudioContext !== 'undefined') {
            this._context = new webkitAudioContext();
        }
    } catch (e) {
        this._context = null;
    }
};

/**
 * @static
 * @method _detectCodecs
 * @private
 */
WebAudio._detectCodecs = function() {
    var audio = document.createElement('audio');
    if (audio.canPlayType) {
        this._canPlayOgg = audio.canPlayType('audio/ogg');
        this._canPlayM4a = audio.canPlayType('audio/mp4');
    }
};

/**
 * @static
 * @method _createMasterGainNode
 * @private
 */
WebAudio._createMasterGainNode = function() {
    var context = WebAudio._context;
    if (context) {
        this._masterGainNode = context.createGain();
        this._masterGainNode.gain.value = 1;
        this._masterGainNode.connect(context.destination);
    }
};

/**
 * @static
 * @method _setupEventHandlers
 * @private
 */
WebAudio._setupEventHandlers = function() {
    document.addEventListener('touchstart', this._onTouchStart.bind(this));
    document.addEventListener('visibilitychange', this._onVisibilityChange.bind(this));
};

/**
 * @static
 * @method _onTouchStart
 * @private
 */
WebAudio._onTouchStart = function() {
    var context = WebAudio._context;
    if (context && !this._unlocked) {
        // Unlock Web Audio on iOS
        var node = context.createBufferSource();
        node.start(0);
        this._unlocked = true;
    }
};

/**
 * @static
 * @method _onVisibilityChange
 * @private
 */
WebAudio._onVisibilityChange = function() {
    if (document.visibilityState === 'hidden') {
        this._onHide();
    } else {
        this._onShow();
    }
};

/**
 * @static
 * @method _onHide
 * @private
 */
WebAudio._onHide = function() {
    if (this._shouldMuteOnHide()) {
        this._fadeOut(1);
    }
};

/**
 * @static
 * @method _onShow
 * @private
 */
WebAudio._onShow = function() {
    if (this._shouldMuteOnHide()) {
        this._fadeIn(0.5);
    }
};

/**
 * @static
 * @method _shouldMuteOnHide
 * @private
 */
WebAudio._shouldMuteOnHide = function() {
    return Utils.isMobileDevice();
};

/**
 * @static
 * @method _fadeIn
 * @param {Number} duration
 * @private
 */
WebAudio._fadeIn = function(duration) {
    if (this._masterGainNode) {
        var gain = this._masterGainNode.gain;
        var currentTime = WebAudio._context.currentTime;
        gain.setValueAtTime(gain.value, currentTime);
        gain.linearRampToValueAtTime(1, currentTime + duration);
    }
};

/**
 * @static
 * @method _fadeOut
 * @param {Number} duration
 * @private
 */
WebAudio._fadeOut = function(duration) {
    if (this._masterGainNode) {
        var gain = this._masterGainNode.gain;
        var currentTime = WebAudio._context.currentTime;
        gain.setValueAtTime(gain.value, currentTime);
        gain.linearRampToValueAtTime(0, currentTime + duration);
    }
};

/**
 * Clears the audio data.
 *
 * @method clear
 */
WebAudio.prototype.clear = function() {
    this.stop();
    this._buffer = null;
    this._sourceNode = null;
    this._gainNode = null;
    this._pannerNode = null;
    this._totalTime = 0;
    this._sampleRate = 0;
    this._loopStart = 0;
    this._loopLength = 0;
    this._startTime = 0;
    this._volume = 1;
    this._pitch = 1;
    this._pan = 0;
    this._endTimer = null;
    this._loadListeners = [];
    this._stopListeners = [];
    this._hasError = false;
    this._autoPlay = false;
};

/**
 * [read-only] The url of the audio file.
 *
 * @property url
 * @type String
 */
Object.defineProperty(WebAudio.prototype, 'url', {
    get: function() {
        return this._url;
    },
    configurable: true
});

/**
 * The volume of the audio.
 *
 * @property volume
 * @type Number
 */
Object.defineProperty(WebAudio.prototype, 'volume', {
    get: function() {
        return this._volume;
    },
    set: function(value) {
        this._volume = value;
        if (this._gainNode) {
            this._gainNode.gain.value = this._volume;
        }
    },
    configurable: true
});

/**
 * The pitch of the audio.
 *
 * @property pitch
 * @type Number
 */
Object.defineProperty(WebAudio.prototype, 'pitch', {
    get: function() {
        return this._pitch;
    },
    set: function(value) {
        if (this._pitch !== value) {
            this._pitch = value;
            if (this.isPlaying()) {
                this.play(this._sourceNode.loop, 0);
            }
        }
    },
    configurable: true
});

/**
 * The pan of the audio.
 *
 * @property pan
 * @type Number
 */
Object.defineProperty(WebAudio.prototype, 'pan', {
    get: function() {
        return this._pan;
    },
    set: function(value) {
        this._pan = value;
        this._updatePanner();
    },
    configurable: true
});

/**
 * Checks whether the audio data is ready to play.
 *
 * @method isReady
 * @return {Boolean} True if the audio data is ready to play
 */
WebAudio.prototype.isReady = function() {
    return !!this._buffer;
};

/**
 * Checks whether a loading error has occurred.
 *
 * @method isError
 * @return {Boolean} True if a loading error has occurred
 */
WebAudio.prototype.isError = function() {
    return this._hasError;
};

/**
 * Checks whether the audio is playing.
 *
 * @method isPlaying
 * @return {Boolean} True if the audio is playing
 */
WebAudio.prototype.isPlaying = function() {
    return !!this._sourceNode;
};

/**
 * Plays the audio.
 *
 * @method play
 * @param {Boolean} loop Whether the audio data play in a loop
 * @param {Number} offset The start position to play in seconds
 */
WebAudio.prototype.play = function(loop, offset) {
    if (this.isReady()) {
        offset = offset || 0;
        this._startPlaying(loop, offset);
    } else if (WebAudio._context) {
        this._autoPlay = true;
        this.addLoadListener(function() {
            if (this._autoPlay) {
                this.play(loop, offset);
            }
        }.bind(this));
    }
};

/**
 * Stops the audio.
 *
 * @method stop
 */
WebAudio.prototype.stop = function() {
    this._autoPlay = false;
    this._removeEndTimer();
    this._removeNodes();
    if (this._stopListeners) {
        while (this._stopListeners.length > 0) {
            var listner = this._stopListeners.shift();
            listner();
        }
    }
};

/**
 * Performs the audio fade-in.
 *
 * @method fadeIn
 * @param {Number} duration Fade-in time in seconds
 */
WebAudio.prototype.fadeIn = function(duration) {
    if (this.isReady()) {
        if (this._gainNode) {
            var gain = this._gainNode.gain;
            var currentTime = WebAudio._context.currentTime;
            gain.setValueAtTime(0, currentTime);
            gain.linearRampToValueAtTime(this._volume, currentTime + duration);
        }
    } else if (this._autoPlay) {
        this.addLoadListener(function() {
            this.fadeIn(duration);
        }.bind(this));
    }
};

/**
 * Performs the audio fade-out.
 *
 * @method fadeOut
 * @param {Number} duration Fade-out time in seconds
 */
WebAudio.prototype.fadeOut = function(duration) {
    if (this._gainNode) {
        var gain = this._gainNode.gain;
        var currentTime = WebAudio._context.currentTime;
        gain.setValueAtTime(gain.value, currentTime);
        gain.linearRampToValueAtTime(0, currentTime + duration);
    }
    this._autoPlay = false;
};

/**
 * Gets the seek position of the audio.
 *
 * @method seek
 */
WebAudio.prototype.seek = function() {
    if (WebAudio._context) {
        var pos = (WebAudio._context.currentTime - this._startTime) * this._pitch;
        if (this._loopLength > 0) {
            while (pos >= this._loopStart + this._loopLength) {
                pos -= this._loopLength;
            }
        }
        return pos;
    } else {
        return 0;
    }
};

/**
 * Add a callback function that will be called when the audio data is loaded.
 *
 * @method addLoadListener
 * @param {Function} listner The callback function
 */
WebAudio.prototype.addLoadListener = function(listner) {
    if(this.isReady()) {
        listner();
    } else {
        this._loadListeners.push(listner);
    }
};

/**
 * Add a callback function that will be called when the playback is stopped.
 *
 * @method addStopListener
 * @param {Function} listner The callback function
 */
WebAudio.prototype.addStopListener = function(listner) {
    this._stopListeners.push(listner);
};

/**
 * @method _load
 * @param {String} url
 * @private
 */
WebAudio.prototype._load = function(url) {
    if (WebAudio._context) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function() {
            if (xhr.status < 400) {
                this._onXhrLoad(xhr);
            }
        }.bind(this);
        xhr.onerror = function() {
            this._hasError = true;
        }.bind(this);
        xhr.send();
    }
};

/**
 * @method _onXhrLoad
 * @param {XMLHttpRequest} xhr
 * @private
 */
WebAudio.prototype._onXhrLoad = function(xhr) {
    var array = new Uint8Array(xhr.response);
    this._readLoopComments(array);
    WebAudio._context.decodeAudioData(xhr.response, function(buffer) {
        this._buffer = buffer;
        this._totalTime = buffer.duration;
        if (this._loopLength > 0 && this._sampleRate > 0) {
            this._loopStart /= this._sampleRate;
            this._loopLength /= this._sampleRate;
        } else {
            this._loopStart = 0;
            this._loopLength = this._totalTime;
        }
        this._onLoad();
    }.bind(this));
};

/**
 * @method _startPlaying
 * @param {Boolean} loop
 * @param {Number} offset
 * @private
 */
WebAudio.prototype._startPlaying = function(loop, offset) {
    this._removeEndTimer();
    this._removeNodes();
    this._createNodes();
    this._connectNodes();
    this._sourceNode.loop = loop;
    this._sourceNode.start(0, offset);
    this._startTime = WebAudio._context.currentTime - offset / this._pitch;
    this._createEndTimer();
};

/**
 * @method _createNodes
 * @private
 */
WebAudio.prototype._createNodes = function() {
    var context = WebAudio._context;
    this._sourceNode = context.createBufferSource();
    this._sourceNode.buffer = this._buffer;
    this._sourceNode.loopStart = this._loopStart;
    this._sourceNode.loopEnd = this._loopStart + this._loopLength;
    this._sourceNode.playbackRate.value = this._pitch;
    this._gainNode = context.createGain();
    this._gainNode.gain.value = this._volume;
    this._pannerNode = context.createPanner();
    this._pannerNode.panningModel = 'equalpower';
    this._updatePanner();
};

/**
 * @method _connectNodes
 * @private
 */
WebAudio.prototype._connectNodes = function() {
    this._sourceNode.connect(this._gainNode);
    this._gainNode.connect(this._pannerNode);
    this._pannerNode.connect(WebAudio._masterGainNode);
};

/**
 * @method _removeNodes
 * @private
 */
WebAudio.prototype._removeNodes = function() {
    if (this._sourceNode) {
        this._sourceNode.stop(0);
        this._sourceNode = null;
        this._gainNode = null;
        this._pannerNode = null;
    }
};

/**
 * @method _createEndTimer
 * @private
 */
WebAudio.prototype._createEndTimer = function() {
    if (this._sourceNode && !this._sourceNode.loop) {
        var endTime = this._startTime + this._totalTime / this._pitch;
        var delay =  endTime - WebAudio._context.currentTime;
        this._endTimer = setTimeout(function() {
            this.stop();
        }.bind(this), delay * 1000);
    }
};

/**
 * @method _removeEndTimer
 * @private
 */
WebAudio.prototype._removeEndTimer = function() {
    if (this._endTimer) {
        clearTimeout(this._endTimer);
        this._endTimer = null;
    }
};

/**
 * @method _updatePanner
 * @private
 */
WebAudio.prototype._updatePanner = function() {
    if (this._pannerNode) {
        var x = this._pan;
        var z = 1 - Math.abs(x);
        this._pannerNode.setPosition(x, 0, z);
    }
};

/**
 * @method _onLoad
 * @private
 */
WebAudio.prototype._onLoad = function() {
    while (this._loadListeners.length > 0) {
        var listner = this._loadListeners.shift();
        listner();
    }
};

/**
 * @method _readLoopComments
 * @param {Uint8Array} array
 * @private
 */
WebAudio.prototype._readLoopComments = function(array) {
    this._readOgg(array);
    this._readMp4(array);
};

/**
 * @method _readOgg
 * @param {Uint8Array} array
 * @private
 */
WebAudio.prototype._readOgg = function(array) {
    var index = 0;
    while (index < array.length) {
        if (this._readFourCharacters(array, index) === 'OggS') {
            index += 26;
            var vorbisHeaderFound = false;
            var numSegments = array[index++];
            var segments = [];
            for (var i = 0; i < numSegments; i++) {
                segments.push(array[index++]);
            }
            for (i = 0; i < numSegments; i++) {
                if (this._readFourCharacters(array, index + 1) === 'vorb') {
                    var headerType = array[index];
                    if (headerType === 1) {
                        this._sampleRate = this._readLittleEndian(array, index + 12);
                    } else if (headerType === 3) {
                        this._readMetaData(array, index, segments[i]);
                    }
                    vorbisHeaderFound = true;
                }
                index += segments[i];
            }
            if (!vorbisHeaderFound) {
                break;
            }
        } else {
            break;
        }
    }
};

/**
 * @method _readMp4
 * @param {Uint8Array} array
 * @private
 */
WebAudio.prototype._readMp4 = function(array) {
    if (this._readFourCharacters(array, 4) === 'ftyp') {
        var index = 0;
        while (index < array.length) {
            var size = this._readBigEndian(array, index);
            var name = this._readFourCharacters(array, index + 4);
            if (name === 'moov') {
                index += 8;
            } else {
                if (name === 'mvhd') {
                    this._sampleRate = this._readBigEndian(array, index + 20);
                }
                if (name === 'udta' || name === 'meta') {
                    this._readMetaData(array, index, size);
                }
                index += size;
                if (size <= 1) {
                    break;
                }
            }
        }
    }
};

/**
 * @method _readMetaData
 * @param {Uint8Array} array
 * @param {Number} index
 * @param {Number} size
 * @private
 */
WebAudio.prototype._readMetaData = function(array, index, size) {
    for (var i = index; i < index + size - 10; i++) {
        if (this._readFourCharacters(array, i) === 'LOOP') {
            var text = '';
            while (array[i] > 0) {
                text += String.fromCharCode(array[i++]);
            }
            if (text.match(/LOOPSTART=([0-9]+)/)) {
                this._loopStart = parseInt(RegExp.$1);
            }
            if (text.match(/LOOPLENGTH=([0-9]+)/)) {
                this._loopLength = parseInt(RegExp.$1);
            }
            if (text == 'LOOPSTART' || text == 'LOOPLENGTH') {
                var text2 = '';
                i += 16;
                while (array[i] > 0) {
                    text2 += String.fromCharCode(array[i++]);
                }
                if (text == 'LOOPSTART') {
                    this._loopStart = parseInt(text2);
                } else {
                    this._loopLength = parseInt(text2);
                }
            }
        }
    }
};

/**
 * @method _readLittleEndian
 * @param {Uint8Array} array
 * @param {Number} index
 * @private
 */
WebAudio.prototype._readLittleEndian = function(array, index) {
    return (array[index + 3] * 0x1000000 + array[index + 2] * 0x10000 +
            array[index + 1] * 0x100 + array[index + 0]);
};

/**
 * @method _readBigEndian
 * @param {Uint8Array} array
 * @param {Number} index
 * @private
 */
WebAudio.prototype._readBigEndian = function(array, index) {
    return (array[index + 0] * 0x1000000 + array[index + 1] * 0x10000 +
            array[index + 2] * 0x100 + array[index + 3]);
};

/**
 * @method _readFourCharacters
 * @param {Uint8Array} array
 * @param {Number} index
 * @private
 */
WebAudio.prototype._readFourCharacters = function(array, index) {
    var string = '';
    for (var i = 0; i < 4; i++) {
        string += String.fromCharCode(array[index + i]);
    }
    return string;
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
