// Deck building logic - pure data processing functions

function getCardsFromPacks(cubeData, pack1Name, pack2Name) {
    const deck = [];
    
    cubeData.forEach(card => {
        const cardTagsRaw = card.Tags || card.tags || "";
        const cardTags = cardTagsRaw.split(";").map(t => t.trim());
        const cardMaybe = card.Maybe || card.maybeboard;
        
        if (cardMaybe && cardMaybe == "true") return;

        if (cardTags.includes(pack1Name) || cardTags.includes(pack2Name)) {
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
    
    return deck;
}

function extractCommanders(cubeData, pack1Name, pack2Name) {
    const commanders = [];
    
    cubeData.forEach(card => {
        const cardTagsRaw = card.Tags || card.tags || "";
        const cardTags = cardTagsRaw.split(";").map(t => t.trim());
        
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
                (packName === pack1Name || packName === pack2Name) &&
                !commanders.some(c => (c.Name || c.name) === (card.Name || card.name))
            ) {
                commanders.push(card);
            }
        }
    });
    
    return commanders;
}

function categorizeCards(deck) {
    const typeGroups = {
        Creature: [],
        "Instant / Sorcery": [],
        "Artifact / Enchantment": [],
        Planeswalker: [],
        Other: []
    };
    
    deck.forEach(card => {
        const typeLine = (card.Type || card.type || card.type_line || "").toLowerCase();
        if (typeLine.includes("creature")) {
            typeGroups.Creature.push(card);
        } else if (typeLine.includes("instant") || typeLine.includes("sorcery")) {
            typeGroups["Instant / Sorcery"].push(card);
        } else if (typeLine.includes("artifact") || typeLine.includes("enchantment")) {
            typeGroups["Artifact / Enchantment"].push(card);
        } else if (typeLine.includes("planeswalker")) {
            typeGroups.Planeswalker.push(card);
        } else {
            typeGroups.Other.push(card);
        }
    });
    
    return typeGroups;
}

function formatDecklistText(deck, commanders = []) {
    if (commanders.length > 0) {
        const mainDeckLines = deck.map(card => `1 ${card.Name || card.name}`).sort();
        const commanderLines = commanders.map(card => `1 ${card.Name || card.name}`).sort();
        return mainDeckLines.join('\n') + '\n\n' + commanderLines.join('\n');
    }
    
    return deck.map(card => `1 ${card.Name || card.name}`).sort().join('\n');
}

function buildBasicDeck(cubeData, pack1Name, pack2Name, isCommander = false) {
    const deck = getCardsFromPacks(cubeData, pack1Name, pack2Name);
    const commanders = isCommander ? extractCommanders(cubeData, pack1Name, pack2Name) : [];
    const typeGroups = categorizeCards(deck);
    const decklistText = formatDecklistText(deck, commanders);
    
    return {
        deck,
        commanders,
        typeGroups,
        decklistText,
        cardCount: deck.length
    };
}

function applyCommanderCubeAdditions(deck, koffersCard, fixingLands, landsToRemove) {
    const updatedDeck = [...deck];
    
    // Add Koffers card and Command Tower
    updatedDeck.push(koffersCard);
    updatedDeck.push({ Name: "Command Tower", name: "Command Tower" });
    
    // Remove basic lands and add fixing lands
    fixingLands.forEach((landName, i) => {
        const idx = updatedDeck.findIndex(card =>
            (card.Name || card.name) === landsToRemove[i]
        );
        if (idx !== -1) updatedDeck.splice(idx, 1);
        // Add the fixing land
        updatedDeck.push({ Name: landName, name: landName });
    });
    
    return updatedDeck;
}
