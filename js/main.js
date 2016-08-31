//=============================================================================
// main.js
//=============================================================================

document.title = "RPGMV-Taiko";

window.onload = function() {
    Taiko.initialize();
    Scene.run(Scene.SongList);
};
