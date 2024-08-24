from tensorflow.keras import Sequential
from tensorflow.keras.layers import Dense, Conv2D, MaxPooling2D, AveragePooling2D, Flatten

from tensorflow.keras.datasets import mnist
from tensorflow.keras.utils import to_categorical
from keras.callbacks import Callback

import io
from contextlib import redirect_stdout

import matplotlib.pyplot as plt
import os, time
from flask import jsonify

from app import create_logger





logger = create_logger()


"""
    Ejemplo de uso:

    architecture = [(0, 3), (1, 2), (0, 3), (2, 2)]
    input_shape = (64, 64, 3)  # Tamaño de la imagen de entrada: 64x64 con 3 canales (RGB)
    model = createCustomCNN(architecture, input_shape)
    model.summary()
"""
def createNetworkMNIST(architecture):
    input_shape = (28,28,1)
    model = Sequential()
    for layer in architecture:
        layer_type, kernel_size, n_filters = tuple(layer)
        if layer_type == 0:  # Convolutional layer
            # Asumimos que estamos trabajando con imágenes RGB y empezamos con 32 filtros.
            # Podemos aumentar la cantidad de filtros o hacerla configurable si es necesario.
            model.add(Conv2D(filters=n_filters, kernel_size=(kernel_size, kernel_size), 
                             activation='relu', padding='same', input_shape=input_shape))
            input_shape = None  # Después de la primera capa, no necesitamos especificar input_shape
        elif layer_type == 1:  # Average pooling layer
            model.add(AveragePooling2D(pool_size=(kernel_size, kernel_size)))
        elif layer_type == 2:  # Max pooling layer
            model.add(MaxPooling2D(pool_size=(kernel_size, kernel_size)))

    # Añadir una capa Flatten y una Dense para la clasificación al final
    model.add(Flatten())
    model.add(Dense(10, activation='softmax'))  # Asumimos una salida de clasificación de 10 clases

    return model





"""
    PARA EL TRAINING DE LA RED
"""
# Cargar el conjunto de datos MNIST
(train_images, train_labels), (test_images, test_labels) = mnist.load_data()

# Preprocesar los datos
train_images = train_images.reshape((60000, 28, 28, 1)).astype('float32') / 255
test_images = test_images.reshape((10000, 28, 28, 1)).astype('float32') / 255
train_labels = to_categorical(train_labels)
test_labels = to_categorical(test_labels)

# para el logging
log_history = [
    {
        "accuracy" : [],
        "loss" : [],
        "val_accuracy" : [],
        "val_loss" : [],
        "times" : []
    }, 
    {
        "accuracy" : [],
        "loss" : [],
        "val_accuracy" : [],
        "val_loss" : [],
        "times" : []
    }
]


def reset_log_history():
    log_history[0]["accuracy"]     = []
    log_history[0]["loss"]         = []
    log_history[0]["val_accuracy"] = []
    log_history[0]["val_loss"]     = []
    log_history[0]["times"]        = []
    log_history[1]["accuracy"]     = []
    log_history[1]["loss"]         = []
    log_history[1]["val_accuracy"] = []
    log_history[1]["val_loss"]     = []
    log_history[1]["times"]        = []


def create_and_clean_path():
    
    # Verificar y crear el directorio si es necesario
    directory = "app/static/images/plot"
    # Verifica que el directorio existe
    if not os.path.exists(directory):
        os.makedirs(directory)

    # Itera sobre todos los archivos en el directorio para eliminarlos
    for filename in os.listdir(directory):
        file_path = os.path.join(directory, filename)
        try:
            # Si es un archivo, lo elimina
            if os.path.isfile(file_path):
                os.unlink(file_path)
        except Exception as e:
            logger.debug(f'Error al eliminar {file_path}. Razón: {e}')


def update_logHistory(logs, n):
    global log_history
    for key, value in logs.items():
        if key in log_history[n]:
            log_history[n][key].append(value)
        else:
            log_history[n][key] = [value]

"""
def createPlot(n):
    global log_history
    # Crear figuras y ejes
    fig, (ax_loss, ax_ac) = plt.subplots(1,2, figsize=(20, 8))
    
    # Plotting
    for key in log_history[n].keys():
        if key == "times":
            continue
        elif "loss" in key:
            ax_loss.plot(log_history[n][key], label=key, linewidth=3)
        else:
            ax_ac.plot(log_history[n][key], label=key, linewidth=3)

    # Configurar títulos y leyendas
    ax_loss.set_title("Loss", fontsize=40)
    ax_ac.set_title("Accuracy", fontsize=40)
    ax_loss.legend(fontsize=30)
    ax_ac.legend(fontsize=30)
    
    # Guardar figuras
    unique_filename = f"current_log{n}_{time.time()}.png"
    directory = "app/static/images/plot"
    unique_path = f"{directory}/{unique_filename}"
    fig.savefig(unique_path)

    # Cerrar figuras para liberar memoria
    plt.close(fig)
    logger.debug("PLOT CREADO CORRECTAMENTE!\n")

    return unique_filename
"""

"""
def plot_comparison():
    global log_history
    paths = []
    for key in log_history[0].keys():
        fig, ax = plt.subplots(1,1, figsize=(20, 8))
        value1 = log_history[0][key]
        value2 = log_history[1][key]
        if key == "times":
            value1 = [value1[i+1] - value1[i] for i in range(len(value1)-1)]
            value2 = [value2[i+1] - value2[i] for i in range(len(value2)-1)]
        # plot
        ax.plot(value1, label="Optim 1", linewidth=3)
        ax.plot(value2, label="Optim 2", linewidth=3)
        # config
        ax.set_title(key, fontsize=40)
        ax.legend(fontsize=30)
        # Guardar figuras
        unique_filename = f"current_log_{key}_{time.time()}.png"
        directory = "app/static/images/plot"
        unique_path = f"{directory}/{unique_filename}"
        fig.savefig(unique_path)
        paths.append(unique_path[3:])  # quitar "app" para el path desde html
        plt.close(fig)
    return paths
"""


def preprocess_logs(logs):
    for key in logs.keys():
        logs[key] = round(logs[key], 4)
    return logs

def trainMNIST(models, socketio, is_a_new_training, optims, epochs=10, batch_size=128):

    global log_history

    model1, model2 = models[0], models[1]
    optim1, optim2 = optims[0], optims[1]

    # comprobar si es un entrenamiento sobre otro anterior
    if is_a_new_training:
        reset_log_history()
    
    # Compilar el modelo
    model1.compile(optimizer=optim1, loss='categorical_crossentropy', metrics=['accuracy'])
    model2.compile(optimizer=optim2, loss='categorical_crossentropy', metrics=['accuracy'])

    # Crear callbacks
    class TrainingCallback_logger(Callback):
        def __init__(self, n):
            self.n = n
        def on_epoch_end(self, epoch, logs=None):
            log_history[self.n]["times"].append(time.time())
            logs = preprocess_logs(logs) or {}
            logger.debug(f"\nEpoch {epoch} logs: {logs}")
            socketio.emit('compareoptimizers/training_log', {'epoch': epoch, 'logs': logs, "n": self.n + 1})

    class TrainingCallback_plot(Callback):
        def __init__(self, n):
            self.n = n
        def on_epoch_end(self, epoch, logs=None):
            logs = preprocess_logs(logs) or {}
            if logs != {}:
                logger.debug("VAMOS A CREAR EL PLOT")
                update_logHistory(logs, self.n)
                #unique_filename = createPlot(self.n)
                #socketio.emit('compareoptimizers/training_plot', {'filepath': f'/static/images/plot/{unique_filename}', "n": self.n + 1})
                info = {
                    "accuracy" : log_history[self.n]["accuracy"], 
                    "loss" : log_history[self.n]["loss"], 
                    "val_accuracy" : log_history[self.n]["val_accuracy"], 
                    "val_loss" : log_history[self.n]["val_loss"], 
                    "n": self.n
                }
                socketio.emit('compareoptimizers/training_plot', info)

    # Entrenar el modelos
    create_and_clean_path()
    log_history[0]["times"].append(time.time())
    logger.debug("MODELO 1")
    model1.fit(train_images, train_labels, epochs=epochs, batch_size=batch_size, 
            validation_data=(test_images, test_labels), 
            callbacks=[TrainingCallback_plot(0)] 
    )
    socketio.emit('compareoptimizers/logger2', {"info": "Pasando al segundo logger"})
    log_history[1]["times"].append(time.time())
    logger.debug("MODELO 2")
    model2.fit(train_images, train_labels, epochs=epochs, batch_size=batch_size, 
            validation_data=(test_images, test_labels), 
            callbacks=[TrainingCallback_plot(1)] 
    )

    """
    # guardar comparaciones
    paths = plot_comparison()
    socketio.emit('compareoptimizers/comparison', {
        "info": "Entrenamientos termindos, creando comparaciones",
        "paths": paths,
    })

    # Conseguir el resumen del modelo
    buffer = io.StringIO()
    with redirect_stdout(buffer):
        model1.summary()
    summary = buffer.getvalue()
    l = summary.split("\n Total params")
    top = l[0].split("\n")
    logger.debug(l)
    footer = ("Total params" + l[1]).replace("\n", "<br>")
    l_aux = [top[i] for i in range(len(top)) if i % 2 == 0]
    model_name = "<b>" + l_aux[0] + "<b>"
    contents = "<br>".join(l_aux[2:])  # 0 -> model_name, 1 -> header

    # Evaluar el modelo
    return {
        "model_name" : model_name, 
        "contents" : contents, 
        "footer" : footer,
    }
    """