// ui-helpers.js - Simple UI utility functions
// Self-contained functions that don't depend on global state

/**
 * Display a message to the user
 * @param {string} message - The message text
 * @param {string} type - Message type: 'info', 'success', 'error'
 * @param {number} duration - How long to show the message in milliseconds
 */
function showMessage(message, type = 'info', duration = 3000) {
    const messageDiv = document.createElement('div');
    messageDiv.textContent = message;
    messageDiv.className = `message-box message-box-${type}`;
    
    // Find or create message container
    let messageContainer = document.getElementById('messageContainer');
    if (!messageContainer) {
        console.warn('messageContainer not found, creating one');
        messageContainer = document.createElement('div');
        messageContainer.id = 'messageContainer';
        document.body.appendChild(messageContainer);
    }
    
    messageContainer.appendChild(messageDiv);
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, duration);
}

/**
 * Show or hide an element by ID
 * @param {string} elementId - The ID of the element
 * @param {boolean} isVisible - Whether to show (true) or hide (false)
 */
function setElementVisibility(elementId, isVisible) {
    const element = document.getElementById(elementId);
    if (element) {
        if (isVisible) {
            element.classList.remove('hidden');
        } else {
            element.classList.add('hidden');
        }
    } else {
        console.warn(`Element with ID '${elementId}' not found`);
    }
}

/**
 * Set the text content of an element
 * @param {string} elementId - The ID of the element
 * @param {string} text - The text to set
 */
function setElementText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text;
    } else {
        console.warn(`Element with ID '${elementId}' not found`);
    }
}

/**
 * Set the value of an input element
 * @param {string} elementId - The ID of the input element
 * @param {string} value - The value to set
 */
function setElementValue(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.value = value;
    } else {
        console.warn(`Element with ID '${elementId}' not found`);
    }
}

/**
 * Enable or disable a button
 * @param {string} buttonId - The ID of the button
 * @param {boolean} isEnabled - Whether to enable (true) or disable (false)
 */
function setButtonEnabled(buttonId, isEnabled) {
    const button = document.getElementById(buttonId);
    if (button) {
        button.disabled = !isEnabled;
    } else {
        console.warn(`Button with ID '${buttonId}' not found`);
    }
}

/**
 * Toggle loading state - shows/hides loading indicator and disables/enables buttons
 * @param {boolean} isLoading - Whether app is in loading state
 */
function toggleLoading(isLoading) {
    // Show/hide loading indicator
    setElementVisibility('loadingIndicator', isLoading);
    
    // Disable/enable common buttons during loading
    const buttonIds = ['confirmCubeBtn', 'confirmPackBtn', 'copyDecklistBtn'];
    buttonIds.forEach(buttonId => {
        setButtonEnabled(buttonId, !isLoading);
    });
}

/**
 * Clear all text content from multiple elements
 * @param {string[]} elementIds - Array of element IDs to clear
 */
function clearElements(elementIds) {
    elementIds.forEach(elementId => {
        setElementText(elementId, '');
    });
}

/**
 * Reset app to initial state by clearing displays and hiding steps
 */
function resetUIToInitialState() {
    // Show cube selection, hide other steps
    setElementVisibility('cubeSelectionStep', true);
    setElementVisibility('packSelectionStep', false);
    setElementVisibility('decklistStep', false);
    
    // Clear all displays
    clearElements([
        'chosenPack1',
        'chosenPack2', 
        'chosenCubeCode',
        'selectedCubeName'
    ]);
    
    // Clear decklist output
    setElementValue('decklistOutput', '');
    
    // Reset buttons
    setButtonEnabled('confirmCubeBtn', false);
    setButtonEnabled('confirmPackBtn', false);
    setButtonEnabled('copyDecklistBtn', false);
    
    // Reset cube selection
    const cubeSelect = document.getElementById('cubeSelect');
    if (cubeSelect) {
        cubeSelect.value = '';
    }
    
    // Reset pack selection title
    setElementText('packSelectionTitle', 'STEP 2: CHOOSE PACK 1');
    
    showMessage('App reset. Please select a cube.', 'info');
}