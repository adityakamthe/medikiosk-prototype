import sys
import os

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
SERVICES_DIR = os.path.join(ROOT_DIR, "python-services")

for p in [SERVICES_DIR, ROOT_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)
