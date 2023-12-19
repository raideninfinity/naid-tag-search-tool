#Imports
from lib.func import load_json, to_int, clamp, naiExtractData
from lib.const import PREFIX_MAP, Z_GROUPS
from flask import Flask, request, jsonify, make_response, render_template
from PIL import Image
from io import BytesIO
import requests

#Create Flask App
app = Flask(__name__)

#Load Dataset
ROOT = ""
TAGS = load_json(f"{ROOT}dataset/dataset_tags.json")
for tag in TAGS:
    item = TAGS[tag]
    for field in list(item.keys()):
        if field not in ["tag_name", "n_count", "d_count", "d_category", "d_group", "z_category"]:
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
    return '<script>window.location.replace("/naidv3_tag_search");</script>'

@app.route('/naidv3_tag_search')
def tool():
    return render_template("index.html")

@app.route('/guide')
def guide():
    return render_template("guide.html")

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
    params["term"] = (args.get("term", "")).lower()
    for field in ["limit", "page", "min_power", "max_power", "filter"]:
        params[field] = to_int(args.get(field, None))
    return params

def limit_params(params):
    params["limit"] = clamp(params["limit"], 20, 1000)
    params["min_power"] = clamp(params["min_power"], 0, 10000)
    params["max_power"] = clamp(params["max_power"], 0, 10000)
    if params["max_power"] == 0: params["max_power"] = 10000
    params["page"] = clamp(params["page"], 1, 10000)
    params["filter"] = clamp(params["filter"], 0, 2)

def perform_search(params):
    limit_params(params)
    result = { "params" : params}

    #Process Search Term
    term = params["term"].strip()
    if ':' in term:
        prefix, term = map(str.strip, term.split(':', 1))
    else:
        prefix, term = '', term
    prefix = PREFIX_MAP.get(prefix, prefix)

    #Tag Group Indexing
    if term.startswith("z/"):
        return z_show_group(term, result)
    elif term.startswith("g/"):
        return g_show_group(term, result)

    #Search Tags
    keys = list(set(get_tag_keys(prefix, term)))
    result["count"] = 0
    tags = []
    if len(keys) > 0:
        tags = list(map(lambda key: TAGS[key], keys))
        #Filter by Danbooru Category
        for x in ["general", "artist", "copyright", "character", "meta", "none"]:
            if prefix == x:
                tags = [tag for tag in tags if tag["d_category"] == x]
                break
        #Filter by zele.st Category
        if prefix.startswith("z/"):
            z_tags = []
            prefix = prefix.replace("z/", "").strip()
            for z in Z_GROUPS:
                if z.startswith(prefix):
                    z_tags += [tag for tag in tags if z_check_category(tag.get("z_category"), Z_GROUPS[z])]        
            tags = z_tags
        #Filter by Power
        min_power, max_power = params["min_power"], params["max_power"]
        tags = [tag for tag in tags if get_count(tag) >= min_power and min(10000, get_count(tag)) <= max_power]
        #Filter by Type
        filter_type = params["filter"]
        if filter_type == 1:
            tags = [tag for tag in tags if tag["n_count"] > 0]
        elif filter_type == 2:
            tags = [tag for tag in tags if tag["d_count"] > 0]
        #Sort Results    
        tags = sorted(tags, key=lambda tag: (min(10000, get_count(tag)), tag["d_count"]), reverse=True)
        #Filter by limit/page
        result["count"] = len(tags)
        limit, page = params["limit"], params["page"]
        tags = tags[(page-1)*limit:page*limit]
    result["tags"] = tags
    return result

def get_count(tag): 
    return tag["n_count"] if tag["n_count"] != 0 else tag["d_count"]

def get_tag_keys(prefix, term):
    if prefix == "quality": #NAI Quality Tags
        return ["best quality", "amazing quality", "great quality",
        "normal quality", "bad quality", "worst quality"]
    elif prefix == "aesthetic": #NAI Aesthetic Tags
        return ["very aesthetic", "aesthetic", "displeasing", "very displeasing"]
    elif prefix == "year": #NAI Year Tags
        return [f"year {y}" for y in range(2005, 2023+1)]
    elif prefix.startswith("g/"): #Danbooru Tag Group Listing
        return g_get_tags(prefix)
    elif term.endswith("#"): #EXACT MATCH
        term = term[:-1]
        return set([key for key in TAG_KEYS if term == key])
    elif term.endswith("$"): #ENDS WITH
        term = term[:-1]
        return set([key for key in TAG_KEYS if key.endswith(term)])
    elif term.startswith("^"): #STARTS WITH
        term = term[1:]
        return set([key for key in TAG_KEYS if key.startswith(term)])
    elif term.endswith("@"): #STARTS WITH (alternate) 
        term = term[:-1]
        return set([key for key in TAG_KEYS if key.startswith(term)])
    elif term.endswith("%"): #WHOLE WORD
        term = term[:-1]
        return set([key for key in TAG_KEYS if term in key.split(" ")])
    else: #ANYWHERE IN TAG
        return set([key for key in TAG_KEYS if term in key])
    return keys    

def z_show_group(term, result):
    term = term.replace("z/", "").strip()
    group_list = Z_GROUPS.keys()
    group_list = [f"z/{x}" for x in group_list if term in x]
    result["count"] = len(group_list)
    result["groups"] = group_list
    return result

def g_show_group(term, result):
    terms = [x.strip() for x in term.replace("g/", "").split("/", 2)]
    terms += [None] * (3 - len(terms))
    if terms[1] is None and terms[2] is None:
        group_list = [f"g/{x}" for x in TAG_GROUPS.keys() if terms[0] in x]
    elif terms[1] is not None and terms[2] is None:
        mgroup = terms[0]
        g = TAG_GROUPS.get(mgroup, {})
        group_list = [f"g/{mgroup}/{x}" for x in g.keys() if terms[1] in x]
    elif terms[1] is not None and terms[2] is not None:
        mgroup = terms[0]
        g = TAG_GROUPS.get(mgroup, {})
        group = terms[1]
        g = g.get(group, {})
        group_list = [f"g/{mgroup}/{group}/{x}" for x in g.keys() if terms[2] in x]
    else:
        group_list = []
    result["count"] = len(group_list)
    result["groups"] = group_list
    return result

def z_check_category(z_list, term):
    if z_list == None: return False
    return term in z_list

def g_get_tags(prefix):
    prefix = [x.strip() for x in prefix.replace("g/", "").split("/", 2)]
    prefix += [None] * (3 - len(prefix))
    keys = []
    tag_groups = TAG_GROUPS
    m, g, s = prefix[0], prefix[1], prefix[2]
    if g is None and s is None:
        majorgroups = [tag_groups[x] for x in tag_groups if x.startswith(m)]
        for majorgroup in majorgroups:
            groups = [majorgroup[x] for x in majorgroup]
            for group in groups:
                subgroups = [group[x] for x in group]
                for subgroup in subgroups: keys += subgroup
    elif g is not None and s is None:
        majorgroup = tag_groups.get(m, {})
        groups = [majorgroup[x] for x in majorgroup if x.startswith(g)]
        for group in groups:
            subgroups = [group[x] for x in group]
            for subgroup in subgroups: keys += subgroup
    elif g is not None and s is not None:
        group = tag_groups.get(m, {}).get(g, {})
        subgroups = [group[x] for x in group if x.startswith(s)]
        for subgroup in subgroups: keys += subgroup
    return keys

#image

@app.route('/alpha', methods=['GET'])
def alpha():
    return render_template("alpha.html")

@app.route('/process_image', methods=['POST'])
def process_image():
    file = request.files['file']
    image_url = request.form.get('image_url')

    if file:
        # Process image from file upload
        image = Image.open(file)
    elif image_url:
        # Process image from URL
        response = requests.get(image_url)
        image = Image.open(BytesIO(response.content))
    else:
        return jsonify({'error': 'No file or URL provided'})

    metadata = naiExtractData(image)
    return jsonify({'metadata': metadata})

#Main
if __name__ == "__main__":
    app.jinja_env.auto_reload = True
    app.config['TEMPLATES_AUTO_RELOAD'] = True
    app.run(host='0.0.0.0', port=80, debug=True)