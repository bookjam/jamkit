var player = null;

function configureVideo() {
    player = document.body.getElementsByTagName('video')[0];

    if (player) {
        __configureEvents(player);
        __update_player();
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

function __update_player() {
    window.setTimeout(function(){
        var candidate = document.body.getElementsByTagName('video')[0];
                  
        if (candidate != player) {
            player = candidate;
            
            __configureEvents(player);
        }

        __update_player();
    }, 500);
}

function loadVideo() {
    player.load();
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
