from flask import Flask, jsonify, render_template, request
import pandas as pd
import os

app = Flask(__name__)
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# Define Pokédex ranges
GENERATION_RANGES = {
    1: (1, 151), 2: (152, 251), 3: (252, 386), 4: (387, 494), 5: (495, 649),
    6: (650, 721), 7: (722, 809), 8: (810, 898), 9: (899, 905), 10: (906, 1025)
}

pokemon_data_by_generation = {}

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/upload", methods=["POST"])
def upload_file():
    global pokemon_data_by_generation
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400
    
    # file_path = os.path.join(app.config["UPLOAD_FOLDER"], file.filename)
    # file.save(file_path)
    from io import BytesIO
    file_content = file.read()
    
    try:
        # pokemon_data_df = pd.read_excel(file_path)
        pokemon_data_df = pd.read_excel(BytesIO(file_content))
        
        # Reprocess data
        pokemon_data_by_generation.clear()
        for gen, (start, end) in GENERATION_RANGES.items():
            filtered = pokemon_data_df[(pokemon_data_df["Dex Number"] >= start) & 
                                        (pokemon_data_df["Dex Number"] <= end)]
            sanitized_data = []
            for _, row in filtered.iterrows():
                try:
                    dex_number = int(row["Dex Number"]) if not pd.isna(row["Dex Number"]) else None
                    name = row["Name"] if isinstance(row["Name"], str) else "Unknown Pokémon"
                    collected = bool(row["In Collection Check"]) if not pd.isna(row["In Collection Check"]) else False
                    
                    if dex_number is None or name == "Unknown Pokémon":
                        continue
                    
                    sanitized_data.append({
                        "pokedex_number": dex_number,
                        "name": name,
                        "collected": collected
                    })
                except Exception as e:
                    print(f"Error processing row: {row}, Error: {e}")
                    continue
            
            pokemon_data_by_generation[gen] = sanitized_data
        
        return jsonify({"message": "File uploaded and data processed successfully"}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to process file: {str(e)}"}), 500

@app.route("/api/generation/<int:generation>")
def api_get_generation(generation):
    if generation not in GENERATION_RANGES:
        return jsonify({"error": "Invalid generation number"}), 400
    return jsonify(pokemon_data_by_generation.get(generation, []))

@app.route("/api/update", methods=["POST"])
def update_collected_status():
    data = request.get_json()
    dex_number = data.get("pokedex_number")
    collected = data.get("collected", False)

    # Update in-memory structure
    for gen_data in pokemon_data_by_generation.values():
        for poke in gen_data:
            if poke["pokedex_number"] == dex_number:
                poke["collected"] = collected
                return jsonify({"message": "Status updated"}), 200

    return jsonify({"error": "Pokémon not found"}), 404


if __name__ == "__main__":
    app.run(debug=True)
