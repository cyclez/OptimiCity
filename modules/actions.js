// OptimiCity - Actions Module
// Handles: Player actions, cooldowns, effects calculation

window.Actions = (function () {
    'use strict';

    // Action definitions
    const actionDefinitions = {
        occupy: { power: [6, 10], heat: [12, 18], description: 'Organized building occupation' },
        blockDemo: { power: [8, 12], heat: [15, 25], description: 'Blocked demolition crews' },
        protest: { power: [5, 8], heat: [10, 15], description: 'Led protest march' },
        streetArt: { power: [3, 6], heat: [4, 8], description: 'Created inspiring mural' },
        garden: { power: [4, 7], heat: [2, 5], description: 'Planted community garden' },
        festival: { power: [6, 9], heat: [6, 10], description: 'Organized block festival' },
        hackCams: { power: [5, 8], heat: [8, 12], description: 'Disabled surveillance cameras' },
        meshNet: { power: [4, 6], heat: [5, 8], description: 'Installed mesh network nodes' },
        pirateBroad: { power: [7, 10], heat: [12, 16], description: 'Hijacked city communications' },
        meeting: { power: [3, 5], heat: [1, 3], description: 'Held secret organizing meeting' },
        recruit: { power: [5, 8], heat: [3, 6], description: 'Recruited new allies' },
        intel: { power: [2, 4], heat: [1, 2], description: 'Gathered intelligence on AI Mayor' }
    };

    // Calculate dynamic cooldown based on heat and power
    function calculateActionCooldown(heatGain, powerGain) {
        // Base cooldown: 500ms
        const baseCooldown = 500;

        // Heat factor: more heat = longer cooldown (up to 2.5 minutes extra)
        const heatFactor = (heatGain / 25) * 150000; // 150 seconds max from heat

        // Power factor: more power = slightly longer cooldown (up to 30 seconds extra)
        const powerFactor = (powerGain / 12) * 30000; // 30 seconds max from power

        // Total cooldown (max 3 minutes = 180000ms)
        return Math.min(180000, baseCooldown + heatFactor + powerFactor);
    }

    // Calculate action risk based on heat level
    function calculateActionRisk(gameState) {
        const heatLevel = gameState.heatLevel;

        if (heatLevel < 25) return 'low';
        if (heatLevel < 50) return 'medium';
        if (heatLevel < 75) return 'high';
        return 'extreme';
    }

    // Helper functions
    function getRiskProbability(riskLevel) {
        switch (riskLevel) {
            case 'low': return 0.05;      // 5% chance
            case 'medium': return 0.25;   // 25% chance  
            case 'high': return 0.55;     // 55% chance
            case 'extreme': return 0.75;  // 75% chance
            default: return 0;
        }
    }

    function calculateCasualties(riskLevel, actionType) {
        const gameState = window.GameCore.getState();
        const directActions = ['occupy', 'blockDemo', 'protest'];
        const lowRiskActions = ['garden', 'meeting', 'intel'];
        const isDirectAction = directActions.includes(actionType);
        const isLowRiskAction = lowRiskActions.includes(actionType);

        // Scale casualties based on active resistance size (not total population)
        const activeCitizens = gameState.activeCitizens;
        
        // Risk factor: smaller movements face less casualties but are more vulnerable
        let sizeFactor;
        if (activeCitizens < 100) sizeFactor = 0.1;          // Small groups: 10% risk
        else if (activeCitizens < 1000) sizeFactor = 0.3;    // Medium groups: 30% risk
        else sizeFactor = 0.5;                               // Large movements: 50% risk

        // Heat level-based scaling (reduced impact)
        const heatFactor = Math.max(0.5, gameState.heatLevel / 100);

        let killed = 0;
        let imprisoned = 0;

        // Low risk actions have greatly reduced penalties
        const lowRiskMultiplier = isLowRiskAction ? 0.1 : 1.0;

        switch (riskLevel) {
            case 'low':
                imprisoned = Math.floor((Math.random() * 2 + 1) * sizeFactor * lowRiskMultiplier);
                // Rare deaths for low risk
                if (isDirectAction && Math.random() < 0.05) {
                    killed = 1;
                }
                break;
            case 'medium':
                imprisoned = Math.floor((Math.random() * 5 + 2) * sizeFactor * lowRiskMultiplier);
                if (isDirectAction && Math.random() < 0.15) {
                    killed = Math.floor((Math.random() * 2 + 1) * sizeFactor * lowRiskMultiplier);
                }
                break;
            case 'high':
                imprisoned = Math.floor((Math.random() * 8 + 3) * sizeFactor * heatFactor * lowRiskMultiplier);
                killed = Math.floor((Math.random() * 3 + 1) * sizeFactor * heatFactor * lowRiskMultiplier);
                if (isDirectAction) {
                    killed += Math.floor((Math.random() * 2 + 1) * sizeFactor);
                }
                break;
            case 'extreme':
                imprisoned = Math.floor((Math.random() * 12 + 5) * sizeFactor * heatFactor * lowRiskMultiplier);
                killed = Math.floor((Math.random() * 5 + 2) * sizeFactor * heatFactor * lowRiskMultiplier);
                if (isDirectAction) {
                    killed += Math.floor((Math.random() * 3 + 1) * sizeFactor * heatFactor);
                }
                break;
        }

        return { killed, imprisoned };
    }

    // Perform action
    async function performAction(actionType) {
        const gameState = window.GameCore.getState();

        // Check if this specific action in this neighborhood is on cooldown
        const cooldownKey = `${actionType}_${gameState.selectedNeighborhood}`;
        if (window.GameCore.isActionOnCooldown(cooldownKey)) {
            if (window.UIComponents) {
                window.UIComponents.addLogEntry(`${actionType} is still on cooldown in this neighborhood.`);
            }
            return;
        }

        // Check global action cooldown (heat system)
        if (window.GameCore.isGlobalActionOnCooldown()) {
            const remaining = Math.ceil(window.GameCore.getGlobalActionCooldownRemaining() / 1000);
            if (window.UIComponents) {
                window.UIComponents.addLogEntry(`⏱️ Action too rapid! Wait ${remaining}s to avoid surveillance detection.`, 'system');
            }
            return;
        }

        if (!gameState.selectedNeighborhood) {
            if (window.UIComponents) {
                window.UIComponents.addLogEntry("Select a neighborhood first to take action.");
            }
            return;
        }

        // Check if player can afford the action
        if (window.Currency && !window.Currency.canAffordAction(actionType)) {
            const cost = window.Currency.getActionCost(actionType);
            if (window.UIComponents) {
                window.UIComponents.addLogEntry(`Insufficient SimCoin for ${actionType}. Need ${cost.toLocaleString()} SimCoin.`, 'system');
            }
            return;
        }

        const neighborhood = gameState.neighborhoods.find(n => n.id === gameState.selectedNeighborhood);
        const action = actionDefinitions[actionType];

        if (!neighborhood || !action) return;

        // Purchase the action (deduct SimCoin)
        if (window.Currency && !window.Currency.purchaseAction(actionType)) {
            if (window.UIComponents) {
                window.UIComponents.addLogEntry(`Failed to purchase ${actionType}. Transaction error.`, 'system');
            }
            return;
        }

        // Calculate effects
        const powerGain = Math.floor(Math.random() * (action.power[1] - action.power[0] + 1)) + action.power[0];
        const heatGain = Math.floor(Math.random() * (action.heat[1] - action.heat[0] + 1)) + action.heat[0];

        // Calculate dynamic cooldown
        const cooldownDuration = calculateActionCooldown(heatGain, powerGain);

        // Calculate risk level
        const riskLevel = calculateActionRisk(gameState);

        // Start cooldown with dynamic duration per neighborhood
        window.GameCore.setActionCooldown(cooldownKey, cooldownDuration);

        setTimeout(() => {
            window.GameCore.clearActionCooldown(cooldownKey);
            updateActionButtonStates();
        }, cooldownDuration);

        // Apply effects to game state
        window.GameCore.updateCommunityPower(powerGain);
        window.GameCore.updateHeatLevel(heatGain);

        // Check for spam penalty and set global cooldown
        window.GameCore.checkSpamPenalty();
        window.GameCore.setGlobalActionCooldown();

        // Check for casualties based on risk level
        console.log(`Risk level: ${riskLevel}, Heat: ${gameState.heatLevel}`);
        const forceCasualties = false; // Use actual probability system
        if (forceCasualties || Math.random() < getRiskProbability(riskLevel)) {
            const casualties = calculateCasualties(riskLevel, actionType);
            console.log(`Casualties calculated:`, casualties);
            if (casualties.killed > 0) {
                window.GameCore.updateCitizensKilled(casualties.killed);
                window.GameCore.updateActiveCitizens(-casualties.killed);
                if (window.UIComponents) {
                    window.UIComponents.addLogEntry(`💀 ${casualties.killed} citizens killed by AI Mayor forces`, 'ai');
                }
            }
            if (casualties.imprisoned > 0) {
                window.GameCore.updateCitizensImprisoned(casualties.imprisoned);
                window.GameCore.updateActiveCitizens(-casualties.imprisoned);
                if (window.UIComponents) {
                    window.UIComponents.addLogEntry(`🚔 ${casualties.imprisoned} citizens arrested`, 'ai');
                }
            }
        } else {
            console.log(`No casualties this time - probability was ${getRiskProbability(riskLevel)}`);
        }

        // Population-aware staged recruitment system
        const culturalActions = ['streetArt', 'garden', 'festival'];
        const organizingActions = ['meeting', 'recruit', 'intel'];
        const mobilizingActions = ['protest']; // High-visibility actions that inspire people
        
        if (organizingActions.includes(actionType) || culturalActions.includes(actionType) || mobilizingActions.includes(actionType)) {
            const currentCitizens = gameState.activeCitizens;
            const totalPopulation = gameState.totalPopulation;
            
            // Calculate population thresholds for phases
            const phase1Threshold = Math.floor(totalPopulation * 0.0001); // 0.01% of population
            const phase2Threshold = Math.floor(totalPopulation * 0.001);  // 0.1% of population
            
            let citizenGain = 0;
            let phaseName = '';
            
            if (currentCitizens < phase1Threshold) {
                // PHASE 1: Individual Network (fixed small numbers)
                phaseName = 'Individual Network';
                if (mobilizingActions.includes(actionType)) {
                    citizenGain = Math.floor(Math.random() * 21) + 15; // 15-35 citizens (protests inspire!)
                } else if (organizingActions.includes(actionType)) {
                    citizenGain = Math.floor(Math.random() * 16) + 10; // 10-25 citizens
                } else {
                    citizenGain = Math.floor(Math.random() * 13) + 5;  // 5-17 citizens  
                }
                
            } else if (currentCitizens < phase2Threshold) {
                // PHASE 2: Local Movement (small percentage-based)
                phaseName = 'Local Movement';
                const availablePopulation = totalPopulation - currentCitizens;
                
                if (mobilizingActions.includes(actionType)) {
                    // 0.01% to 0.05% of available population (protests get double organizing rates)
                    const minRate = Math.floor(availablePopulation * 0.0001);
                    const maxRate = Math.floor(availablePopulation * 0.0005);
                    citizenGain = Math.max(50, Math.min(1000, minRate + Math.floor(Math.random() * (maxRate - minRate + 1))));
                } else if (organizingActions.includes(actionType)) {
                    // 0.005% to 0.02% of available population
                    const minRate = Math.floor(availablePopulation * 0.00005);
                    const maxRate = Math.floor(availablePopulation * 0.0002);
                    citizenGain = Math.max(10, Math.min(500, minRate + Math.floor(Math.random() * (maxRate - minRate + 1))));
                } else {
                    // 0.002% to 0.01% of available population  
                    const minRate = Math.floor(availablePopulation * 0.00002);
                    const maxRate = Math.floor(availablePopulation * 0.0001);
                    citizenGain = Math.max(5, Math.min(200, minRate + Math.floor(Math.random() * (maxRate - minRate + 1))));
                }
                
            } else {
                // PHASE 3: City-Wide Resistance (full percentage system)
                phaseName = 'City-Wide Resistance';
                const availablePopulation = totalPopulation - currentCitizens;
                
                if (mobilizingActions.includes(actionType)) {
                    // 0.2% to 1.0% of available population (massive protest recruitment)
                    const minRate = Math.floor(availablePopulation * 0.002);
                    const maxRate = Math.floor(availablePopulation * 0.01);
                    citizenGain = Math.max(500, Math.min(maxRate, minRate + Math.floor(Math.random() * (maxRate - minRate + 1))));
                } else if (organizingActions.includes(actionType)) {
                    // 0.1% to 0.5% of available population
                    const minRate = Math.floor(availablePopulation * 0.001);
                    const maxRate = Math.floor(availablePopulation * 0.005);
                    citizenGain = Math.max(100, Math.min(maxRate, minRate + Math.floor(Math.random() * (maxRate - minRate + 1))));
                } else {
                    // 0.05% to 0.2% of available population
                    const minRate = Math.floor(availablePopulation * 0.0005);
                    const maxRate = Math.floor(availablePopulation * 0.002);
                    citizenGain = Math.max(50, Math.min(maxRate, minRate + Math.floor(Math.random() * (maxRate - minRate + 1))));
                }
            }
            
            // Apply the recruitment
            if (citizenGain > 0) {
                window.GameCore.updateActiveCitizens(citizenGain);
                
                const newTotal = currentCitizens + citizenGain;
                const populationPercentage = (newTotal / totalPopulation * 100).toFixed(3);
                
                if (window.UIComponents) {
                    if (mobilizingActions.includes(actionType)) {
                        window.UIComponents.addLogEntry(`✊ ${phaseName}: Protest mobilized ${citizenGain.toLocaleString()} new resistance members (${populationPercentage}% of city)`, 'player');
                    } else if (organizingActions.includes(actionType)) {
                        window.UIComponents.addLogEntry(`📢 ${phaseName}: Recruited ${citizenGain.toLocaleString()} new resistance members (${populationPercentage}% of city)`, 'player');
                    } else {
                        window.UIComponents.addLogEntry(`🎭 ${phaseName}: Inspired ${citizenGain.toLocaleString()} citizens to join (${populationPercentage}% of city)`, 'player');
                    }
                    
                    // Phase transition notifications
                    if (currentCitizens < phase1Threshold && newTotal >= phase1Threshold) {
                        window.UIComponents.addLogEntry(`🎉 PHASE 2 UNLOCKED: Local Movement - Better recruitment rates available!`, 'system');
                    }
                    if (currentCitizens < phase2Threshold && newTotal >= phase2Threshold) {
                        window.UIComponents.addLogEntry(`🎉 PHASE 3 UNLOCKED: City-Wide Resistance - Mass recruitment available!`, 'system');
                    }
                }
            }
        }

        // Apply effects to neighborhood
        if (window.Neighborhoods) {
            window.Neighborhoods.updateNeighborhoodState(neighborhood.id, powerGain);
        }

        // Log action with cost and effects
        if (window.UIComponents) {
            const cost = window.Currency ? window.Currency.getActionCost(actionType) : 0;
            window.UIComponents.addLogEntry(`${action.description} in ${neighborhood.name}`, 'player');
            window.UIComponents.addLogEntry(`-${cost.toLocaleString()} SimCoin, +${powerGain} power, +${heatGain} heat`, 'player');

            if (riskLevel !== 'low') {
                window.UIComponents.addLogEntry(`⚠️ ${riskLevel.toUpperCase()} risk operation - surveillance heavy`, 'player');
            }

            const cooldownSeconds = Math.round(cooldownDuration / 1000);
            if (cooldownSeconds > 2) {
                window.UIComponents.addLogEntry(`🕐 ${actionType} cooldown in ${neighborhood.name}: ${cooldownSeconds}s`, 'system');
            }
        }

        // Update UI
        if (window.UIComponents) {
            window.UIComponents.updateAll();
        }

        if (window.Neighborhoods) {
            window.Neighborhoods.renderAll();
        }

        // Update button states immediately
        updateActionButtonStates();

        // Get AI responses (AI Mayor responds to every action, Citizens occasionally)
        setTimeout(async () => {
            if (window.AIMayor) {
                const aiResponse = await window.AIMayor.getResponse(action.description, neighborhood.name);
                if (window.UIComponents) {
                    window.UIComponents.addLogEntry(aiResponse, 'ai');
                    window.UIComponents.updateAIInterface(aiResponse);
                }
            }
        }, 1000);

        if (Math.random() < 0.25) {
            setTimeout(async () => {
                if (window.AICitizens) {
                    const citizenResponse = await window.AICitizens.getResponse(action.description, neighborhood.name);
                    if (window.UIComponents) {
                        window.UIComponents.addLogEntry(citizenResponse, 'citizen');
                    }
                }
            }, 2500);
        }

        // Check victory conditions
        window.GameCore.checkVictoryConditions();
    }

    // Check if action is available
    function canPerformAction(actionType) {
        const gameState = window.GameCore.getState();

        if (!gameState.selectedNeighborhood) return false;
        if (!gameState.isActive) return false;

        // Check cooldown for this specific action in this neighborhood
        const cooldownKey = `${actionType}_${gameState.selectedNeighborhood}`;
        if (window.GameCore.isActionOnCooldown(cooldownKey)) return false;

        // Check global action cooldown (heat system)
        if (window.GameCore.isGlobalActionOnCooldown()) return false;

        // Check if player can afford the action
        if (window.Currency && !window.Currency.canAffordAction(actionType)) return false;

        // Special action requirements
        switch (actionType) {
            case 'blockDemo':
                // Can only block demolition if neighborhood is threatened
                const neighborhood = window.Neighborhoods ?
                    window.Neighborhoods.getSelectedNeighborhood() : null;
                return neighborhood && neighborhood.threatened;
            case 'pirateBroad':
                // Requires high coordination
                return gameState.communityPower >= 20;
            default:
                return true;
        }
    }

    // Get action effectiveness based on context
    function getActionEffectiveness(actionType, neighborhoodId) {
        const gameState = window.GameCore.getState();
        const neighborhood = gameState.neighborhoods.find(n => n.id === neighborhoodId);

        if (!neighborhood) return 1.0;

        let effectiveness = 1.0;

        // High resistance neighborhoods are easier to organize in
        if (neighborhood.resistance > 40) {
            effectiveness *= 1.1;
        }

        // Threatened neighborhoods get urgency bonus
        if (neighborhood.threatened && neighborhood.gentrificationTimer < 30) {
            effectiveness *= 1.2;
        }

        // High heat makes actions riskier but more impactful
        if (gameState.heatLevel > 70) {
            effectiveness *= 1.15;
        }

        return effectiveness;
    }

    // Store original button texts
    const originalButtonTexts = {};

    // Initialize original button texts
    function initializeButtonTexts() {
        document.querySelectorAll('.action-btn').forEach(button => {
            const actionType = button.dataset.action;
            if (actionType) {
                const actionNameEl = button.querySelector('.action-name');
                if (actionNameEl && !originalButtonTexts[actionType]) {
                    originalButtonTexts[actionType] = actionNameEl.textContent;
                }
            }
        });
    }

    // Update action button states based on availability
    function updateActionButtonStates() {
        // Initialize texts if not done yet
        if (Object.keys(originalButtonTexts).length === 0) {
            initializeButtonTexts();
        }

        document.querySelectorAll('.action-btn').forEach(button => {
            const actionType = button.dataset.action;
            if (actionType) {
                const gameState = window.GameCore.getState();
                const cooldownKey = `${actionType}_${gameState.selectedNeighborhood}`;
                const isOnCooldown = window.GameCore.isActionOnCooldown(cooldownKey);
                const isGlobalCooldown = window.GameCore.isGlobalActionOnCooldown();
                const canPerform = canPerformAction(actionType);
                const actionNameEl = button.querySelector('.action-name');
                const actionStatsEl = button.querySelector('.action-stats');

                button.disabled = !canPerform;

                // Always reset to original text first
                if (actionNameEl && originalButtonTexts[actionType]) {
                    actionNameEl.textContent = originalButtonTexts[actionType];
                }

                // Update action stats to show cost
                if (actionStatsEl && window.Currency) {
                    const cost = window.Currency.getActionCost(actionType);
                    const action = actionDefinitions[actionType];
                    if (action) {
                        actionStatsEl.textContent = `${cost.toLocaleString()} SimCoin, +${action.power[0]}-${action.power[1]} Power`;
                    }
                }

                if (isGlobalCooldown) {
                    // Global cooldown takes priority - affects all actions
                    button.classList.add('loading');
                    button.style.opacity = '0.3';
                    button.style.background = '#e74c3c'; // Red for global cooldown
                    const globalRemaining = window.GameCore.getGlobalActionCooldownRemaining();
                    if (globalRemaining > 0 && actionNameEl) {
                        const seconds = Math.ceil(globalRemaining / 1000);
                        actionNameEl.textContent = `⚠️ Heat Cooldown (${seconds}s)`;
                    }
                } else if (isOnCooldown && gameState.selectedNeighborhood) {
                    button.classList.add('loading');
                    button.style.opacity = '0.5';
                    button.style.background = ''; // Reset background
                    // Show cooldown timer on button
                    const remainingTime = window.GameCore.getActionCooldownRemaining(cooldownKey);
                    if (remainingTime > 0 && actionNameEl) {
                        const seconds = Math.ceil(remainingTime / 1000);
                        actionNameEl.textContent = `${originalButtonTexts[actionType]} (${seconds}s)`;
                    }
                } else {
                    button.classList.remove('loading');
                    button.style.opacity = canPerform ? '1' : '0.6';
                    button.style.background = ''; // Reset background
                }
            }
        });
    }

    // Start periodic update for cooldown timers
    setInterval(updateActionButtonStates, 1000);

    // Get action definition
    function getActionDefinition(actionType) {
        return actionDefinitions[actionType];
    }

    // Public API
    return {
        init: function () {
            console.log('Actions initialized');
            // Initialize button texts when module loads
            setTimeout(initializeButtonTexts, 100);
        },

        performAction: performAction,
        canPerformAction: canPerformAction,
        getActionEffectiveness: getActionEffectiveness,
        updateActionButtonStates: updateActionButtonStates,
        getActionDefinition: getActionDefinition
    };
})();