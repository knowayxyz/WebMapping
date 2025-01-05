// app.js

var locations;
var datalayer1;
var datalayer2;
var map;

function init_map()
{
    map = L.map('map').setView([22.4, 114.2], 12); // 设置初始视图
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
    }).addTo(map);
}

async function load_data(datasets,display_data)
{
    // load datasets
    document.getElementById('loading').style.display = 'block';
    const promises = datasets.map(file => 
        d3.csv(file).catch(error => {
            console.error(`Error loading ${file}:`, error);
            return []; 
        })
    );

    Promise.all(promises).then(results => {
        document.getElementById('loading').style.display = 'none';
        [locations, datalayer1, datalayer2] = results;

        display_data();
    });
}

function attribute2digits(d)
{
    for (let key in d) {
        if (d.hasOwnProperty(key) && typeof d[key] === 'string') {
            let num = Number(d[key]);
            if (!isNaN(num)) {
                d[key] = num; // 转换为数字
            }
        }
    }
}
function data_preprocess()
{
    locations.forEach(d =>{
        attribute2digits(d);
        d['value'] = Math.floor(Math.random() * 100+40) 
    });


    datalayer1.forEach(d =>{
        attribute2digits(d);
        d["TimePoint"] = d.SampleName.split("_")[1];
    });

    datalayer2.forEach(d =>{
        attribute2digits(d);
        d["TimePoint"] = d.SampleName.split("_")[1];
    });
}

function bar_icon(value)
{
    const svg = d3.create("svg")
            .attr("width", 50)
            .attr("height", 100);

        svg.append("rect")
            .attr("width", 30)
            .attr("height", value)
            .attr("x", 10)
            .attr("y", 100 - value)
            .attr("fill", "steelblue").attr("class", "bar");;
        /*
        svg.append("text")
            .attr("x", 25) // Center the text
            .attr("y", 90) // Position it above the bar
            .attr("text-anchor", "middle") // Center-align the text
            .attr("fill", "white") // Text color
            .text(value); // Set the text to the value*/

        return L.divIcon({
            className: 'bar-chart',
            html: svg.node().outerHTML,
            iconSize: [50, 100],
            iconAnchor: [25, 100]
        });
}

function charts_update(data)
{
    
}

function update_map(sitetype)
{
    map.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
            map.removeLayer(layer);
        }
    });

    // Add new markers based on selected SiteType
    if (sitetype === 'all') {
        locations.forEach(d => {
            const marker = L.marker([d.lat, d.lon], { icon: bar_icon(d.value) }).addTo(map);
            marker.on('click', function() {
                stacked_time_bars(d.SamplingSite)
            });

        });
    } else {
        locations.filter(d => d.SiteType === parseInt(sitetype)).forEach(d => {
            const marker = L.marker([d.lat, d.lon], { icon: bar_icon(d.value) }).addTo(map);
            marker.on('click', function() {
                stacked_time_bars(d.SamplingSite)
            });
        });
    }
}

function display_data()
{
    data_preprocess();
    
    //console.log(datalayer2);
    /*locations.forEach(d => {

        // add markers
        //L.marker([d.lat, d.lon], { icon: bar_icon(d.value) }).addTo(map);
        L.marker([d.lat, d.lon]).addTo(map)
            .bindPopup(`<strong>${d.SamplingSite}</strong><br>Latitude: ${d.lat}<br>Longitude: ${d.lon}`);
    });*/
    update_map("all");
}

function fakedata_map(item)
{
    //alert(item);
    map.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
            map.removeLayer(layer);
        }
    });

   
    locations.forEach(d => {
        const marker = L.marker([d.lat, d.lon], { icon: bar_icon(Math.random()*100) }).addTo(map);
        marker.on('click', function() {
            stacked_time_bars(d.SiteType)
        });

    });
}

function stacked_time_bars(sitename)
{
    document.getElementById("select_site").textContent = `Show Data: Site ${sitename}`;
    const categories = ['cat1', 'cat2', 'cat3', 'cat4', 'cat5', 'cat6', 'cat7', 'cat8', 'cat9', 'cat10'];

        // Generate random data for 10 categories across 12 quarters (3 years)
        const data = Array.from({ length: 12 }, (_, i) => {
            const quarter = `202${Math.floor(i / 4)} Q${(i % 4) + 1}`;
            const values = categories.map(() => Math.floor(Math.random() * 100));
            const total = d3.sum(values);
            return {
                quarter: quarter,
                ...Object.fromEntries(categories.map((cat, index) => [cat, (values[index] / total) * 100])) // Normalize to total 100
            };
        });

        // Append SVG to the div
        d3.select("#stackedbar").html("");
        const svg = d3.select("#stackedbar")
            .append("svg")
            .attr("width", 800)
            .attr("height", 400);

        const margin = { top: 20, right: 30, bottom: 40, left: 40 };
        const width = +svg.attr("width") - margin.left - margin.right;
        const height = +svg.attr("height") - margin.top - margin.bottom;

        const x = d3.scaleBand()
            .domain(data.map(d => d.quarter))
            .range([0, width])
            .padding(0.1);

        const y = d3.scaleLinear()
            .domain([0, 100]) // Fixed to 100 for proportional heights
            .nice()
            .range([height, 0]);

        const color = d3.scaleOrdinal()
            .domain(categories)
            .range(d3.schemeCategory10); // Use D3's category color scheme

        const stack = d3.stack()
            .keys(categories);

        const stackedData = stack(data);

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Create a group for each stack
        const groups = g.selectAll("g")
            .data(stackedData)
            .enter().append("g")
            .attr("fill", d => color(d.key));

        // Create rectangles for each segment
        groups.selectAll("rect")
            .data(d => d)
            .enter().append("rect")
            .attr("x", d => x(d.data.quarter))
            .attr("y", d => y(d[1]))
            .attr("height", d => y(d[0]) - y(d[1]))
            .attr("width", x.bandwidth())
            .attr("class", "bar")
            .on("click", function(event, d) {
                const quarter = d.data.quarter;
                const segment = d3.select(this.parentNode).datum().key; // Access segment key
                const value = d[1] - d[0]; // Calculate the value based on stack height
                //alert(`Clicked on ${quarter}: ${segment} = ${value.toFixed(2)}%`);
                draw_pie_map(quarter,segment);
            });

        g.append("g")
            .attr("class", "axis axis--x")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x));

        g.append("g")
            .attr("class", "axis axis--y")
            .call(d3.axisLeft(y));
}

function draw_pie_map(timepoint, cat)
{
    document.getElementById("select_rect").textContent = `Show Data: ${timepoint}, ${cat}`;
    
    const categories = Math.floor(Math.random() * 5) + 6; 
    const data = Array.from({ length: categories }, () => Math.floor(Math.random() * 100));

    const width = 400;
    const height = 400;
    const radius = Math.min(width, height) / 2 - 40;

    d3.select("#piechart").html("");
    const svg = d3.select("#piechart")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const pie = d3.pie();
    const arc = d3.arc()
        .innerRadius(80) // 设置内半径以创建甜甜圈效果
        .outerRadius(radius);

    const arcs = pie(data);

    svg.selectAll("path")
        .data(arcs)
        .enter()
        .append("path")
        .attr("d", arc)
        .attr("fill", (d, i) => color(i))
        .attr("stroke", "#fff")
        .attr("stroke-width", 2);
}