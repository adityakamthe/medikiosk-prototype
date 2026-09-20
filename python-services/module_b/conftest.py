import os
import sys

MODULE_B_DIR = os.path.dirname(os.path.abspath(__file__))
if MODULE_B_DIR in sys.path:
    sys.path.remove(MODULE_B_DIR)
sys.path.insert(0, MODULE_B_DIR)
