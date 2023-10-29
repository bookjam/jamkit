var __$_ = (function() {
    return {
        player: null,
        container: '',
        current_video_id: '',
        suggested_quality: 'default',
        plays_when_ready: false,
        turns_off_captions: false,
        buffering_video: false
    }
})();

function configureVideo(container, video_id, quality, options) {
    __$_.player = new YT.Player(container, {
        width: '100%',
        height: '100%',
        playerVars: options,
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
            'onError': onPlayerError
        }
    });

    __$_.container = container;
    __$_.current_video_id = video_id;
    __$_.suggested_quality = quality;
    __$_.buffering_video = false;

    if (options.autoplay === "1") {
        __$_.plays_when_ready = true;
    }
    
    if (options.captions === "0") {
        __$_.turns_off_captions = true;
    }
}

function onPlayerReady(event) {
    __$_.player.cueVideoById(__$_.current_video_id, 0, __$_.suggested_quality);

    if (__$_.plays_when_ready) {
        __$_.player.playVideo();
    }
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.CUED) {
        window.location = "video://ready";

        if (__$_.turns_off_captions) {
            __$_.player.unloadModule("captions");
        }

        return;
    }

    if (event.data === YT.PlayerState.PLAYING) {
        window.location = "video://playing";

        if (__$_.turns_off_captions) {
            __$_.player.unloadModule("captions");
        }

        return;
    }

    if (event.data === YT.PlayerState.PAUSED) {
        window.location = "video://paused";

        return;
    }

    if (event.data === YT.PlayerState.ENDED) {
        window.location = "video://finished";

        return;
    }

    if (event.data === YT.PlayerState.BUFFERING) {
        __$_.buffering_video = true;

        return;
    }

    if (event.data === -1 && __$_.buffering_video) {
        __$_.buffering_video = false;

        return;
    }
}

function onPlayerError(event) {
    if (event.data == 2) {
        window.location = "video://error/invalid";

        return;
    }

    if (event.data == 5) {
        window.location = "video://error/system";

        return;
    }

    if (event.data == 100) {
        window.location = "video://notavailable/private";

        return;
    }

    if (event.data == 101 || event.data == 105) {
        window.location = "video://notavailable/protected";

        return;
    }

    if (event.data == 150) {
        window.location = "video://notavailable/restricted";

        return;
    }
}

function loadVideo(video_id) {
    __$_.player.cueVideoById(video_id, 0, __$_.suggested_quality);

    __$_.current_video_id = video_id;
    __$_.buffering_video = false;
}

function playVideo() {
    __$_.player.playVideo();
}

function pauseVideo() {
    __$_.player.pauseVideo();
}

function stopVideo() {
    __$_.player.stopVideo();
}

function getVideoID() {
    return __$_.current_video_id;
}

function getTitle() {
    return __$_.player.getVideoData().title;
}

function getAuthor() {
    return __$_.player.getVideoData().author;
}

function seekTo(time) {
    __$_.player.seekTo(time, true);
}

function getCurrentTime() {
    return __$_.player.getCurrentTime();
}

function getDuration() {
    return __$_.player.getDuration();
}

function setRate(rate) {
    __$_.player.setPlaybackRate(rate);
}

function getRate() {
    return __$_.player.getPlaybackRate();
}

function setVolume(volume) {
}

function getVolume() {
    return 1.0;
}

function setRepeats(repeats) {
}

function setMirrors(mirrors) {
    var container = document.getElementById(__$_.container);

    if (mirrors) {
        container.style.setProperty("-webkit-transform", "scaleX(-1)");
    } else {
        container.style.setProperty("-webkit-transform", "");
    }
}

function mute() {
    __$_.player.mute();
}

function unmute() {
    __$_.player.unMute();
}

function enterFullscreen() {
}

function exitFullscreen() {
}

function isFullscreen() {
}
