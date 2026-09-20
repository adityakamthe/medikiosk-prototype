import os
import sys

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
MODULE_B_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if MODULE_B_DIR not in sys.path:
    sys.path.insert(0, MODULE_B_DIR)
