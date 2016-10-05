window.open = function(url) {
    var t = document.createElement("a");
    var e = document.createEvent("MouseEvent");

    t.setAttribute("href", "web://open/" + getAbsoluteUrl(url));
    e.initMouseEvent("click");
    
    t.dispatchEvent(e);
};

window.close = function() {
    var t = document.createElement("a");
    var e = document.createEvent("MouseEvent");
    
    t.setAttribute("href", "web://close");
    e.initMouseEvent("click");
    
    t.dispatchEvent(e);
};

var getAbsoluteUrl = (function() {
  var a;
                      
  return function(url) {
    if (!a) {
      a = document.createElement('a');
    }

    a.href = url;
                   
    return a.href;
  };
})();
