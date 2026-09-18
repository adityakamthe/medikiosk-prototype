import sys
import os

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
MODULE_C_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if MODULE_C_DIR not in sys.path:
    sys.path.insert(0, MODULE_C_DIR)
