// Cube loading and processing functions

const EXCLUDED_CARD_NAMES = [
	"Dungeon of the Mad Mage", 
	"Lost Mine of Phandelver",
	"Tomb of Annihilation",
	"The Ring",
	"Undercity",
	"Cragflame"
];

const EXCLUDED_TAGS_NAMES = [
	"Other", 
	"z_Fixing Roster_z",
	"z_Kvatch Koffers",
	"B - The Big Top",
	"WUR - Mutate",
	"WU - Studies",
	"WU - Studies (Lessons)",
	"UBR - Mirror Breakers",
    "G - Mutate",
    "W - Cats",
    "UR - Draw 2",
    "G - Grow Tall",
    "G - Constructs",
    "U - Flash 2",
    "U - Sea Monsters"
];

function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 1) return [];
    const headers = lines[0].split(',').map(header => header.trim().replace(/^"|"$/g, ''));
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = [];
        let currentLine = lines[i];
        let inQuotes = false;
        let currentValue = '';
        for (let charIndex = 0; charIndex < currentLine.length; charIndex++) {
            const char = currentLine[charIndex];
            if (char === '"') {
                if (inQuotes && charIndex + 1 < currentLine.length && currentLine[charIndex + 1] === '"') {
                    currentValue += '"';
                    charIndex++; 
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                values.push(currentValue.trim());
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        values.push(currentValue.trim()); 
        if (values.length === headers.length) {
            const entry = {};
            headers.forEach((header, index) => {
                entry[header] = values[index] ? values[index].replace(/^"|"$/g, '') : '';
            });
            data.push(entry);
        }
    }
    return data;
}

function populateCubeSelect() {
    // Remove all options except the first (the placeholder)
    while (cubeSelect.options.length > 1) {
        cubeSelect.remove(1);
    }
    cubes.forEach(cube => {
        const option = document.createElement('option');
        option.value = cube.code;
        option.textContent = cube.name;
        cubeSelect.appendChild(option);
    });
}

async function fetchAndProcessCube(cubeCode) {
    toggleLoading(true);
    const cube = cubes.find(c => c.code === cubeCode);
    if (!cube) {
        showMessage('Selected cube not found.', 'error');
        toggleLoading(false);
        return false;
    }
    cubeSelect.name = cube.name;
    selectedCubeName.textContent = cube.name;
    const csvUrl = cube.csvPath; // Use local path
    try {
        const response = await fetch(csvUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const csvText = await response.text();
        if (!csvText) throw new Error('CSV data is empty.');
        currentCubeData = parseCSV(csvText);
        if (!currentCubeData || currentCubeData.length === 0) throw new Error('Cube data could not be parsed or is empty.');
        extractPackThemes();
        showMessage(`LOADED: ${cube.name} (${currentCubeData.length} cards)`, 'success');
        return true;
    } catch (error) {
        showMessage(`ERROR: ${error.message}`, 'error', 5000);
        currentCubeData = null;
        resetToCubeSelection(); 
        return false;
    } finally {
        toggleLoading(false);
        confirmCubeBtn.disabled = !cubeSelect.value;
    }
}

function extractPackThemes() {
    if (!currentCubeData) return;
    const themes = new Set();
    currentCubeData.forEach(card => {
        const cardMaybe = card.Maybe || card.maybeboard;
        if (cardMaybe && cardMaybe == "true") return;
        let cardName = card.Name || card.name;
        if (
            cardName && 
            cardName.trim() !== "" &&
            EXCLUDED_CARD_NAMES.includes(cardName)
        ) {
            return;
        }
        const cardTags = card.Tags || card.tags;
        if (
            cardTags &&
            cardTags.trim() !== "" &&
            !cardTags.includes("zz_Commander") && // Exclude any tag with zz_Commander
            !EXCLUDED_TAGS_NAMES.includes(cardTags)
        ) {
            themes.add(cardTags.trim());
        }
    });
    availablePackThemes = Array.from(themes).sort();
}