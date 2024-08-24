from tensorflow.keras import Sequential
from tensorflow.keras.layers import Dense, Activation



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
    model.add(Activation(activativation_functions[0]))

    # Añadir capas intermedias
    for i in range(2, len(architecture) - 1):
        model.add(Dense(units=architecture[i]))
        model.add(Activation(activativation_functions[i-1]))

    # Añadir la capa de salida
    model.add(Dense(units=architecture[-1]))
    model.add(Activation(activativation_functions[-1]))

    return model




# --------------------------------------------------------------------------------------------------------




import matplotlib.pyplot as plt
import numpy as np
import os


def train(model, epochs, batch_size):

    # functions
    f = lambda x : -2*x + 12
    g = lambda x : 1 if x > 0 else -1

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

    # train
    model.compile(optimizer='adam',
                loss='binary_crossentropy',
                metrics=['accuracy'])
    model.fit(X, Y, epochs=epochs, batch_size=batch_size)

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

    # save plot in directory
    directory = "app/static/images/plot"
    if not os.path.exists(directory):
        os.makedirs(directory)
    # elimina los elementos actuales
    for filename in os.listdir(directory):
        file_path = os.path.join(directory, filename)
        try:
            # Si es un archivo, lo elimina
            if os.path.isfile(file_path):
                os.unlink(file_path)
        except Exception as e:
            print(f'Error al eliminar {file_path}. Razón: {e}')
    # save
    unique_filename = f"plot_perceptron_{time.time()}.png"
    unique_path = f"{directory}/{unique_filename}"
    fig.savefig(unique_path)
    plt.close(fig)

    return unique_filename