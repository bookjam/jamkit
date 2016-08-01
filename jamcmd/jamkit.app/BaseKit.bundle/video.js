var player;

function configureVideo(element) {
    player = element;
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
