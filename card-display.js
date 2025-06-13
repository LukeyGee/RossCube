// card-display.js - Card display and preview utilities
// Functions for handling card visualization, hover previews, and image management

/**
 * Attach hover preview functionality to a card image element
 * @param {HTMLImageElement} imgElement - The image element to attach hover to
 * @param {string} cardName - The name of the card for preview
 */
function attachCardHoverPreview(imgElement, cardName) {
    const cardHoverPreview = document.getElementById('cardHoverPreview');
    if (!cardHoverPreview) {
        console.warn('cardHoverPreview element not found');
        return;
    }

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

/**
 * Simple Sleep Function to ratelimit API calls
 * @param {*} ms to sleep
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Preload card images for better performance
 * @param {string[]} cardNames - Array of card names to preload
 */
function preloadCardImages(cardNames) {
    cardNames.forEach(cardName => {
        const img = new Image();
        sleep(101).then(img.src = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}&format=image&version=normal`);
    });
}

/**
 * Create a standard card image element with consistent styling
 * @param {string} cardName - The name of the card
 * @param {Object} options - Styling options
 * @param {string} options.width - Image width (default: '122px')
 * @param {string} options.height - Image height (default: '170px')
 * @param {boolean} options.hoverPreview - Whether to attach hover preview (default: true)
 * @param {string} options.className - Additional CSS class (default: 'decklist-card-thumb')
 * @returns {HTMLImageElement} The created image element
 */
function createCardImage(cardName, options = {}) {
    const {
        width = '122px',
        height = '170px',
        hoverPreview = true,
        className = 'decklist-card-thumb'
    } = options;

    const img = document.createElement('img');
    img.src = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}&format=image&version=normal`;
    img.alt = cardName;
    img.title = cardName;
    img.style.width = width;
    img.style.height = height;
    img.style.objectFit = 'cover';
    img.style.border = '2px solid #facc15';
    img.style.borderRadius = '4px';
    img.style.background = '#111';
    img.style.cursor = 'pointer';
    img.className = className;

    if (hoverPreview) {
        attachCardHoverPreview(img, cardName);
    }

    return img;
}

/**
 * Hide the card preview (useful for cleanup)
 */
function hideCardPreview() {
    const cardHoverPreview = document.getElementById('cardHoverPreview');
    if (cardHoverPreview) {
        cardHoverPreview.classList.remove('show');
        cardHoverPreview.src = '';
    }
}
