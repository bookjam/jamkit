var video;

function configureVideo(element) {
    video = element;
    
    video.addEventListener('webkitbeginfullscreen', function() {
        alert('webkitbeginfullscreen');
    }, false);
}
