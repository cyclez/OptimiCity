// OptimiCity - AI Mayor Module
// Handles: AI Mayor responses, corporate countermeasures, escalation

window.AIMayor = (function () {
    'use strict';

    // AI Mayor Response System
    async function getResponse(actionDescription, neighborhoodName) {
        try {
            const prompt = buildPrompt(actionDescription, neighborhoodName);

            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'llama3.2',
                    prompt: prompt,
                    stream: false,
                    options: {
                        temperature: 0.3,
                        num_predict: 1000,
                        top_p: 0.9
                    }
                })
            });

            if (response.ok) {
                const data = await response.json();
                return cleanResponse(data.response);
            }
        } catch (error) {
            console.warn('AI Mayor response failed:', error);
        }

        // Fallback to predefined responses
        return getFallbackResponse(actionDescription, neighborhoodName);
    }

    // Build contextual prompt for AI Mayor
    function buildPrompt(actionDescription, neighborhoodName) {
        const gameState = window.GameCore.getState();
        const threatLevel = gameState.heatLevel < 20 ? "minimal" :
            gameState.heatLevel < 50 ? "moderate" : "critical";

        const efficiencyLoss = Math.round(gameState.communityPower * 1.2);

        let prompt = `You are an AI Mayor optimizing a city for maximum efficiency and profit. You treat citizens as data points in optimization algorithms.

RESISTANCE ACTION DETECTED:
Action: ${actionDescription}
Location: ${neighborhoodName}
Threat Level: ${threatLevel}
System Efficiency Loss: ${efficiencyLoss}%
Current Dissent Level: ${gameState.heatLevel}%

Respond with a brief corporate countermeasure (max 50 words). Use cold, algorithmic language focused on efficiency metrics and control.`;

        // Add escalation context for high threat levels
        if (gameState.heatLevel > 50) {
            prompt += `\n\nELEVATED THREAT PROTOCOL: Deploy advanced countermeasures. Multiple resistance cells detected.`;
        }

        return prompt;
    }

    // Clean and format AI Mayor response
    function cleanResponse(response) {
        return response
            .trim()
            .replace(/^\"|\"$/g, '') // Remove quotes
            .replace(/\n+/g, ' ')     // Replace newlines with spaces
            .replace(/\s+/g, ' ')     // Normalize whitespace
            .slice(0, 1000);            // Ensure max length
    }

    // Fallback responses when Ollama is unavailable
    function getFallbackResponse(actionDescription, neighborhoodName) {
        const gameState = window.GameCore.getState();
        const escalationLevel = gameState.heatLevel > 50 ? 'high' :
            gameState.heatLevel > 20 ? 'medium' : 'low';

        const fallbackResponses = {
            low: [
                "Deploying additional surveillance units to target area.",
                "Efficiency algorithms updated to counter disruption patterns.",
                "Property optimization protocols activated.",
                "Citizen behavior patterns flagged for enhanced monitoring.",
                "Automated patrol routes recalibrated for maximum coverage."
            ],
            medium: [
                "Escalating surveillance protocols in response to inefficiency.",
                "Economic pressure algorithms activated for non-compliant zones.",
                "Predictive policing models deployed to prevent further disruption.",
                "Property value optimization accelerated in affected areas.",
                "Social media monitoring increased 200% in target demographics."
            ],
            high: [
                "CRITICAL THREAT: Deploying emergency optimization protocols.",
                "All available enforcement algorithms directed to resistance zones.",
                "Immediate eviction procedures initiated for efficiency restoration.",
                "Emergency gentrification acceleration approved for target areas.",
                "Maximum surveillance state protocols now active city-wide."
            ]
        };

        const responses = fallbackResponses[escalationLevel];
        const contextIndex = Math.abs((actionDescription + neighborhoodName).length) % responses.length;
        return responses[contextIndex];
    }

    // AI Mayor autonomous actions (called from game loop)
    function triggerRandomAction() {
        if (Math.random() < getAggressionLevel()) {
            const gameState = window.GameCore.getState();

            if (gameState.heatLevel > 50) {
                triggerEscalation();
            } else {
                triggerRoutineAction();
            }
        }
    }

    // Calculate AI Mayor aggression based on game state
    function getAggressionLevel() {
        const gameState = window.GameCore.getState();
        let baseAggression = 0.1; // 10% base chance

        // Increase aggression with community power
        baseAggression += gameState.communityPower * 0.002; // +0.2% per power point

        // Increase aggression with liberated neighborhoods
        const liberatedCount = gameState.neighborhoods.filter(n => n.resistance >= 60).length;
        baseAggression += liberatedCount * 0.05; // +5% per liberated neighborhood

        return Math.min(0.3, baseAggression); // Cap at 30%
    }

    // AI escalation responses
    function triggerEscalation() {
        const escalationActions = [
            "Emergency optimization protocols activated across all districts.",
            "Deploying autonomous enforcement units to resistance hotspots.",
            "Predictive arrest algorithms now targeting potential dissidents.",
            "Economic sanctions applied to non-compliant neighborhood businesses.",
            "Emergency gentrification orders fast-tracked through automated systems."
        ];

        const action = escalationActions[Math.floor(Math.random() * escalationActions.length)];

        if (window.UIComponents) {
            window.UIComponents.addLogEntry(action, 'ai');
        }

        // Apply escalation effects
        const gameState = window.GameCore.getState();
        window.GameCore.updateHeatLevel(3);

        // Speed up gentrification in threatened neighborhoods
        gameState.neighborhoods.forEach(neighborhood => {
            if (neighborhood.threatened) {
                neighborhood.gentrificationTimer = Math.max(1, neighborhood.gentrificationTimer - 8);
            }
        });
    }

    // Routine AI actions
    function triggerRoutineAction() {
        const routineActions = [
            "Efficiency optimization protocols updated across city systems.",
            "Property value algorithms recalibrated for maximum ROI.",
            "Citizen movement patterns analyzed for behavioral optimization.",
            "Resource allocation algorithms fine-tuned for peak efficiency.",
            "Automated zoning adjustments implemented per optimization models."
        ];

        const action = routineActions[Math.floor(Math.random() * routineActions.length)];

        if (window.UIComponents) {
            window.UIComponents.addLogEntry(action, 'ai');
        }
    }

    // Update AI interface metrics
    function updateMetrics() {
        const gameState = window.GameCore.getState();
        const efficiency = Math.max(0, Math.min(100, 90 - gameState.communityPower));
        const surveillance = Math.max(50, 95 - gameState.communityPower * 0.5);

        const cityEfficiencyEl = document.getElementById('cityEfficiency');
        const dissentLevelEl = document.getElementById('dissentLevel');
        const surveillanceEl = document.getElementById('surveillance');

        if (cityEfficiencyEl) cityEfficiencyEl.textContent = Math.round(efficiency) + '%';
        if (dissentLevelEl) dissentLevelEl.textContent = Math.round(gameState.heatLevel) + '%';
        if (surveillanceEl) surveillanceEl.textContent = Math.round(surveillance) + '%';

        // Update threat level display
        const threatLevel = document.getElementById('threatLevel');
        if (threatLevel) {
            if (gameState.heatLevel < 20) {
                threatLevel.textContent = 'MINIMAL';
                threatLevel.style.color = '#27ae60';
                threatLevel.style.background = 'rgba(46, 204, 113, 0.2)';
            } else if (gameState.heatLevel < 50) {
                threatLevel.textContent = 'MODERATE';
                threatLevel.style.color = '#f39c12';
                threatLevel.style.background = 'rgba(243, 156, 18, 0.2)';
            } else {
                threatLevel.textContent = 'CRITICAL';
                threatLevel.style.color = '#e74c3c';
                threatLevel.style.background = 'rgba(231, 76, 60, 0.2)';
            }
        }
    }

    // Public API
    return {
        init: function () {
            console.log('AIMayor initialized');
        },

        getResponse: getResponse,
        triggerRandomAction: triggerRandomAction,
        updateMetrics: updateMetrics
    };
})();