var chart;

function configureChart(div, type, data, options) {
    chart = new Chart(div, { type:type, data:data, options:options });
}
