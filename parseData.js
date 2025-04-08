// array to store charts so they can be cleared if file changed
let charts = [];

async function readData() {
    let dataFile = document.getElementById("data-input").files[0];
    const reader = new FileReader();
    reader.onload = () => {
        parseData(reader.result);
    }
    reader.readAsText(dataFile);
}

function parseData(data) {
    document.getElementById("main").style.display = "flex";
    markers.forEach(marker => marker.setMap(null)); // hide all markers
    markers = []; // clear previous markers
    charts.forEach(chart => chart.destroy()); // clear all charts
    charts = [];

    data = data.split(/\r?\n|\r|\n/g); // split by line
    data = data.filter(Boolean); // filter out empty lines
    data = data.filter(str => str !== ",,,,,,,,,,,,,,,,,,,,,,,,"); // filter out the empty lines that get printed for some reason
    data.shift();
    let milliseconds = [];
    let externalTemps = [];
    let internalTemps = [];
    let humidity = [];
    let timestamps = [];
    let latitudes = [];
    let longitudes = [];
    let altitudes = [];

    for (const bigRow of data) {
        row = bigRow.split(",");
        milliseconds.push(row[0]);
        externalTemps.push(row[2]);
        internalTemps.push(row[3]);
        humidity.push(row[5]);
        timestamps.push(row[10])
        // check if quality is 1 or higher -- indicates there's data there (+0 for conversion)
        let quality = row[15];
        if (quality !== "0") {
            // these ternaries will make the values negative for S or E coords
            // divide by 100 for proper coords
            /*
            let lat = (row[11] * (row[12] === "N" ? 1 : -1)) / 100;
            latitudes.push(lat);
            let lng = (row[13] * (row[14] === "E" ? 1 : -1)) / 100;
            longitudes.push(lng)
            */
         
           let latDeg = parseFloat(row[11].replace(/^0+/, '').slice(0,2));
           let latMin = parseFloat(row[11].replace(/^0+/, '').slice(2));
           let lat = latDeg + (latMin / 60);
           if (row[12] === "S") lat *= -1;
           latitudes.push(lat);

           let lngDeg = parseFloat(row[13].replace(/^0+/, '').slice(0,2));
           let lngMin = parseFloat(row[13].replace(/^0+/, '').slice(2));
           let lng = lngDeg + (lngMin / 60);          
           if (row[14] === "W") lng *= -1;
           longitudes.push(lng);

           altitudes.push(row[18]);
        }
    }

    externalTemps = externalTemps.filter(Boolean);
    internalTemps = internalTemps.filter(Boolean);
    humidity = humidity.filter(Boolean);
    timestamps = timestamps.filter(Boolean);
    latitudes = latitudes.filter(Boolean);
    longitudes = longitudes.filter(Boolean);


    // plot path
    let points = [];
    for (let i = 0; i < latitudes.length; i++) {
        let coord = {lat : latitudes[i], lng : longitudes[i]};
        points.push(coord);
    }

    let flightPath = new google.maps.Polyline({
        path: points,
        geodesic: false,
        strokeColor: "#FF0000",
        strokeOpacity: 1.0,
        strokeWeight: 1
    });
    markers.push(flightPath);

    flightPath.setMap(map);

    // recenter map on line
    let bounds = new google.maps.LatLngBounds();
    flightPath.getPath().forEach(x => bounds.extend(x));
    if (flightPath.getPath().length > 0) map.fitBounds(bounds);
    else {
        map.panTo(new google.maps.LatLng(42.27684985412537, -83.73819494482258));
        map.setZoom(14);
    }
    // flight time
    let flightTime = (milliseconds[milliseconds.length - 1]) / (1000 * 60 * 60);
    document.getElementById("flight-time").getElementsByTagName("p")[0].innerHTML = Math.trunc(flightTime) + " hours, " + Math.round((flightTime % 1) * 60) + " minutes";

    // flight distance
    let pathLength = (google.maps.geometry.spherical.computeLength(flightPath.getPath()) / 1000).toFixed(1);
    document.getElementById("flight-distance").getElementsByTagName("p")[0].innerHTML = pathLength + " km"; 
    
    // avg. velocity
    let avgVelocity = (pathLength / flightTime).toFixed(2);
    document.getElementById("velocity").getElementsByTagName("p")[0].innerHTML = avgVelocity + " km/h";

    // avg. humidity
    let avgHumidity = 0;
    humidity.forEach(humidities => avgHumidity += parseFloat(humidities));
    avgHumidity /= humidity.length;
    avgHumidity = avgHumidity.toFixed(2);
    document.getElementById("humidity").getElementsByTagName("p")[0].innerHTML = avgHumidity + "%";

    // temps
    let avgTemp = 0;
    internalTemps.forEach(temp => avgTemp += parseFloat(temp));
    avgTemp /= internalTemps.length;
    avgTemp = avgTemp.toFixed(2);
    document.getElementById("temp-avg").getElementsByTagName("p")[0].innerHTML = avgTemp + "&deg;C";

    let highTemp = Math.max(...internalTemps.map(parseFloat));
    let lowTemp = Math.min(...internalTemps.map(parseFloat));

    document.getElementById("temp-high").getElementsByTagName("p")[0].innerHTML = highTemp + "&deg;C"
    document.getElementById("temp-low").getElementsByTagName("p")[0].innerHTML = lowTemp + "&deg;C"

    // graphs
    const altitudeTime = new Chart("alt-time", {
        type: "line",
        data: {
            labels: milliseconds.map(x => parseFloat(x)),
            datasets: [{
                //backgroundColor: "#a2afbf",
                pointBackgroundColor: "#a2afbf",
                borderColor: "#a2afbf",
                data: altitudes.map(x => parseFloat(x)),
            }]
        },
        options: {
            legend: {
                display: false
            },
            title: {
                display: true,
                text: "Altitude over time (m/ms)"
            }
        }
    });

    charts.push(altitudeTime);


    /*
    console.log(milliseconds);
    console.log(externalTemps);
    console.log(internalTemps);
    console.log(humidity);
    console.log(timestamps);
    console.log(latitudes);
    console.log(longitudes);
    console.log(altitudes);
    */
}
