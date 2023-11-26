#Imports
from lib.func import load_json, to_int, to_str
from lib.const import PREFIX_MAP, Z_GROUPS
from flask import Flask, request, jsonify, make_response, render_template

#Create Flask App
app = Flask(__name__)

#Load Dataset
TAGS = load_json("dataset/dataset_tags.json")
for tag in TAGS:
    item = TAGS[tag]
    for field in list(item.keys()):
        if field not in ["tag_name", "n_count", "d_count", "z_category"]:
            del item[field]
        if "z_category" in item and len(item["z_category"]) == 0:
            del item["z_category"]
TAG_KEYS = list(TAGS.keys())
TAG_GROUPS = load_json("dataset/dataset_tag_groups.json") 

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

#Main
if __name__ == "__main__":
    app.run(host='0.0.0.0', port=80, debug=True)