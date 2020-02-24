window.open = function(url) {
    window.location = (function() {
        return function(url) {
            var a = document.createElement('a');
            a.href = url;
            return a.href;
        }
    })(url);
}

window.close = function() {
    window.history.back();
}

window.import = function(url) {
    var script = document.createElement('script');
    script.src = url;
    document.head.appendChild(script);
}
