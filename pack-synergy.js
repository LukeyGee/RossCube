// Pack Synergy Analysis for RossCube
// Evaluates and visualizes synergy between Jumpstart packs for a better deck-building experience.

class PackSynergyAnalyzer {
    constructor() {
        this.scryfallCache = new Map();
        this.packThemeCache = new Map();
        this.enabled = true;
    }

    // Toggle synergy system for performance or debugging
    setEnabled(enabled) {
        this.enabled = enabled;
        console.log(`Pack Synergy Analyzer ${enabled ? 'enabled' : 'disabled'}`);
    }

    // Main entry: Analyze all available packs against the selected pack
    async addDynamicPackWarnings(selectedPack1, cubeData, commander1, commander2) {
        if (!this.enabled) return;
        this.showSynergyCalculatingIndicator(true);

        try {
            const pack1Theme = await this.analyzePackCards(selectedPack1, cubeData);
            const packOptions = document.querySelectorAll('input[name^="pack_selection_group_2"]');
            const packPromises = Array.from(packOptions).map(radio => {
                const pack2Name = radio.value;
                return this.analyzePackCards(pack2Name, cubeData).then(pack2Theme => {
                    const synergy = this.calculateDynamicSynergy(
                        pack1Theme, pack2Theme, commander1, commander2, cubeData
                    );
                    this.applySynergyIndicator(radio, synergy);
                });
            });
            await Promise.all(packPromises);
        } finally {
            this.showSynergyCalculatingIndicator(false);
        }
    }

    // Analyze a pack's cards to infer its theme and mechanics
    async analyzePackCards(packName, cubeData) {
        if (this.packThemeCache.has(packName)) {
            return this.packThemeCache.get(packName);
        }
        const packCards = cubeData.filter(card => {
            const cardTags = card.Tags || card.tags || "";
            return cardTags.includes(packName);
        });
        const cardNames = packCards.map(card => card.Name || card.name);
        const cardData = await this.batchFetchCardData(cardNames, cubeData);
        const theme = this.generatePackTheme(cardData);
        this.packThemeCache.set(packName, theme);
        return theme;
    }

    // Fetch card data from Scryfall, fallback to CSV if needed
    async batchFetchCardData(cardNames, cubeData) {
        const uncachedCards = cardNames.filter(name => !this.scryfallCache.has(name));
        if (uncachedCards.length === 0) {
            return cardNames.map(name => this.scryfallCache.get(name));
        }
        const batchSize = 25;
        const batches = [];
        for (let i = 0; i < uncachedCards.length; i += batchSize) {
            batches.push(uncachedCards.slice(i, i + batchSize));
        }
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
                if (batchIndex < batches.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            } catch (error) {
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

    // Infer a pack's theme and synergy profile from its cards
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
            themeStrength: 0,
            subThemes: [],
            curveArchetype: '',
            cardSynergies: []
        };

        // Color identity and mana curve help with color and archetype synergy
        const colorCounts = { W: 0, U: 0, B: 0, R: 0, G: 0 };
        cards.forEach(card => {
            card.color_identity.forEach(color => {
                colorCounts[color] = (colorCounts[color] || 0) + 1;
            });
        });
        theme.colorIdentity = Object.keys(colorCounts).filter(c => colorCounts[c] > 0);
        theme.avgCmc = cards.reduce((sum, card) => sum + card.cmc, 0) / cards.length;

        // Pattern matching for common cube archetypes
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

        // Score themes by pattern matches
        const themeScores = {};
        for (const [themeName, pattern] of Object.entries(themePatterns)) {
            let score = 0;
            let cardMatches = 0;
            cards.forEach(card => {
                const text = (card.oracle_text || '').toLowerCase();
                const typeLine = (card.type_line || '').toLowerCase();
                const cardName = (card.name || '').toLowerCase();
                let cardScore = 0;
                pattern.keywords.forEach(keyword => {
                    const matches = (text.match(new RegExp(keyword, 'g')) || []).length;
                    if (matches > 0) cardScore += pattern.weight * Math.min(matches, 3);
                });
                pattern.types?.forEach(type => {
                    if (typeLine.includes(type)) cardScore += pattern.weight * 1.5;
                });
                pattern.cardNames?.forEach(name => {
                    if (cardName.includes(name) || text.includes(name)) cardScore += pattern.weight * 2;
                });
                if (cardScore > 0) {
                    score += cardScore;
                    cardMatches++;
                }
            });
            if (cardMatches >= 3) score += cardMatches * 0.5;
            if (score > 0) themeScores[themeName] = score;
        }

        // Assign primary and secondary themes for synergy logic
        const sortedThemes = Object.entries(themeScores).sort(([,a], [,b]) => b - a);
        if (sortedThemes.length > 0) {
            theme.primaryStrategy = sortedThemes[0][0];
            theme.themeStrength = sortedThemes[0][1];
            theme.subThemes = sortedThemes
                .slice(1)
                .filter(([, score]) => score >= theme.themeStrength * 0.3)
                .map(([name]) => name);
        }

        // Fallbacks for packs with weak or ambiguous themes
        if (theme.themeStrength < 5) {
            if (theme.avgCmc <= 2.5 && theme.keywords.includes('flying')) theme.primaryStrategy = 'Aggro Flyers';
            else if (theme.avgCmc <= 2.5) theme.primaryStrategy = 'Aggro';
            else if (theme.avgCmc >= 4.5) theme.primaryStrategy = 'Big Mana/Ramp';
            else if (theme.keywords.includes('counter') || theme.keywords.includes('draw')) theme.primaryStrategy = 'Control';
            else if (theme.keywords.includes('sacrifice') || theme.keywords.includes('graveyard')) theme.primaryStrategy = 'Sacrifice/Graveyard';
            else if (theme.keywords.includes('artifact')) theme.primaryStrategy = 'Artifacts Matter';
            else if (theme.tribes.length > 0) theme.primaryStrategy = `${theme.tribes[0]} Tribal`;
            else theme.primaryStrategy = 'Midrange';
            theme.themeStrength = 3;
        }

        // Synergy and tribal detection for more nuanced analysis
        theme.cardSynergies = this.detectCardSynergies(cards);

        const tribeCount = {};
        const creatureTypes = [
            'human','elf','goblin','wizard','zombie','angel','dragon','beast','spirit','knight','soldier','warrior','vampire','demon','elemental','construct','thopter','servo','cleric','artificer','shaman','druid','rogue','phyrexian','cat','merfolk','assassin','bird','faerie','scout','pirate','noble','horror','dwarf','archer','dinosaur'
        ];
        cards.forEach(card => {
            const typeLine = (card.type_line || '').toLowerCase();
            creatureTypes.forEach(tribe => {
                if (typeLine.includes(tribe)) {
                    tribeCount[tribe] = (tribeCount[tribe] || 0) + 1;
                }
            });
        });
        theme.tribes = Object.entries(tribeCount)
            .filter(([tribe, count]) => count >= 2)
            .sort(([,a], [,b]) => b - a)
            .map(([tribe]) => tribe);

        // Mechanic detection for synergy scoring
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

    // Find potential card combos and synergies within a pack
    detectCardSynergies(cards) {
        const synergies = [];
        const enablers = cards.filter(card => {
            const text = (card.oracle_text || '').toLowerCase();
            return text.includes('create') || text.includes('put') || text.includes('search') ||
                   text.includes('when') || text.includes('whenever');
        });
        const payoffs = cards.filter(card => {
            const text = (card.oracle_text || '').toLowerCase();
            return text.includes('for each') || text.includes('if you control') ||
                   text.includes('gets +') || text.includes('whenever a') || text.includes('whenever you');
        });
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
        return synergies.slice(0, 5);
    }

    // Score synergy between two cards for internal pack analysis
    calculateCardSynergy(card1, card2) {
        const text1 = (card1.oracle_text || '').toLowerCase();
        const text2 = (card2.oracle_text || '').toLowerCase();
        let strength = 0;
        if ((text1.includes('create') && text1.includes('token')) && 
            (text2.includes('creatures you control') || text2.includes('for each creature'))) {
            strength += 2;
        }
        if ((text1.includes('artifact') || card1.type_line.includes('Artifact')) &&
            (text2.includes('artifacts you control') || text2.includes('metalcraft'))) {
            strength += 2;
        }
        if ((text1.includes('graveyard') || text1.includes('mill')) &&
            (text2.includes('graveyard') || text2.includes('threshold'))) {
            strength += 2;
        }
        if ((card1.type_line.includes('Instant') || card1.type_line.includes('Sorcery')) &&
            (text2.includes('noncreature spell') || text2.includes('prowess'))) {
            strength += 1;
        }
        return strength;
    }

    // Classify synergy type for display and scoring
    identifySynergyType(card1, card2) {
        const text1 = (card1.oracle_text || '').toLowerCase();
        const text2 = (card2.oracle_text || '').toLowerCase();
        if (text1.includes('token') || text2.includes('token')) return 'Token';
        if (text1.includes('artifact') || text2.includes('artifact')) return 'Artifact';
        if (text1.includes('graveyard') || text2.includes('graveyard')) return 'Graveyard';
        if (text1.includes('spell') || text2.includes('spell')) return 'Spell';
        return 'Generic';
    }

    // Calculate synergy score and reasons between two packs
    calculateDynamicSynergy(theme1, theme2, commander1, commander2, cubeData) {
        let synergyScore = 0;
        let reasons = [];

        // Color overlap and mana base complexity
        const sharedColors = theme1.colorIdentity.filter(c => theme2.colorIdentity.includes(c));
        const totalColors = new Set([...theme1.colorIdentity, ...theme2.colorIdentity]).size;
        if (sharedColors.length >= 2 && totalColors <= 2) {
            synergyScore += 1.0;
            reasons.push(`Perfect color overlap (${sharedColors.join('')})`);
        } else if (sharedColors.length > 0 && totalColors <= 3) {
            synergyScore += 0.3;
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

        // Tribal, mechanic, and sub-theme overlap
        const sharedTribes = theme1.tribes.filter(t => theme2.tribes.includes(t));
        if (sharedTribes.length > 0) {
            synergyScore += 0.5;
            reasons.push(`Shared tribes: ${sharedTribes.join(', ')}`);
        }
        const sharedKeywords = theme1.keywords.filter(k => theme2.keywords.includes(k));
        if (sharedKeywords.length >= 3) {
            synergyScore += 0.7;
            reasons.push(`Many shared mechanics: ${sharedKeywords.slice(0, 3).join(', ')}...`);
        } else if (sharedKeywords.length >= 1) {
            synergyScore += 0.3;
            reasons.push(`Shared mechanics: ${sharedKeywords.join(', ')}`);
        }

        // Theme strength and sub-theme overlap
        const avgThemeStrength = (theme1.themeStrength + theme2.themeStrength) / 2;
        if (avgThemeStrength > 20) {
            synergyScore += 0.3;
            reasons.push('Both packs have strong, focused themes');
        } else if (avgThemeStrength < 3) {
            synergyScore -= 0.5;
            reasons.push('Weak theme coherence');
        }
        const sharedSubThemes = theme1.subThemes.filter(t => theme2.subThemes.includes(t));
        if (sharedSubThemes.length > 0) {
            synergyScore += 0.4;
            reasons.push(`Shared sub-themes: ${sharedSubThemes.join(', ')}`);
        }

        // Internal card synergy bonus
        const combinedSynergies = [...theme1.cardSynergies, ...theme2.cardSynergies];
        if (combinedSynergies.length > 2) {
            const avgSynergyStrength = combinedSynergies.reduce((sum, s) => sum + s.strength, 0) / combinedSynergies.length;
            if (avgSynergyStrength > 2) {
                synergyScore += 0.3;
                reasons.push('Strong internal card synergies detected');
            }
        }

        // Strategy compatibility/conflict
        const strategyPairs = {
            'Aggro': { good: ['Aggro Flyers'], okay: ['Burn/Direct Damage'], neutral: ['Midrange'], bad: ['Control/Counterspells', 'Ramp/Big Mana'] },
            'Aggro Flyers': { good: ['Aggro'], okay: ['Burn/Direct Damage'], neutral: ['Midrange'], bad: ['Control/Counterspells', 'Ramp/Big Mana'] },
            'Control/Counterspells': { good: ['Ramp/Big Mana'], okay: ['Enchantments Matter'], neutral: ['Midrange'], bad: ['Aggro', 'Burn/Direct Damage', 'Token Swarm'] },
            'Ramp/Big Mana': { good: ['Control/Counterspells'], okay: ['Graveyard Value'], neutral: ['Midrange'], bad: ['Aggro', 'Burn/Direct Damage'] },
            'Sacrifice/Aristocrats': { good: ['Token Swarm', 'Graveyard Value'], okay: ['Artifacts'], neutral: ['Midrange'], bad: ['Lifegain'] },
            'Token Swarm': { good: ['Sacrifice/Aristocrats'], okay: ['Artifacts'], neutral: ['Midrange'], bad: ['Control/Counterspells'] },
            'Graveyard Value': { good: ['Sacrifice/Aristocrats'], okay: ['Spell Velocity'], neutral: ['Midrange'], bad: ['Aggro'] },
            'Artifacts': { good: ['Sacrifice/Aristocrats'], okay: ['Token Swarm', 'Control/Counterspells'], neutral: ['Midrange'], bad: [] },
            'Spell Velocity': { good: ['Burn/Direct Damage'], okay: ['Graveyard Value'], neutral: ['Midrange'], bad: ['Token Swarm'] },
            'Burn/Direct Damage': { good: ['Spell Velocity', 'Aggro'], okay: ['Aggro Flyers'], neutral: ['Midrange'], bad: ['Lifegain', 'Control/Counterspells'] },
            'Lifegain': { good: [], okay: ['Control/Counterspells'], neutral: ['Midrange'], bad: ['Burn/Direct Damage', 'Sacrifice/Aristocrats'] },
            'Enchantments Matter': { good: [], okay: ['Control/Counterspells'], neutral: ['Midrange'], bad: ['Aggro'] },
            'Midrange': { good: [], okay: [], neutral: ['Midrange', 'Aggro', 'Control/Counterspells', 'Sacrifice/Aristocrats', 'Artifacts', 'Token Swarm', 'Graveyard Value'], bad: [] }
        };
        const strategy1 = theme1.primaryStrategy;
        const strategy2 = theme2.primaryStrategy;
        if (strategyPairs[strategy1]?.good.includes(strategy2)) {
            synergyScore += 0.8;
            reasons.push('Complementary strategies');
        } else if (strategyPairs[strategy1]?.okay.includes(strategy2)) {
            synergyScore += 0.2;
            reasons.push('Compatible strategies');
        } else if (strategyPairs[strategy1]?.neutral.includes(strategy2)) {
            synergyScore += 0;
            reasons.push('Neutral strategies');
        } else if (strategyPairs[strategy1]?.bad.includes(strategy2)) {
            synergyScore -= 1.0;
            reasons.push('Conflicting strategies');
        } else {
            synergyScore -= 0.2;
            reasons.push('Unknown strategy interaction');
        }

        // Penalize extreme mana curve mismatches
        const cmcDiff = Math.abs(theme1.avgCmc - theme2.avgCmc);
        if (cmcDiff >= 3.0) {
            synergyScore -= 0.1;
            reasons.push('Extreme mana curve mismatch');
        }

        // Baseline penalty to encourage more neutral/negative ratings
        synergyScore -= 0.5;

        // Remove generic or redundant reasons
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

    // Show synergy indicator and tooltip for a pack option
    applySynergyIndicator(radio, synergy) {
        const label = radio.nextElementSibling;
        const optionDiv = radio.parentElement;
        const existingIcon = optionDiv.querySelector('.synergy-indicator');
        if (existingIcon) existingIcon.remove();

        const indicator = document.createElement('span');
        indicator.className = 'synergy-indicator';
        indicator.style.marginLeft = '8px';
        indicator.style.fontSize = '1.2em';
        indicator.style.fontWeight = 'bold';
        indicator.style.cursor = 'help';

        // Visual indicator for synergy score
        if (synergy.score >= 3) {
            indicator.textContent = ' 🔥🔥🔥';
            indicator.style.color = '#ff6b00';
            optionDiv.classList.add('pack-synergy-amazing');
        } else if (synergy.score >= 2) {
            indicator.textContent = ' 👍👍';
            indicator.style.color = '#00ff00';
            optionDiv.classList.add('pack-synergy-excellent');
        } else if (synergy.score >= 1) {
            indicator.textContent = ' 👍';
            indicator.style.color = '#10b981';
            optionDiv.classList.add('pack-synergy-good');
        } else if (synergy.score >= 0) {
            indicator.textContent = ' 😑';
            indicator.style.color = '#94a3b8';
            optionDiv.classList.add('pack-synergy-neutral');
        } else if (synergy.score >= -1) {
            indicator.textContent = ' 👎';
            indicator.style.color = '#f59e0b';
            optionDiv.classList.add('pack-synergy-poor');
        } else if (synergy.score >= -2) {
            indicator.textContent = ' 👎👎';
            indicator.style.color = '#ef4444';
            optionDiv.classList.add('pack-synergy-bad');
        } else {
            indicator.textContent = ' 💀💀💀';
            indicator.style.color = '#dc2626';
            optionDiv.classList.add('pack-synergy-terrible');
        }

        // Custom tooltip for synergy details
        const tooltip = document.createElement('div');
        tooltip.className = 'custom-synergy-tooltip';
        tooltip.style.display = 'none';
        tooltip.style.position = 'absolute';
        tooltip.style.background = '#1a1a2e';
        tooltip.style.color = '#facc15';
        tooltip.style.padding = '6px 10px';
        tooltip.style.borderRadius = '8px';
        tooltip.style.fontSize = '0.68em';
        tooltip.style.maxHeight = '260px';
        tooltip.style.overflowY = 'auto';
        tooltip.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
        tooltip.style.zIndex = '1001';
        tooltip.style.maxWidth = '380px';
        tooltip.style.pointerEvents = 'none';
        tooltip.style.overflowWrap = 'break-word';
        tooltip.style.wordBreak = 'break-word';
        tooltip.style.whiteSpace = 'pre-line';

        // Group reasons for display
        const negativeRegex = /conflict|issue|concern|bad|penalt|no |weak|mismatch|serious|unknown|not|lack|poor|terrible|neutral|penalty|negative|fail|problem|minus|lose|loss|absent|missing|deficit|deficiency|drawback|downside|incompatib|incoheren|four colors|five colors|mana concerns|mana issues|curve mismatch|baseline penalty|no significant/i;
        const positives = synergy.reasons.filter(r => 
            !negativeRegex.test(r) &&
            !r.includes('Both packs have strong, focused themes')
        );
        const negatives = synergy.reasons.filter(r => negativeRegex.test(r));

        let html = '';
        if (positives.length) {
            html += `<div style="margin-bottom:0.5em;"><b style="color:#10b981;margin-left:0.5em;">Positives:</b></div>`;
            html += positives.map(r => {
                if (/Shared tribes: (.+)/i.test(r)) {
                    const [, tribes] = r.match(/Shared tribes: (.+)/i);
                    const items = tribes.split(',').map(t => t.trim());
                    return `<div style="margin-left:1.5em;color:#10b981;">Shared tribes:<ul style="margin:0.2em 0 0 0;padding:0;list-style:square inside;color:#10b981;font-size:1em;list-style-position:inside;">${items.map(t => `<li>${t}</li>`).join('')}</ul></div>`;
                }
                if (/Shared mechanics: (.+)/i.test(r)) {
                    const [, mechs] = r.match(/Shared mechanics: (.+)/i);
                    const items = mechs.split(',').map(m => m.trim());
                    return `<div style="margin-left:1.5em;color:#10b981;">Shared mechanics:<ul style="margin:0.2em 0 0 0;padding:0;list-style:square inside;color:#10b981;font-size:1em;list-style-position:inside;">${items.map(m => `<li>${m}</li>`).join('')}</ul></div>`;
                }
                if (/Many shared mechanics: (.+)\.\.\./i.test(r)) {
                    const [, mechs] = r.match(/Many shared mechanics: (.+)\.\.\./i);
                    const items = mechs.split(',').map(m => m.trim());
                    return `<div style="margin-left:1.5em;color:#10b981;">Many shared mechanics:<ul style="margin:0.2em 0 0 1.5em;padding:0;list-style:square inside;color:#10b981;font-size:1em;">${items.map(m => `<li>${m}</li>`).join('')}</ul></div>`;
                }
                if (/Shared sub-themes: (.+)/i.test(r)) {
                    const [, subs] = r.match(/Shared sub-themes: (.+)/i);
                    const items = subs.split(',').map(s => s.trim());
                    return `<div style="margin-left:1.5em;color:#10b981;">Shared sub-themes:<ul style="margin:0.2em 0 0 0;padding:0;list-style:square inside;color:#10b981;font-size:1em;list-style-position:inside;">${items.map(s => `<li>${s}</li>`).join('')}</ul></div>`;
                }
                return `<div style="margin-left:1.5em;color:#10b981;">${r}</div>`;
            }).join('');
        }
        if (negatives.length) {
            html += `<div style="margin:0.5em 0 0 0;"><b style="color:#ef4444;margin-left:0.5em;">Negatives:</b></div>`;
            html += negatives.map(r =>
                `<div style="margin-left:1.5em;font-weight:bold;color:#ef4444;">${r}</div>`
            ).join('');
        }
        tooltip.innerHTML = html || '<div style="margin-left:1.5em;color:#94a3b8;">No significant synergies detected</div>';

        indicator.addEventListener('mouseenter', (e) => {
            tooltip.style.display = 'block';
            tooltip.style.visibility = 'hidden';
            document.body.appendChild(tooltip);

            const rect = indicator.getBoundingClientRect();
            const scrollY = window.scrollY;
            const scrollX = window.scrollX;
            const margin = 8;
            tooltip.style.maxHeight = `${window.innerHeight - margin * 2}px`;
            const tooltipHeight = tooltip.offsetHeight;
            const tooltipWidth = tooltip.offsetWidth || 320;
            let left = rect.right + 8 + scrollX;
            let top = rect.top + scrollY;
            if (top + tooltipHeight > scrollY + window.innerHeight - margin) {
                top = scrollY + window.innerHeight - tooltipHeight - margin;
            }
            if (top < scrollY + margin) {
                top = scrollY + margin;
            }
            if (left + tooltipWidth > scrollX + window.innerWidth - margin) {
                left = rect.left + scrollX - tooltipWidth - 8;
                if (left < scrollX + margin) {
                    left = scrollX + margin;
                }
            }
            tooltip.style.left = `${left}px`;
            tooltip.style.top = `${top}px`;
            tooltip.style.visibility = 'visible';
        });
        indicator.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
            if (tooltip.parentNode) tooltip.parentNode.removeChild(tooltip);
        });

        label.appendChild(indicator);
    }

    // Show a spinner while synergy calculations are running
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

    // Utility: Extract color identity from mana cost
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

    // Utility: Calculate converted mana cost from mana string
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

    // Clear all caches for debugging or data refresh
    clearCache() {
        this.scryfallCache.clear();
        this.packThemeCache.clear();
        console.log('Pack synergy caches cleared');
    }

    // Analyze card for role and threat level (future expansion)
    analyzeCardRole(card) {
        const roles = [];
        const text = card.oracle_text.toLowerCase();
        const cmc = card.cmc;
        if (text.includes('win the game') || text.includes('you win')) {
            roles.push({ type: 'win_condition', priority: 10 });
        }
        if (text.includes('draw') && text.includes('card')) {
            roles.push({ type: 'card_advantage', priority: 7 });
        }
        const efficiency = this.calculateManaEfficiency(card);
        return {
            roles,
            efficiency,
            threatLevel: this.assessThreatLevel(card),
            versatility: this.assessVersatility(card)
        };
    }

    // Recognize common archetypes for future features
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
        const scores = {};
        for (const [name, archetype] of Object.entries(archetypes)) {
            scores[name] = this.scoreArchetypeMatch(theme, archetype);
        }
        return Object.entries(scores)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 2);
    }
}

// Improved caching for performance and data freshness
class ImprovedPackSynergyAnalyzer extends PackSynergyAnalyzer {
    constructor() {
        super();
        this.cacheExpiry = new Map();
        this.CACHE_TTL = 30 * 60 * 1000;
    }
    getCachedTheme(packName) {
        const cached = this.packThemeCache.get(packName);
        const timestamp = this.cacheExpiry.get(packName);
        if (cached && timestamp && Date.now() - timestamp < this.CACHE_TTL) {
            return cached;
        }
        this.packThemeCache.delete(packName);
        this.cacheExpiry.delete(packName);
        return null;
    }
}

// Export for use in main.js
window.PackSynergyAnalyzer = PackSynergyAnalyzer;