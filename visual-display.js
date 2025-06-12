// visual-display.js - Visual display and rendering functions
// Functions that handle the visual presentation of decks and cards

/**
 * Render the visual decklist with card images
 * @param {Object} typeGroups - Cards grouped by type
 * @param {Array} commanders - Commander cards (optional)
 */
function renderVisualDecklist(typeGroups, commanders = []) {
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
            const cardStack = createCardStack(uniqueCards, cardCounts, row, cardsPerRow);
            stackDiv.appendChild(cardStack);
        }
        container.appendChild(stackDiv);
    });
}

/**
 * Create a card stack for visual display
 * @param {Array} uniqueCards - Unique cards to display
 * @param {Object} cardCounts - Count of each card
 * @param {number} row - Current row number
 * @param {number} cardsPerRow - Cards per row
 * @returns {HTMLElement} Card stack element
 */
function createCardStack(uniqueCards, cardCounts, row, cardsPerRow) {
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

        const cardWrapper = createCardWrapper(cardName, count, idx, cardsPerRow);
        cardStack.appendChild(cardWrapper);
    }
    
    return cardStack;
}

/**
 * Create a card wrapper with image and count badge
 * @param {string} cardName - Name of the card
 * @param {number} count - Number of copies
 * @param {number} idx - Index in the row
 * @param {number} cardsPerRow - Cards per row
 * @returns {HTMLElement} Card wrapper element
 */
function createCardWrapper(cardName, count, idx, cardsPerRow) {
    const cardWrapper = document.createElement('div');
    cardWrapper.style.position = 'relative';
    cardWrapper.style.display = 'inline-block';
    cardWrapper.style.marginLeft = idx % cardsPerRow === 0 ? '0' : '-32px'; // overlap by 32px

    const cardImg = createCardImage(cardName, {
        width: '110px',
        height: '156px',
        className: 'decklist-card-thumb'
    });
    cardImg.style.border = '2px solid #222';
    cardWrapper.appendChild(cardImg);

    // Add count badge if more than 1
    if (count > 1) {
        const badge = createCountBadge(count);
        cardWrapper.appendChild(badge);
    }

    return cardWrapper;
}

/**
 * Create a count badge for cards with multiple copies
 * @param {number} count - Number of copies
 * @returns {HTMLElement} Count badge element
 */
function createCountBadge(count) {
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
    return badge;
}

/**
 * Update deck display with new deck information
 * @param {Object} deckResult - Deck result object
 * @param {Object} globals - Global variables needed
 */
function updateDeckDisplay(deckResult, globals) {
    const { decklistOutput, chosenPack1Display, chosenPack2Display, chosenCubeCodeDisplay, packSelections, cubeSelect } = globals;
    
    decklistOutput.value = deckResult.decklistText;
    chosenPack1Display.textContent = packSelections.pack1;
    chosenPack2Display.textContent = packSelections.pack2;
    chosenCubeCodeDisplay.textContent = cubeSelect.name;
    renderVisualDecklist(deckResult.typeGroups, deckResult.commanders);
}

/**
 * Finalize deck generation and show final UI
 * @param {Array} deck - Final deck cards
 * @param {Array} commanders - Commander cards
 */
function finalizeDeckGeneration(deck, commanders = []) {
    const cubeSelectionStep = document.getElementById('cubeSelectionStep');
    const packSelectionStep = document.getElementById('packSelectionStep');
    const decklistStep = document.getElementById('decklistStep');
    const copyDecklistBtn = document.getElementById('copyDecklistBtn');
    
    cubeSelectionStep.classList.add('hidden');
    packSelectionStep.classList.add('hidden');
    decklistStep.classList.remove('hidden');
    copyDecklistBtn.disabled = false;
    showMessage('DECKLIST READY!', 'success');
    toggleLoading(false);
    runBullyMeterAnalysis(deck, commanders);
}

/**
 * Run bully meter analysis on the deck
 * @param {Array} deck - Deck cards
 * @param {Array} commanders - Commander cards
 */
function runBullyMeterAnalysis(deck, commanders = []) {
    const bullyMeter = initializeBullyMeter();
    if (bullyMeter) {
        setTimeout(() => {
            const powerScore = bullyMeter.analyzeDeck(deck, commanders);
            console.log(`Deck Power Level: ${Math.round(powerScore)}%`);
        }, 1000);
    }
}
