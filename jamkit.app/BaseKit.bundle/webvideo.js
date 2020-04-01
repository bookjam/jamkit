var __$_ = (function() {
    return {
        player: null
    }
})()

function configureVideo(element, url, options) {
    __$_.player = element;

    if (options.autoplay === "1") {
        __$_.player.autoplay = true;
    }

    if (options.loop === "1") {
        __$_.player.loop = true;
    }

    if (options.playsinline === "1") {
        __$_.player.setAttribute('playsinline', '');
        __$_.player.setAttribute('webkit-playsinline', '');
    }

    if (options.controls === "0") {
        __$_.player.controls = false;
    }

    __$_.player.onloadstart = function(event) {
        window.location = "video://ready";
    }

    __$_.player.onplay = function(event) {
        window.location = "video://playing";
    }

    __$_.player.onpause = function(event) {
        window.location = "video://paused";
    }

    __$_.player.onended = function(event) {
        window.location = "video://finished";
    }

    __$_.player.src = url;
}

function playVideo() {
    __$_.player.play();
}

function pauseVideo() {
    __$_.player.pause();
}

function stopVideo() {
    __$_.player.stop();
}

function seekTo(time) {
    __$_.player.currentTime = time;
}

function getCurrentTime() {
    return __$_.player.currentTime;
}

function getDuration() {
    return __$_.player.duration;
}

function setRate(rate) {
}

function getRate() {
    return 1.0;
}

function mute() {
}

function unmute() {
}

function enterFullscreen() {
}

function exitFullscreen() {
}

function isFullscreen() {
}
