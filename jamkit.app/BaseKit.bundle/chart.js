var __$_ = (function() {
    return {
        chart: null
    }
})()

function configureChart(element, type, data, options) {
    __$_.chart = new Chart(element, { type:type, data:data, options:options });
}
