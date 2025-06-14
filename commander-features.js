// commander-features.js - Commander cube specific features
// Functions that only run for commander cubes (Koffers, Fixing Lands, Commander Zone)

/**
 * Render the commander zone display
 * @param {Array} commanders - Array of commander cards
 */
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
        sleep(101).then(img.src = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}&format=image`);
        img.alt = cardName;
        img.title = cardName;
        img.style.width = '122px';
        img.style.height = '170px';
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

/**
 * Render the Kvatch Koffers selection step
 * @param {Array} koffersPool - Available Koffers cards
 * @param {Function} onSelect - Callback when a Koffers card is selected
 */
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
        sleep(101).then(img.src = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}&format=image`);
        img.alt = cardName;
        img.title = cardName;
        img.style.width = '122px';
        img.style.height = '170px';
        img.style.marginBottom = '8px';
        attachCardHoverPreview(img, cardName);

        btn.appendChild(img);
        btn.appendChild(document.createTextNode(cardName));
        btn.onclick = () => {
            hideCardPreview();
            koffersDiv.remove();
            onSelect(card);
        };
        row.appendChild(btn);
    });

    koffersDiv.appendChild(row);
    const decklistStep = document.getElementById('decklistStep');
    decklistStep.prepend(koffersDiv);
}

/**
 * Render the fixing lands selection step
 * @param {Array} fixingPool - Available fixing lands
 * @param {Array} deck - Current deck
 * @param {Function} onSelect - Callback when fixing lands are selected
 * @param {Object} packSelections - Current pack selections for color identity
 */
async function renderFixingLandsStep(fixingPool, deck, onSelect, packSelections) {
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

            const img = createCardImage(cardName, { width: '122px', height: '170px' });
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
        hideCardPreview();
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

    const decklistStep = document.getElementById('decklistStep');
    decklistStep.prepend(fixingDiv);
}

/**
 * Helper: Prompt user to pick a basic land to remove
 * @param {Array} basicsDeck - Remaining basic lands
 * @param {number} current - Current selection number
 * @param {number} total - Total selections needed
 * @returns {Promise<string>} Selected land name
 */
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
        let totalplaceholder = total + 1
        msg.innerHTML = `<span style="color:#facc15">Choose a basic land to remove:</span><br><span style="color:#94a3b8;font-size:0.9rem;">Remove ${totalplaceholder - current} more land(s)</span>`;
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

            const img = createCardImage(name, { width: '122px', height: '170px', hoverPreview: false });
            img.style.marginBottom = '6px';
            btn.appendChild(img);

            const label = document.createElement('span');
            label.textContent = `${name} (${counts[name]})`;
            label.style.color = '#facc15';
            label.style.fontSize = '1rem';
            btn.appendChild(label);

            btn.onclick = (e) => {
                // Add jiggle class to the image only
                img.classList.add('jiggle');
                img.addEventListener('animationend', function handler() {
                    img.classList.remove('jiggle');
                    img.removeEventListener('animationend', handler);
                    // After animation, remove modal and resolve
                    document.body.removeChild(modal);
                    resolve(name);
                });
            };
            row.appendChild(btn);
        });

        box.appendChild(row);
        modal.appendChild(box);
        document.body.appendChild(modal);
    });
}

/**
 * Handle the complete commander cube flow
 * @param {Object} deckResult - Initial deck result
 * @param {Object} globals - Global variables needed
 */
function handleCommanderCubeFlow(deckResult, globals) {
    const { currentCubeData, packSelections } = globals;
    
    toggleLoading(true);
    
    // UI setup for commander cube
    renderCommanderZone(deckResult.commanders);
    renderVisualDecklist(deckResult.typeGroups, deckResult.commanders);

    // Add mana distribution chart to the right of commanders
    const allCards = [...deckResult.deck, ...deckResult.commanders];
    const chartHTML = createManaDistributionChart(allCards);
    if (chartHTML) {
        const commanderZone = document.getElementById('commanderZone');
        if (commanderZone) {
            // Create a wrapper div to hold both commanders and chart side by side
            const wrapper = document.createElement('div');
            wrapper.style.display = 'flex';
            wrapper.style.alignItems = 'flex-start';
            wrapper.style.justifyContent = 'space-between';
            wrapper.style.width = '100%';
            wrapper.style.gap = '40px';
            
            // Create commanders container
            const commandersContainer = document.createElement('div');
            commandersContainer.style.flexShrink = '0';
            commandersContainer.innerHTML = commanderZone.innerHTML;
            
            // Re-attach hover previews to commander images
            const commanderImages = commandersContainer.querySelectorAll('img');
            commanderImages.forEach(img => {
                attachCardHoverPreview(img, img.alt);
            });
            
            // Create chart container
            const chartContainer = document.createElement('div');
            chartContainer.style.marginRight = '20px';
            chartContainer.innerHTML = chartHTML;
            
            // Clear and rebuild commander zone
            commanderZone.innerHTML = '';
            wrapper.appendChild(commandersContainer);
            wrapper.appendChild(chartContainer);
            commanderZone.appendChild(wrapper);
        }
    }

    // Koffers step
    const koffersPool = currentCubeData.filter(card =>
        (card.tags && card.tags.includes("z_Kvatch Koffers")) ||
        (card.Tags && card.Tags.includes("z_Kvatch Koffers"))
    );
    
    if (!koffersPool.length) {
        showMessage('No Koffers cards found!', 'error');
        toggleLoading(false);
        return;
    }
    
    renderKoffersStep(koffersPool, koffersCard => {
        // Fixing lands step
        const fixingPool = currentCubeData.filter(card =>
            (card.tags && card.tags.includes("z_Fixing Roster_z")) ||
            (card.Tags && card.Tags.includes("z_Fixing Roster_z"))
        );
        
        renderFixingLandsStep(fixingPool, deckResult.deck, async (fixingLands, landsToRemove) => {
            // Apply commander cube additions using deck-builder function
            const finalDeck = applyCommanderCubeAdditions(
                deckResult.deck, 
                koffersCard, 
                fixingLands, 
                landsToRemove
            );
            
            // Update type groups with final deck
            const finalTypeGroups = categorizeCards(finalDeck);
            const finalDecklistText = formatDecklistText(finalDeck, deckResult.commanders);
            
            // Update UI with final results
            updateDeckDisplay({
                deck: finalDeck,
                commanders: deckResult.commanders,
                typeGroups: finalTypeGroups,
                decklistText: finalDecklistText
            }, globals);
            
            finalizeDeckGeneration(finalDeck, deckResult.commanders);
        }, packSelections);
    });
    
    toggleLoading(false);
}

// Add this function to analyze mana costs and create a pie chart

function createManaDistributionChart(deck) {
    const colorCounts = {
        W: 0,
        U: 0,
        B: 0,
        R: 0,
        G: 0
    };
    
    // Filter out lands before analyzing mana costs
    const nonLandCards = deck.filter(card => {
        const cardType = (card.Type || card.type || '').toLowerCase();
        return !cardType.includes('land');
    });
    
    // Analyze all non-land cards in the deck (including commanders)
    nonLandCards.forEach(card => {
        if (card.manacost) {
            // Extract color symbols using regex
            const whiteMatches = card.manacost.match(/{W}/g);
            const blueMatches = card.manacost.match(/{U}/g);
            const blackMatches = card.manacost.match(/{B}/g);
            const redMatches = card.manacost.match(/{R}/g);
            const greenMatches = card.manacost.match(/{G}/g);
            
            colorCounts.W += (whiteMatches ? whiteMatches.length : 0);
            colorCounts.U += (blueMatches ? blueMatches.length : 0);
            colorCounts.B += (blackMatches ? blackMatches.length : 0);
            colorCounts.R += (redMatches ? redMatches.length : 0);
            colorCounts.G += (greenMatches ? greenMatches.length : 0);
            
            // Handle hybrid mana
            const hybridMatches = card.manacost.match(/{[WUBRG]\/[WUBRG]}/g);
            if (hybridMatches) {
                hybridMatches.forEach(hybrid => {
                    const colors = hybrid.match(/[WUBRG]/g);
                    colors.forEach(color => {
                        colorCounts[color]++;
                    });
                });
            }
        }
    });
    
    // Create pie chart HTML with animation
    const total = Object.values(colorCounts).reduce((sum, count) => sum + count, 0);
    if (total === 0) return '';
    
    const colorData = [
        { color: 'W', count: colorCounts.W, name: 'White', hex: '#F9FAF4' },
        { color: 'U', count: colorCounts.U, name: 'Blue', hex: '#0E68AB' },
        { color: 'B', count: colorCounts.B, name: 'Black', hex: '#150B00' },
        { color: 'R', count: colorCounts.R, name: 'Red', hex: '#D3202A' },
        { color: 'G', count: colorCounts.G, name: 'Green', hex: '#009B3E' }
    ].filter(item => item.count > 0);
    
    // Generate unique ID for this chart
    const chartId = 'mana-chart-' + Math.random().toString(36).substr(2, 9);
    
    // Calculate segments
    let cumulativePercentage = 0;
    const segments = colorData.map(item => {
        const percentage = (item.count / total) * 100;
        const segment = {
            ...item,
            percentage,
            startAngle: cumulativePercentage * 3.6,
            endAngle: (cumulativePercentage + percentage) * 3.6
        };
        cumulativePercentage += percentage;
        return segment;
    });
    
    const html = `
        <div style="text-align: center; margin: 20px 0;">
            <div id="${chartId}" style="width: 200px; height: 200px; border-radius: 50%; position: relative; margin: 0 auto; border: 3px solid #FFD700; background: #333; overflow: hidden;">
            </div>
            <div style="margin-top: 15px; font-size: 14px; color: #CCCCCC;">
                ${segments.map(s => `
                    <div style="margin: 3px 0;">
                        <span style="color: ${s.hex};">●</span> ${s.name}: ${s.count} (${s.percentage.toFixed(1)}%)
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    // Start animation after the HTML is inserted
    setTimeout(() => {
        animatePieChart(chartId, segments);
    }, 100);
    
    return html;
}

function animatePieChart(chartId, segments) {
    const chart = document.getElementById(chartId);
    if (!chart) return;
    
    const duration = 5000; // 5 seconds total animation
    const startTime = Date.now();
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease-out animation curve
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        
        // Calculate current segments based on progress
        let currentAngle = 0;
        const gradientSegments = segments.map(segment => {
            const segmentProgress = Math.min(easedProgress * segments.length, 1);
            const segmentAngle = segment.percentage * 3.6 * segmentProgress;
            const gradientSegment = `${segment.hex} ${currentAngle}deg ${currentAngle + segmentAngle}deg`;
            currentAngle += segmentAngle;
            return gradientSegment;
        });
        
        // Apply the animated gradient
        chart.style.background = `conic-gradient(${gradientSegments.join(', ')}, #333 ${currentAngle}deg)`;
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    
    animate();
}
