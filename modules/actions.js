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

        // Population-based scaling
        const populationFactor = Math.max(1, gameState.totalPopulation / 8000000); // Base 8M

        // Heat level-based scaling
        const heatFactor = Math.max(0.5, gameState.heatLevel / 60);

        let killed = 0;
        let imprisoned = 0;

        // Low risk actions (garden, meeting, intel) have greatly reduced penalties
        const lowRiskMultiplier = isLowRiskAction ? 0.2 : 1.0;

        switch (riskLevel) {
            case 'low':
                imprisoned = Math.floor((Math.random() * 2 + 1) * populationFactor * lowRiskMultiplier);
                // No deaths for low risk, except direct actions
                if (isDirectAction && Math.random() < 0.1) {
                    killed = 1;
                }
                break;
            case 'medium':
                imprisoned = Math.floor((Math.random() * 5 + 2) * populationFactor * lowRiskMultiplier);
                if (isDirectAction && Math.random() < 0.3) {
                    killed = Math.floor((Math.random() * 2 + 1) * populationFactor * lowRiskMultiplier);
                }
                break;
            case 'high':
                imprisoned = Math.floor((Math.random() * 10 + 5) * populationFactor * heatFactor * lowRiskMultiplier);
                killed = Math.floor((Math.random() * 5 + 1) * populationFactor * heatFactor * lowRiskMultiplier);
                if (isDirectAction) {
                    killed += Math.floor((Math.random() * 3 + 1) * populationFactor);
                }
                break;
            case 'extreme':
                imprisoned = Math.floor((Math.random() * 20 + 10) * populationFactor * heatFactor * lowRiskMultiplier);
                killed = Math.floor((Math.random() * 10 + 3) * populationFactor * heatFactor * lowRiskMultiplier);
                if (isDirectAction) {
                    killed += Math.floor((Math.random() * 8 + 2) * populationFactor * heatFactor);
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

        if (!gameState.selectedNeighborhood) {
            if (window.UIComponents) {
                window.UIComponents.addLogEntry("Select a neighborhood first to take action.");
            }
            return;
        }

        const neighborhood = gameState.neighborhoods.find(n => n.id === gameState.selectedNeighborhood);
        const action = actionDefinitions[actionType];

        if (!neighborhood || !action) return;

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

        // Check for casualties based on risk level - FORCED FOR DEBUG
        console.log(`Risk level: ${riskLevel}, Heat: ${gameState.heatLevel}`);
        const forceCasualties = true; // Force always for testing
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

        // Increase active citizens for Cultural/Organizing actions
        const culturalActions = ['streetArt', 'garden', 'festival'];
        const organizingActions = ['meeting', 'recruit', 'intel'];
        if (culturalActions.includes(actionType) || organizingActions.includes(actionType)) {
            const citizenGain = Math.floor(Math.random() * 5) + 2;
            window.GameCore.updateActiveCitizens(citizenGain);
        }

        // Apply effects to neighborhood
        if (window.Neighborhoods) {
            window.Neighborhoods.updateNeighborhoodState(neighborhood.id, powerGain);
        }

        // Log action with risk warning
        if (window.UIComponents) {
            window.UIComponents.addLogEntry(`${action.description} in ${neighborhood.name}`, 'player');
            window.UIComponents.addLogEntry(`+${powerGain} community power, +${heatGain} heat level`, 'player');

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

        // Get AI responses
        setTimeout(async () => {
            if (window.AIMayor) {
                const aiResponse = await window.AIMayor.getResponse(action.description, neighborhood.name);
                if (window.UIComponents) {
                    window.UIComponents.addLogEntry(aiResponse, 'ai');
                    window.UIComponents.updateAIInterface(aiResponse);
                }
            }
        }, 1000);

        setTimeout(async () => {
            if (window.AICitizens) {
                const citizenResponse = await window.AICitizens.getResponse(action.description, neighborhood.name);
                if (window.UIComponents) {
                    window.UIComponents.addLogEntry(citizenResponse, 'citizen');
                }
            }
        }, 2500);

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
                const canPerform = canPerformAction(actionType);
                const actionNameEl = button.querySelector('.action-name');

                button.disabled = !canPerform;

                // Always reset to original text first
                if (actionNameEl && originalButtonTexts[actionType]) {
                    actionNameEl.textContent = originalButtonTexts[actionType];
                }

                if (isOnCooldown && gameState.selectedNeighborhood) {
                    button.classList.add('loading');
                    button.style.opacity = '0.5';
                    // Show cooldown timer on button
                    const remainingTime = window.GameCore.getActionCooldownRemaining(cooldownKey);
                    if (remainingTime > 0 && actionNameEl) {
                        const seconds = Math.ceil(remainingTime / 1000);
                        actionNameEl.textContent = `${originalButtonTexts[actionType]} (${seconds}s)`;
                    }
                } else {
                    button.classList.remove('loading');
                    button.style.opacity = canPerform ? '1' : '0.6';
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