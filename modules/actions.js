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

    // Perform action
    async function performAction(actionType) {
        const gameState = window.GameCore.getState();

        if (gameState.actionCooldown) {
            if (window.UIComponents) {
                window.UIComponents.addLogEntry("Wait before taking another action.");
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

        // Start cooldown
        window.GameCore.setActionCooldown(true);
        setTimeout(() => {
            window.GameCore.setActionCooldown(false);
            updateActionButtonStates();
        }, 2000);

        // Calculate effects
        const powerGain = Math.floor(Math.random() * (action.power[1] - action.power[0] + 1)) + action.power[0];
        const heatGain = Math.floor(Math.random() * (action.heat[1] - action.heat[0] + 1)) + action.heat[0];

        // Apply effects to game state
        window.GameCore.updateCommunityPower(powerGain);
        window.GameCore.updateHeatLevel(heatGain);

        // Apply effects to neighborhood
        if (window.Neighborhoods) {
            window.Neighborhoods.updateNeighborhoodState(neighborhood.id, powerGain);
        }

        // Log action
        if (window.UIComponents) {
            window.UIComponents.addLogEntry(`${action.description} in ${neighborhood.name}`, 'player');
            window.UIComponents.addLogEntry(`+${powerGain} community power, +${heatGain} heat level`, 'player');
        }

        // Update UI
        if (window.UIComponents) {
            window.UIComponents.updateAll();
        }

        if (window.Neighborhoods) {
            window.Neighborhoods.renderAll();
        }

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

        // Update button states
        updateActionButtonStates();
    }

    // Check if action is available
    function canPerformAction(actionType) {
        const gameState = window.GameCore.getState();

        if (gameState.actionCooldown) return false;
        if (!gameState.selectedNeighborhood) return false;
        if (!gameState.isActive) return false;

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

    // Update action button states based on availability
    function updateActionButtonStates() {
        document.querySelectorAll('.action-btn').forEach(button => {
            const actionType = button.dataset.action;
            if (actionType) {
                const canPerform = canPerformAction(actionType);
                const gameState = window.GameCore.getState();

                button.disabled = !canPerform;

                if (gameState.actionCooldown) {
                    button.classList.add('loading');
                    button.style.opacity = '0.5';
                } else {
                    button.classList.remove('loading');
                    button.style.opacity = canPerform ? '1' : '0.6';
                }
            }
        });
    }

    // Get action definition
    function getActionDefinition(actionType) {
        return actionDefinitions[actionType];
    }

    // Public API
    return {
        init: function () {
            console.log('Actions initialized');
        },

        performAction: performAction,
        canPerformAction: canPerformAction,
        getActionEffectiveness: getActionEffectiveness,
        updateActionButtonStates: updateActionButtonStates,
        getActionDefinition: getActionDefinition
    };
})();