(function() {
    var open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function() {
        var url = arguments[1];
        
        if (url.startsWith("/")) {
            url = window.location.origin + url;
        }
        
        webkit.messageHandlers.__xhr__.postMessage(JSON.stringify({
            state: "start",
            url: url
        }));
        
        open.apply(this, [].slice.call(arguments));
    };
})();
