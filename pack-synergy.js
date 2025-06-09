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

    // Enhanced theme detection with semantic analysis and statistical patterns
    generatePackTheme(cards) {
        const theme = {
            primaryStrategy: '',
            tribes: [],
            keywords: [],
            colorIdentity: [],
            avgCmc: 0,
            archetypes: [],
            synergies: [],
            antiSynergies: [],
            themeStrength: 0, // New: How cohesive is this theme?
            subThemes: [], // New: Secondary themes detected
            curveArchetype: '', // New: Mana curve classification
            cardSynergies: [] // New: Specific card relationships
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
        
        // New: Analyze mana curve for strategy detection
        theme.curveArchetype = this.analyzeManaCurveStrategy(cards);
        
        // Enhanced theme patterns with weights and semantic analysis
        const themePatterns = {
            'Lifegain': {
                keywords: ['lifegain', 'life', 'heal', 'lifelink'],
                types: ['cleric', 'angel'],
                cardNames: ['soul warden', 'ajani\'s pridemate', 'serra ascendant'],
                weight: 2.5
            },
            'Artifacts': {
                keywords: ['artifact', 'equipment', 'metalcraft', 'affinity'],
                types: ['artificer', 'construct', 'thopter'],
                cardNames: ['servo', 'myr', 'vault skirge'],
                weight: 2.5
            },
            'Graveyard Value': {
                keywords: ['graveyard', 'flashback', 'delve', 'escape', 'dredge', 'threshold'],
                types: ['zombie', 'skeleton', 'spirit'],
                cardNames: ['raise dead', 'reanimate', 'buried alive'],
                weight: 3
            },
            'Token Swarm': {
                keywords: ['token', 'create', 'populate', 'convoke'],
                types: ['soldier', 'goblin', 'saproling', 'elf'],
                cardNames: ['gather the townsfolk', 'krenko', 'doubling season'],
                weight: 2.5
            },
            'Spell Velocity': {
                keywords: ['instant', 'sorcery', 'prowess', 'storm', 'flashback'],
                types: ['wizard', 'monk', 'shaman'],
                cardNames: ['young pyromancer', 'monastery swiftspear'],
                weight: 2.5
            },
            'Burn/Direct Damage': {
                keywords: ['damage', 'burn', 'shock', 'bolt'],
                types: ['wizard', 'elemental'],
                cardNames: ['lightning bolt', 'lava spike', 'flame rift'],
                weight: 2
            },
            'Ramp/Big Mana': {
                keywords: ['ramp', 'mana', 'land', 'search', 'accelerate'],
                types: ['druid', 'elf'],
                cardNames: ['llanowar elves', 'rampant growth', 'cultivate'],
                weight: 2
            },
            'Control/Counterspells': {
                keywords: ['counter', 'draw', 'exile', 'bounce'],
                types: ['wizard', 'sphinx'],
                cardNames: ['counterspell', 'fact or fiction', 'wrath of god'],
                weight: 2
            },
            'Sacrifice/Aristocrats': {
                keywords: ['sacrifice', 'death', 'dies', 'enters'],
                types: ['vampire', 'demon', 'cleric'],
                cardNames: ['blood artist', 'zulaport cutthroat', 'viscera seer'],
                weight: 2.5
            },
            'Enchantments Matter': {
                keywords: ['enchantment', 'aura', 'constellation'],
                types: ['spirit', 'nymph'],
                cardNames: ['enchantress', 'eidolon', 'sphere of safety'],
                weight: 2
            }
        };

        // Calculate theme scores with enhanced analysis
        const themeScores = {};
        for (const [themeName, pattern] of Object.entries(themePatterns)) {
            let score = 0;
            let cardMatches = 0;
            
            cards.forEach(card => {
                const text = (card.oracle_text || '').toLowerCase();
                const typeLine = (card.type_line || '').toLowerCase();
                const cardName = (card.name || '').toLowerCase();
                let cardScore = 0;
                
                // Check keywords in text (weighted by frequency)
                pattern.keywords.forEach(keyword => {
                    const matches = (text.match(new RegExp(keyword, 'g')) || []).length;
                    if (matches > 0) {
                        cardScore += pattern.weight * Math.min(matches, 3); // Cap at 3 mentions
                    }
                });
                
                // Check creature types
                pattern.types?.forEach(type => {
                    if (typeLine.includes(type)) {
                        cardScore += pattern.weight * 1.5;
                    }
                });
                
                // Check specific card names/effects (high value)
                pattern.cardNames?.forEach(name => {
                    if (cardName.includes(name) || text.includes(name)) {
                        cardScore += pattern.weight * 2;
                    }
                });
                
                if (cardScore > 0) {
                    score += cardScore;
                    cardMatches++;
                }
            });
            
            // Bonus for theme density (many cards supporting the theme)
            if (cardMatches >= 3) {
                score += cardMatches * 0.5;
            }
            
            if (score > 0) themeScores[themeName] = score;
        }
        
        // Determine primary and secondary themes
        const sortedThemes = Object.entries(themeScores)
            .sort(([,a], [,b]) => b - a);
        
        if (sortedThemes.length > 0) {
            theme.primaryStrategy = sortedThemes[0][0];
            theme.themeStrength = sortedThemes[0][1];
            
            // Add secondary themes if they're significant
            theme.subThemes = sortedThemes
                .slice(1)
                .filter(([, score]) => score >= theme.themeStrength * 0.3)
                .map(([name]) => name);
        }
        
        // Fallback to original strategy detection if no strong themes found
        if (theme.themeStrength < 5) {
            if (theme.avgCmc <= 2.5 && theme.keywords.includes('flying')) theme.primaryStrategy = 'Aggro Flyers';
            else if (theme.avgCmc <= 2.5) theme.primaryStrategy = 'Aggro';
            else if (theme.avgCmc >= 4.5) theme.primaryStrategy = 'Big Mana/Ramp';
            else if (theme.keywords.includes('counter') || theme.keywords.includes('draw')) theme.primaryStrategy = 'Control';
            else if (theme.keywords.includes('sacrifice') || theme.keywords.includes('graveyard')) theme.primaryStrategy = 'Sacrifice/Graveyard';
            else if (theme.keywords.includes('artifact')) theme.primaryStrategy = 'Artifacts Matter';
            else if (theme.tribes.length > 0) theme.primaryStrategy = `${theme.tribes[0]} Tribal`;
            else theme.primaryStrategy = 'Midrange';
            
            theme.themeStrength = 3; // Default strength for fallback themes
        }
        
        // Detect card synergies
        theme.cardSynergies = this.detectCardSynergies(cards);
        
        // Enhanced tribal detection with more tribes
        const tribeCount = {};
        const creatureTypes = ['human', 'elf', 'goblin', 'wizard', 'zombie', 'angel', 'dragon', 'beast', 'spirit', 'knight', 'soldier', 'warrior', 'vampire', 'demon', 'elemental', 'construct', 'thopter', 'servo', 'cleric', 'artificer', 'shaman', 'druid'];
        
        cards.forEach(card => {
            const typeLine = (card.type_line || '').toLowerCase();
            creatureTypes.forEach(tribe => {
                if (typeLine.includes(tribe)) {
                    tribeCount[tribe] = (tribeCount[tribe] || 0) + 1;
                }
            });
        });
        
        theme.tribes = Object.entries(tribeCount)
            .filter(([tribe, count]) => count >= 2) // Lowered threshold
            .sort(([,a], [,b]) => b - a)
            .map(([tribe]) => tribe);
        
        // Enhanced keyword detection
        const mechanicCount = {};
        const mechanics = ['flying', 'trample', 'lifelink', 'deathtouch', 'sacrifice', 'draw', 'counter', 'artifact', 'enchantment', 'graveyard', 'exile', 'token', 'equipment', 'aura', 'flash', 'storm', 'cascade', 'delve', 'prowess', 'landfall', 'flashback', 'dredge', 'threshold', 'metalcraft', 'affinity', 'convoke', 'populate'];
        
        cards.forEach(card => {
            const text = (card.oracle_text || '').toLowerCase();
            const keywords = card.keywords || [];
            
            mechanics.forEach(mechanic => {
                if (text.includes(mechanic) || keywords.some(k => k.toLowerCase().includes(mechanic))) {
                    mechanicCount[mechanic] = (mechanicCount[mechanic] || 0) + 1;
                }
            });
        });
        
        theme.keywords = Object.entries(mechanicCount)
            .filter(([mechanic, count]) => count >= 2)
            .sort((a, b) => b[1] - a[1])
            .map(([mechanic]) => mechanic);
        
        return theme;
    }

    // New: Analyze mana curve for strategy detection
    analyzeManaCurveStrategy(cards) {
        const cmcDistribution = {};
        cards.forEach(card => {
            const cmc = Math.min(card.cmc || 0, 7); // Cap at 7+
            cmcDistribution[cmc] = (cmcDistribution[cmc] || 0) + 1;
        });
        
        const totalCards = cards.length;
        const lowCurve = (cmcDistribution[1] || 0) + (cmcDistribution[2] || 0);
        const midCurve = (cmcDistribution[3] || 0) + (cmcDistribution[4] || 0);
        const highCurve = (cmcDistribution[5] || 0) + (cmcDistribution[6] || 0) + (cmcDistribution[7] || 0);
        
        // Determine curve archetype
        if (lowCurve / totalCards > 0.6) return 'Aggressive';
        if (highCurve / totalCards > 0.4) return 'Big Mana';
        if (midCurve / totalCards > 0.5) return 'Midrange';
        return 'Balanced';
    }

    // New: Detect synergistic card relationships
    detectCardSynergies(cards) {
        const synergies = [];
        
        // Look for enabler + payoff patterns
        const enablers = cards.filter(card => {
            const text = (card.oracle_text || '').toLowerCase();
            return text.includes('create') || 
                   text.includes('put') || 
                   text.includes('search') ||
                   text.includes('when') || 
                   text.includes('whenever');
        });
        
        const payoffs = cards.filter(card => {
            const text = (card.oracle_text || '').toLowerCase();
            return text.includes('for each') ||
                   text.includes('if you control') ||
                   text.includes('gets +') ||
                   text.includes('whenever a') ||
                   text.includes('whenever you');
        });
        
        // Cross-reference for potential synergies
        enablers.forEach(enabler => {
            payoffs.forEach(payoff => {
                const synergyStrength = this.calculateCardSynergy(enabler, payoff);
                if (synergyStrength > 0) {
                    synergies.push({
                        enabler: enabler.name,
                        payoff: payoff.name,
                        strength: synergyStrength,
                        type: this.identifySynergyType(enabler, payoff)
                    });
                }
            });
        });
        
        return synergies.slice(0, 5); // Return top 5 synergies
    }

    // New: Calculate synergy strength between two cards
    calculateCardSynergy(card1, card2) {
        const text1 = (card1.oracle_text || '').toLowerCase();
        const text2 = (card2.oracle_text || '').toLowerCase();
        let strength = 0;
        
        // Token synergies
        if ((text1.includes('create') && text1.includes('token')) && 
            (text2.includes('creatures you control') || text2.includes('for each creature'))) {
            strength += 2;
        }
        
        // Artifact synergies
        if ((text1.includes('artifact') || card1.type_line.includes('Artifact')) &&
            (text2.includes('artifacts you control') || text2.includes('metalcraft'))) {
            strength += 2;
        }
        
        // Graveyard synergies
        if ((text1.includes('graveyard') || text1.includes('mill')) &&
            (text2.includes('graveyard') || text2.includes('threshold'))) {
            strength += 2;
        }
        
        // Spell synergies
        if ((card1.type_line.includes('Instant') || card1.type_line.includes('Sorcery')) &&
            (text2.includes('noncreature spell') || text2.includes('prowess'))) {
            strength += 1;
        }
        
        return strength;
    }

    // New: Identify the type of synergy between cards
    identifySynergyType(card1, card2) {
        const text1 = (card1.oracle_text || '').toLowerCase();
        const text2 = (card2.oracle_text || '').toLowerCase();
        
        if (text1.includes('token') || text2.includes('token')) return 'Token';
        if (text1.includes('artifact') || text2.includes('artifact')) return 'Artifact';
        if (text1.includes('graveyard') || text2.includes('graveyard')) return 'Graveyard';
        if (text1.includes('spell') || text2.includes('spell')) return 'Spell';
        return 'Generic';
    }

    // Enhanced synergy calculation using improved themes
    calculateDynamicSynergy(theme1, theme2) {
        let synergyScore = 0;
        let reasons = [];
        
        // More conservative color synergy scoring
        const sharedColors = theme1.colorIdentity.filter(c => theme2.colorIdentity.includes(c));
        const totalColors = new Set([...theme1.colorIdentity, ...theme2.colorIdentity]).size;
        
        if (sharedColors.length >= 2 && totalColors <= 2) {
            synergyScore += 1.0; // Reduced from 1.5
            reasons.push(`Perfect color overlap (${sharedColors.join('')})`);
        } else if (sharedColors.length > 0 && totalColors <= 3) {
            synergyScore += 0.3; // Reduced from 0.5
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
        
        // More conservative tribal synergy
        const sharedTribes = theme1.tribes.filter(t => theme2.tribes.includes(t));
        if (sharedTribes.length > 0) {
            synergyScore += 0.5; // Reduced from 1.0
            reasons.push(`Shared tribes: ${sharedTribes.join(', ')}`);
        }
        
        // More conservative keyword/mechanic synergy
        const sharedKeywords = theme1.keywords.filter(k => theme2.keywords.includes(k));
        if (sharedKeywords.length >= 3) {
            synergyScore += 0.7; // Reduced from 1.0
            reasons.push(`Many shared mechanics: ${sharedKeywords.slice(0, 3).join(', ')}...`);
        } else if (sharedKeywords.length >= 1) {
            synergyScore += 0.3; // Reduced from 0.5
            reasons.push(`Shared mechanics: ${sharedKeywords.join(', ')}`);
        }
        
        // More conservative theme strength consideration
        const avgThemeStrength = (theme1.themeStrength + theme2.themeStrength) / 2;
        if (avgThemeStrength > 20) { // Raised threshold
            synergyScore += 0.3; // Reduced from 0.5
            reasons.push('Both packs have strong, focused themes');
        } else if (avgThemeStrength < 3) { // Lowered threshold
            synergyScore -= 0.5; // Increased penalty
            reasons.push('Weak theme coherence');
        }
        
        // More conservative sub-theme synergies
        const sharedSubThemes = theme1.subThemes.filter(t => theme2.subThemes.includes(t));
        if (sharedSubThemes.length > 0) {
            synergyScore += 0.4; // Reduced from 0.7
            reasons.push(`Shared sub-themes: ${sharedSubThemes.join(', ')}`);
        }
        
        // Curve compatibility (keep as is)
        const curveCompatibility = this.analyzeCurveCompatibility(theme1, theme2);
        synergyScore += curveCompatibility.score;
        if (curveCompatibility.reason) reasons.push(curveCompatibility.reason);
        
        // More conservative card synergy bonus
        const combinedSynergies = [...theme1.cardSynergies, ...theme2.cardSynergies];
        if (combinedSynergies.length > 2) { // Raised threshold
            const avgSynergyStrength = combinedSynergies.reduce((sum, s) => sum + s.strength, 0) / combinedSynergies.length;
            if (avgSynergyStrength > 2) { // Raised threshold
                synergyScore += 0.3; // Reduced from 0.5
                reasons.push('Strong internal card synergies detected');
            }
        }
        
        // Strategy synergy/conflicts (keep existing logic but add penalties)
        const strategyPairs = {
            'Aggro': { 
                good: ['Aggro Flyers'], 
                okay: ['Burn/Direct Damage'], 
                neutral: ['Midrange'],
                bad: ['Control/Counterspells', 'Ramp/Big Mana'] 
            },
            'Aggro Flyers': { 
                good: ['Aggro'], 
                okay: ['Burn/Direct Damage'], 
                neutral: ['Midrange'],
                bad: ['Control/Counterspells', 'Ramp/Big Mana'] 
            },
            'Control/Counterspells': { 
                good: ['Ramp/Big Mana'], 
                okay: ['Enchantments Matter'], 
                neutral: ['Midrange'],
                bad: ['Aggro', 'Burn/Direct Damage', 'Token Swarm'] 
            },
            'Ramp/Big Mana': { 
                good: ['Control/Counterspells'], 
                okay: ['Graveyard Value'], 
                neutral: ['Midrange'],
                bad: ['Aggro', 'Burn/Direct Damage'] 
            },
            'Sacrifice/Aristocrats': { 
                good: ['Token Swarm', 'Graveyard Value'], 
                okay: ['Artifacts'], 
                neutral: ['Midrange'],
                bad: ['Lifegain'] 
            },
            'Token Swarm': { 
                good: ['Sacrifice/Aristocrats'], 
                okay: ['Artifacts'], 
                neutral: ['Midrange'],
                bad: ['Control/Counterspells'] 
            },
            'Graveyard Value': { 
                good: ['Sacrifice/Aristocrats'], 
                okay: ['Spell Velocity'], 
                neutral: ['Midrange'],
                bad: ['Aggro'] 
            },
            'Artifacts': { 
                good: ['Sacrifice/Aristocrats'], 
                okay: ['Token Swarm', 'Control/Counterspells'], 
                neutral: ['Midrange'],
                bad: [] 
            },
            'Spell Velocity': { 
                good: ['Burn/Direct Damage'], 
                okay: ['Graveyard Value'], 
                neutral: ['Midrange'],
                bad: ['Token Swarm'] 
            },
            'Burn/Direct Damage': { 
                good: ['Spell Velocity', 'Aggro'], 
                okay: ['Aggro Flyers'], 
                neutral: ['Midrange'],
                bad: ['Lifegain', 'Control/Counterspells'] 
            },
            'Lifegain': { 
                good: [], 
                okay: ['Control/Counterspells'], 
                neutral: ['Midrange'],
                bad: ['Burn/Direct Damage', 'Sacrifice/Aristocrats'] 
            },
            'Enchantments Matter': { 
                good: [], 
                okay: ['Control/Counterspells'], 
                neutral: ['Midrange'],
                bad: ['Aggro'] 
            },
            'Midrange': { 
                good: [], 
                okay: [], 
                neutral: ['Midrange', 'Aggro', 'Control/Counterspells', 'Sacrifice/Aristocrats', 'Artifacts', 'Token Swarm', 'Graveyard Value'],
                bad: [] 
            }
        };
        
        const strategy1 = theme1.primaryStrategy;
        const strategy2 = theme2.primaryStrategy;
        
        if (strategyPairs[strategy1]?.good.includes(strategy2)) {
            synergyScore += 0.8; // Reduced from 1.0
            reasons.push('Complementary strategies');
        } else if (strategyPairs[strategy1]?.okay.includes(strategy2)) {
            synergyScore += 0.2; // Reduced from 0
            reasons.push('Compatible strategies');
        } else if (strategyPairs[strategy1]?.neutral.includes(strategy2)) {
            synergyScore += 0; // No change
            reasons.push('Neutral strategies');
        } else if (strategyPairs[strategy1]?.bad.includes(strategy2)) {
            synergyScore -= 1.0; // Reduced penalty from -1.5
            reasons.push('Conflicting strategies');
        } else {
            // Default case for unmatched strategies
            synergyScore -= 0.2;
            reasons.push('Unknown strategy interaction');
        }
        
        // CMC curve penalty for very different curves
        const cmcDiff = Math.abs(theme1.avgCmc - theme2.avgCmc);
        if (cmcDiff <= 0.5) {
            synergyScore += 0.2; // Reduced from 0.5
            reasons.push('Nearly identical curves');
        } else if (cmcDiff <= 1.5) {
            synergyScore += 0; // No bonus
            reasons.push('Similar mana curves');
        } else if (cmcDiff >= 3.0) { // Increased threshold
            synergyScore -= 0.8; // Increased penalty
            reasons.push('Very different mana curves');
        } else if (cmcDiff >= 2.0) {
            synergyScore -= 0.3; // New penalty tier
            reasons.push('Somewhat different mana curves');
        }
        
        // Baseline penalty - most combinations should be neutral or negative
        synergyScore -= 0.5; // New baseline penalty
        
        // Remove generic "limited synergies" text since we now have baseline penalty
        const meaningfulReasons = reasons.filter(r => 
            !r.includes('Compatible') && 
            !r.includes('Similar') && 
            !r.includes('Limited synergies')
        );
        
        if (meaningfulReasons.length === 0) {
            reasons = ['No significant synergies detected'];
        }
        
        return {
            score: Math.max(-3, Math.min(3, Math.round(synergyScore * 2) / 2)),
            reasons: reasons
        };
    }

    // New: Analyze curve compatibility between two themes
    analyzeCurveCompatibility(theme1, theme2) {
        const curve1 = theme1.curveArchetype;
        const curve2 = theme2.curveArchetype;
        
        // Complementary curves
        if ((curve1 === 'Aggressive' && curve2 === 'Big Mana') || 
            (curve1 === 'Big Mana' && curve2 === 'Aggressive')) {
            return { score: 0.5, reason: 'Complementary early/late game focus' };
        }
        
        // Similar curves
        if (curve1 === curve2) {
            return { score: 0.3, reason: `Both packs have ${curve1.toLowerCase()} curves` };
        }
        
        // Balanced curves work with everything
        if (curve1 === 'Balanced' || curve2 === 'Balanced') {
            return { score: 0.2, reason: 'Balanced curve provides flexibility' };
        }
        
        return { score: 0, reason: null };
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

    // Analyze individual card power level and role
    analyzeCardRole(card) {
        const roles = [];
        const text = card.oracle_text.toLowerCase();
        const cmc = card.cmc;
        
        // Threat assessment
        if (text.includes('win the game') || text.includes('you win')) {
            roles.push({ type: 'win_condition', priority: 10 });
        }
        
        // Engine pieces
        if (text.includes('draw') && text.includes('card')) {
            roles.push({ type: 'card_advantage', priority: 7 });
        }
        
        // Mana efficiency analysis
        const efficiency = this.calculateManaEfficiency(card);
        
        return {
            roles,
            efficiency,
            threatLevel: this.assessThreatLevel(card),
            versatility: this.assessVersatility(card)
        };
    }

    // Recognize common Limited archetypes
    recognizeArchetype(theme) {
        const archetypes = {
            'Control': {
                indicators: ['counterspell', 'wrath', 'card draw', 'high cmc'],
                winCondition: 'late game value',
                gameplan: 'survive early, win late'
            },
            'Aggro': {
                indicators: ['low cmc', 'haste', 'burn', 'creature focus'],
                winCondition: 'quick damage',
                gameplan: 'fast pressure'
            },
            'Midrange': {
                indicators: ['versatile threats', 'removal', 'medium cmc'],
                winCondition: 'efficient threats',
                gameplan: 'flexible positioning'
            }
        };
        
        // Score each archetype
        const scores = {};
        for (const [name, archetype] of Object.entries(archetypes)) {
            scores[name] = this.scoreArchetypeMatch(theme, archetype);
        }
        
        return Object.entries(scores)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 2); // Return top 2 matches
    }
}

// Implement smarter caching with expiration
class ImprovedPackSynergyAnalyzer extends PackSynergyAnalyzer {
    constructor() {
        super();
        this.cacheExpiry = new Map(); // Track cache timestamps
        this.CACHE_TTL = 30 * 60 * 1000; // 30 minutes
    }
    
    // Add cache validation
    getCachedTheme(packName) {
        const cached = this.packThemeCache.get(packName);
        const timestamp = this.cacheExpiry.get(packName);
        
        if (cached && timestamp && Date.now() - timestamp < this.CACHE_TTL) {
            return cached;
        }
        
        // Cleanup expired cache
        this.packThemeCache.delete(packName);
        this.cacheExpiry.delete(packName);
        return null;
    }
}

// Export for use in main.js
window.PackSynergyAnalyzer = PackSynergyAnalyzer;