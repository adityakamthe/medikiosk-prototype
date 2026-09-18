import sys
import os

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
SERVICES_DIR = os.path.join(ROOT_DIR, "python-services")
MODULE_B_DIR = os.path.join(SERVICES_DIR, "module_b")
MODULE_C_DIR = os.path.join(SERVICES_DIR, "module_c")

for p in [SERVICES_DIR, MODULE_B_DIR, MODULE_C_DIR, ROOT_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)
