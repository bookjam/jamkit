var player = null;
var iframe = null;
var current_video_id = null;
var suggested_quality = 'default'
var plays_when_ready = false;
var turns_off_captions = false;
var buffering_video = false;

function configureVideo(element, video_id, quality, options) {
    player = new YT.Player(element, {
        width: '100%',
        height: '100%',
        playerVars: options,
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
            'onError': onError
        }
    });

    iframe = document.getElementById(element);

    current_video_id = video_id;
    suggested_quality = quality;
    buffering_video = false;

    if (options.autoplay === "1") {
        plays_when_ready = true;
    }
    
    if (options.captions === "0") {
        turns_off_captions = true;
    }
}

function onPlayerReady(event) {
    player.cueVideoById(current_video_id, 0, suggested_quality);

    if (plays_when_ready) {
        player.playVideo();
    }
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.CUED) {
        window.location = "video://ready";

        if (turns_off_captions) {
            player.unloadModule("captions");
        }

        return;
    }

    if (event.data === YT.PlayerState.PLAYING) {
        window.location = "video://playing";

        if (turns_off_captions) {
            player.unloadModule("captions");
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
        buffering_video = true;

        return;
    }

    if (event.data === -1 && buffering_video) {
        buffering_video = false;

        return;
    }
}

function onError(event) {
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
}

function loadVideo(video_id) {
    player.cueVideoById(video_id, 0, suggested_quality);

    current_video_id = video_id;
    buffering_video = false;
}

function playVideo() {
    player.playVideo();
}

function pauseVideo() {
    player.pauseVideo();
}

function stopVideo() {
    player.stopVideo();
}

function seekTo(time) {
    player.seekTo(time, true);
}

function getCurrentTime() {
    return player.getCurrentTime();
}

function getDuration() {
    return player.getDuration();
}

function getVideoID() {
    return current_video_id;
}

function getTitle() {
    return player.getVideoData().title;
}

function getAuthor() {
    return player.getVideoData().author;
}

function mute() {
    player.mute();
}

function unmute() {
    player.unMute();
}

function enterFullscreen() {
}

function exitFullscreen() {
}

function isFullscreen() {
}
