from app import create_app, create_logger
from flask import render_template, request, jsonify
from flask_socketio import SocketIO
import os, time
import numpy as np

from app.scripts import perceptron, mnist, compareoptimizers, dogcat

app = create_app()
socketio = SocketIO(app, cors_allowed_origins="*")

logger = create_logger()

# global variables
NETWORKS = dict()
is_a_new_training = dict()
INPUT_ARCHITECTURE = dict() 


def cleanFolder(folder_path):
    for filename in os.listdir(folder_path):
        file_path = os.path.join(folder_path, filename)
        try:
            os.remove(file_path)  
        except Exception as e:
            logger.debug('Failed to delete %s. Reason: %s' % (file_path, e))


@app.route('/')
def render_template_home():
    return render_template('home.html')

@app.route('/contact')
def render_template_contact():
    return render_template('contact.html')


""" ------------------------------ THEORY ----------------------------------"""

@app.route('/theory/history')
def render_template_history():
    return render_template("theory/history.html")

@app.route('/theory/lossfunctions')
def render_template_lossfunctions():
    return render_template("theory/loss.html")


""" ------------------------------ EXERCISES ----------------------------------"""

@app.route('/neural_networks/perceptron')
def render_template_perceptron():
    return render_template("neural_networks/perceptron.html")

@app.route('/neural_networks/mnist')
def render_template_mnist():
    return render_template("neural_networks/mnist.html")

@app.route('/neural_networks/compareoptimizers')
def render_template_compareoptimizers():
    return render_template("neural_networks/compareoptimizers.html")

@app.route('/neural_networks/dogcat')
def render_template_dogcat():
    return render_template("neural_networks/dogcat.html")


""" ------------------------------ FUNCTIONS ----------------------------------"""

""" ------------------------------ Perceptron ----------------------------------"""

@app.route('/neural_networks/perceptron/createNetwork', methods=['POST'])
def create_neural_network_perceptron():
    data = request.get_json()
    architecture = data["architecture"]
    activationFunctions = data["activationFunctions"]
    INPUT_ARCHITECTURE["perceptron"] = data["inputArchitecture"]
    model = perceptron.createNetworkPerceptron(architecture, activationFunctions)
    is_a_new_training["perceptron"] = True
    NETWORKS["perceptron"] = model
    info = "Network created. Architecture: " + str(architecture) + "\nActivation Functions: " + str(activationFunctions)
    return jsonify({"info":info})

@app.route('/neural_networks/perceptron/trainNetwork', methods=['POST'])
def train_neural_network_perceptron():
    data = request.get_json()
    perceptron.train(
        NETWORKS["perceptron"], 
        inputArchitecture = INPUT_ARCHITECTURE["perceptron"],
        socketio = socketio,
        is_a_new_training = is_a_new_training["perceptron"],
        ttype = data["ttype"],
        optim = data["optim"],
        loss = data["loss"],
        epochs = int(data["epochs"]),
        batch_size = int(data["batch_size"])
    )
    is_a_new_training["perceptron"] = False
    return jsonify({"info":"Training done!"})

@app.route('/perceptron/predict_c2', methods=['POST'])
def predict_perceptron_c2():
    data = request.get_json()
    X, Y = data['X'], data['Y']
    inputX = perceptron.preprocess_XY(X, Y, INPUT_ARCHITECTURE["perceptron"])
    predictions = NETWORKS["perceptron"](inputX).numpy().reshape(-1)
    clases = [("1" if pred > 0.5 else "0") for pred in predictions]
    return jsonify({'class': clases})

@app.route('/perceptron/predict_c2c', methods=['POST'])
def predict_perceptron_c2c():
    data = request.get_json()
    X, Y = data['X'], data['Y']
    inputX = perceptron.preprocess_XY(X, Y, INPUT_ARCHITECTURE["perceptron"])
    predictions = NETWORKS["perceptron"](inputX).numpy().reshape(-1)
    clases = [("1" if pred > 0.5 else "0") for pred in predictions]
    return jsonify({'class': clases})

@app.route('/perceptron/predict_c3', methods=['POST'])
def predict_perceptron_c3():
    data = request.get_json()
    X, Y = data['X'], data['Y']
    inputX = perceptron.preprocess_XY(X, Y, INPUT_ARCHITECTURE["perceptron"])
    predictions = NETWORKS["perceptron"](inputX).numpy()
    clases = [str(np.argmax(pred)) for pred in predictions]
    return jsonify({'class': clases})

""" ------------------------------ MNIST ----------------------------------"""

@app.route('/neural_networks/mnist/createNetwork', methods=['POST'])
def  create_neural_network_mnist():
    is_a_new_training["mnist"] = True
    architecture = request.get_json()["architecture"]
    model = mnist.createNetworkMNIST(architecture)
    NETWORKS["mnist"] = model
    info = "CNN Network created. Architecture:\n" + str(architecture)
    return jsonify({"info":info})

@app.route('/neural_networks/mnist/trainNetwork', methods=['POST'])
def train_neural_network_mnist():
    data = request.get_json()
    optim = data["optim"]
    loss = data["loss"]
    epochs = int(data["epochs"])
    batch_size = int(data["batch_size"])
    data = mnist.trainMNIST(NETWORKS["mnist"], socketio, is_a_new_training["mnist"], optim=optim, loss=loss, epochs=epochs, batch_size=batch_size)
    is_a_new_training["mnist"] = False
    return jsonify(data)

@app.route('/neural_networks/mnist/playNetwork', methods=['POST'])
def play_neural_network_mnist():
    x = request.get_json()["input"]
    print("KEYS:", NETWORKS.keys())
    pred, prob = mnist.predict(NETWORKS["mnist"], x)
    return jsonify({ "pred" : pred, "prob" : prob })



""" ------------------------------ COMPARE OPTIMIZERS ----------------------------------"""

@app.route('/neural_networks/compareoptimizers/createNetwork', methods=['POST'])
def  create_neural_network_compareoptimizers():
    is_a_new_training["compareoptimizers"] = True
    architecture = request.get_json()["architecture"]
    # crear 2 modelos iguales ya que los vamos a entrenar con distintos optimizadores y queremos comparar
    model1 = compareoptimizers.createNetworkMNIST(architecture)
    model2 = compareoptimizers.createNetworkMNIST(architecture)
    NETWORKS["compareoptimizers"] = [model1, model2]
    info = "CNN Network created. Architecture:\n" + str(architecture)
    return jsonify({"info":info})

@app.route('/neural_networks/compareoptimizers/trainNetwork', methods=['POST'])
def train_neural_network_compareoptimizers():
    data = request.get_json()
    optim1 = data["optim1"]
    optim2 = data["optim2"]
    epochs = int(data["epochs"])
    batch_size = int(data["batch_size"])
    logger.debug(f"\n\n\nepochs={epochs}, batch_size={batch_size}\n\n\n")
    try:
        logger.debug("VAMOS A ENTRENAR EL MODELO!")
        compareoptimizers.trainMNIST(NETWORKS["compareoptimizers"], socketio, is_a_new_training["compareoptimizers"], optims=[optim1, optim2], epochs=epochs, batch_size=batch_size)
        error = "OK"
    except Exception as e:
        logger.debug(f"Error: {e}")
        data = {}
        error = e
    is_a_new_training["compareoptimizers"] = False
    return jsonify({"error": error})


""" ------------------------------ DOG vs CAT ----------------------------------"""


@app.route('/neural_networks/dogcat/loadImage', methods=['POST'])
def loadImage_neural_network_dogcat():
    if 'image' not in request.files: # este es el nombre del input
        return 'No file part', 400
    file = request.files['image']
    if file.filename == '':
        return 'No selected file', 400
    if file:
        aux = file.filename.split(".")
        filename = aux[0] + "_" + str(time.time()) + "." + aux[1]   # unique filename
        folder_path = "app/static/images/input"
        file_path = os.path.join(folder_path, filename)
        cleanFolder(folder_path)
        file.save(file_path)
        NETWORKS["dogcat_filepath"] = file_path
        NETWORKS["dogcat_filename"] = filename
    return jsonify({"filename":filename})

@app.route('/neural_networks/dogcat/playNetwork', methods=['POST'])
def play_neural_network_dogcat():
    pred, prob = dogcat.predict(NETWORKS["dogcat_filepath"])
    return jsonify({
        "filename": NETWORKS["dogcat_filename"],
        "pred" : pred,
        "prob" : prob,
        "info" : "Modelo cat-dog ejecutado correctamente!",
    })

@app.route('/neural_networks/dogcat/printSummary', methods=['POST'])
def print_summary_neural_network_dogcat():
    n = int(request.get_json()["n"])
    data = dogcat.get_summary(n)
    return jsonify(data)




if __name__ == "__main__":
    socketio.run(app, debug=True)
