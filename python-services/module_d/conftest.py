import os
import sys

MODULE_D_DIR = os.path.dirname(os.path.abspath(__file__))
if MODULE_D_DIR in sys.path:
    sys.path.remove(MODULE_D_DIR)
sys.path.insert(0, MODULE_D_DIR)
