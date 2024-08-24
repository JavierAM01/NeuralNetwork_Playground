
let architecture = [2,1,5,3];
let nodes = [], links = [];
let imageSelected = false;


window.addEventListener('DOMContentLoaded', (event) => {
    fetch('/static/data/header.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('header').innerHTML = data;
        });
});


document.addEventListener('DOMContentLoaded', function() {

    document.getElementById('imageInput').addEventListener('change', function() {
        if (this.files && this.files[0]) {
            // Un archivo ha sido seleccionado, muestra el botón de play
            imageSelected = true;
            let filename = document.getElementById("imageInput").files[0].name;
            
            // Send the FormData using fetch
            const form = document.getElementById('imageForm');
            const formData = new FormData(form);
            fetch('/neural_networks/dogcat/loadImage', {
                method: 'POST',
                body: formData
            })
            .then(
                response => response.json())
            .then(data => {
                // show image
                let imagePath = "/static/images/input/" + data.filename;
                console.log("Image saved at: " + imagePath);
                document.getElementById("imageFrame").src = imagePath;
                console.log("Image ", filename, " loaded!");
            })
            .catch(
                error => console.error('Error:', error)
            );
        } else {
            // No hay ningún archivo seleccionado, oculta el botón de play
            imageSelected = false;
        }
    });

    document.getElementById('playButton').addEventListener('click', function(event) {
        // Prevent the default form submission
        event.preventDefault();
        
        // checkear que se haya insertado la imagen
        if (!imageSelected){
            showWarning("ERROR", "No hay ninguna imagen seleccionada!");
            return;
        }

        // Send the FormData using fetch
        fetch('/neural_networks/dogcat/playNetwork', {
            method: 'POST',
        })
        .then(
            response => response.json())
        .then(data => {
            console.log(data.info);
            let ms = 50, times = 10;
            animate(ms, times);
            setTimeout(() => {

                let info = "Clasificación: " + data.pred + "<br>Probabilidad: " + data.prob; 
                showWarning("PREDICCIÓN", info);

            }, times * ms * architecture.length );
        })
        .catch(
            error => console.error('Error:', error)
        );
    });

    document.getElementById("clearBoard").addEventListener('click', function(event) {
        document.getElementById("imageFrame").src = "";
    });

    drawNetwork();
    print_summary(1);
    print_summary(2);
});

function print_summary(n){

    let aux = (n == 1) ? '' : '2';
    
    // Send the FormData using fetch
    fetch('/neural_networks/dogcat/printSummary', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'  // Especifica que el tipo de contenido es JSON
        },
        body: JSON.stringify({ "n": n })
    })
    .then(
        response => response.json())
    .then(data => {

        document.getElementById(`summary${aux}_model`).innerHTML = data.model_name;
        let rows = data.contents.split("<br>");
        for (let i=0; i<rows.length; i++) {
            let row_info = rows[i].split("│");
            info = {
                "layerType"  : row_info[1],
                "outputShape": row_info[2],
                "paramCount" : row_info[3],
            };
            let is_last = (i === rows.length-1);
            let next_empty = false;
            if (!is_last) {
                next_empty = ("" == rows[i+1].split("│")[2].trim());
            }
            addTableRow(info, is_last, next_empty, aux);
        }
        document.getElementById(`summary${aux}_info_footer`).innerHTML = data.footer;

    })
    .catch(
        error => console.error('Error:', error)
    );
}

function selectImage() {
    document.getElementById("imageInput").click();
}


function randint(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}


function updateArchitecture() {
    architecture = Array.from(document.getElementsByName('layerSize')).map(input => parseInt(input.value));
}


function clearPreviousNetwork() {
    nodes = [];
    links = [];
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
        .attr('fill', 'var(--color-2)');
}


function getRandomList(size) {
    let arr = [];
    for (let i = 0; i < size; i++) {
        arr.push(Math.random());
    }
    return arr;
}

function animate(ms, times) { // ms = 50 o 250
    let aux = 0;
    for (let i = 0; i < times; i++){
        architecture.forEach((size, layerIndex) => {
            setTimeout(() => {
                const activations = getRandomList(size);
                paint(layerIndex, activations);
            }, aux + ms * layerIndex); // X ms * índice de la capa´(para dar un efecto de continuidad)
            setTimeout(() => reset_paint(layerIndex), 
                                    aux + ms * (layerIndex+1) ); // ir borrando el anterior para que parzca que avanza el color
        });
        aux = aux + ms * architecture.length;
    }
}


function drawNetwork() {
    const layerSizes = architecture;
    const svg = d3.select('svg');
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
        .attr('r', 10)
        .attr('cx', d => d.x)
        .attr('cy', d => d.y)
        .attr('fill', 'black');
}



// Función para agregar una línea de contenido a la tabla
/*let info = {
    layerType: 'Dense',
    outputShape: '(None, 64)',
    paramCount: '640'
};*/
function addTableRow(layerInfo, is_last, next_empty, aux) {
    var tableRow = document.createElement('div');
    tableRow.style.display = 'flex';
    tableRow.style.borderBottom = is_last ? '2px solid gray' : (next_empty ? '0px solid gray' : '1px solid gray');
    tableRow.style.padding = next_empty ? '15px 5px 0 5px' : '15px 5px';

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

    document.getElementById(`summary${aux}_info_content`).appendChild(tableRow);
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





