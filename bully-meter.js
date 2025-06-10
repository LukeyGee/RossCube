// Bully Meter - Analyzes deck power level and displays visual feedback
class BullyMeter {
    constructor() {
        this.powerThresholds = {
            nice: 0,
            mild: 20,
            moderate: 40,
            strong: 60,
            bully: 80,
            bigBully: 100
        };
        this.powerFactors = {
            fastMana: 15,      // Sol Ring, Mana Crypt, etc.
            tutors: 12,        // Demonic Tutor, Vampiric Tutor
            countermagic: 8,   // Counterspell, Force of Will
            removal: 6,        // Wrath effects, spot removal
            cardDraw: 5,       // Rhystic Study, Mystic Remora
            combos: 20,        // Infinite combos
            stax: 18,          // Winter Orb, Smokestack
            landDestruction: 15, // Armageddon, Strip Mine
            extraTurns: 25,    // Time Walk effects
            planeswalkers: 8   // High-impact planeswalkers
        };
    }

    // Main function to analyze deck and create meter
    analyzeDeck(deck, commanders = []) {
        const powerScore = this.calculatePowerScore(deck, commanders);
        this.createBullyMeterDisplay(powerScore);
        return powerScore;
    }

    // Calculate overall power score based on card categories
    calculatePowerScore(deck, commanders) {
        let totalScore = 0;
        const allCards = [...deck, ...commanders];
        
        const analysis = {
            fastMana: this.countFastMana(allCards),
            tutors: this.countTutors(allCards),
            countermagic: this.countCountermagic(allCards),
            removal: this.countRemoval(allCards),
            cardDraw: this.countCardDraw(allCards),
            combos: this.detectCombos(allCards),
            stax: this.countStax(allCards),
            landDestruction: this.countLandDestruction(allCards),
            extraTurns: this.countExtraTurns(allCards),
            planeswalkers: this.countPlaneswalkers(allCards)
        };

        // Calculate weighted score
        Object.entries(analysis).forEach(([category, count]) => {
            totalScore += count * this.powerFactors[category];
        });

        // Normalize to 0-100 scale
        const normalizedScore = Math.min(100, totalScore);
        
        console.log('Bully Meter Analysis:', { analysis, totalScore, normalizedScore });
        return normalizedScore;
    }

    // Count fast mana sources
    countFastMana(cards) {
        const fastManaCards = [
            'sol ring', 'mana crypt', 'mana vault', 'chrome mox', 'mox diamond',
            'mox opal', 'lotus petal', 'dark ritual', 'cabal ritual', 'seething song',
            'simian spirit guide', 'elvish spirit guide', 'jeweled lotus'
        ];
        return this.countCardsByName(cards, fastManaCards);
    }

    // Count tutors
    countTutors(cards) {
        const tutorCards = [
            'demonic tutor', 'vampiric tutor', 'imperial seal', 'diabolic intent',
            'enlightened tutor', 'mystical tutor', 'worldly tutor', 'survival of the fittest',
            'natural order', 'green sun\'s zenith', 'chord of calling'
        ];
        return this.countCardsByName(cards, tutorCards) + this.countCardsByText(cards, ['search your library']);
    }

    // Count counterspells
    countCountermagic(cards) {
        const counterCards = [
            'counterspell', 'force of will', 'force of negation', 'mana drain',
            'swan song', 'negate', 'spell pierce', 'mental misstep'
        ];
        return this.countCardsByName(cards, counterCards) + this.countCardsByText(cards, ['counter target']);
    }

    // Count removal spells
    countRemoval(cards) {
        const removalCards = [
            'wrath of god', 'damnation', 'cyclonic rift', 'toxic deluge',
            'swords to plowshares', 'path to exile', 'lightning bolt', 'fatal push'
        ];
        return this.countCardsByName(cards, removalCards) + 
               this.countCardsByText(cards, ['destroy all', 'exile target', 'return all']);
    }

    // Count card draw engines
    countCardDraw(cards) {
        const drawCards = [
            'rhystic study', 'mystic remora', 'necropotence', 'sylvan library',
            'phyrexian arena', 'consecrated sphinx', 'tymna the weaver'
        ];
        return this.countCardsByName(cards, drawCards) + this.countCardsByText(cards, ['draw.*card']);
    }

    // Detect combo pieces
    detectCombos(cards) {
        const comboCards = [
            'thassa\'s oracle', 'demonic consultation', 'tainted pact', 'hermit druid',
            'dockside extortionist', 'temur sabertooth', 'kiki-jiki', 'splinter twin',
            'exquisite blood', 'sanguine bond', 'mikaeus', 'walking ballista'
        ];
        return this.countCardsByName(cards, comboCards);
    }

    // Count stax pieces  
    countStax(cards) {
        const staxCards = [
            'winter orb', 'static orb', 'smokestack', 'tangle wire',
            'sphere of resistance', 'trinisphere', 'null rod', 'collector ouphe'
        ];
        return this.countCardsByName(cards, staxCards);
    }

    // Count land destruction
    countLandDestruction(cards) {
        const ldCards = [
            'armageddon', 'ravages of war', 'catastrophe', 'strip mine',
            'wasteland', 'ghost quarter', 'tectonic edge'
        ];
        return this.countCardsByName(cards, ldCards);
    }

    // Count extra turn effects
    countExtraTurns(cards) {
        const extraTurnCards = [
            'time walk', 'ancestral recall', 'time warp', 'temporal manipulation',
            'capture of jingzhou', 'temporal mastery', 'nexus of fate'
        ];
        return this.countCardsByName(cards, extraTurnCards) + this.countCardsByText(cards, ['extra turn']);
    }

    // Count powerful planeswalkers
    countPlaneswalkers(cards) {
        return cards.filter(card => {
            const typeLine = (card.Type || card.type || card.type_line || '').toLowerCase();
            return typeLine.includes('planeswalker');
        }).length;
    }

    // Helper: Count cards by name
    countCardsByName(cards, targetNames) {
        return cards.filter(card => {
            const cardName = (card.Name || card.name || '').toLowerCase();
            return targetNames.some(target => cardName.includes(target.toLowerCase()));
        }).length;
    }

    // Helper: Count cards by oracle text
    countCardsByText(cards, patterns) {
        return cards.filter(card => {
            const oracleText = (card.oracle_text || '').toLowerCase();
            return patterns.some(pattern => {
                const regex = new RegExp(pattern, 'i');
                return regex.test(oracleText);
            });
        }).length;
    }

    // Create the visual bully meter display
    createBullyMeterDisplay(powerScore) {
        // Remove existing meter
        const existing = document.getElementById('bullyMeter');
        if (existing) existing.remove();

        // Create meter container
        const meterContainer = document.createElement('div');
        meterContainer.id = 'bullyMeter';
        meterContainer.className = 'bully-meter-container';
        
        // Position in the circular area on the right
        meterContainer.style.cssText = `
            position: fixed;
            top: 50%;
            right: 20px;
            transform: translateY(-50%);
            width: 120px;
            height: 220px;
            background: rgba(26, 26, 46, 0.95);
            border: 3px solid #facc15;
            border-radius: 12px;
            padding: 12px 12px 20px 12px;
            font-family: 'Press Start 2P', cursive;
            z-index: 100;
            box-shadow: 0 4px 16px rgba(0,0,0,0.5);
        `;

        // Title
        const title = document.createElement('div');
        title.textContent = 'BULLY METER';
        title.style.cssText = `
            color: #facc15;
            font-size: 0.6rem;
            text-align: center;
            margin-bottom: 8px;
            line-height: 1.2;
        `;
        meterContainer.appendChild(title);

        // Meter bar container
        const barContainer = document.createElement('div');
        barContainer.style.cssText = `
            width: 20px;
            height: 120px;
            border: 2px solid #333;
            margin: 8px auto;
            position: relative;
            background: #111;
        `;

        // Fill bar with animation
        const fillBar = document.createElement('div');
        const fillHeight = (powerScore / 100) * 120;
        const barColor = this.getBarColor(powerScore);
        
        fillBar.style.cssText = `
            position: absolute;
            bottom: 0;
            width: 100%;
            height: 0px;
            background: linear-gradient(to top, ${barColor}, ${this.lightenColor(barColor)});
            transition: height 2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        `;
        barContainer.appendChild(fillBar);

        // Scale markers
        for (let i = 0; i <= 4; i++) {
            const marker = document.createElement('div');
            marker.style.cssText = `
                position: absolute;
                right: -8px;
                top: ${(i * 30)}px;
                width: 6px;
                height: 1px;
                background: #666;
            `;
            barContainer.appendChild(marker);
        }

        meterContainer.appendChild(barContainer);

        // Score display - start at 0 for animation
        const scoreDisplay = document.createElement('div');
        scoreDisplay.textContent = '0%';
        scoreDisplay.style.cssText = `
            color: #10b981;
            font-size: 0.7rem;
            text-align: center;
            margin-top: 8px;
            transition: color 0.3s ease;
        `;
        meterContainer.appendChild(scoreDisplay);

        // Power level label - start as NICE for animation
        const levelLabel = document.createElement('div');
        levelLabel.textContent = 'NICE';
        levelLabel.style.cssText = `
            color: #94a3b8;
            font-size: 0.5rem;
            text-align: center;
            margin-top: 6px;
            line-height: 1.2;
            min-height: 20px;
            transition: all 0.3s ease;
        `;
        meterContainer.appendChild(levelLabel);

        // Add to page first
        document.body.appendChild(meterContainer);

        // Animate the fill after a short delay
        setTimeout(() => {
            fillBar.style.height = `${fillHeight}px`;
            
            // Animate score counter from 0 to final score
            this.animateCounter(scoreDisplay, 0, Math.round(powerScore), 2000, '%', levelLabel);
            
        }, 100);

        // Big Bully Alert overlay (appears after animation completes)
        if (powerScore >= this.powerThresholds.bigBully) {
            setTimeout(() => {
                const alertOverlay = document.createElement('div');
                alertOverlay.textContent = '🚨 BIG BULLY ALERT! 🚨';
                alertOverlay.style.cssText = `
                    position: absolute;
                    top: -40px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: #991b1b;
                    color: #fff;
                    padding: 6px 8px;
                    border-radius: 8px;
                    font-size: 0.5rem;
                    text-align: center;
                    white-space: nowrap;
                    animation: bullyBlink 1s infinite;
                    z-index: 101;
                    border: 2px solid #fff;
                    opacity: 0;
                    transition: opacity 0.5s ease;
                `;
                meterContainer.appendChild(alertOverlay);

                // Fade in the alert
                setTimeout(() => {
                    alertOverlay.style.opacity = '1';
                }, 50);

                // Add blinking animation if not already added
                if (!document.getElementById('bullyBlinkStyle')) {
                    const style = document.createElement('style');
                    style.id = 'bullyBlinkStyle';
                    style.textContent = `
                        @keyframes bullyBlink {
                            0%, 50% { opacity: 1; }
                            51%, 100% { opacity: 0.3; }
                        }
                    `;
                    document.head.appendChild(style);
                }
            }, 2200); // Appear after fill animation completes
        }

        // Auto-fade after delay (optional)
        setTimeout(() => {
            if (meterContainer.parentNode) {
                meterContainer.style.opacity = '0.7';
            }
        }, 15000);
    }

    // Animate counter from start to end value
    animateCounter(element, start, end, duration, suffix = '', labelElement = null) {
        const startTime = performance.now();
        const difference = end - start;
        
        const updateCounter = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Use easing function for smooth animation
            const easeProgress = progress < 0.5 
                ? 2 * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;
            
            const currentValue = Math.round(start + (difference * easeProgress));
            const currentScore = start + (difference * easeProgress);
            
            element.textContent = `${currentValue}${suffix}`;
            element.style.color = this.getBarColor(currentScore);
            
            // Update label if provided
            if (labelElement) {
                labelElement.textContent = this.getPowerLabel(currentScore);
                labelElement.style.color = this.getBarColor(currentScore);
            }
            
            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            }
        };
        
        requestAnimationFrame(updateCounter);
    }

    // Get color based on power score
    getBarColor(score) {
        if (score >= 100) return '#dc2626'; // Big Bully - Red
        if (score >= 80) return '#ef4444';  // Bully - Light Red
        if (score >= 60) return '#f59e0b';  // Strong - Orange
        if (score >= 40) return '#eab308';  // Moderate - Yellow
        if (score >= 20) return '#22c55e';  // Mild - Green
        return '#10b981';                   // Nice - Light Green
    }

    // Lighten color for gradient effect
    lightenColor(color) {
        // Simple color lightening - could be more sophisticated
        const colorMap = {
            '#dc2626': '#fca5a5',
            '#ef4444': '#fca5a5', 
            '#f59e0b': '#fcd34d',
            '#eab308': '#fde047',
            '#22c55e': '#86efac',
            '#10b981': '#6ee7b7'
        };
        return colorMap[color] || color;
    }

    // Get power level label
    getPowerLabel(score) {
        if (score >= 100) return 'BIG BULLY';
        if (score >= 80) return 'BULLY';
        if (score >= 60) return 'STRONG';
        if (score >= 40) return 'MODERATE';
        if (score >= 20) return 'MILD';
        return 'NICE';
    }

    // Remove meter from display
    remove() {
        const meter = document.getElementById('bullyMeter');
        if (meter) meter.remove();
    }

    // Test function to display meter at 100% - for debugging/demo purposes
    testMaxBully() {
        console.log('Testing Bully Meter at 100%');
        this.createBullyMeterDisplay(100);
    }
}

// Export for use in main.js
window.BullyMeter = BullyMeter;