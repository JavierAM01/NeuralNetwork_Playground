let architecture = [];
let activationFunctions = [];
let inputArchitecture = [];
let nodes = [], links = [];

let exerciseType = "regression"; // clustering

let trainingDone = false;
let numberLayers = 0;
let numberInputs = 0;

let trainingOptimizer = "";
let trainingLoss = ""


window.addEventListener('DOMContentLoaded', (event) => {
    fetch('/static/data/header.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('header').innerHTML = data;
        });
});


document.addEventListener('DOMContentLoaded', function() {

    document.getElementById('typeTraining').addEventListener('input', function(event){
        if (this.value == "Regresión lineal" || this.value == "Regresión no lineal") {
            if (!(exerciseType == "regression")){
                while (numberLayers > 0){
                    removeLayerInputs();
                }
                exerciseType = "regression";
                numberInputs = 0;
                addLayerInputs();
            }
        }
        else {
            if (exerciseType == "regression"){
                while (numberLayers > 0){
                    removeLayerInputs();
                }
                exerciseType = "clustering";
                numberInputs = 0;
                addLayerInputs();
            }
        }
        console.log("exerciseType: ", exerciseType);
    });

    document.getElementById('createNetwork').addEventListener('click', function(event) {
        event.preventDefault();
        reset_window();
        updateArchitecture();
        if (architecture.length == 0){
            showWarning("ERROR", "Primero debes crear la arquitectura de la red!");
            return;
        }
        if (exerciseType == "regression"){
            if (architecture[architecture.length-1] != 1){
                showWarning("WARNING", "Es un ejercicio de regresión. Revisa el tamaño de la capa de salida para que tenga sentido el entrenamiento.");
                return;
            }
        }
        else {
            exercise = document.getElementById("typeTraining").value;
            if (exercise == "Clustering binario lineal" || exercise == "Clustering binario circular"){
                if (architecture[architecture.length-1] != 1){
                    showWarning("WARNING", "Es un ejercicio de clasificación binaria, 0 o 1. Revisa el tamaño de la capa de salida para que tenga sentido el entrenamiento.");
                    return;
                }
            }
            else { // Clustering de 3 grupos
                if (architecture[architecture.length-1] != 3){
                    showWarning("WARNING", "Es un ejercicio de clasificación en 3 grupos. Revisa el tamaño de la capa de salida para que tenga sentido el entrenamiento.");
                    return;
                }
            }
        }
        sendArchitectureBackEnd();
        drawNetwork();
    });

    document.getElementById('trainNetwork').addEventListener('click', function(event) {
        // Prevent the default form submission
        event.preventDefault();

        // checkear que se haya creado la red
        if (nodes.length == 0){
            showWarning("ERROR", "Antes de entrenar debes crear el perceptrón.");
            return;
        }

        // checkear que estén todos los datos bien y completos
        if ((document.getElementById("typeTraining").value == "") ||
                (document.getElementById("optimizerTraining").value == "") ||
                    (document.getElementById("lossTraining").value == "")) {
            showWarning("ERROR", "Algo falla en la configuración!");
            return;
        }

        // Send the FormData using fetch
        trainingDone = false;
        trainingOptimizer = document.getElementById("optimizerTraining").value;
        trainingLoss = document.getElementById("lossTraining").value;
        let info = {
            "ttype" : document.getElementById("typeTraining").value,
            "loss" : trainingLoss,
            "optim" : trainingOptimizer,
            "epochs" : document.getElementById("epochsTraining").value,
            "batch_size" : document.getElementById("batchSizeTraining").value,
        };
        console.log(info);
        animate(50);
        fetch('/neural_networks/perceptron/trainNetwork', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(info)
        })
        .then(() => {
            trainingDone = true;
        })
        .catch(
            error => console.error('Error:', error)
        );
    });

    // init window
    addLayerInputs();

});


document.addEventListener('DOMContentLoaded', function() {

    var socket = io('http://localhost:5000');

    socket.on('perceptron/training_plot', function(data) {
        console.log('Received plot:', data);
        drawGraph(data);
    });

    socket.on('perceptron/training_result_regression', function(data) {
        plot_regression(data);
    });

    socket.on('perceptron/training_result_clustering', function(data) {
        plot_clustering(data);
    });
});


function reset_window(){
    // variables globales
    trainingDone = false;
    // reseteo de la red
    nodes = [];
    links = [];
    // reseteo de previos resultados
    d3.select(`#graphSVG svg`).selectAll('*').remove();
    d3.select(`#plotSVG svg`).selectAll('*').remove();
}



function sendArchitectureBackEnd() {
    fetch('/neural_networks/perceptron/createNetwork', {  // Asegúrate de que la URL coincide con la del servidor Flask
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'  // Especifica que el tipo de contenido es JSON
        },
        body: JSON.stringify({ 
            "architecture": architecture,
            "activationFunctions": activationFunctions,
            "inputArchitecture": inputArchitecture,
        })  
    })
    .then(response => response.json())  // Convierte la respuesta del servidor de nuevo a JSON
    .then(data => console.log(data.info))  // Procesa la respuesta del servidor
    .catch(error => console.error('Error:', error));  // Maneja posibles errores
}





function randint(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}


function updateArchitecture() {
    architecture = Array.from(document.getElementsByName('layerSize')).map(input => parseInt(input.value));
    activationFunctions = Array.from(document.getElementsByName('layerActivationFunction')).map(input => input.value);
    inputArchitecture = Array.from(document.getElementsByName('inputLayer')).map(input => input.value);
    //architecture = [1,4,1];
    //activationFunctions = ["relu", "relu"];
}


function updateInputOptions(div, value_inputSize) {
    
    let N = parseInt(value_inputSize);

    // eliminar entradas si es necesario
    if (N < numberInputs){
        const dif = numberInputs - N;
        for (let i=0; i<dif; i++){
            var element = document.getElementById(`inputLayerDiv-${numberInputs-i-1}`);  
            if (element) { // por cómo esta definido tendría que existir aunque lo comprobamos por si a caso
                element.remove();
            }
        }
    }
    // añadir entradas si es necesario
    else { // if N >= numberInputs
        for (let i=numberInputs; i<N; i++){
            // crear div
            const divInputLayer = document.createElement("div");
            divInputLayer.style.padding = "0 0 0 15px";
            divInputLayer.id = `inputLayerDiv-${i}`;
            // crear input
            const inputInputLayer = document.createElement('select');
            inputInputLayer.id = `inputLayer-${i}`;
            inputInputLayer.name = "inputLayer";
            inputInputLayer.style.width = "50px";
            let optionsListInputs = null;
            if (exerciseType == "regression") {
                optionsListInputs = ["x","x^2"];
            } 
            else {
                optionsListInputs = ["x","x^2","y","y^2","xy"];
            } 
            optionsListInputs.forEach(optionValue => {
                const option = document.createElement('option');
                option.value = optionValue;
                option.textContent = optionValue;
                inputInputLayer.appendChild(option);
            });

            // añadir config
            divInputLayer.appendChild(document.createElement('br'));
            divInputLayer.appendChild(document.createTextNode(`- Entrada ${i+1}:\t`));
            divInputLayer.appendChild(inputInputLayer);
            div.appendChild(divInputLayer);
        }
    }

    // update 
    numberInputs = N;
}


function addLayerInputs() {
    numberLayers += 1;
    const layersConfig = document.getElementById('layersConfig');
        
    // Crear div padre
    let id_base = "bloqueLayerConfig-" + numberLayers;
    const bloque = document.createElement("div");
    bloque.id = id_base;
        
    // Crear div para los inputs
    const div = document.createElement("div");
    div.style = "padding: 10px 10px;";
        
    // Crear el input para la configuración
    const inputConfig = document.createElement('input');
    inputConfig.type = 'number';
    inputConfig.id = id_base + "-number";
    inputConfig.name = "layerSize";
    inputConfig.style.width = "50px";
    inputConfig.min = '1';
    inputConfig.max = '10';
    inputConfig.value = '1';

    // CAPA DE ENTRADA
    if (numberLayers == 1) {
        console.log("Creando capa de entrada...");
        div.appendChild(document.createTextNode("- Tamaño de entrada:\t"));
        div.appendChild(inputConfig);
        updateInputOptions(div, "1");

        // Añadir un listener para los cambios en la entrada
        inputConfig.addEventListener('input', function() {
            if (this.value != numberInputs) {
                updateInputOptions(div, this.value);
            }
        });
        console.log("Capa creada!");
    }
    // CAPAS INTERNAS
    else {
        div.appendChild(document.createTextNode("- Nº de nodos:\t"));
        div.appendChild(inputConfig);

        // Crear el input para el tipo de función de activación (en caso de no ser la capa de entrada)
        const inputType = document.createElement('select');
        inputType.id = id_base + "-type";
        inputType.name = "layerActivationFunction";
        inputType.style.width = "80px";
        
        const optionsListLayers = ["none","relu","sigmoid","softmax","tanh"];
        optionsListLayers.forEach(optionValue => {
            const option = document.createElement('option');
            option.value = optionValue;
            option.textContent = optionValue;
            inputType.appendChild(option);
        });
        
        div.appendChild(document.createElement('br'));
        div.appendChild(document.createTextNode("- Función de activación:\t"));
        div.appendChild(inputType);
    }

    // Configurar el bloque
    let ss = "Capa "+ numberLayers + ":";
    bloque.appendChild(document.createTextNode(ss));
    bloque.appendChild(document.createElement('br'));
    bloque.appendChild(div);
    bloque.appendChild(document.createElement('br'));

    // Añadir el bloque al window
    layersConfig.appendChild(bloque);
}


function removeLayerInputs() {
    if (numberLayers > 0) {
        let id = "bloqueLayerConfig-" + numberLayers;
        document.getElementById(id).remove();
        numberLayers = numberLayers - 1;
    }
}


function paint(layer, activations) {
    const svg = d3.select('#networkSVG svg');
    svg.selectAll('.node')
        .filter(d => d.layer === layer)
        .attr('fill', d => {
            let index = parseInt(d.id.split('-')[1]);
            return activations && activations[index] ? d3.interpolateRdYlBu(activations[index]) : 'red';
        });
}


function reset_paint(layer) {
    const svg = d3.select('#networkSVG svg');
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
        architecture.forEach((size, layerIndex) => {
            setTimeout(() => {
                const activations = getRandomList(size);
                paint(layerIndex, activations);
            }, aux + ms * layerIndex);

            setTimeout(() => {
                reset_paint(layerIndex);
                // Comprueba si aún necesita seguir animando
                if (layerIndex === architecture.length - 1 && !trainingDone) {
                    setTimeout(step, ms * architecture.length);  // Espera y vuelve a ejecutar
                }
            }, aux + ms * (layerIndex + 1));
        });
        //aux += ms * architecture.length;
    }

    step();  // Inicia la primera ejecución
}





function drawGraph(info) {
    const { accuracy, loss, val_accuracy, val_loss } = info;

    const dataAccuracy = [
        { values: accuracy, key: 'accuracy', color: 'steelblue' },
        { values: val_accuracy, key: 'val_accuracy', color: 'green' }
    ];

    const dataLoss = [
        { values: loss, key: 'loss', legend: 'Entrenamiento', color: 'red' },
        { values: val_loss, key: 'val_loss', legend: 'Validación', color: 'orange' }
    ];

    const epochs = d3.range(1, accuracy.length + 1);

    const graphID = `graphSVG`
    const svg = d3.select(`#${graphID} svg`);
    svg.selectAll('*').remove(); // Limpiar la visualización anterior

    const width = document.getElementById(graphID).clientWidth;
    const height = document.getElementById(graphID).clientHeight;

    const margin = { top: 40, right: 20, bottom: 30, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const xScale = d3.scaleLinear()
        .domain([1, accuracy.length])
        .range([0, innerWidth]);

    /*
    const yScaleAccuracy = d3.scaleLinear()
        .domain([Math.max(0, d3.min([...accuracy, ...val_accuracy])-0.1), 1])
        .range([innerHeight, 0]);
    */

    const yScaleLoss = d3.scaleLinear()
        .domain([d3.min([...loss, ...val_loss]), d3.max([...loss, ...val_loss])])
        .range([innerHeight, 0]);

    /*
    const line = d3.line()
        .x((d, i) => xScale(i + 1))
        .y((d, i) => yScaleAccuracy(d));
    */

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
        .text(trainingLoss);

/*
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
*/

    // Gráfica de Loss
    const gLoss = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`); //.attr('transform', `translate(${width / 2 + margin.left},${margin.top})`);

    gLoss.append('g')
        .call(d3.axisLeft(yScaleLoss));

    const xticks = d3.range(0, accuracy.length, Math.max(1, Math.floor(accuracy.length / 20)));
    gLoss.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale).tickValues(xticks));

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
        .attr('transform', `translate(${innerWidth - 100},${margin.top})`);  // width / 2 + margin.left + 20

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
            .attr('font-size', '12px')
            .attr('text-anchor', 'start')
            .text(dataset.legend);
    });
}




function drawNetwork() {
    const layerSizes = architecture;
    const svg = d3.select('#networkSVG svg');
    svg.selectAll('*').remove(); // Limpiar la visualización anterior

    const width = document.getElementById("networkSVG").clientWidth; 
    const height = document.getElementById("networkSVG").clientHeight;

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
                    const source = nodes.find(d => d.id === `${layerIndex-1}-${j}`);
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

    // Dibujar nodos y color basado en activaciones
    svg.selectAll('.node')
        .data(nodes)
        .enter().append('circle')
        .attr('class', 'node')
        .attr('r', 5)
        .attr('cx', d => d.x)
        .attr('cy', d => d.y)
        .attr('fill', 'black');
}



function plot_regression(info) {
    const { X, Y, rango, predictions } = info;

    const svg = d3.select('#plotSVG svg');
    svg.selectAll('*').remove(); // Limpiar la visualización anterior
    const tooltip = d3.select('.tooltip');

    const width = document.getElementById("plotSVG").clientWidth;
    const height = document.getElementById("plotSVG").clientHeight;

    const margin = { top: 40, right: 20, bottom: 30, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Añadir título
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', margin.top / 2)
        .attr('text-anchor', 'middle')
        .attr('font-size', '16px')
        .attr('font-weight', 'bold')
        .text("Resultados");

    const xScale = d3.scaleLinear()
        .domain([rango[0], rango[1]])
        .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
        .domain([d3.min(Y), d3.max(Y)])
        .range([innerHeight, 0]);

    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    g.append('g')
        .call(d3.axisLeft(yScale));

    g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale));

    // Plot training data points
    g.selectAll('.point')
        .data(X)
        .enter().append('circle')
        .attr('class', 'point')
        .attr('cx', d => xScale(d))
        .attr('cy', (d, i) => yScale(Y[i]))
        .attr('r', 4)
        .attr('fill', 'blue')
        .attr('opacity', 0.7)
        .on('mouseover', function(event, d) {
            tooltip.style('visibility', 'visible')
                .html(`X: ${d}<br>Y: ${Y[X.indexOf(d)]}`);
        })
        .on('mousemove', function(event) {
            tooltip.style('top', (event.pageY - 10) + 'px')
                .style('left', (event.pageX + 10) + 'px');
        })
        .on('mouseout', function() {
            tooltip.style('visibility', 'hidden');
        });

    // Plot predictions line
    const line = d3.line()
        .x((d, i) => xScale(rango[0] + (i / 99) * (rango[1] - rango[0])))
        .y(d => yScale(d));

    g.append('path')
        .datum(predictions)
        .attr('fill', 'none')
        .attr('stroke', 'black')
        .attr('stroke-width', 2)
        .attr('d', line);

    // Add legend
    const legend = svg.append('g')
        .attr('transform', `translate(${margin.left + 20},${margin.top})`);   // inerWidth - 100 -> derecha

    const legendData = [
        { color: 'blue', text: 'Training data' },
        { color: 'black', text: 'Predictions' }
    ];

    legendData.forEach((d, i) => {
        const legendRow = legend.append('g')
            .attr('transform', `translate(0, ${i * 20})`);

        legendRow.append('rect')
            .attr('width', 10)
            .attr('height', 10)
            .attr('fill', d.color);

        legendRow.append('text')
            .attr('x', 20)
            .attr('y', 10)
            .attr('text-anchor', 'start')
            .text(d.text);
    });
}



async function perceptronPredict(cuadricula_X, cuadricula_Y) {
    let type = document.getElementById("typeTraining").value;
    let extra = type == "Clustering binario lineal" ? "c2" : (type == "Clustering binario circular" ? "c2c" : "c3");
    const response = await fetch(`/perceptron/predict_${extra}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ X: cuadricula_X, Y: cuadricula_Y })
    });
    const data = await response.json();
    return data.class;
}

async function plot_clustering(info) {
    const { X, Y, Z, rango } = info;

    const svg = d3.select('#plotSVG svg');
    svg.selectAll('*').remove(); // Limpiar la visualización anterior
    const tooltip = d3.select('.tooltip');

    const width = document.getElementById("plotSVG").clientWidth;
    const height = document.getElementById("plotSVG").clientHeight;

    const margin = { top: 40, right: 20, bottom: 30, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const colors = {"0":"black", "1":"blue", "2":"green"};

    // Añadir título
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', margin.top / 2)
        .attr('text-anchor', 'middle')
        .attr('font-size', '16px')
        .attr('font-weight', 'bold')
        .text("Resultados");

    const xScale = d3.scaleLinear()
        .domain([rango[0], rango[1]])
        .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
        .domain([d3.min(Y), d3.max(Y)])
        .range([innerHeight, 0]);

    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    g.append('g')
        .call(d3.axisLeft(yScale));

    g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale));

    // Crear una cuadrícula y clasificar cada celda
    const gridSize = 5; // Tamaño de cada celda de la cuadrícula
    const xStep = (rango[1] - rango[0]) / (innerWidth / gridSize);
    const yStep = (d3.max(Y) - d3.min(Y)) / (innerHeight / gridSize);

    let cuadricula_X = [];
    let cuadricula_Y = [];
    for (let x = rango[0]; x < rango[1]; x += xStep) {
        for (let y = d3.min(Y); y < d3.max(Y); y += yStep) {
            cuadricula_X.push(x);
            cuadricula_Y.push(y);
        }
    }

    const classPredictions = await perceptronPredict(cuadricula_X, cuadricula_Y);
    console.log(classPredictions);
    for (let i=0; i<classPredictions.length; i++){
        let x = cuadricula_X[i];
        let y = cuadricula_Y[i];
        let c = classPredictions[i];
        console.log((x,y,c));
        g.append('rect')
            .attr('x', xScale(x))
            .attr('y', yScale(y))
            .attr('width', gridSize)
            .attr('height', gridSize)
            .attr('fill', colors[c])
            .attr('opacity', 0.3); // Ajusta la opacidad según sea necesario
    }


    // Plot training data points
    g.selectAll('.point')
        .data(Z)
        .enter().append('circle')
        .attr('class', 'point')
        .attr('cx', (d, i) => xScale(X[i]))
        .attr('cy', (d, i) => yScale(Y[i]))
        .attr('r', 4)
        .attr('fill', d => colors[d])
        .attr('opacity', 0.8)
        .on('mouseover', function(event, d) {
            tooltip.style('visibility', 'visible')
                .html(`Clase: ${d}`);
        })
        .on('mousemove', function(event) {
            tooltip.style('top', (event.pageY - 10) + 'px')
                .style('left', (event.pageX + 10) + 'px');
        })
        .on('mouseout', function() {
            tooltip.style('visibility', 'hidden');
        });
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



