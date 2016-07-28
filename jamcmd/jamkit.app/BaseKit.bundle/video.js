var video;

function configureVideo(element) {
    video = element;
    
    video.addEventListener('play', function() {
    }, false);
}

function playVideo() {
    video.play();
}

function pauseVideo() {
    video.pause();
}

function stopVideo() {
}
