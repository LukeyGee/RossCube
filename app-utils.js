// app-utils.js - General application utility functions
// Simple utility functions that support the main application logic

/**
 * Get the currently selected cube object
 * @param {string} cubeCode - The code of the selected cube
 * @param {Array} cubesArray - Array of available cubes
 * @returns {Object|undefined} The selected cube object or undefined if not found
 */
function getSelectedCube(cubeCode, cubesArray) {
    return cubesArray.find(cube => cube.code === cubeCode);
}

/**
 * Initialize pack synergy analyzer if available
 * @returns {Object|null} PackSynergyAnalyzer instance or null if not available
 */
function initializePackSynergy() {
    if (window.PackSynergyAnalyzer) {
        const analyzer = new PackSynergyAnalyzer();
        console.log('Pack synergy analyzer initialized');
        return analyzer;
    } else {
        console.warn('PackSynergyAnalyzer not found - synergy features disabled');
        return null;
    }
}

/**
 * Initialize bully meter if available
 * @returns {Object|null} BullyMeter instance or null if not available
 */
function initializeBullyMeter() {
    if (typeof window.BullyMeter === 'undefined') {
        console.warn('BullyMeter not loaded');
        return null;
    }
    return new window.BullyMeter();
}

/**
 * Generate a random selection from an array
 * @param {Array} array - Array to select from
 * @param {number} count - Number of items to select
 * @param {Array} exclude - Items to exclude from selection
 * @returns {Array} Random selection of items
 */
function getRandomSelection(array, count, exclude = []) {
    const filtered = array.filter(item => !exclude.includes(item));
    const shuffled = [...filtered].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, filtered.length));
}

/**
 * Format a card name for URL encoding
 * @param {string} cardName - The card name to format
 * @returns {string} URL-encoded card name
 */
function formatCardNameForUrl(cardName) {
    return encodeURIComponent(cardName);
}

/**
 * Clean up dynamic UI elements
 * @param {string[]} elementIds - Array of element IDs to remove
 */
function cleanupDynamicElements(elementIds) {
    elementIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.remove();
        }
    });
}

/**
 * Copy text to clipboard with fallback for older browsers
 * @param {string} text - Text to copy
 * @param {Function} onSuccess - Success callback
 * @param {Function} onError - Error callback
 */
function copyToClipboard(text, onSuccess, onError) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text)
            .then(() => onSuccess && onSuccess())
            .catch(() => onError && onError());
    } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        
        try {
            textArea.select();
            document.execCommand('copy');
            onSuccess && onSuccess();
        } catch (err) {
            onError && onError();
        } finally {
            document.body.removeChild(textArea);
        }
    }
}
