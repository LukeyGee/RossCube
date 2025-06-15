// NOTE: For better maintainability, consider moving this script to a separate main.js file.
// DOM Elements
const cubeSelect = document.getElementById('cubeSelect');
const confirmCubeBtn = document.getElementById('confirmCubeBtn');
const packSelectionTitle = document.getElementById('packSelectionTitle');
const selectedCubeName = document.getElementById('selectedCubeName');
const packOptionsContainer = document.getElementById('packOptionsContainer');
const confirmPackBtn = document.getElementById('confirmPackBtn');
const decklistOutput = document.getElementById('decklistOutput');
const copyDecklistBtn = document.getElementById('copyDecklistBtn');
const printToConsoleBtn = document.getElementById('printToConsoleBtn');
const cubeSelectionStep = document.getElementById('cubeSelectionStep');
const packSelectionStep = document.getElementById('packSelectionStep');
const decklistStep = document.getElementById('decklistStep');
const loadingIndicator = document.getElementById('loadingIndicator');
const chosenPack1Display = document.getElementById('chosenPack1');
const chosenPack2Display = document.getElementById('chosenPack2');
const chosenCubeCodeDisplay = document.getElementById('chosenCubeCode');
const messageContainer = document.getElementById('messageContainer');
const cardHoverPreview = document.getElementById('cardHoverPreview');
// --- Application State ---
let cubes = [
    { name: "MADChilupa Big Vintage", code: "trs", csvPath: "./cubes/trs.csv" },
    { name: "KaramjaRum Super Jump", code: "krstart1", csvPath: "./cubes/krstart1.csv" },
    { name: "ImNotFine Jumpstart Cube", code: "infjumpstartcube", csvPath: "./cubes/infjumpstartcube.csv" },
    { name: "Aerac Jumpstart Cube", code: "ajsc", csvPath: "./cubes/ajsc.csv" },
    { name: "aquickalias Jumpstart", code: "jumpstartdecks", csvPath: "./cubes/jumpstartdecks.csv" },
    { name: "Jumpstart Cube 900", code: "jump-start-cube", csvPath: "./cubes/jump-start-cube.csv" },
    { name: "Hasted's Pauper Jumpstart Cube", code: "HastedPJC", csvPath: "./cubes/HastedPJC.csv" },
    { name: "Big Beginner Jumpstart", code: "vuq", csvPath: "./cubes/vuq.csv" },
    { name: "Rocky Mountain 93/94 JumpStart", code: "n8cr", csvPath: "./cubes/n8cr.csv" },
    { name: "Todsa Jumpstart Cube", code: "jumpsa", csvPath: "./cubes/jumpsa.csv" },
    { name: "Jumpstart 2025 Tight", code: "j25-tight", csvPath: "./cubes/j25-tight.csv" },
    { name: "Jumpstart 2022 Tight", code: "j22-tight", csvPath: "./cubes/j22-tight.csv" },
    { name: "Jumpstart 2020 Tight", code: "jmp2020tight", csvPath: "./cubes/jmp2020tight.csv" },
    { name: "Old School Jumpstart", code: "osjs", csvPath: "./cubes/osjs.csv" },
    { name: "KvatchStart Commander Cube", code: "kvatchstart", csvPath: "./cubes/kvatchstart.csv", isCommander: true }
];
let currentCubeData = null;
let availablePackThemes = []; 
let packSelections = { pack1: null, pack2: null };
let currentPackOptions = [];

// --- Helper Functions ---
// showMessage(), toggleLoading(), attachCardHoverPreview(), preloadCardImages(), 
// getSelectedCube(), initializePackSynergy(), and initializeBullyMeter() now provided by utility modules

function generateDecklist() {
    try {
        if (!currentCubeData || !packSelections.pack1 || !packSelections.pack2) {
            showMessage('ERROR: MISSING SELECTIONS', 'error');
            return;
        }
        
        const selectedCube = getSelectedCube(cubeSelect.value, cubes);
        const isCommanderCube = selectedCube && selectedCube.isCommander;
        
        // Build basic deck using deck-builder functions
        const deckResult = buildBasicDeck(
            currentCubeData,
            packSelections.pack1,
            packSelections.pack2,
            isCommanderCube
        );
        
        const globals = {
            currentCubeData,
            packSelections,
            decklistOutput,
            chosenPack1Display,
            chosenPack2Display,
            chosenCubeCodeDisplay,
            cubeSelect
        };
        
        if (isCommanderCube) {
            handleCommanderCubeFlow(deckResult, globals);
        } else {
            handleRegularCubeFlow(deckResult, globals);
        }
    } catch (err) {
        showMessage('ERROR: ' + err.message, 'error', 5000);    toggleLoading(false);
    }
}

cubeSelect.addEventListener('change', () => {
    confirmCubeBtn.disabled = !cubeSelect.value;
});

confirmCubeBtn.addEventListener('click', async () => {
    if (!cubeSelect.value) return;
    
    setButtonLoading(confirmCubeBtn, true);
    
    try {
        const success = await fetchAndProcessCube(cubeSelect.value);
        
        if (success) {
            await smoothTransition(cubeSelectionStep, packSelectionStep, 'fade', {
                loadingText: 'Loading packs...',
                contentPreparer: () => {                    const globals = {
                        packOptionsContainer,
                        confirmPackBtn,
                        availablePackThemes,
                        packSelections,
                        cubeSelect,
                        cubes,
                        currentCubeData,
                        packSynergyAnalyzer,
                        packSelectionTitle,
                        cubeSelectionStep,
                        packSelectionStep,
                        decklistStep
                    };                    
                    // Prepare pack content for measurement
                    transitionToPackSelection(1, globals);
                }
            });
        }
    } catch (error) {
        console.error('Error loading cube:', error);
    } finally {
        setButtonLoading(confirmCubeBtn, false);
    }
});

confirmPackBtn.addEventListener('click', async () => {
    const globals = {
        packOptionsContainer,
        confirmPackBtn,
        availablePackThemes,
        packSelections,
        cubeSelect,
        cubes,
        currentCubeData,
        packSynergyAnalyzer,
        packSelectionTitle,
        packSelectionStep,
        decklistStep,
        cubeSelectionStep
    };
    
    // Use modular pack selection validation and transition
    if (!validatePackSelections(packSelections, globals)) {
        return;
    }
    
    setButtonLoading(confirmPackBtn, true);
    
    try {
        await smoothTransition(packSelectionStep, decklistStep, 'scale', {
            loadingText: 'Generating your deck...',
            contentPreparer: async () => {
                // Generate deck content
                generateDecklist();
                
                // Wait for images to load for proper height measurement
                await waitForImagesToLoad(decklistStep);
            }
        });
    } finally {
        setButtonLoading(confirmPackBtn, false);
    }
});

copyDecklistBtn.addEventListener('click', () => {
        const text = decklistOutput.value;
        if (!text) {
            showMessage('Nothing to copy!', 'error');
            return;
        }
        
        copyToClipboard(
            text,
            () => showMessage('Decklist copied to clipboard!', 'success'),
            () => showMessage('Failed to copy decklist.', 'error')
        );
    });

document.getElementById('resetAppBtnPack').addEventListener('click', resetToCubeSelection);
document.getElementById('resetAppBtnDeck').addEventListener('click', resetToCubeSelection);

function resetToCubeSelection() {
    // Reset all state and UI to the initial cube selection step
    packSelections = { pack1: null, pack2: null };
    currentPackOptions = [];
    currentCubeData = null;
    cubeSelect.value = "";
    confirmCubeBtn.disabled = true;
    cubeSelectionStep.classList.remove('hidden');
    packSelectionStep.classList.add('hidden');
    decklistStep.classList.add('hidden');
    decklistOutput.value = "";
    chosenPack1Display.textContent = "";
    chosenPack2Display.textContent = "";
    chosenCubeCodeDisplay.textContent = "";
    document.getElementById('selectedCubeName').textContent = "";
    packSelectionTitle.textContent = "STEP 2: CHOOSE PACK 1";
    // Remove any dynamic UI (commander zone, koffers, fixing lands, etc.)
    const commanderZone = document.getElementById('commanderZone');
    if (commanderZone) commanderZone.remove();
    const koffersStep = document.getElementById('koffersStep');
    if (koffersStep) koffersStep.remove();
    const fixingLandsStep = document.getElementById('fixingLandsStep');
    if (fixingLandsStep) fixingLandsStep.remove();
    // Remove bully meter
    const bullyMeter = document.getElementById('bullyMeter');
    if (bullyMeter) bullyMeter.remove();
    hideCardPreview();
    showMessage('App reset. Please select a cube.', 'info');
}

populateCubeSelect();

// Initialize modules
const packSynergyAnalyzer = initializePackSynergy();

function handleRegularCubeFlow(deckResult, globals) {
    toggleLoading(true);
    
    // Update UI with deck result using modular functions
    updateDeckDisplay(deckResult, globals);
    finalizeDeckGeneration(deckResult.deck, deckResult.commanders);
    
    toggleLoading(false);
}

// Utility function to wait for images to load for proper height measurement
function waitForImagesToLoad(element) {
    return new Promise((resolve) => {
        const images = element.querySelectorAll('img');
        if (images.length === 0) {
            resolve();
            return;
        }
        
        let loadedImages = 0;
        const imageCount = images.length;
        
        const onImageLoad = () => {
            loadedImages++;
            if (loadedImages === imageCount) {
                resolve();
            }
        };
        
        images.forEach(img => {
            if (img.complete) {
                onImageLoad();
            } else {
                img.addEventListener('load', onImageLoad);
                img.addEventListener('error', onImageLoad); // Count errors as "loaded" too
            }
        });
        
        // Fallback timeout in case images take too long
        setTimeout(resolve, 1000);
    });
}

// Global variables