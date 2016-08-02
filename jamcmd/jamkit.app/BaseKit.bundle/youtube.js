var player;
var plays_when_ready = false;

function configureVideo(element, video_id, options) {
    player = new YT.Player(element, {
        width: '100%',
        height: '100%',
        videoId: video_id,
        playerVars: options,
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
    
    if (options.autoplay === "1") {
        plays_when_ready = true;
    }
}

function onPlayerReady(event) {
    if (plays_when_ready) {
        player.playVideo();
    }
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        window.location = "video://ended";
    }
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
