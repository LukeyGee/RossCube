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
            { name: "Old School Jumpstart", code: "osjs", csvPath: "./cubes/osjs.csv" },
            { name: "KvatchStart Commander Cube", code: "kvatchstart", csvPath: "./cubes/kvatchstart.csv", isCommander: true }
        ];
        let currentCubeData = null;
        let availablePackThemes = []; 
        let packSelections = { pack1: null, pack2: null };
        let currentPackOptions = [];

        // --- Helper Functions ---
        function showMessage(message, type = 'info', duration = 3000) {
            const messageDiv = document.createElement('div');
            messageDiv.textContent = message;
            messageDiv.className = `message-box message-box-${type}`;
            messageContainer.appendChild(messageDiv);
            setTimeout(() => {
                messageDiv.remove();
            }, duration);
        }

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

        function setLoading(isLoading) {
            if (isLoading) {
                loadingIndicator.classList.remove('hidden');
                confirmCubeBtn.disabled = true;
                confirmPackBtn.disabled = true; 
                copyDecklistBtn.disabled = true;
            } else {
                loadingIndicator.classList.add('hidden');
                // Button enabling/disabling is handled by context
            }
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
            setLoading(true);
            const cube = cubes.find(c => c.code === cubeCode);
            if (!cube) {
                showMessage('Selected cube not found.', 'error');
                setLoading(false);
                return;
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
                transitionToPackSelection(1); 
                showMessage(`LOADED: ${cube.name} (${currentCubeData.length} cards)`, 'success');
            } catch (error) {
                showMessage(`ERROR: ${error.message}`, 'error', 5000);
                currentCubeData = null;
                resetToCubeSelection(); 
            } finally {
                setLoading(false);
                confirmCubeBtn.disabled = !cubeSelect.value;
            }
        }

        function extractPackThemes() {
            if (!currentCubeData) return;
            const themes = new Set();
            currentCubeData.forEach(card => {
                const cardMaybe = card.Maybe || card.maybeboard;
                if (cardMaybe && cardMaybe == "true") return;
                const cardTags = card.Tags || card.tags;
                if (
                    cardTags &&
                    cardTags.trim() !== "" &&
                    !cardTags.includes("zz_Commander") && // Exclude any tag with zz_Commander
                    cardTags !== "Other" &&
                    cardTags !== "z_Fixing Roster_z" && // Exclude fixing roster
                    cardTags !== "B - The Big Top" &&
                    cardTags !== "WUR - Mutate" &&
                    cardTags !== "WU - Studies" &&
                    cardTags !== "WU - Studies (Lessons)"
                ) {
                    themes.add(cardTags.trim());
                }
            });
            availablePackThemes = Array.from(themes).sort();
        }

        function displayPackChoices(packNumber) {
            packOptionsContainer.innerHTML = ''; 
            confirmPackBtn.disabled = true; 
            let themesToOffer;

            const selectedCube = getSelectedCube();
            const isCommanderCube = selectedCube && selectedCube.isCommander;

            // Use 10 packs for commander cube, 6 for others
            const packsToOffer = isCommanderCube ? 10 : 3;

            if (packNumber === 1) {
                packSelections.pack1 = null; 
                packSelections.pack2 = null; 
                const shuffledThemes = [...availablePackThemes].sort(() => 0.5 - Math.random());
                themesToOffer = shuffledThemes.slice(0, Math.min(packsToOffer, availablePackThemes.length));
                if (availablePackThemes.length < packsToOffer && availablePackThemes.length > 1) {
                     showMessage(`INFO: ${availablePackThemes.length} PACKS AVAILABLE`, 'info', 4000);
                } else if (availablePackThemes.length <= 1 && availablePackThemes.length > 0) {
                     showMessage(`INFO: ONLY 1 PACK THEME IN CUBE`, 'info', 4000);
                }
                currentPackOptions = themesToOffer;
            } else { 
                packSelections.pack2 = null; 
                if (isCommanderCube) {
                    const shuffledThemes = [...availablePackThemes].sort(() => 0.5 - Math.random());
                    themesToOffer = shuffledThemes.filter(theme => theme !== packSelections.pack1).slice(0, Math.min(packsToOffer-1, availablePackThemes.length));
                } else {
                    const shuffledThemes = [...availablePackThemes].sort(() => 0.5 - Math.random());
                    themesToOffer = shuffledThemes.filter(theme => theme !== packSelections.pack1).slice(0, Math.min(packsToOffer, availablePackThemes.length));
                }
                // Add this at the end of your displayPackChoices function, just before the closing }
                
                    // Add synergy analysis after rendering pack options
                    if (packNumber === 2 && packSelections.pack1 && packSynergyAnalyzer && packSynergyAnalyzer.enabled) {
                        setTimeout(() => {
                            packSynergyAnalyzer.addDynamicPackWarnings(packSelections.pack1, currentCubeData);
                        }, 50);
                    }                
            }
            
            if (themesToOffer.length === 0) {
                showMessage('NO MORE PACKS TO CHOOSE', 'error', 5000);
                confirmPackBtn.disabled = true;
                return;
            }

            themesToOffer.forEach((theme, index) => {
                const radioId = `pack_theme_${packNumber}_${index}`;
                const radioName = `pack_selection_group_${packNumber}`;
                const optionDiv = document.createElement('div'); 
                optionDiv.classList.add('radio-option-item');
                const radioInput = document.createElement('input');
                radioInput.type = 'radio';
                radioInput.id = radioId;
                radioInput.name = radioName;
                radioInput.value = theme;
                radioInput.onchange = () => handlePackSelectionChange(theme, packNumber);
                const label = document.createElement('label');
                label.htmlFor = radioId;
                label.textContent = `${theme}`;
                label.classList.add('pack-radio-label');
                optionDiv.appendChild(radioInput);
                optionDiv.appendChild(label);    
                packOptionsContainer.appendChild(optionDiv);
            });
        }

        function handlePackSelectionChange(theme, packNumber) {
            if (packNumber === 1) {
                packSelections.pack1 = theme;
            } else { 
                packSelections.pack2 = theme;
            }
            confirmPackBtn.disabled = false; 
        }

        function generateDecklist() {
            try {
                if (!currentCubeData || !packSelections.pack1 || !packSelections.pack2) {
                    showMessage('ERROR: MISSING SELECTIONS', 'error');
                    return;
                }
                setLoading(true);

                const selectedCube = getSelectedCube();
                const isCommanderCube = selectedCube && selectedCube.isCommander;

                const deck = [];
                let commanders = [];
                currentCubeData.forEach(card => {
                    const cardTagsRaw = card.Tags || card.tags || "";
                    const cardTags = cardTagsRaw.split(";").map(t => t.trim());
                    const cardMaybe = card.Maybe || card.maybeboard;
                    if (cardMaybe && cardMaybe == "true") return;

                    // Find commander tags and extract the pack name
                    const commanderTag = cardTags.find(tag => tag.includes("zz_Commander"));
                    if (commanderTag) {
                        // If tag is "W - Farmers;zz_Commander" or "zz_Commander;2 - Rebel Yell"
                        let packName = null;
                        if (commanderTag === "zz_Commander") {
                            // The other tag is the pack name
                            packName = cardTags.find(tag => tag !== "zz_Commander");
                        } else if (commanderTag.startsWith("zz_Commander;")) {
                            packName = commanderTag.replace("zz_Commander;", "").trim();
                        } else if (commanderTag.endsWith(";zz_Commander")) {
                            packName = commanderTag.replace(";zz_Commander", "").trim();
                        }
                        // If this commander matches either selected pack, add it
                        if (
                            packName &&
                            (packName === packSelections.pack1 || packName === packSelections.pack2) &&
                            !commanders.some(c => (c.Name || c.name) === (card.Name || card.name))
                        ) {
                            commanders.push(card);
                        }
                    } else if (
                        cardTags.includes(packSelections.pack1) ||
                        cardTags.includes(packSelections.pack2)
                    ) {
                        const cardName = card.Name || card.name;
                        if (
                            cardName && 
                            cardName.trim() !== "" &&
                            cardName !== "Dungeon of the Mad Mage" &&
                            cardName !== "Lost Mine of Phandelver" &&
                            cardName !== "Tomb of Annihilation" &&
                            cardName !== "The Ring" &&
                            cardName !== "Undercity" &&
                            cardName !== "Cragflame"
                        ) {
                            deck.push(card);
                        }
                    }
                });

                // Commander cube: Koffers and Fixing Lands steps
                if (isCommanderCube) {
                    // Group by main type, merging Sorcery+Instant and Artifact+Enchantment
                    const typeGroups = {
                        Creature: [],
                        "Instant / Sorcery": [],
                        "Artifact / Enchantment": [],
                        Planeswalker: [],
                        Other: []
                    };
                    deck.forEach(card => {
                        const typeLine = (card.Type || card.type || card.type_line || "").toLowerCase();
                        if (typeLine.includes("creature")) typeGroups.Creature.push(card);
                        else if (typeLine.includes("instant") || typeLine.includes("sorcery")) typeGroups["Instant / Sorcery"].push(card);
                        else if (typeLine.includes("artifact") || typeLine.includes("enchantment")) typeGroups["Artifact / Enchantment"].push(card);
                        else if (typeLine.includes("planeswalker")) typeGroups.Planeswalker.push(card);
                        else typeGroups.Other.push(card);
                    });
                    renderVisualDecklist(typeGroups, commanders);

                    // Koffers pool: filter by tag or column (adjust as needed)
                    const koffersPool = currentCubeData.filter(card =>
                        (card.tags && card.tags.includes("z_Kvatch Koffers")) ||
                        (card.Tags && card.Tags.includes("z_Kvatch Koffers"))
                    );
                    if (!koffersPool.length) {
                    showMessage('No Koffers cards found!', 'error');
                    setLoading(false);
                    return;
                    }
                    renderKoffersStep(koffersPool, koffersCard => {
                    // Fixing lands pool: filter by tag or column (adjust as needed)
                        const fixingPool = currentCubeData.filter(card =>
                            (card.tags && card.tags.includes("z_Fixing Roster_z")) ||
                            (card.Tags && card.Tags.includes("z_Fixing Roster_z"))
                        );
                        renderFixingLandsStep(fixingPool, deck, async (fixingLands, landsToRemove) => {
                        // Add Koffers card and Command Tower
                        deck.push(koffersCard);
                        deck.push({ Name: "Command Tower", name: "Command Tower" });

                        // Remove a basic land for each fixing land added
                        fixingLands.forEach((landName, i) => {
                            const idx = deck.findIndex(card =>
                                (card.Name || card.name) === landsToRemove[i]
                            );
                            if (idx !== -1) deck.splice(idx, 1);
                            // Add the fixing land
                            deck.push({ Name: landName, name: landName });
                        });

                        // Regroup after koffer and fixing lands
                        typeGroups.Creature.length = 0;
                        typeGroups["Instant / Sorcery"].length = 0;
                        typeGroups["Artifact / Enchantment"].length = 0;
                        typeGroups.Planeswalker.length = 0;
                        typeGroups.Other.length = 0;
                        deck.forEach(card => {
                            const typeLine = (card.Type || card.type || card.type_line || "").toLowerCase();
                            if (typeLine.includes("creature")) typeGroups.Creature.push(card);
                            else if (typeLine.includes("instant") || typeLine.includes("sorcery")) typeGroups["Instant / Sorcery"].push(card);
                            else if (typeLine.includes("artifact") || typeLine.includes("enchantment")) typeGroups["Artifact / Enchantment"].push(card);
                            else if (typeLine.includes("planeswalker")) typeGroups.Planeswalker.push(card);
                            else typeGroups.Other.push(card);
                        });

                        // Show decklist and visual decklist
                        if (isCommanderCube && commanders.length > 0) {
                            const mainDeckLines = deck
                                .map(card => `1 ${card.Name || card.name}`)
                                .sort();
                            const commanderLines = commanders
                                .map(card => `1 ${card.Name || card.name}`)
                                .sort();
                            decklistOutput.value = mainDeckLines.join('\n') + '\n\n' + commanderLines.join('\n');
                        } else {
                            decklistOutput.value = deck
                                .map(card => `1 ${card.Name || card.name}`)
                                .sort()
                                .join('\n');
                        }
                        chosenPack1Display.textContent = packSelections.pack1;
                        chosenPack2Display.textContent = packSelections.pack2;
                        chosenCubeCodeDisplay.textContent = cubeSelect.name;
                        cubeSelectionStep.classList.add('hidden');
                        packSelectionStep.classList.add('hidden');
                        decklistStep.classList.remove('hidden');

                        showMessage('DECKLIST READY!', 'success');
                        setLoading(false);
                        copyDecklistBtn.disabled = false;
                        renderVisualDecklist(typeGroups, commanders);
                });
            });
            setLoading(false);
            return;
        }

            // --- Normal cube logic below ---
            // Group by main type, merging Sorcery+Instant and Artifact+Enchantment
            const typeGroups = {
                Creature: [],
                "Instant / Sorcery": [],
                "Artifact / Enchantment": [],
                Planeswalker: [],
                Other: []
            };
            deck.forEach(card => {
                const typeLine = (card.Type || card.type || card.type_line || "").toLowerCase();
                if (typeLine.includes("creature")) typeGroups.Creature.push(card);
                else if (typeLine.includes("instant") || typeLine.includes("sorcery")) typeGroups["Instant / Sorcery"].push(card);
                else if (typeLine.includes("artifact") || typeLine.includes("enchantment")) typeGroups["Artifact / Enchantment"].push(card);
                else if (typeLine.includes("planeswalker")) typeGroups.Planeswalker.push(card);
                else typeGroups.Other.push(card);
            });

            // Show text decklist as before
            decklistOutput.value = deck.map(card => `1 ${card.Name || card.name}`).sort().join('\n');
            chosenPack1Display.textContent = packSelections.pack1;
            chosenPack2Display.textContent = packSelections.pack2;
            chosenCubeCodeDisplay.textContent = cubeSelect.name;

            cubeSelectionStep.classList.add('hidden');
            packSelectionStep.classList.add('hidden');
            decklistStep.classList.remove('hidden');

            showMessage('DECKLIST READY!', 'success');
            setLoading(false);
            copyDecklistBtn.disabled = false;

            // Render visual decklist
            renderVisualDecklist(typeGroups);
        } catch (err) {
            showMessage('ERROR: ' + err.message, 'error', 5000);
            setLoading(false);
        }
    }

    function transitionToPackSelection(packNumber) {
        cubeSelectionStep.classList.add('hidden');
        packSelectionStep.classList.remove('hidden');
        decklistStep.classList.add('hidden');
        displayPackChoices(packNumber);
    }

    cubeSelect.addEventListener('change', () => {
        confirmCubeBtn.disabled = !cubeSelect.value;
    });

    confirmCubeBtn.addEventListener('click', () => {
        if (cubeSelect.value) {
            fetchAndProcessCube(cubeSelect.value);
        }
    });

    confirmPackBtn.addEventListener('click', () => {
    // If pack 1 not chosen, move to pack 2 selection
    if (!packSelections.pack1) {
        showMessage('Please select your first pack.', 'error');
        return;
    }
    // If pack 2 not chosen, move to pack 2 selection
    if (!packSelections.pack2) {
        transitionToPackSelection(2);
        packSelectionTitle.textContent = "STEP 2: CHOOSE PACK 2";
        return;
    }
    // Both packs chosen, generate decklist and move to decklist step
    packSelectionStep.classList.add('hidden');
    decklistStep.classList.remove('hidden');
    generateDecklist();
});

    copyDecklistBtn.addEventListener('click', () => {
    const text = decklistOutput.value;
    if (!text) {
        showMessage('Nothing to copy!', 'error');
        return;
    }
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text)
            .then(() => showMessage('Decklist copied to clipboard!', 'success'))
            .catch(() => showMessage('Failed to copy decklist.', 'error'));
    } else {
        // Fallback for older browsers
        decklistOutput.removeAttribute('readonly');
        decklistOutput.select();
        try {
            document.execCommand('copy');
            showMessage('Decklist copied to clipboard!', 'success');
        } catch (err) {
            showMessage('Failed to copy decklist.', 'error');
        }
        decklistOutput.setAttribute('readonly', true);
        window.getSelection().removeAllRanges();
    }
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
    cardHoverPreview.classList.remove('show');
    cardHoverPreview.src = '';
    showMessage('App reset. Please select a cube.', 'info');
}

populateCubeSelect();

// Initialize pack synergy analyzer
function initializePackSynergy() {
    if (window.PackSynergyAnalyzer) {
        packSynergyAnalyzer = new PackSynergyAnalyzer();
        console.log('Pack synergy analyzer initialized');
    } else {
        console.warn('PackSynergyAnalyzer not found - synergy features disabled');
    }
}

initializePackSynergy();

function getSelectedCube() {
    return cubes.find(cube => cube.code === cubeSelect.value);
}

function renderCommanderZone(commanders) {
    let zone = document.getElementById('commanderZone');
    if (!zone) {
        zone = document.createElement('div');
        zone.id = 'commanderZone';
        zone.className = 'mt-4';
        // Insert before the visual decklist
        const visualDecklist = document.getElementById('visualDecklist');
        if (visualDecklist && visualDecklist.parentNode) {
            visualDecklist.parentNode.insertBefore(zone, visualDecklist);
        }
    }
    if (!commanders || commanders.length === 0) {
        zone.innerHTML = '';
        return;
    }
    zone.innerHTML = "<h3 style='color:#facc15'>Commanders</h3>";
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '12px';
    commanders.forEach(card => {
        const cardName = card.Name || card.name;
        const img = document.createElement('img');
        img.src = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}&format=image`;
        img.alt = cardName;
        img.title = cardName;
        img.style.width = '110px';
        img.style.height = '156px';
        img.style.objectFit = 'cover';
        img.style.border = '2px solid #facc15';
        img.style.borderRadius = '4px';
        img.style.background = '#111';
        img.style.cursor = 'pointer';
        img.className = 'decklist-card-thumb';
        attachCardHoverPreview(img, cardName);
        row.appendChild(img);
    });
    zone.appendChild(row);
}

function renderKoffersStep(koffersPool, onSelect) {
    // Remove any existing Koffers step UI
    const existing = document.getElementById('koffersStep');
    if (existing) existing.remove();

    const koffersDiv = document.createElement('div');
    koffersDiv.id = 'koffersStep';
    koffersDiv.className = 'mt-4';
    koffersDiv.innerHTML = "<h3 style='color:#facc15'>Pick Your Kvatch Koffers Artifact</h3>";

    // Pick 3 random Koffers cards to offer
    const choices = [];
    const poolCopy = [...koffersPool];
    for (let i = 0; i < 3 && poolCopy.length > 0; i++) {
        const idx = Math.floor(Math.random() * poolCopy.length);
        choices.push(poolCopy.splice(idx, 1)[0]);
    }

    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '16px';

    choices.forEach(card => {
    const cardName = card.Name || card.name;
    const btn = document.createElement('button');
    btn.className = 'btn-secondary';
    btn.style.display = 'flex';
    btn.style.flexDirection = 'column';
    btn.style.alignItems = 'center';

    // Create the image element and attach hover preview
    const img = document.createElement('img');
    img.src = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}&format=image`;
    img.alt = cardName;
    img.title = cardName;
    img.style.width = '90px';
    img.style.height = '128px';
    img.style.marginBottom = '8px';
    attachCardHoverPreview(img, cardName);

    btn.appendChild(img);
    btn.appendChild(document.createTextNode(cardName));
    btn.onclick = () => {
        cardHoverPreview.classList.remove('show');
        cardHoverPreview.src = '';
        koffersDiv.remove();
        onSelect(card);
    };
    row.appendChild(btn);
});

    koffersDiv.appendChild(row);
    decklistStep.prepend(koffersDiv);
}

async function renderFixingLandsStep(fixingPool, deck, onSelect) {
    // Remove any existing Fixing Lands step UI
    const existing = document.getElementById('fixingLandsStep');
    if (existing) existing.remove();

    // --- Get color identity from both packs ---
    function extractColors(packName) {
        if (!packName) return [];
        const colorPart = packName.split(' - ')[0].trim();
        return colorPart.replace(/[^WUBRG]/g, '').split('');
    }
    const colors1 = extractColors(packSelections.pack1);
    const colors2 = extractColors(packSelections.pack2);
    const combinedColors = Array.from(new Set([...colors1, ...colors2]));

    // --- Filter fixingPool for relevant color identity ---
    function landMatchesColor(card) {
        let landColors = (card.Color || card.color || '').toUpperCase().replace(/[^WUBRG]/g, '').split('').filter(Boolean);
        if (!landColors.length) return true;
        if (!combinedColors.length) return false;
        return landColors.some(color => combinedColors.includes(color));
    }
    const filteredFixingPool = fixingPool.filter(landMatchesColor);

    // --- Fetch oracle text from Scryfall ---
    const scryfallCache = {};
    async function getOracleText(cardName) {
        if (scryfallCache[cardName]) return scryfallCache[cardName];
        try {
            const resp = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`);
            if (!resp.ok) throw new Error('Not found');
            const data = await resp.json();
            scryfallCache[cardName] = data.oracle_text ? data.oracle_text.toLowerCase() : '';
            return scryfallCache[cardName];
        } catch {
            scryfallCache[cardName] = '';
            return '';
        }
    }

    // --- Infer effect from oracle text ---
    function inferEffect(text) {
        if (text.includes('scry')) return 'Scry Lands';
        if (text.includes('deals') && text.includes('damage')) return 'Pain Lands';
        if (text.includes('gain') && text.includes('life')) return 'Gain Lands';
        if (text.includes('cycling')) return 'Cycling Lands';
        if (text.includes('fetch') || text.includes('search your library')) return 'Fetch Lands';
        if (text.includes('enters tapped')) return 'Tapped Lands';
        if (text.includes('draw a card')) return 'Draw Lands';
        if (text.includes('sacrifice') && text.includes('add')) return 'Sacrifice for Mana';
        if (text.includes('untap')) return 'Untap Lands';
        return 'Other';
    }

    // --- Build groupedLands with Scryfall text ---
    const groupedLands = {};
    const oracleTexts = await Promise.all(filteredFixingPool.map(card =>
        getOracleText(card.Name || card.name)
    ));
    filteredFixingPool.forEach((card, i) => {
        const cardName = card.Name || card.name;
        const text = oracleTexts[i] || '';
        const effect = inferEffect(text);
        if (!groupedLands[effect]) groupedLands[effect] = [];
        groupedLands[effect].push(card);
    });

    // --- Render each group as a disclosure triangle with card art ---
    const fixingDiv = document.createElement('div');
    fixingDiv.id = 'fixingLandsStep';
    fixingDiv.className = 'mt-4';
    fixingDiv.innerHTML = `<h3 style='color:#facc15'>Pick up to 6 Fixing Lands (optional)</h3>
        <p style="color:#94a3b8;font-size:0.9rem;">Only lands matching your deck's color identity are shown. Grouped by effect.</p>`;

    Object.entries(groupedLands).forEach(([effect, cards]) => {
        const details = document.createElement('details');
        details.style.marginBottom = '16px';
        const summary = document.createElement('summary');
        summary.textContent = effect;
        summary.style.fontWeight = 'bold';
        summary.style.color = '#facc15';
        summary.style.fontSize = '1.1rem';
        summary.style.cursor = 'pointer';
        details.appendChild(summary);

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.flexWrap = 'wrap';
        row.style.gap = '12px';
        row.style.marginTop = '10px';

        cards.forEach(card => {
            const cardName = card.Name || card.name;
            const btn = document.createElement('button');
            btn.style.background = 'none';
            btn.style.border = 'none';
            btn.style.padding = '0';
            btn.style.cursor = 'pointer';
            btn.style.position = 'relative';

            const img = document.createElement('img');
            img.src = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}&format=image`;
            img.alt = cardName;
            img.title = cardName;
            img.style.width = '110px';
            img.style.height = '156px';
            img.style.objectFit = 'cover';
            img.style.border = '2px solid #facc15';
            img.style.borderRadius = '4px';
            img.style.background = '#111';
            img.className = 'decklist-card-thumb';

            attachCardHoverPreview(img, cardName);

            btn.appendChild(img);

            // Add a checkmark overlay if selected
            const check = document.createElement('span');
            check.textContent = '✔';
            check.style.position = 'absolute';
            check.style.top = '6px';
            check.style.right = '10px';
            check.style.fontSize = '1.5rem';
            check.style.color = '#00ff00';
            check.style.display = 'none';
            btn.appendChild(check);

            btn.onclick = () => {
                if (btn.classList.contains('selected')) {
                    btn.classList.remove('selected');
                    check.style.display = 'none';
                } else {
                    const selected = fixingDiv.querySelectorAll('.selected');
                    if (selected.length >= 6) {
                        showMessage('You can only select up to 6 fixing lands.', 'error', 2000);
                        return;
                    }
                    btn.classList.add('selected');
                    check.style.display = '';
                }
                updateSelected();
            };

            row.appendChild(btn);
        });

        details.appendChild(row);
        fixingDiv.appendChild(details);
    });

    // --- Confirm button ---
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn mt-4';
    confirmBtn.textContent = 'Confirm Fixing Lands';
    confirmBtn.disabled = false;
    fixingDiv.appendChild(confirmBtn);

    function updateSelected() {
        const selected = fixingDiv.querySelectorAll('.selected');
        confirmBtn.disabled = selected.length > 6;
    }
    updateSelected();

    confirmBtn.onclick = async () => {
        cardHoverPreview.classList.remove('show');
        cardHoverPreview.src = '';
        const selected = Array.from(fixingDiv.querySelectorAll('.selected')).map(btn =>
            btn.querySelector('img').alt
        );
        fixingDiv.remove();

        // Clone the deck so we can update it as we remove basics
        let basicsDeck = deck.filter(card => ["Plains", "Island", "Swamp", "Mountain", "Forest"].includes(card.Name || card.name));
        const landsToRemove = [];
        for (let i = 0; i < selected.length; i++) {
            if (basicsDeck.length === 0) {
                showMessage('No basic lands left to remove!', 'error', 3000);
                break;
            }
            const choice = await promptBasicLandToRemove(basicsDeck, i + 1, selected.length);
            if (!choice) break; // User cancelled
            landsToRemove.push(choice);

            // Remove the chosen basic from basicsDeck (only one copy)
            const idx = basicsDeck.findIndex(card => (card.Name || card.name) === choice);
            if (idx !== -1) basicsDeck.splice(idx, 1);

            showMessage(`${choice} removed from the deck.`, 'success', 1200);
        }
        onSelect(selected, landsToRemove);
    };

    // Helper: Prompt user to pick a basic land to remove, showing only those left and their counts, with a counter and card images
    function promptBasicLandToRemove(basicsDeck, current, total) {
        return new Promise(resolve => {
            // Count remaining basics
            const counts = {};
            basicsDeck.forEach(card => {
                const name = card.Name || card.name;
                counts[name] = (counts[name] || 0) + 1;
            });
            const basicNames = Object.keys(counts);

            // Create modal
            const modal = document.createElement('div');
            modal.style.position = 'fixed';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.width = '100vw';
            modal.style.height = '100vh';
            modal.style.background = 'rgba(0,0,0,0.7)';
            modal.style.display = 'flex';
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
            modal.style.zIndex = '9999';

            const box = document.createElement('div');
            box.style.background = '#222';
            box.style.padding = '24px';
            box.style.borderRadius = '12px';
            box.style.textAlign = 'center';

            const msg = document.createElement('div');
            msg.innerHTML = `<span style="color:#facc15">Choose a basic land to remove:</span><br><span style="color:#94a3b8;font-size:0.9rem;">(${current}/${total})</span>`;
            msg.style.marginBottom = '16px';
            box.appendChild(msg);

            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.justifyContent = 'center';
            row.style.gap = '16px';
            row.style.marginBottom = '8px';

            basicNames.forEach(name => {
                const btn = document.createElement('button');
                btn.style.background = 'none';
                btn.style.border = 'none';
                btn.style.padding = '0';
                btn.style.cursor = 'pointer';
                btn.style.display = 'flex';
                btn.style.flexDirection = 'column';
                btn.style.alignItems = 'center';

                const img = document.createElement('img');
                img.src = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}&format=image`;
                img.alt = name;
                img.title = name;
                img.style.width = '90px';
                img.style.height = '128px';
                img.style.marginBottom = '6px';
                img.style.border = '2px solid #facc15';
                img.style.borderRadius = '4px';
                img.style.background = '#111';

                btn.appendChild(img);

                const label = document.createElement('span');
                label.textContent = `${name} (${counts[name]})`;
                label.style.color = '#facc15';
                label.style.fontSize = '1rem';
                btn.appendChild(label);

                btn.onclick = () => {
                    document.body.removeChild(modal);
                    resolve(name);
                };
                row.appendChild(btn);
            });

            box.appendChild(row);
            modal.appendChild(box);
            document.body.appendChild(modal);
        });
    }

    decklistStep.prepend(fixingDiv);
}

function renderVisualDecklist(typeGroups) {
    const container = document.getElementById('visualDecklist');
    container.innerHTML = '';

    // Preload all unique card images for the decklist
    const allCardNames = [];
    Object.values(typeGroups).forEach(cards => {
        cards.forEach(card => {
            const cardName = card.Name || card.name;
            if (cardName && !allCardNames.includes(cardName)) {
                allCardNames.push(cardName);
            }
        });
    });
    preloadCardImages(allCardNames);

    Object.entries(typeGroups).forEach(([type, cards]) => {
        // Skip empty groups and "Other" if it only contains lands
        if (cards.length === 0) return;
        if (type === "Other") {
            // Filter out lands from "Other"
            const nonLandCards = cards.filter(card => {
                const typeLine = (card.Type || card.type || card.type_line || "").toLowerCase();
                return !typeLine.includes("land");
            });
            if (nonLandCards.length === 0) return; // Don't show "Other" if only lands
            cards = nonLandCards;
        }

        // Count duplicates by card name
        const cardCounts = {};
        cards.forEach(card => {
            const cardName = card.Name || card.name;
            cardCounts[cardName] = (cardCounts[cardName] || 0) + 1;
        });

        // Only unique cards for display
        const uniqueCards = Object.keys(cardCounts).map(cardName =>
            cards.find(card => (card.Name || card.name) === cardName)
        );

        const stackDiv = document.createElement('div');
        stackDiv.className = 'mb-6';
        const title = document.createElement('h3');
        title.textContent = type;
        title.style.color = '#facc15';
        stackDiv.appendChild(title);

        // Creature: two rows, others: one row
        let cardsPerRow = 8;
        if (type === "Creature") {
            cardsPerRow = Math.ceil(uniqueCards.length / 2);
        }

        for (let row = 0; row < (type === "Creature" ? 2 : 1); row++) {
            const cardStack = document.createElement('div');
            cardStack.style.display = 'flex';
            cardStack.style.flexDirection = 'row';
            cardStack.style.position = 'relative';
            cardStack.style.height = '156px';
            cardStack.style.gap = '0';

            const startIdx = row * cardsPerRow;
            const endIdx = Math.min(startIdx + cardsPerRow, uniqueCards.length);

            for (let idx = startIdx; idx < endIdx; idx++) {
                const card = uniqueCards[idx];
                const cardName = card.Name || card.name;
                const count = cardCounts[cardName];

                const cardWrapper = document.createElement('div');
                cardWrapper.style.position = 'relative';
                cardWrapper.style.display = 'inline-block';
                cardWrapper.style.marginLeft = idx % cardsPerRow === 0 ? '0' : '-32px'; // overlap by 32px

                const cardImg = document.createElement('img');
                cardImg.src = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}&format=image`;
                cardImg.alt = cardName;
                cardImg.title = cardName;
                cardImg.style.width = '110px';
                cardImg.style.height = '156px';
                cardImg.style.objectFit = 'cover';
                cardImg.style.border = '2px solid #222';
                cardImg.style.borderRadius = '4px';
                cardImg.style.background = '#111';
                cardImg.style.cursor = 'pointer';
                cardImg.className = 'decklist-card-thumb';

                // Use your existing hover preview
                attachCardHoverPreview(cardImg, cardName);

                cardWrapper.appendChild(cardImg);

                // Add count badge if more than 1
                if (count > 1) {
                    const badge = document.createElement('span');
                    badge.textContent = `x${count}`;
                    badge.style.position = 'absolute';
                    badge.style.bottom = '4px';
                    badge.style.left = '6px';
                    badge.style.background = '#1a1a2e';
                    badge.style.color = '#facc15';
                    badge.style.fontFamily = "'Press Start 2P', cursive";
                    badge.style.fontSize = '0.85rem';
                    badge.style.padding = '2px 6px';
                    badge.style.borderRadius = '6px';
                    badge.style.border = '1px solid #222';
                    badge.style.pointerEvents = 'none';
                    cardWrapper.appendChild(badge);
                }

                cardStack.appendChild(cardWrapper);
            }
            stackDiv.appendChild(cardStack);
        }
        container.appendChild(stackDiv);
    });
}

function attachCardHoverPreview(imgElement, cardName) {
    imgElement.addEventListener('mouseenter', (e) => {
        cardHoverPreview.src = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}&format=image&version=normal`;
        cardHoverPreview.classList.add('show');
        positionCardPreview(e);
    });
    imgElement.addEventListener('mousemove', positionCardPreview);
    imgElement.addEventListener('mouseleave', () => {
        cardHoverPreview.classList.remove('show');
        cardHoverPreview.src = '';
    });
    function positionCardPreview(e) {
        const previewWidth = cardHoverPreview.offsetWidth || 488;
        const previewHeight = cardHoverPreview.offsetHeight || 680;
        let x = e.clientX + 24;
        let y = e.clientY - 40;

        // Prevent overflow right/bottom
        const maxX = window.innerWidth - previewWidth - 8;
        const maxY = window.innerHeight - previewHeight - 8;

        if (x > maxX) x = maxX;
        if (y > maxY) y = maxY;
        if (x < 0) x = 0;
        if (y < 0) y = 0;

        cardHoverPreview.style.left = x + 'px';
        cardHoverPreview.style.top = y + 'px';
    }
}

function preloadCardImages(cardNames) {
    cardNames.forEach(cardName => {
        const img = new Image();
        img.src = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}&format=image&version=normal`;
    });
}