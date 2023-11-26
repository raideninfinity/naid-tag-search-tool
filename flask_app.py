#Imports
from lib.func import load_json, to_int, clamp
from lib.const import PREFIX_MAP, Z_GROUPS
from flask import Flask, request, jsonify, make_response, render_template

#Create Flask App
app = Flask(__name__)

#Load Dataset
ROOT = ""
TAGS = load_json(f"{ROOT}dataset/dataset_tags.json")
for tag in TAGS:
    item = TAGS[tag]
    for field in list(item.keys()):
        if field not in ["tag_name", "n_count", "d_count", "z_category"]:
            del item[field]
        if "z_category" in item and len(item["z_category"]) == 0:
            del item["z_category"]
TAG_KEYS = list(TAGS.keys())
TAG_GROUPS = load_json(f"{ROOT}dataset/dataset_tag_groups.json") 

#Handle CORS
def _build_cors_preflight_response():
    response = make_response()
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Headers", "*")
    response.headers.add("Access-Control-Allow-Methods", "*")
    return response

def _corsify_actual_response(response, code=200):
    response.headers.add("Access-Control-Allow-Origin", "*")
    return response, code

#Index
@app.route('/')
def index():
    return render_template("index.html")

#Search
@app.route('/search')
def search():
    if request.method == "OPTIONS": 
        return _build_cors_preflight_response()
    params = search_get_params(request.args)
    result = perform_search(params)
    if type(result) != dict:
        err = {"error": "oops, shit happened!"}
        return _corsify_actual_response(jsonify(err), 500)
    else:    
        return _corsify_actual_response(jsonify(result))

def search_get_params(args):
    params = {}
    params["term"] = (args.get("term", ""))
    for field in ["limit", "page", "min_power", "max_power", "filter"]:
        params[field] = to_int(args.get(field, None))
    return params

def limit_params(params):
    params["limit"] = clamp(params["limit"], 20, 1000)
    params["min_power"] = clamp(params["min_power"], 0, 10000)
    params["max_power"] = clamp(params["max_power"], 0, 10000)
    params["page"] = clamp(params["page"], 1, 10000)
    params["filter"] = clamp(params["filter"], 0, 2)

def perform_search(params):
    limit_params(params)
    result = { "params" : params}

    return result    

#Main
if __name__ == "__main__":
    app.run(host='0.0.0.0', port=80, debug=True)