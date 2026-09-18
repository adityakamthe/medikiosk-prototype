import sys
import os

MODULE_C_DIR = os.path.dirname(os.path.abspath(__file__))
if MODULE_C_DIR in sys.path:
    sys.path.remove(MODULE_C_DIR)
sys.path.insert(0, MODULE_C_DIR)

# Evict sibling 'schemas' package from sys.modules to prevent cross-module namespace collision
sys.modules.pop("schemas", None)
for k in list(sys.modules.keys()):
    if k.startswith("schemas."):
        sys.modules.pop(k, None)
