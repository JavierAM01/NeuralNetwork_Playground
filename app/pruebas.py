import io
from contextlib import redirect_stdout
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense


# Supongamos que tienes un modelo Keras
model = Sequential()
model.add(Dense(64, activation='relu', input_dim=100))
model.add(Dense(10, activation='softmax'))

# Redirigir la salida estándar a un buffer de texto
buffer = io.StringIO()
with redirect_stdout(buffer):
    model.summary()

# Capturar el contenido del buffer en una cadena
summary_string = buffer.getvalue()

# Ahora puedes pasar summary_string a tu página web
print(summary_string)  # Solo para demostración, puedes enviar esta cadena a tu página web como desees
