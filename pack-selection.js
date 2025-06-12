// pack-selection.js - Pack selection UI and logic
// Functions for handling pack selection interface and validation

/**
 * Display pack choices for the given pack number
 * @param {number} packNumber - Which pack (1 or 2) to display choices for
 * @param {Object} globals - Global variables needed (packOptionsContainer, confirmPackBtn, etc.)
 */
function displayPackChoices(packNumber, globals) {
    const { 
        packOptionsContainer, 
        confirmPackBtn, 
        availablePackThemes, 
        packSelections, 
        cubeSelect, 
        cubes, 
        currentCubeData, 
        packSynergyAnalyzer 
    } = globals;
    
    packOptionsContainer.innerHTML = ''; 
    confirmPackBtn.disabled = true;
    let themesToOffer;

    const selectedCube = getSelectedCube(cubeSelect.value, cubes);
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
        globals.currentPackOptions = themesToOffer;
    } else { 
        packSelections.pack2 = null; 
        if (isCommanderCube) {
            const shuffledThemes = [...availablePackThemes].sort(() => 0.5 - Math.random());
            themesToOffer = shuffledThemes.filter(theme => theme !== packSelections.pack1).slice(0, Math.min(packsToOffer-1, availablePackThemes.length));
        } else {
            const shuffledThemes = [...availablePackThemes].sort(() => 0.5 - Math.random());
            themesToOffer = shuffledThemes.filter(theme => theme !== packSelections.pack1).slice(0, Math.min(packsToOffer, availablePackThemes.length));
        }
        
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
        radioInput.onchange = () => handlePackSelectionChange(theme, packNumber, globals);
        const label = document.createElement('label');
        label.htmlFor = radioId;
        label.textContent = `${theme}`;
        label.classList.add('pack-radio-label');
        optionDiv.appendChild(radioInput);
        optionDiv.appendChild(label);    
        packOptionsContainer.appendChild(optionDiv);
    });
}

/**
 * Handle pack selection change
 * @param {string} theme - Selected pack theme
 * @param {number} packNumber - Which pack (1 or 2)
 * @param {Object} globals - Global variables needed
 */
function handlePackSelectionChange(theme, packNumber, globals) {
    console.log('Pack selection changed:', theme, packNumber); // Debug log
    const { packSelections, confirmPackBtn } = globals;
    
    if (packNumber === 1) {
        packSelections.pack1 = theme;
    } else { 
        packSelections.pack2 = theme;
    }
    confirmPackBtn.disabled = false; 
    console.log('Pack selections:', packSelections); // Debug log
}

/**
 * Transition to pack selection step
 * @param {number} packNumber - Which pack number to display
 * @param {Object} globals - Global variables needed
 */
function transitionToPackSelection(packNumber, globals) {
    const { cubeSelectionStep, packSelectionStep, decklistStep } = globals;
    
    cubeSelectionStep.classList.add('hidden');
    packSelectionStep.classList.remove('hidden');
    decklistStep.classList.add('hidden');
    displayPackChoices(packNumber, globals);
}

/**
 * Validate pack selections and handle transitions
 * @param {Object} packSelections - Current pack selections
 * @param {Object} globals - Global variables needed
 * @returns {boolean} True if both packs chosen, false if need to continue
 */
function validatePackSelections(packSelections, globals) {
    console.log('Validating pack selections:', packSelections); // Debug log
    const { packSelectionTitle } = globals;
    
    // If pack 1 not chosen, show error
    if (!packSelections.pack1) {
        console.log('Pack 1 not selected'); // Debug log
        showMessage('Please select your first pack.', 'error');
        return false;
    }
    
    // If pack 2 not chosen, move to pack 2 selection
    if (!packSelections.pack2) {
        console.log('Pack 2 not selected, transitioning to pack 2'); // Debug log
        transitionToPackSelection(2, globals);
        packSelectionTitle.textContent = "STEP 2: CHOOSE PACK 2";
        return false;
    }
    
    // Both packs chosen
    console.log('Both packs selected, proceeding to deck generation'); // Debug log
    return true;
}
