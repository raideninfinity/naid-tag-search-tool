import json

def load_json(name):
    file = open(name)
    data = json.load(file)
    file.close()
    return data

def to_int(val, *, default=0):
    try:
        return int(val)
    except Exception:
        return default

def to_str(val, *, default=''):
    if val == None: return default
    try:
        return str(val)
    except Exception:
        return default
















