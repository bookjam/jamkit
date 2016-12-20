var map, marker, infoWindow;

function configureMap(div) {
    map = new google.maps.Map(div, { zoom:17, mapTypeId:google.maps.MapTypeId.ROADMAP });
}

function setLocation(latitude, longitude, zoom) {
    map.setCenter(new google.maps.LatLng(latitude, longitude))
}

function setZoomLevel(zoomLevel) {
    map.setZoom(zoomLevel)
}

function setPlaceMark(latitude, longitude, title, subtitle) {
    var location = new google.maps.LatLng(latitude, longitude);
    
    marker = new google.maps.Marker({ position:location, map:map, title:subtitle });
    infoWindow = new google.maps.InfoWindow({ content:title });
    
    google.maps.event.addListener(marker, 'click', function() {
        infoWindow.open(map, marker);
    });
}

function showPlaceMark() {
    infoWindow.open(map, marker);
}

function hidePlaceMark() {
    infoWindow.close();
}
