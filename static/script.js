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
document.addEventListener("DOMContentLoaded", () => {
    preloadImages(1, 151);
    loadGeneration(1);
});
