

# ----------------------------- CREACIÓN DEL MODELO ----------------------------------


from keras.applications import MobileNetV2
from keras.models import Sequential
from keras.layers import Dense, GlobalAveragePooling2D
from keras.preprocessing import image
from keras.applications.mobilenet_v2 import preprocess_input, decode_predictions
import numpy as np

# Cargar el modelo MobileNetV2 preentrenado
base_model = MobileNetV2(weights='imagenet', include_top=False, input_shape=(224, 224, 3))  # Excluir las capas finales y especificar el tamaño de entrada

# Congelar todas las capas del modelo preentrenado
for layer in base_model.layers:
    layer.trainable = False

# Añadir capas adicionales para la clasificación binaria de gato o perro
model = Sequential([
    base_model,
    GlobalAveragePooling2D(),
    Dense(128, activation='relu'),
    Dense(1, activation='sigmoid')  # Capa final con activación sigmoide para la clasificación binaria
])

# Compilar el modelo
model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])

def predict(img_path):
    # Cargar una imagen de archivo
    img = image.load_img(img_path, target_size=(224, 224))  # Redimensionar la imagen al tamaño que espera MobileNetV2
    # Convertir la imagen a un array numpy y preprocesarla
    x = image.img_to_array(img)
    x = np.expand_dims(x, axis=0)
    x = preprocess_input(x)
    # Realizar la predicción
    preds = model.predict(x)
    return 'Gato' if preds[0][0] > 0.5 else 'Perro'  # Si la probabilidad predicha es mayor a 0.5, se considera un gato; de lo contrario, un perro


# ----------------------------- ENTRENAMIENTO DEL MODELO ----------------------------------


def entrenar_modelo(modelo, directorio_entrenamiento, directorio_validacion, epochs=10, batch_size=32):
    # Configurar generadores de datos para entrenamiento y validación con aumento de datos
    train_datagen = ImageDataGenerator(
        rescale=1./255,
        shear_range=0.2,
        zoom_range=0.2,
        horizontal_flip=True
    )

    test_datagen = ImageDataGenerator(rescale=1./255)

    train_generator = train_datagen.flow_from_directory(
        directorio_entrenamiento,
        target_size=(224, 224),
        batch_size=batch_size,
        class_mode='binary'  # Especificar la clase binaria (0 para perro, 1 para gato)
    )

    validation_generator = test_datagen.flow_from_directory(
        directorio_validacion,
        target_size=(224, 224),
        batch_size=batch_size,
        class_mode='binary'  # Especificar la clase binaria (0 para perro, 1 para gato)
    )

    # Entrenar el modelo
    modelo.fit_generator(
        train_generator,
        steps_per_epoch=train_generator.samples // batch_size,
        epochs=epochs,
        validation_data=validation_generator,
        validation_steps=validation_generator.samples // batch_size
    )

