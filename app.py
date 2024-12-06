from flask import Flask, jsonify, render_template
import pandas as pd

app = Flask(__name__)

# Define Pokédex ranges
GENERATION_RANGES = {
    1: (1, 151),
    2: (152, 251),
    3: (252, 386),
    4: (387, 494),
    5: (495, 649),
    6: (650, 721),
    7: (722, 809),
    8: (810, 898),
    9: (899, 905),
    10: (906, 1025)
}

# Load and preprocess Pokémon data on server startup
FILE_PATH = "Pokedex.xlsx"
pokemon_data_df = pd.read_excel(FILE_PATH)

# Preprocess data for faster access
pokemon_data_by_generation = {}
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
                print(f"Skipping invalid row: {row}")
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

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/generation/<int:generation>")
def api_get_generation(generation):
    if generation not in GENERATION_RANGES:
        return jsonify({"error": "Invalid generation number"}), 400
    return jsonify(pokemon_data_by_generation[generation])

@app.route("/api/reload", methods=["POST"])
def reload_data():
    global pokemon_data_df, pokemon_data_by_generation
    try:
        # Reload the Excel sheet
        pokemon_data_df = pd.read_excel(FILE_PATH)

        # Reprocess the data
        pokemon_data_by_generation = {}
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

        return jsonify({"message": "Data reloaded successfully"}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to reload data: {str(e)}"}), 500


if __name__ == "__main__":
    app.run(debug=True)
