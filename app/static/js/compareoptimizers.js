
const animateArchitecture = [2,1,5,3];

let architecture = [];
let nodes = [], links = [];
let numberLayers = 0;
let trainingDone = false; // variable para saber si se ha terminado el entrenamiento o no
let networkCreated = false;   // variable inicial para saber si se ha creado la red
let trainingOptimizer = ["adam", "sgd"];  // variable para los títulos de las gráficas



window.addEventListener('DOMContentLoaded', (event) => {
    fetch('/static/data/header.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('header').innerHTML = data;
        });
});

document.addEventListener('DOMContentLoaded', function() {
    var socket = io('http://localhost:5000');
    
    socket.on('compareoptimizers/training_plot', function(data) {
        console.log('Received plot:', data);
        drawGraph(data);
    });
});


document.addEventListener('DOMContentLoaded', function() {

    document.getElementById('createNetwork').addEventListener('click', function(event) {
        event.preventDefault();
        updateArchitecture();          // actualizar la arquitectura de la red 
        if (architecture.length == 0){
            showWarning("ERROR", "Primero debes crear la arquitectura de la red!");
            return;
        }
        sendArchitectureBackEnd();     // mandar dicha arquitectura al backend para crear el modelo
        reset_window()                 // resetear el display
        drawNetwork();
        networkCreated = true;
    });
});

function reset_window(){
    console.log("Reseting window!");
    // resetear variables
    trainingDone = false;
    networkCreated = false;
    // limpiar posible dibujo de la red
    nodes = [];
    links = [];
    d3.select(`#graphSVG_0 svg`).selectAll('*').remove();
    d3.select(`#graphSVG_1 svg`).selectAll('*').remove();
}



document.getElementById('trainNetwork').addEventListener('click', function() {

    // checkear si existe una red 
    if (!networkCreated) {
        showWarning("ERROR", "La red no existe! Primero debes crearla y luego crearla!");
        return;
    }

    // configurar variables globales y comenzar la animación
    trainingDone = false;
    trainingOptimizer = [
        document.getElementById("trainingOptimizer1").value,
        document.getElementById("trainingOptimizer2").value
    ]
    animate(50);

    const info = { 
        "optim1": trainingOptimizer[0],
        "optim2": trainingOptimizer[1],
        "epochs": document.getElementById("trainingEpochs").value,
        "batch_size" : document.getElementById("trainingBatchSize").value
    }

    console.log(info);

    // train network
    fetch('/neural_networks/compareoptimizers/trainNetwork', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(info)
    })
    .then(response => response.json())
    .then(data => {
        console.log('Respuesta recibida:', data);
        trainingDone = true;
    })
    .catch(error => console.error('Error:', error));
});




function sendArchitectureBackEnd() {
    fetch('/neural_networks/compareoptimizers/createNetwork', {  // Asegúrate de que la URL coincide con la del servidor Flask
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'  // Especifica que el tipo de contenido es JSON
        },
        body: JSON.stringify({ "architecture": architecture })  // Convierte el objeto a una cadena JSON
    })
    .then(response => response.json())  // Convierte la respuesta del servidor de nuevo a JSON
    .then(data => console.log(data.info))  // Procesa la respuesta del servidor
    .catch(error => console.error('Error:', error));  // Maneja posibles errores
}





function randint(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}


function updateArchitecture() {
    architecture = [];
    for (let i = 0; i < numberLayers; i++) {
        let id_base = "bloqueLayerConfig-" + (i+1);
        let type_name = document.getElementById(id_base + "-type").value;
        let number = document.getElementById(id_base + "-number").value;
        let extra = 0;
        if (type_name === "Capa Convolucional") {
            extra = document.getElementById(id_base + "-filtro").value;
        }
        let type = (type_name === "Capa Convolucional") ? 0 : (type_name === "Avg Pooling" ? 1 : 2);
        let content = [
            type, 
            parseInt(number, 10), 
            parseInt(extra, 10)
        ];
        architecture.push(content);
    }
}



function addLayerInputs() {
    numberLayers = numberLayers + 1;
    const layersConfig = document.getElementById('layersConfig');
    // layersConfig.innerHTML = ''; 
    
    // Crear div padre
    let id_base = "bloqueLayerConfig-" + numberLayers;
    const bloque = document.createElement("div");
    bloque.id = id_base;
    
    // Crear div para los inputs
    const div = document.createElement("div");
    div.style = "padding: 10px 10px;";
    div.id = id_base + "-div";
    div.name = "configLayer";

    // Crear el input para el tipo
    const inputType = document.createElement('select');
    inputType.id = id_base + "-type";
    
    const optionsListLayers = ['Avg Pooling', 'Max Pooling', 'Capa Convolucional'];
    optionsListLayers.forEach(optionValue => {
        const option = document.createElement('option');
        option.value = optionValue;
        option.textContent = optionValue;
        inputType.appendChild(option);
    });

    // Crear el input para la configuración
    const inputConfig = document.createElement('input');
    inputConfig.type = 'number';
    inputConfig.style = "width: 50px;";
    inputConfig.id = id_base + "-number";
    inputConfig.min = '1';
    inputConfig.max = '10';
    inputConfig.value = '1';

    // Añadir los inputs al div
    div.appendChild(inputType);
    div.appendChild(inputConfig);

    // Añadir los inputs al div
    div.appendChild(document.createTextNode("- Tipo:\t"));
    div.appendChild(inputType);
    div.appendChild(document.createElement('br'));
    div.appendChild(document.createTextNode("- Tamaño del kernel:\t"));
    div.appendChild(inputConfig);

    // Configurar el bloque
    let ss = "Capa "+ numberLayers + ":";
    bloque.appendChild(document.createTextNode(ss));
    bloque.appendChild(document.createElement('br'));
    bloque.appendChild(div);
    bloque.appendChild(document.createElement('br'));

    // Añadir el bloque al window
    layersConfig.appendChild(bloque);

    // Añadir un listener para los cambios en las capas
    document.getElementById(id_base + "-type").addEventListener('input', function() {
        if (this.value == "Capa Convolucional") {
            // cargar bloque principal
            let d = document.getElementById(id_base + "-div");
            // crear nuevo div extra para los filtros
            let extra_div = document.createElement("div");
            extra_div.id = id_base + "-extra";
            // crear el input
            const inputFiltro = document.createElement('input');
            inputFiltro.type = 'number';
            inputFiltro.id = id_base + "-filtro";
            inputFiltro.style = "width: 50px;";
            inputFiltro.min = '1';
            inputFiltro.value = '32';
            // añadirlo todo
            extra_div.appendChild(document.createTextNode("- Nº de filtros:\t"));
            extra_div.appendChild(inputFiltro);
            d.appendChild(extra_div);
        }
        else {
            var element = document.getElementById(id_base + "-extra");
            if (element) {
                element.remove();
            }
        }
    });
}


function removeLayerInputs() {
    if (numberLayers > 0) {
        let id = "bloqueLayerConfig-" + numberLayers;
        document.getElementById(id).remove();
        numberLayers = numberLayers - 1;
    }
}


function paint(layer, activations) {
    const svg = d3.select('svg');
    svg.selectAll('.node')
        .filter(d => d.layer === layer)
        .attr('fill', d => {
            let index = parseInt(d.id.split('-')[1]);
            return activations && activations[index] ? d3.interpolateRdYlBu(activations[index]) : 'red';
        });
}


function reset_paint(layer) {
    const svg = d3.select('svg');
    svg.selectAll('.node')
        .filter(d => d.layer === layer)
        .attr('fill', 'black');
}


function getRandomList(size) {
    let arr = [];
    for (let i = 0; i < size; i++) {
        arr.push(Math.random());
    }
    return arr;
}


// animación que se realiza mientras se entrena el modelo
function animate(ms) {
    let aux = 0;  // Esta variable puede necesitar ser ajustada si se desea controlar la animación más finamente

    function step() {
        animateArchitecture.forEach((size, layerIndex) => {
            setTimeout(() => {
                const activations = getRandomList(size);
                paint(layerIndex, activations);
            }, aux + ms * layerIndex);

            setTimeout(() => {
                reset_paint(layerIndex);
                // Comprueba si aún necesita seguir animando
                if (layerIndex === animateArchitecture.length - 1 && !trainingDone) {
                    setTimeout(step, ms * animateArchitecture.length);  // Espera y vuelve a ejecutar
                }
            }, aux + ms * (layerIndex + 1));
        });
        //aux += ms * architecture.length;
    }

    step();  // Inicia la primera ejecución
}



// Función para agregar una línea de contenido a la tabla
/*let info = {
    layerType: 'Dense',
    outputShape: '(None, 64)',
    paramCount: '640'
};*/
function addTableRow(layerInfo, is_last) {
    var tableRow = document.createElement('div');
    tableRow.style.display = 'flex';
    tableRow.style.borderBottom = is_last ? '2px solid gray' : '1px solid gray';
    tableRow.style.padding = '15px 5px';

    var layerTypeCell = document.createElement('div');
    layerTypeCell.textContent = layerInfo.layerType;
    layerTypeCell.style.flex = '1';

    var outputShapeCell = document.createElement('div');
    outputShapeCell.textContent = layerInfo.outputShape;
    outputShapeCell.style.flex = '1';
    outputShapeCell.style.textAlign = "center";

    var paramCountCell = document.createElement('div');
    paramCountCell.textContent = layerInfo.paramCount;
    paramCountCell.style.flex = '1';
    paramCountCell.style.textAlign = "center";

    tableRow.appendChild(layerTypeCell);
    tableRow.appendChild(outputShapeCell);
    tableRow.appendChild(paramCountCell);

    document.getElementById('summary_info_content').appendChild(tableRow);
}



function drawGraph(info) {
    const { accuracy, loss, val_accuracy, val_loss } = info;
    const n = parseInt(info.n);

    const dataAccuracy = [
        { values: accuracy, key: 'accuracy', color: 'steelblue' },
        { values: val_accuracy, key: 'val_accuracy', color: 'green' }
    ];

    const dataLoss = [
        { values: loss, key: 'loss', color: 'red' },
        { values: val_loss, key: 'val_loss', color: 'orange' }
    ];

    const epochs = d3.range(1, accuracy.length + 1);

    const graphID = `graphSVG_${n}`
    const svg = d3.select(`#${graphID} svg`);
    svg.selectAll('*').remove(); // Limpiar la visualización anterior

    const width = document.getElementById(graphID).clientWidth;
    const height = document.getElementById(graphID).clientHeight;

    const margin = { top: 40, right: 20, bottom: 30, left: 50 };
    const innerWidth = (width / 2) - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const xScale = d3.scaleLinear()
        .domain([1, accuracy.length])
        .range([0, innerWidth]);

    const yScaleAccuracy = d3.scaleLinear()
        .domain([Math.max(0, d3.min([...accuracy, ...val_accuracy])-0.1), 1])
        .range([innerHeight, 0]);

    const yScaleLoss = d3.scaleLinear()
        .domain([0, d3.max([...loss, ...val_loss])])
        .range([innerHeight, 0]);

    const line = d3.line()
        .x((d, i) => xScale(i + 1))
        .y((d, i) => yScaleAccuracy(d));

    const lineLoss = d3.line()
        .x((d, i) => xScale(i + 1))
        .y((d, i) => yScaleLoss(d));

    const tooltip = d3.select('.tooltip');

    // Añadir título
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', margin.top / 2)
        .attr('text-anchor', 'middle')
        .attr('font-size', '16px')
        .attr('font-weight', 'bold')
        .text("Optimizador: " + trainingOptimizer[n]);

    // Gráfica de Accuracy
    const gAccuracy = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    gAccuracy.append('g')
        .call(d3.axisLeft(yScaleAccuracy));

    gAccuracy.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale).ticks(accuracy.length));

    dataAccuracy.forEach(dataset => {
        gAccuracy.append('path')
            .datum(dataset.values)
            .attr('fill', 'none')
            .attr('stroke', dataset.color)
            .attr('stroke-width', 2)
            .attr('d', line);

        gAccuracy.selectAll(`.point-${dataset.key}`)
            .data(dataset.values)
            .enter().append('circle')
            .attr('class', `point-${dataset.key}`)
            .attr('cx', (d, i) => xScale(i + 1))
            .attr('cy', d => yScaleAccuracy(d))
            .attr('r', 4)
            .attr('fill', dataset.color)
            .on('mouseover', function (event, d, i) {
                tooltip.style('visibility', 'visible')
                    .html(`${dataset.key}: ${d}`);
            })
            .on('mousemove', function (event) {
                tooltip.style('top', (event.pageY - 10) + 'px')
                    .style('left', (event.pageX + 10) + 'px');
            })
            .on('mouseout', function () {
                tooltip.style('visibility', 'hidden');
            });
    });

    const legendAccuracy = svg.append('g')
        .attr('transform', `translate(${margin.left + 20},${height - margin.bottom - 20 * dataAccuracy.length})`);

    dataAccuracy.forEach((dataset, i) => {
        const legendRow = legendAccuracy.append('g')
            .attr('transform', `translate(0, ${i * 20})`);

        legendRow.append('rect')
            .attr('width', 10)
            .attr('height', 10)
            .attr('fill', dataset.color);

        legendRow.append('text')
            .attr('x', 20)
            .attr('y', 10)
            .attr('text-anchor', 'start')
            .text(dataset.key);
    });

    // Gráfica de Loss
    const gLoss = svg.append('g')
        //.attr('transform', `translate(${innerWidth - margin.right - 100},${height - margin.bottom - 20 * dataAccuracy.length})`);
        .attr('transform', `translate(${width / 2 + margin.left},${margin.top})`);

    gLoss.append('g')
        .call(d3.axisLeft(yScaleLoss));

    gLoss.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale).ticks(accuracy.length));

    dataLoss.forEach(dataset => {
        gLoss.append('path')
            .datum(dataset.values)
            .attr('fill', 'none')
            .attr('stroke', dataset.color)
            .attr('stroke-width', 2)
            .attr('d', lineLoss);

        gLoss.selectAll(`.point-${dataset.key}`)
            .data(dataset.values)
            .enter().append('circle')
            .attr('class', `point-${dataset.key}`)
            .attr('cx', (d, i) => xScale(i + 1))
            .attr('cy', d => yScaleLoss(d))
            .attr('r', 4)
            .attr('fill', dataset.color)
            .on('mouseover', function (event, d, i) {
                tooltip.style('visibility', 'visible')
                    .html(`${dataset.key}: ${d}`);
            })
            .on('mousemove', function (event) {
                tooltip.style('top', (event.pageY - 10) + 'px')
                    .style('left', (event.pageX + 10) + 'px');
            })
            .on('mouseout', function () {
                tooltip.style('visibility', 'hidden');
            });
    });

    const legendLoss = svg.append('g')
        //.attr('transform', `translate(${width / 2 + innerWidth - margin.right - 100},${margin.top})`);
        .attr('transform', `translate(${width / 2 + margin.left + 20},${height - margin.bottom - 20 * dataLoss.length})`);

    dataLoss.forEach((dataset, i) => {
        const legendRow = legendLoss.append('g')
            .attr('transform', `translate(0, ${i * 20})`);

        legendRow.append('rect')
            .attr('width', 10)
            .attr('height', 10)
            .attr('fill', dataset.color);

        legendRow.append('text')
            .attr('x', 20)
            .attr('y', 10)
            .attr('text-anchor', 'start')
            .text(dataset.key);
    });
}




function drawNetwork() {
    const layerSizes = animateArchitecture; // Ejemplo de arquitectura de red
    const svg = d3.select('#networkSVG svg');
    svg.selectAll('*').remove(); // Limpiar la visualización anterior

    const width = document.getElementById("networkSVG").clientWidth;
    const height = document.getElementById("networkSVG").clientHeight;

    const nodes = [];
    const links = [];

    // Generar nodos y enlaces
    layerSizes.forEach((size, layerIndex) => {
        for (let i = 0; i < size; i++) {
            const node = {
                id: `${layerIndex}-${i}`,
                layer: layerIndex,
                x: (layerIndex + 1) * width / (layerSizes.length + 1),
                y: (i + 1) * height / (size + 1)
            };
            nodes.push(node);

            if (layerIndex > 0) {
                for (let j = 0; j < layerSizes[layerIndex - 1]; j++) {
                    const source = nodes.find(d => d.id === `${layerIndex - 1}-${j}`);
                    const target = node;
                    links.push({ source, target });
                }
            }
        }
    });

    // Dibujar enlaces
    svg.selectAll('.link')
        .data(links)
        .enter().append('line')
        .attr('class', 'link')
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y)
        .attr('stroke', 'black');

    // Dibujar nodos
    svg.selectAll('.node')
        .data(nodes)
        .enter().append('circle')
        .attr('class', 'node')
        .attr('r', 8)
        .attr('cx', d => d.x)
        .attr('cy', d => d.y)
        .attr('fill', 'black');
}



// WARNINGS 
function showWarning(title, info) {
    document.getElementById('warningMessage').style.display = 'block';
    document.getElementById('warningMessage-title').innerHTML = title;
    document.getElementById('warningMessage-info').innerHTML = "<p>" + info + "</p>";
}
function closeWarning() {
    document.getElementById('warningMessage').style.display = 'none';
}



addLayerInputs();