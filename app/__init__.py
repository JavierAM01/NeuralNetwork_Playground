from flask import Flask
from .models import db

import os
import logging
from logging.handlers import RotatingFileHandler


def create_logger():

    log_file      = "app.log"
    max_file_size = 11000000
    backup_count  = 3

    # Create handler
    file_path = os.path.join("app/static/data/logger", log_file)
    file_handler = RotatingFileHandler(file_path, maxBytes=max_file_size, backupCount=backup_count)

    # Create configs
    file_handler.setLevel(logging.DEBUG)
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    file_handler.setFormatter(formatter)

    # Add configs 
    logger = logging.getLogger('')
    logger.setLevel(logging.DEBUG)
    logger.addHandler(file_handler)

    return logger

def create_app():
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
    db.init_app(app)
    return app