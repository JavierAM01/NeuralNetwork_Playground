from keras.applications import MobileNetV2
from keras.models import Sequential
from keras.layers import Dense, GlobalAveragePooling2D
from keras.preprocessing import image
from keras.applications.mobilenet_v2 import preprocess_input, decode_predictions

import pickle, os
import numpy as np

import io
from contextlib import redirect_stdout

from app import create_logger


logger = create_logger()



# Cargar los pesos desde un archivo utilizando pickle
def cargar_pesos(nombre_archivo):
    with open(nombre_archivo, 'rb') as f:
        pesos = pickle.load(f)
    return pesos

# Cargar el modelo MobileNetV2 preentrenado
base_model = MobileNetV2(weights='imagenet', include_top=False, input_shape=(224, 224, 3))  # Excluir las capas finales y especificar el tamaño de entrada

# Congelar todas las capas del modelo preentrenado
for layer in base_model.layers:
    layer.trainable = False

# Añadir capas adicionales para la clasificación binaria de gato o perro
model = Sequential(name="dogcat_model")
model.add(base_model)
model.add(GlobalAveragePooling2D())
model.add(Dense(128, activation='relu'))
model.add(Dense(1, activation='sigmoid'))

# cargar los pesos preentrenados para la clasificación
model.layers[-2].build(input_shape=(None, 1280))
model.layers[-2].set_weights(cargar_pesos("app/static/data/dogcat/pesos_dense_1.pkl"))

model.layers[-1].build(input_shape=(None, 128))
model.layers[-1].set_weights(cargar_pesos("app/static/data/dogcat/pesos_dense_2.pkl"))


def get_summary(n):

    # usar el modelo una vez para asegurar que el modelo esté cargado
    if n == 1:
        pred, prob = predict("app/static/images/cat.jpg") # imagen de prueba
        info = {"pred":pred, "prob":prob}
        logger.debug(f'Imagen de prueba: {info}')

    # cargar el summary
    buffer = io.StringIO()
    with redirect_stdout(buffer):
        if n == 1:
            model.summary()
        else:
            base_model.summary()
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


def predict(img_path):
    # Cargar una imagen de archivo
    img = image.load_img(img_path, target_size=(224, 224))  # Redimensionar la imagen al tamaño que espera MobileNetV2
    # Convertir la imagen a un array numpy y preprocesarla
    x = image.img_to_array(img)
    x = np.expand_dims(x, axis=0)
    x = preprocess_input(x)
    # Realizar la predicción
    preds = model.predict(x)[0][0]
    pred = 'Gato' if preds < 0.5 else 'Perro'
    prob = float(round(preds,2))
    if prob < 0.5: prob = 1 - prob
    logger.debug("RESULTADOS:")
    logger.debug({"pred":pred, "prob":prob, "preds":preds})
    return  pred, prob

# c = lambda x : os.path.join("D:\TFG\imagenes\dogcat\\test\cat", "1"+("0000"+str(x))[-4:]+".jpg")      
# d = lambda x : os.path.join("D:\TFG\imagenes\dogcat\\test\dog", "1"+("0000"+str(x))[-4:]+".jpg")   