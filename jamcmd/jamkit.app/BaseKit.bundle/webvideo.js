var player;

function configureVideo(element, url, options) {
    player = element;

    __configureOptions(player, options);
    __configureEvents(player);
    
    player.src = url;
}

function __configureOptions(player, options) {
    if (options.autoplay === "1") {
        player.autoplay = true;
    }
    
    if (options.loop === "1") {
        player.loop = true;
    }
    
    if (options.playsinline === "1") {
        player.setAttribute('playsinline', '');
        player.setAttribute('webkit-playsinline', '');
    }
    
    if (options.controls === "0") {
        player.controls = false;
    }
}

function __configureEvents(player) {
    player.onloadstart = function(event) {
        window.location = "video://ready";
    }
    
    player.onplay = function(event) {
        window.location = "video://playing";
    }
    
    player.onpause = function(event) {
        window.location = "video://paused";
    }
    
    player.onended = function(event) {
        window.location = "video://finished";
    }
}

function playVideo() {
    player.play();
}

function pauseVideo() {
    player.pause();
}

function stopVideo() {
    player.stop();
}

function seekTo(time) {
    player.currentTime = time;
}

function getCurrentTime() {
    return player.currentTime;
}

function getDuration() {
    return player.duration;
}

function enterFullscreen() {
}

function exitFullscreen() {
}

function isFullscreen() {
}
