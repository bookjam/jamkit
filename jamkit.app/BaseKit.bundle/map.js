var __$_ = (function() {
    return {
        map: null,
        marker: null,
        infoWindow: null
    }
})()

function configureMap(element) {
    __$_.map = new google.maps.Map(element, { zoom:17, mapTypeId:google.maps.MapTypeId.ROADMAP });
}

function setLocation(latitude, longitude, zoom) {
    __$_.map.setCenter(new google.maps.LatLng(latitude, longitude))
}

function setZoomLevel(zoomLevel) {
    __$_.map.setZoom(zoomLevel)
}

function setPlaceMark(latitude, longitude, title, subtitle) {
    var location = new google.maps.LatLng(latitude, longitude);
    
    __$_.marker = new google.maps.Marker({ position:location, map:__$_.map, title:subtitle });
    __$_.infoWindow = new google.maps.InfoWindow({ content:title, maxWidth:300 });
    
    google.maps.event.addListener(__$_.marker, 'click', function() {
        __$_.infoWindow.open(__$_.map, __$_.marker);
    });
}

function showPlaceMark() {
    __$_.infoWindow.open(map, marker);
}

function hidePlaceMark() {
    __$_.infoWindow.close();
}
