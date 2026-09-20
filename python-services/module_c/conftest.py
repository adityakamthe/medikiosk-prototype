import os
import sys

MODULE_C_DIR = os.path.dirname(os.path.abspath(__file__))
if MODULE_C_DIR not in sys.path:
    sys.path.append(MODULE_C_DIR)

