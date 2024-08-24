from tensorflow.keras import Sequential
from tensorflow.keras.layers import Dense, Activation
from keras.callbacks import Callback

from app import create_logger





logger = create_logger()



"""
    Ejemplo de uso:
    
    architecture = [10, 20, 5, 1]  # Ejemplo de arquitectura: entrada de 10, capas intermedias de 20 y 5, salida de 1
    model = createNetworkPerceptron(architecture)
"""
def createNetworkPerceptron(architecture, activativation_functions):
    if len(architecture) < 2:
        raise ValueError("Architecture not possible")

    model = Sequential()
    # Añadir la primera capa con la entrada adecuada
    model.add(Dense(units=architecture[1], input_dim=architecture[0]))
    if activativation_functions[0] != "none": 
        model.add(Activation(activativation_functions[0]))

    # Añadir capas intermedias
    for i in range(2, len(architecture) - 1):
        model.add(Dense(units=architecture[i]))
        if activativation_functions[i-1] != "none":
            model.add(Activation(activativation_functions[i-1]))

    # Añadir la capa de salida
    model.add(Dense(units=architecture[-1]))
    if activativation_functions[-1] != "none":
        model.add(Activation(activativation_functions[-1]))

    return model




# --------------------------------------------------------------------------------------------------------




import matplotlib.pyplot as plt
import numpy as np
import os
import time

np.random.seed(45)



# para el logging
log_history = {
    "accuracy" : [],
    "loss" : [],
    "val_accuracy" : [],
    "val_loss" : [],
    "times" : []
}



def reset_log_history():
    log_history["accuracy"]     = []
    log_history["loss"]         = []
    log_history["val_accuracy"] = []
    log_history["val_loss"]     = []
    log_history["times"]        = []


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


def update_logHistory(logs):
    global log_history
    for key, value in logs.items():
        if key in ["accuracy", "loss", "val_accuracy", "val_loss", "times"]:
            log_history[key].append(value)
        else:
            log_history[key] = [value]


def preprocess_logs(logs):
    for key in logs.keys():
        logs[key] = round(logs[key], 4)
    return logs


def train_test_split(X, y, test_size=0.2, random_state=None):
    if random_state:
        np.random.seed(random_state)
    
    # Barajar los índices de los datos
    indices = np.arange(X.shape[0])
    np.random.shuffle(indices)
    
    # Calcular el tamaño del conjunto de validación
    test_size = int(len(indices) * test_size)
    
    # Dividir los índices en conjuntos de entrenamiento y validación
    test_indices = indices[:test_size]
    train_indices = indices[test_size:]
    
    # Crear los conjuntos de datos
    X_train, X_test = X[train_indices], X[test_indices]
    y_train, y_test = y[train_indices], y[test_indices]
    
    return X_train, X_test, y_train, y_test


def train(model, inputArchitecture, socketio, is_a_new_training, optim, loss, epochs, batch_size, ttype):

    # comprobar si es un entrenamiento sobre otro anterior
    if is_a_new_training:
        reset_log_history()
    
    # entrenamiento
    if "Regresión" in ttype: 
        train_regression(model, inputArchitecture, socketio, optim, loss, epochs, batch_size, ttype)
    else:
        train_clustering(model, inputArchitecture, socketio, optim, loss, epochs, batch_size, ttype)

"""
-------------------------------------------------------------------------------------------------------------------------------
--------------------------------------------------------- REGRESSIONS --------------------------------------------------------- 
-------------------------------------------------------------------------------------------------------------------------------
"""

def getDataRegresionLineal():
    rango = (10,100)
    r = lambda x : x/2 + 3
    X = np.linspace(rango[0], rango[1], 100)
    Y = np.array([r(x) + max(1, abs(3*np.random.randn()+3)) *np.random.randn() for x in X])
    X = np.array(X).reshape((len(X),1))
    return X, Y, rango

def getDataRegresionNoLineal():
    rango = (-10,10)
    r = lambda x : x*x/2 + 10
    X = np.linspace(rango[0], rango[1], 100)
    Y = np.array([r(x) + np.random.randint(1,3) *np.random.randn() for x in X])
    X = np.array(X).reshape((len(X),1))
    return X, Y, rango


def preprocess_X(X, inputArchitecture):
    _X = np.array(X).reshape(-1)
    new_X = np.array([
        (_X if t == "x" else _X*_X)
            for t in inputArchitecture
    ]).transpose()
    return new_X

def get_results_regression(X, Y, rango, pred):
    X = X.reshape((-1,))
    pred = pred.numpy().reshape((-1,))
    result = {
        "X" : [float(round(e, 4)) for e in X],
        "Y" : [float(round(e, 4)) for e in Y],
        "rango" : list(rango),
        "predictions" : [float(round(e, 4)) for e in pred],
    }
    return result


def train_regression(model, inputArchitecture, socketio, optim, loss, epochs, batch_size, ttype):

    global log_history

    # get training data
    if ttype == "Regresión lineal":
        X, Y, rango = getDataRegresionLineal()
    elif ttype == "Regresión no lineal":
        X, Y, rango = getDataRegresionNoLineal()
    X_preprocesado = preprocess_X(X, inputArchitecture)
    X_range_preprocesado = preprocess_X(np.linspace(rango[0], rango[1], 100).reshape((100,1)), inputArchitecture)
    X_train, X_test, y_train, y_test = train_test_split(X_preprocesado, Y, test_size=0.2)

    # compile
    model.compile(
        optimizer=optim,
        loss=loss,
        metrics=['accuracy']
    )
                
    # define callbacks & plotting

    def plot_results():
        pred = model(X_range_preprocesado)
        result = get_results_regression(X, Y, rango, pred)
        socketio.emit('perceptron/training_result_regression', result)

    class TrainingCallback_plot(Callback):
        def on_epoch_end(self, epoch, logs=None):
            logs = preprocess_logs(logs) or {}
            if logs != {}:
                logger.debug("VAMOS A CREAR EL PLOT")
                update_logHistory(logs)
                info = {
                    "accuracy" : log_history["accuracy"], 
                    "loss" : log_history["loss"], 
                    "val_accuracy" : log_history["val_accuracy"], 
                    "val_loss" : log_history["val_loss"], 
                }
                socketio.emit('perceptron/training_plot', info)
            if epoch % 2 == 0:
                plot_results()

    # train
    model.fit(X_train, y_train, epochs=epochs, batch_size=batch_size, validation_data=(X_test, y_test), callbacks=TrainingCallback_plot())
    plot_results()
    print("ENTRENAMIENTO TERMINADO!!")



"""
-------------------------------------------------------------------------------------------------------------------------------
--------------------------------------------------------- CLUSTERINGS --------------------------------------------------------- 
-------------------------------------------------------------------------------------------------------------------------------
"""

def getDataClustering2():
    rango = (0,100)
    X1 = 30 + 15 * np.random.randn(75)
    X2 = 20 + 10 * np.random.randn(75)
    Y1 = 70 + 15 * np.random.randn(75)
    Y2 = 80 + 10 * np.random.randn(75)
    Z = np.array(75*[0] + 75*[1])
    E1 = np.array([X1, Y1]).reshape(-1) 
    E2 = np.array([X2, Y2]).reshape(-1) 
    return E1, E2, Z, rango

def getDataClustering2Circulo():
    rango = (0,100)
    R1 = 20 * np.random.random(75)
    A1 = 2 * np.pi * np.random.random(75)
    R2 = 20 + 30 * np.random.random(75)
    A2 = 2 * np.pi * np.random.random(75)
    X1 = 50 + R1 * np.cos(A1)
    X2 = 50 + R1 * np.sin(A1)
    Y1 = 50 + R2 * np.cos(A2)
    Y2 = 50 + R2 * np.sin(A2)
    Z = np.array(75*[0] + 75*[1])
    E1 = np.array([X1, Y1]).reshape(-1) 
    E2 = np.array([X2, Y2]).reshape(-1) 
    return E1, E2, Z, rango

def getDataClustering3():
    rango = (0,100)
    X1 = 30 + 15 * np.random.randn(75)
    X2 = 20 + 10 * np.random.randn(75)
    Y1 = 60 + 15 * np.random.randn(75)
    Y2 = 80 + 10 * np.random.randn(75)
    Z1 = 90 + 5 * np.random.randn(75)
    Z2 = 25 + 10 * np.random.randn(75)
    C = np.array(75*[[1,0,0]] + 75*[[0,1,0]] + 75*[[0,0,1]])
    E1 = np.array([X1, Y1, Z1]).reshape(-1) 
    E2 = np.array([X2, Y2, Z2]).reshape(-1) 
    return E1, E2, C, rango

def preprocess_XY(X, Y, inputArchitecture):
    X = np.array(X)
    Y = np.array(Y)
    def f(t):
        if t == "x":
            return X
        elif t == "x^2":
            return X*X
        elif t == "y":
            return Y
        elif t == "y^2":
            return Y*Y
        else:
            return X*Y
    
    new_X = np.array([f(t) for t in inputArchitecture]).transpose()
    return new_X

def get_results_clustering(X, Y, Z, rango, clases):
    f = (lambda e : int(np.argmax(e))) if clases == 3 else (lambda e : int(e))
    result = {
        "X" : [float(round(e, 4)) for e in X],
        "Y" : [float(round(e, 4)) for e in Y],
        "Z" : [f(e) for e in Z],
        "rango" : list(rango),
    }
    return result

def train_clustering(model, inputArchitecture, socketio, optim, loss, epochs, batch_size, ttype):

    global log_history

    # get training data
    clases = 2
    if ttype == "Clustering binario lineal":
        X, Y, Z, rango = getDataClustering2()
    elif ttype == "Clustering binario circular":
        X, Y, Z, rango = getDataClustering2Circulo()
    elif ttype == "Clustering de 3 grupos":
        X, Y, Z, rango = getDataClustering3()
        clases = 3
    X_preprocesado = preprocess_XY(X, Y, inputArchitecture)
    # X_range_preprocesado = preprocess_X(np.linspace(rango[0], rango[1], 100).reshape((100,1)), inputArchitecture)
    X_train, X_test, y_train, y_test = train_test_split(X_preprocesado, Z, test_size=0.2)

    # compile
    model.compile(
        optimizer=optim,
        loss=loss,
        metrics=['accuracy']
    )
                
    # define callbacks & plotting

    def plot_results():
        #pred = model(X_range_preprocesado)
        result = get_results_clustering(X, Y, Z, rango, clases=clases)
        socketio.emit('perceptron/training_result_clustering', result)

    class TrainingCallback_plot(Callback):
        def on_epoch_end(self, epoch, logs=None):
            logs = preprocess_logs(logs) or {}
            if logs != {}:
                logger.debug("VAMOS A CREAR EL PLOT")
                update_logHistory(logs)
                info = {
                    "accuracy" : log_history["accuracy"], 
                    "loss" : log_history["loss"], 
                    "val_accuracy" : log_history["val_accuracy"], 
                    "val_loss" : log_history["val_loss"], 
                }
                socketio.emit('perceptron/training_plot', info)
            if epoch % 2 == 0:
                plot_results()

    # train
    model.fit(X_train, y_train, epochs=epochs, batch_size=batch_size, validation_data=(X_test, y_test), callbacks=TrainingCallback_plot())
    plot_results()
    print("ENTRENAMIENTO TERMINADO!!")






# ----------------------------------------------------------------------------------------------------------------


def plot(X, Y, rango):
    x_range = np.linspace(rango[0], rango[1], 100)
    pred = model(x_range.reshape((100,1)))
    fig, ax = plt.subplots(1,1, figsize=(20, 8))
    ax.plot(X[:,0], Y, "bo", label="Training data")
    ax.plot(x_range, pred, "k-", label="predictions")

"""
    # points 
    n = 150
    px = 10*np.random.rand(n)
    py = 10*np.random.rand(n)

    points1 = np.array([(x,y) for x,y in zip(px,py) if y > f(x)])
    points2 = np.array([(x,y) for x,y in zip(px,py) if y <= f(x)])
    #points1 = np.array([(x,y) for x,y in zip(px,py) if (x-5)**2+(y-5)**2 > 6])
    #points2 = np.array([(x,y) for x,y in zip(px,py) if (x-5)**2+(y-5)**2 <= 6])

    # training data
    X = np.array([[x,y] for x, y in zip(px,py)])
    Y = np.array(list(map(g, (py-np.array(list(map(f, px)))))))
"""

"""
    p1_pred = []
    p2_pred = []
    for x in X:
        pred = model(np.array([x]))[0]
        if pred > 0: p1_pred.append(x)
        else: p2_pred.append(x)
    p1_pred = np.array(p1_pred)
    p2_pred = np.array(p2_pred)

    # PLOT
    fig, (ax1, ax2) = plt.subplots(1,2, figsize=(20, 8))

    # plot de los puntos 
    ax1.plot(points1[:,0], points1[:,1], "ro")
    ax1.plot(points2[:,0], points2[:,1], "bo")
    ax1.set_title("True labels")

    # plot de los puntos separados por el perceptrón
    if len(p1_pred) > 0: ax2.plot(p1_pred[:,0], p1_pred[:,1], "ro")
    if len(p2_pred) > 0: ax2.plot(p2_pred[:,0], p2_pred[:,1], "bo")
    ax2.set_title("Predicted labels")
"""