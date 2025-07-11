// Cache to hold the Pokémon data for each generation
const pokemonCache = {};

// Update the generation info display
function updateGenerationInfo(generation, collected, total) {
    const generationNames = {
        1: "Kanto",
        2: "Johto",
        3: "Hoenn",
        4: "Sinnoh",
        5: "Unova",
        6: "Kalos",
        7: "Alola",
        8: "Galar",
        9: "Hisui",
        10: "Paldea"
    };
    const generationInfo = document.getElementById("generation-info");
    generationInfo.textContent = `${generationNames[generation]}: ${collected}/${total}`;
}

document.getElementById("reload-button").addEventListener("click", async () => {
    try {
        const response = await fetch("/api/reload", {
            method: "POST"
        });

        if (!response.ok) throw new Error("Failed to reload data");

        const result = await response.json();
        console.log(result.message || "Pokémon data reloaded successfully!");
        
        // Refresh the page after successful reload
        location.reload();
    } catch (error) {
        console.log(`Error: ${error.message}`);
    }
});


// Load Pokémon data for a specific generation
async function loadGeneration(generation) {
    const grid = document.getElementById("pokemon-grid");
    // While loading, display loading balls in the first 18 grid slots
    grid.innerHTML = Array(18).fill(`
        <div class="pokemon-box loader-slot">
            <div class="loader"></div>
        </div>
    `).join("");

    if (pokemonCache[generation]) {
        const pokemonData = pokemonCache[generation];
        const collectedCount = pokemonData.filter(pokemon => pokemon.collected).length;
        updateGenerationInfo(generation, collectedCount, pokemonData.length);
        renderPokemon(pokemonData);
        return;
    }

    try {
        const response = await fetch(`/api/generation/${generation}`);
        if (!response.ok) throw new Error("Failed to fetch data");

        const pokemonData = await response.json();
        pokemonCache[generation] = pokemonData;

        const collectedCount = pokemonData.filter(pokemon => pokemon.collected).length;
        updateGenerationInfo(generation, collectedCount, pokemonData.length);

        renderPokemon(pokemonData);

        if (generation < 10) prefetchGeneration(generation + 1);
    } catch (error) {
        grid.innerHTML = `<p>Error loading data: ${error.message}</p>`;
    }
}

// Render Pokémon data into the grid and update their colors
async function renderPokemon(pokemonData) {
    const grid = document.getElementById("pokemon-grid");
    grid.innerHTML = pokemonData.map(pokemon => `
        <div class="pokemon-box ${pokemon.collected ? 'collected' : 'uncollected'}" id="pokemon-${pokemon.pokedex_number}" data-pokedex="${pokemon.pokedex_number}">
            <img 
                src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.pokedex_number}.png" 
                alt="${pokemon.name}" 
                class="pokemon-image" 
                loading="lazy"
            >
            <div class="pokemon-number">#${pokemon.pokedex_number.toString().padStart(3, '0')}</div>
            <div class="pokemon-name">${pokemon.name}</div>
        </div>
    `).join("");

    // Apply type-based colors for collected Pokémon
    for (const pokemon of pokemonData) {
        if (pokemon.collected) {
            await updatePokemonColors(pokemon.pokedex_number, true);
        } else {
            updatePokemonColors(pokemon.pokedex_number, false);
        }
    }
}

// Prefetch data for a generation
async function prefetchGeneration(generation) {
    if (pokemonCache[generation]) return;
    try {
        const response = await fetch(`/api/generation/${generation}`);
        if (response.ok) {
            const data = await response.json();
            pokemonCache[generation] = data;
        }
    } catch {
        console.warn(`Prefetching generation ${generation} failed.`);
    }
}

// Preload images for the first generation for initial load speed
function preloadImages(rangeStart, rangeEnd) {
    for (let dexNumber = rangeStart; dexNumber <= rangeEnd; dexNumber++) {
        const img = new Image();
        img.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dexNumber}.png`;
    }
}

let highlightedId = null;

document.getElementById("search-button").addEventListener("click", async () => {
    const name = document.getElementById("search-input").value.trim().toLowerCase();
    if (!name) return;

    // Search in all generations
    for (let gen = 1; gen <= 10; gen++) {
        const data = pokemonCache[gen] || await fetch(`/api/generation/${gen}`).then(res => res.json());
        if (!pokemonCache[gen]) pokemonCache[gen] = data;

        const match = data.find(p => p.name.toLowerCase() === name);
        if (match) {
            document.getElementById("generation-select").value = gen;
            await loadGeneration(gen);

            // Delay to ensure grid is rendered
            setTimeout(() => {
                highlightPokemon(match.pokedex_number);
            }, 200);
            return;
        }
    }

    alert("Pokémon not found.");
});

function highlightPokemon(dexNumber) {
    // Remove previous highlight
    if (highlightedId !== null) {
        const previous = document.getElementById(`pokemon-${highlightedId}`);
        if (previous) {
            previous.classList.remove("highlighted");
        }
    }

    const el = document.getElementById(`pokemon-${dexNumber}`);
    if (el) {
        el.classList.add("highlighted");
        el.scrollIntoView({ behavior: "smooth", block: "center" });

        highlightedId = dexNumber;

        // Click to remove highlight
        el.addEventListener("click", function removeHighlightOnce() {
            el.classList.remove("highlighted");
            highlightedId = null;
            el.removeEventListener("click", removeHighlightOnce);
        });
    }
}

const typeColors = {
    normal: "#B3B2AB",
    fire: "#EE8130",
    water: "#6390F0",
    electric: "#F7D02C",
    grass: "#7AC74C",
    ice: "#96D9D6",
    fighting: "#C22E28",
    poison: "#A33EA1",
    ground: "#E2BF65",
    flying: "#A98FF3",
    psychic: "#F95587",
    bug: "#A6B91A",
    rock: "#B6A136",
    ghost: "#735797",
    dragon: "#6F35FC",
    dark: "#705746",
    steel: "#B7B7CE",
    fairy: "#D685AD"
};

// Update Pokémon background color based on type
async function updatePokemonColors(pokemonId, isCollected) {
    const pokemonBox = document.querySelector(`#pokemon-${pokemonId}`);

    if (!isCollected) {
        // Uncollected Pokémon remain gray
        pokemonBox.style.backgroundColor = "#f9f9f9";
        pokemonBox.style.filter = "grayscale(100%)";
        return;
    }

    try {
        // Fetch Pokémon data from PokéAPI
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
        const data = await response.json();

        // Get the first type of the Pokémon
        const pokemonType = data.types[0].type.name;

        // Set the background color based on type
        pokemonBox.style.backgroundColor = typeColors[pokemonType] || "#FFFFFF"; // Default to white if type is not found
        pokemonBox.style.filter = "none";
    } catch (error) {
        console.error(`Error fetching Pokémon data for ID ${pokemonId}:`, error);
    }
}

// Preload Gen 1 sprites and load Gen 1 data on page load
document.addEventListener("DOMContentLoaded", async () => {
    preloadImages(1, 151);
    for (let gen = 1; gen <= 10; gen++) {
        await prefetchGeneration(gen);
    }
    loadGeneration(1);
});


// Allow uploading of your own file path
document.addEventListener("DOMContentLoaded", () => {
    const fileInput = document.getElementById("file-input");
    const uploadButton = document.getElementById("upload-button");
    const fileNameDisplay = document.getElementById("file-name");

    uploadButton.addEventListener("click", () => {
        fileInput.click(); // Simulate clicking the hidden file input
    });

    fileInput.addEventListener("change", async () => {
        if (fileInput.files.length === 0) {
            fileNameDisplay.textContent = '';
            return;
        }

        const fileName = fileInput.files[0].name;
        fileNameDisplay.textContent = `Selected file: ${fileName}`;

        const formData = new FormData();
        formData.append("file", fileInput.files[0]);

        // Change the button text and disable it
        uploadButton.textContent = "Uploading...";
        uploadButton.disabled = true;

        try {
            const response = await fetch("/api/upload", {
                method: "POST",
                body: formData
            });

            const result = await response.json();

            // If the upload was successful, alert the user and reload the page
            if (response.ok) {
                uploadButton.textContent = "Upload File";
                uploadButton.disabled = false;
                uploadButton.textContent = "Upload Successful!";
                // alert("File uploaded successfully! Reloading data...");
                location.reload();
            } else {
                uploadButton.textContent = "Upload Failed";
                uploadButton.disabled = false;
                uploadStatus.textContent = result.message || result.error;
            }
        } catch (error) {
            uploadButton.textContent = "Upload Failed";
            uploadButton.disabled = false;
            uploadStatus.textContent = "Error uploading file.";
            console.error("Upload error:", error);
        }
    });
});

// Show a floating card box when clicmig on a pokemon.
// Select if they are collected or not
document.addEventListener("DOMContentLoaded", () => {
    const grid = document.getElementById("pokemon-grid");

    grid.addEventListener("click", (event) => {
        const box = event.target.closest(".pokemon-box");
        if (!box) return;

        const pokedexNumber = parseInt(box.dataset.pokedex, 10);
        let selectedPokemon = null;
        let selectedGen = null;

        for (let gen = 1; gen <= 10; gen++) {
            const data = pokemonCache[gen];
            if (!data) continue;
            const match = data.find(p => p.pokedex_number === pokedexNumber);
            if (match) {
                selectedPokemon = match;
                selectedGen = gen;
                break;
            }
        }

        if (!selectedPokemon) return;

        const existingCard = document.querySelector(".floating-card");
        if (existingCard) existingCard.remove();

        const card = document.createElement("div");
        card.className = "floating-card";
        card.innerHTML = `
            <strong>#${selectedPokemon.pokedex_number.toString().padStart(3, '0')} ${selectedPokemon.name}</strong><br>
            <label>
                <input type="checkbox" ${selectedPokemon.collected ? "checked" : ""}> Collected
            </label>
        `;

        // Position at mouse
        card.style.top = `${event.pageY + 10}px`;
        card.style.left = `${event.pageX + 10}px`;

        document.body.appendChild(card);

        const outsideClickHandler = (e) => {
            if (!card.contains(e.target)) {
                card.remove();
                document.removeEventListener("click", outsideClickHandler);
            }
        };
        setTimeout(() => document.addEventListener("click", outsideClickHandler), 0);

        // Handle checkbox toggle
        const checkbox = card.querySelector("input[type='checkbox']");
        checkbox.addEventListener("change", () => {
            selectedPokemon.collected = checkbox.checked;

            const boxEl = document.getElementById(`pokemon-${selectedPokemon.pokedex_number}`);
            boxEl.classList.toggle("collected", checkbox.checked);
            boxEl.classList.toggle("uncollected", !checkbox.checked);

            updatePokemonColors(selectedPokemon.pokedex_number, checkbox.checked);

            const collectedCount = pokemonCache[selectedGen].filter(p => p.collected).length;
            updateGenerationInfo(selectedGen, collectedCount, pokemonCache[selectedGen].length);
        });
    });
});



