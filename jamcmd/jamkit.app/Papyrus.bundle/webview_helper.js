window.open = function(url) {
    window.location = __getAbsoluteUrl(url);
};

window.close = function() {
    window.history.back();
};

var __getAbsoluteUrl = (function() {
  var a;
                      
  return function(url) {
    if (!a) {
      a = document.createElement('a');
    }

    a.href = url;
                   
    return a.href;
  };
})();
