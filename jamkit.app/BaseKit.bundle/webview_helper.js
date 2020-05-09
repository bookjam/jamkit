window.import = function(url) {
    var script = document.createElement('script');
    script.src = url;
    document.head.appendChild(script);
}
