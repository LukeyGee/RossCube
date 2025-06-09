// Pack Synergy Analysis Module for RossCube
// Analyzes pack combinations and provides synergy ratings

class PackSynergyAnalyzer {
    constructor() {
        this.scryfallCache = new Map();
        this.packThemeCache = new Map();
        this.enabled = true;
    }

    // Enable/disable the synergy system
    setEnabled(enabled) {
        this.enabled = enabled;
        console.log(`Pack Synergy Analyzer ${enabled ? 'enabled' : 'disabled'}`);
    }

    // Main function to analyze pack and show synergy indicators
    async addDynamicPackWarnings(selectedPack1, cubeData) {
        if (!this.enabled) return;
        
        console.log('Analyzing pack synergies for:', selectedPack1);
        
        // Show calculating indicator
        this.showSynergyCalculatingIndicator(true);
        
        try {
            const pack1Theme = await this.analyzePackCards(selectedPack1, cubeData);
            console.log('Pack 1 theme:', pack1Theme);
            
            const packOptions = document.querySelectorAll('input[name^="pack_selection_group_2"]');
            
            for (const radio of packOptions) {
                const pack2Name = radio.value;
                const pack2Theme = await this.analyzePackCards(pack2Name, cubeData);
                const synergy = this.calculateDynamicSynergy(pack1Theme, pack2Theme);
                
                this.applySynergyIndicator(radio, synergy);
                
                // Small delay for progressive UI
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        } finally {
            this.showSynergyCalculatingIndicator(false);
        }
    }

    // Analyze cards in a pack to determine its theme
    async analyzePackCards(packName, cubeData) {
        if (this.packThemeCache.has(packName)) {
            return this.packThemeCache.get(packName);
        }
        
        // Get all cards in this pack
        const packCards = cubeData.filter(card => {
            const cardTags = card.Tags || card.tags || "";
            return cardTags.includes(packName);
        });
        
        const cardNames = packCards.map(card => card.Name || card.name);
        
        // Batch fetch card data with fallback to CSV
        const cardData = await this.batchFetchCardData(cardNames, cubeData);
        
        // Generate theme from the fetched data
        const theme = this.generatePackTheme(cardData);
        
        // Cache the result
        this.packThemeCache.set(packName, theme);
        
        return theme;
    }

    // Batch fetch cards from Scryfall with CSV fallback
    async batchFetchCardData(cardNames, cubeData) {
        const uncachedCards = cardNames.filter(name => !this.scryfallCache.has(name));
        
        if (uncachedCards.length === 0) {
            return cardNames.map(name => this.scryfallCache.get(name));
        }
        
        // Smaller batch size for faster response
        const batchSize = 25;
        const batches = [];
        
        for (let i = 0; i < uncachedCards.length; i += batchSize) {
            batches.push(uncachedCards.slice(i, i + batchSize));
        }
        
        // Process only first 2 batches to be faster
        for (let batchIndex = 0; batchIndex < Math.min(batches.length, 2); batchIndex++) {
            const batch = batches[batchIndex];
            try {
                const identifiers = batch.map(name => ({ name: name }));
                const response = await fetch('https://api.scryfall.com/cards/collection', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ identifiers })
                });
                
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();
                
                // Cache successful results
                data.data.forEach(card => {
                    this.scryfallCache.set(card.name, {
                        name: card.name,
                        oracle_text: card.oracle_text || '',
                        type_line: card.type_line || '',
                        mana_cost: card.mana_cost || '',
                        color_identity: card.color_identity || [],
                        keywords: card.keywords || [],
                        cmc: card.cmc || 0
                    });
                });
                
                // Cache failed lookups with CSV fallback
                batch.forEach(cardName => {
                    if (!this.scryfallCache.has(cardName)) {
                        const csvCard = cubeData.find(c => (c.Name || c.name) === cardName);
                        this.scryfallCache.set(cardName, {
                            name: cardName,
                            oracle_text: '',
                            type_line: csvCard ? (csvCard.Type || csvCard.type || '') : '',
                            mana_cost: csvCard ? (csvCard.Mana || csvCard.mana_cost || '') : '',
                            color_identity: this.extractColorsFromManaCost(csvCard ? (csvCard.Mana || csvCard.mana_cost || '') : ''),
                            keywords: [],
                            cmc: this.calculateCMC(csvCard ? (csvCard.Mana || csvCard.mana_cost || '') : '')
                        });
                    }
                });
                
                // Rate limiting between batches
                if (batchIndex < batches.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
                
            } catch (error) {
                console.warn('Batch fetch failed:', error);
                // Use CSV data as fallback for failed batch
                batch.forEach(cardName => {
                    if (!this.scryfallCache.has(cardName)) {
                        const csvCard = cubeData.find(c => (c.Name || c.name) === cardName);
                        this.scryfallCache.set(cardName, {
                            name: cardName,
                            oracle_text: '',
                            type_line: csvCard ? (csvCard.Type || csvCard.type || '') : '',
                            mana_cost: csvCard ? (csvCard.Mana || csvCard.mana_cost || '') : '',
                            color_identity: this.extractColorsFromManaCost(csvCard ? (csvCard.Mana || csvCard.mana_cost || '') : ''),
                            keywords: [],
                            cmc: this.calculateCMC(csvCard ? (csvCard.Mana || csvCard.mana_cost || '') : '')
                        });
                    }
                });
            }
        }
        
        return cardNames.map(name => this.scryfallCache.get(name));
    }

    // Generate pack theme from card analysis
    generatePackTheme(cards) {
        const theme = {
            primaryStrategy: '',
            tribes: [],
            keywords: [],
            colorIdentity: [],
            avgCmc: 0,
            archetypes: [],
            synergies: [],
            antiSynergies: []
        };
        
        // Analyze color identity
        const colorCounts = { W: 0, U: 0, B: 0, R: 0, G: 0 };
        cards.forEach(card => {
            card.color_identity.forEach(color => {
                colorCounts[color] = (colorCounts[color] || 0) + 1;
            });
        });
        theme.colorIdentity = Object.keys(colorCounts).filter(c => colorCounts[c] > 0);
        
        // Calculate average CMC
        theme.avgCmc = cards.reduce((sum, card) => sum + card.cmc, 0) / cards.length;
        
        // Detect tribes
        const tribeCount = {};
        cards.forEach(card => {
            const typeLine = card.type_line.toLowerCase();
            const creatureTypes = ['human', 'elf', 'goblin', 'wizard', 'zombie', 'angel', 'dragon', 'beast', 'spirit', 'knight', 'soldier', 'warrior'];
            creatureTypes.forEach(tribe => {
                if (typeLine.includes(tribe)) {
                    tribeCount[tribe] = (tribeCount[tribe] || 0) + 1;
                }
            });
        });
        theme.tribes = Object.entries(tribeCount)
            .filter(([tribe, count]) => count >= 3)
            .map(([tribe]) => tribe);
        
        // Detect keywords and mechanics
        const mechanicCount = {};
        const mechanics = ['flying', 'trample', 'lifelink', 'deathtouch', 'sacrifice', 'draw', 'counter', 'artifact', 'enchantment', 'graveyard', 'exile', 'token', 'equipment', 'aura', 'flash', 'storm', 'cascade', 'delve', 'prowess', 'landfall'];
        
        cards.forEach(card => {
            const text = card.oracle_text.toLowerCase();
            mechanics.forEach(mechanic => {
                if (text.includes(mechanic) || card.keywords.some(k => k.toLowerCase().includes(mechanic))) {
                    mechanicCount[mechanic] = (mechanicCount[mechanic] || 0) + 1;
                }
            });
        });
        
        theme.keywords = Object.entries(mechanicCount)
            .filter(([mechanic, count]) => count >= 2)
            .sort((a, b) => b[1] - a[1])
            .map(([mechanic]) => mechanic);
        
        // Determine primary strategy
        if (theme.avgCmc <= 2.5 && mechanicCount.flying) theme.primaryStrategy = 'Aggro Flyers';
        else if (theme.avgCmc <= 2.5) theme.primaryStrategy = 'Aggro';
        else if (theme.avgCmc >= 4.5) theme.primaryStrategy = 'Big Mana/Ramp';
        else if (mechanicCount.counter || mechanicCount.draw) theme.primaryStrategy = 'Control';
        else if (mechanicCount.sacrifice || mechanicCount.graveyard) theme.primaryStrategy = 'Sacrifice/Graveyard';
        else if (mechanicCount.artifact) theme.primaryStrategy = 'Artifacts Matter';
        else if (theme.tribes.length > 0) theme.primaryStrategy = `${theme.tribes[0]} Tribal`;
        else theme.primaryStrategy = 'Midrange';
        
        return theme;
    }

    // Calculate synergy score between two pack themes
    calculateDynamicSynergy(theme1, theme2) {
        let synergyScore = 0;
        let reasons = [];
        
        // Color synergy (conservative scoring)
        const sharedColors = theme1.colorIdentity.filter(c => theme2.colorIdentity.includes(c));
        const totalColors = new Set([...theme1.colorIdentity, ...theme2.colorIdentity]).size;
        
        if (sharedColors.length >= 2 && totalColors <= 2) {
            synergyScore += 1.5;
            reasons.push(`Perfect color overlap (${sharedColors.join('')})`);
        } else if (sharedColors.length > 0 && totalColors <= 3) {
            synergyScore += 0.5;
            reasons.push(`Good color synergy (${sharedColors.join('')})`);
        } else if (totalColors === 4) {
            synergyScore -= 1;
            reasons.push('Four colors - mana concerns');
        } else if (totalColors >= 5) {
            synergyScore -= 2;
            reasons.push('Five colors - serious mana issues');
        } else if (sharedColors.length === 0 && theme1.colorIdentity.length > 1 && theme2.colorIdentity.length > 1) {
            synergyScore -= 0.5;
            reasons.push('No color overlap in multicolor packs');
        }
        
        // Tribal synergy (conservative)
        const sharedTribes = theme1.tribes.filter(t => theme2.tribes.includes(t));
        if (sharedTribes.length > 0) {
            synergyScore += 1;
            reasons.push(`Shared tribes: ${sharedTribes.join(', ')}`);
        }
        
        // Keyword/mechanic synergy (conservative)
        const sharedKeywords = theme1.keywords.filter(k => theme2.keywords.includes(k));
        if (sharedKeywords.length >= 3) {
            synergyScore += 1;
            reasons.push(`Many shared mechanics: ${sharedKeywords.slice(0, 3).join(', ')}...`);
        } else if (sharedKeywords.length >= 1) {
            synergyScore += 0.5;
            reasons.push(`Shared mechanics: ${sharedKeywords.join(', ')}`);
        }
        
        // Strategy synergy/conflicts
        const strategyPairs = {
            'Aggro': { 
                good: ['Aggro Flyers'], 
                okay: ['Aggro', 'Midrange'], 
                bad: ['Control', 'Big Mana/Ramp'] 
            },
            'Aggro Flyers': { 
                good: ['Aggro'], 
                okay: ['Aggro Flyers', 'Midrange'], 
                bad: ['Control', 'Big Mana/Ramp'] 
            },
            'Control': { 
                good: ['Big Mana/Ramp'], 
                okay: ['Control', 'Midrange'], 
                bad: ['Aggro', 'Aggro Flyers'] 
            },
            'Big Mana/Ramp': { 
                good: ['Control'], 
                okay: ['Big Mana/Ramp', 'Midrange'], 
                bad: ['Aggro', 'Aggro Flyers'] 
            },
            'Sacrifice/Graveyard': { 
                good: ['Artifacts Matter'], 
                okay: ['Sacrifice/Graveyard', 'Midrange'], 
                bad: ['Aggro'] 
            },
            'Artifacts Matter': { 
                good: ['Sacrifice/Graveyard'], 
                okay: ['Artifacts Matter', 'Midrange', 'Control'], 
                bad: [] 
            },
            'Midrange': { 
                good: [], 
                okay: ['Midrange', 'Aggro', 'Control', 'Sacrifice/Graveyard', 'Artifacts Matter'], 
                bad: [] 
            }
        };
        
        const strategy1 = theme1.primaryStrategy;
        const strategy2 = theme2.primaryStrategy;
        
        if (strategyPairs[strategy1]?.good.includes(strategy2)) {
            synergyScore += 1;
            reasons.push('Complementary strategies');
        } else if (strategyPairs[strategy1]?.okay.includes(strategy2)) {
            synergyScore += 0;
            reasons.push('Compatible strategies');
        } else if (strategyPairs[strategy1]?.bad.includes(strategy2)) {
            synergyScore -= 1.5;
            reasons.push('Conflicting strategies');
        }
        
        // CMC curve synergy
        const cmcDiff = Math.abs(theme1.avgCmc - theme2.avgCmc);
        if (cmcDiff <= 0.5) {
            synergyScore += 0.5;
            reasons.push('Nearly identical curves');
        } else if (cmcDiff <= 1.5) {
            synergyScore += 0;
            reasons.push('Similar mana curves');
        } else if (cmcDiff >= 2.5) {
            synergyScore -= 0.5;
            reasons.push('Very different mana curves');
        }
        
        // Add baseline negative scoring if no synergies found
        if (reasons.filter(r => !r.includes('Compatible') && !r.includes('Similar')).length === 0) {
            synergyScore -= 0.5;
            reasons.push('Limited synergies detected');
        }
        
        // Add small random factor for variety
        const randomFactor = (Math.random() - 0.5) * 0.5;
        synergyScore += randomFactor;
        
        return {
            score: Math.max(-3, Math.min(3, Math.round(synergyScore * 2) / 2)),
            reasons: reasons
        };
    }

    // Apply synergy indicator to a pack option
    applySynergyIndicator(radio, synergy) {
        const label = radio.nextElementSibling;
        const optionDiv = radio.parentElement;
        
        // Remove any existing synergy indicators
        const existingIcon = optionDiv.querySelector('.synergy-indicator');
        if (existingIcon) existingIcon.remove();
        
        // Add synergy indicator
        const indicator = document.createElement('span');
        indicator.className = 'synergy-indicator';
        indicator.style.marginLeft = '8px';
        indicator.style.fontSize = '1.2em';
        indicator.style.fontWeight = 'bold';
        indicator.style.cursor = 'help';
        
        // 7-point rating system: -3 to +3
        if (synergy.score >= 3) {
            indicator.textContent = '🔥';
            indicator.style.color = '#ff6b00';
            indicator.title = `Amazing synergy (${synergy.score}): ${synergy.reasons.join(', ')}`;
            optionDiv.classList.add('pack-synergy-amazing');
        } else if (synergy.score >= 2) {
            indicator.textContent = '✨';
            indicator.style.color = '#00ff00';
            indicator.title = `Excellent synergy (${synergy.score}): ${synergy.reasons.join(', ')}`;
            optionDiv.classList.add('pack-synergy-excellent');
        } else if (synergy.score >= 1) {
            indicator.textContent = '👍';
            indicator.style.color = '#10b981';
            indicator.title = `Good synergy (${synergy.score}): ${synergy.reasons.join(', ')}`;
            optionDiv.classList.add('pack-synergy-good');
        } else if (synergy.score >= 0) {
            indicator.textContent = '➖';
            indicator.style.color = '#94a3b8';
            indicator.title = `Neutral synergy (${synergy.score}): ${synergy.reasons.join(', ') || 'No significant synergies or conflicts'}`;
            optionDiv.classList.add('pack-synergy-neutral');
        } else if (synergy.score >= -1) {
            indicator.textContent = '👎';
            indicator.style.color = '#f59e0b';
            indicator.title = `Poor synergy (${synergy.score}): ${synergy.reasons.join(', ')}`;
            optionDiv.classList.add('pack-synergy-poor');
        } else if (synergy.score >= -2) {
            indicator.textContent = '⚠️';
            indicator.style.color = '#ef4444';
            indicator.title = `Bad synergy (${synergy.score}): ${synergy.reasons.join(', ')}`;
            optionDiv.classList.add('pack-synergy-bad');
        } else {
            indicator.textContent = '💀';
            indicator.style.color = '#dc2626';
            indicator.title = `Terrible synergy (${synergy.score}): ${synergy.reasons.join(', ')}`;
            optionDiv.classList.add('pack-synergy-terrible');
        }
        
        label.appendChild(indicator);
    }

    // Show/hide calculating indicator
    showSynergyCalculatingIndicator(show) {
        let indicator = document.getElementById('synergyCalculatingIndicator');
        
        if (show) {
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.id = 'synergyCalculatingIndicator';
                indicator.style.position = 'fixed';
                indicator.style.top = '20px';
                indicator.style.right = '20px';
                indicator.style.background = '#1a1a2e';
                indicator.style.color = '#facc15';
                indicator.style.padding = '8px 16px';
                indicator.style.borderRadius = '20px';
                indicator.style.border = '2px solid #facc15';
                indicator.style.fontSize = '0.9rem';
                indicator.style.fontFamily = "'Press Start 2P', cursive";
                indicator.style.display = 'flex';
                indicator.style.alignItems = 'center';
                indicator.style.gap = '8px';
                indicator.style.zIndex = '1000';
                indicator.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
                
                const spinner = document.createElement('div');
                spinner.style.width = '12px';
                spinner.style.height = '12px';
                spinner.style.border = '2px solid #facc15';
                spinner.style.borderTop = '2px solid transparent';
                spinner.style.borderRadius = '50%';
                spinner.style.animation = 'spin 1s linear infinite';
                
                if (!document.querySelector('#spinnerStyle')) {
                    const style = document.createElement('style');
                    style.id = 'spinnerStyle';
                    style.textContent = `
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `;
                    document.head.appendChild(style);
                }
                
                indicator.appendChild(spinner);
                indicator.appendChild(document.createTextNode('Calculating Synergies'));
                document.body.appendChild(indicator);
            }
            indicator.style.display = 'flex';
        } else if (indicator) {
            indicator.style.display = 'none';
        }
    }

    // Helper functions
    extractColorsFromManaCost(manaCost) {
        if (!manaCost) return [];
        const colors = [];
        if (manaCost.includes('W')) colors.push('W');
        if (manaCost.includes('U')) colors.push('U');
        if (manaCost.includes('B')) colors.push('B');
        if (manaCost.includes('R')) colors.push('R');
        if (manaCost.includes('G')) colors.push('G');
        return colors;
    }

    calculateCMC(manaCost) {
        if (!manaCost) return 0;
        let cmc = 0;
        const numbers = manaCost.match(/\d+/g);
        if (numbers) {
            cmc += numbers.reduce((sum, num) => sum + parseInt(num), 0);
        }
        const symbols = manaCost.match(/[WUBRG]/g);
        if (symbols) {
            cmc += symbols.length;
        }
        return cmc;
    }

    // Clear all caches
    clearCache() {
        this.scryfallCache.clear();
        this.packThemeCache.clear();
        console.log('Pack synergy caches cleared');
    }
}

// Export for use in main.js
window.PackSynergyAnalyzer = PackSynergyAnalyzer;