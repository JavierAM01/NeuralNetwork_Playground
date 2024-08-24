from tensorflow.keras import Sequential
from tensorflow.keras.layers import Dense, Conv2D, MaxPooling2D, AveragePooling2D, Flatten


from tensorflow.keras.datasets import mnist
from tensorflow.keras.utils import to_categorical
from keras.callbacks import Callback

import io
from contextlib import redirect_stdout

import matplotlib.pyplot as plt
import os, time
import numpy as np






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


def predict(model, x):
    input_shape = (1,28,28,1)
    x = np.array(x).reshape(input_shape)
    predictions = model(x)[0].numpy()
    pred = int(np.argmax(predictions))  # evitar números en tensores para pasarlos por el backend 
    prob = float(round(predictions[pred], 2))
    return pred, prob



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
log_history = {
    "accuracy" : [],
    "loss" : [],
    "val_accuracy" : [],
    "val_loss" : [],
}

def reset_log_history():
    log_history["accuracy"] = []
    log_history["loss"] = []
    log_history["val_accuracy"] = []
    log_history["val_loss"] = []

def preprocess_logs(logs):
    for key in logs.keys():
        logs[key] = round(logs[key], 4)
    return logs

def update_logHistory(logs):
    global log_history
    for key, value in logs.items():
        if key in ["accuracy", "loss", "val_accuracy", "val_loss", "times"]:
            log_history[key].append(value)
        else:
            log_history[key] = [value]

def get_summary(model):
    buffer = io.StringIO()
    with redirect_stdout(buffer):
        model.summary()
    summary = buffer.getvalue()
    l = summary.split("\n Total params")

    footer = ("Total params" + l[1]).replace("\n", "<br>")
    top = l[0].split("\n")

    while "Model:" not in top[0]:
        top = top[1:]
    model_name = "<b>" + top[0] + "<b>"

    while "Param" not in top[0]:
        top = top[1:]
    top = top[2:]
    
    key = "─"
    content_rows = [row for row in top if key not in row]
    contents = "<br>".join(content_rows)

    return {
        "model_name" : model_name, 
        "contents" : contents, 
        "footer" : footer
    }

def trainMNIST(model, socketio, is_a_new_training, optim="adam", loss="categorical_crossentropy", epochs=10, batch_size=128):

    # comprobar si es un entrenamiento sobre otro anterior
    if is_a_new_training:
        reset_log_history()
    
    # Compilar el modelo
    model.compile(optimizer=optim, loss=loss, metrics=['accuracy'])

    # Crear callbacks
    class TrainingCallback_plot(Callback):
        def on_epoch_end(self, epoch, logs=None):
            logs = preprocess_logs(logs) or {}
            if logs != {}:
                update_logHistory(logs)
                info = {
                    "accuracy" : log_history["accuracy"], 
                    "loss" : log_history["loss"], 
                    "val_accuracy" : log_history["val_accuracy"], 
                    "val_loss" : log_history["val_loss"], 
                }
                socketio.emit('mnist/training_plot', info)

    # Entrenar el modelo
    model.fit(train_images, train_labels, epochs=epochs, batch_size=batch_size, 
            validation_data=(test_images, test_labels), 
            callbacks=[TrainingCallback_plot()]
    )

    # Conseguir el resumen del modelo
    data = get_summary(model)

    # Evaluar el modelo
    test_loss, test_acc = model.evaluate(test_images, test_labels)
    return {
        "test_loss" : test_loss, 
        "test_acc" : test_acc, 
        **data
    }