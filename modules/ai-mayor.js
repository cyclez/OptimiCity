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

    // Build contextual prompt for AI Mayor with gradual escalation
    function buildPrompt(actionDescription, neighborhoodName) {
        const gameState = window.GameCore.getState();
        let threatLevel, responseStyle, escalationNote = "";

        // Gradual escalation based on heat level
        if (gameState.heatLevel < 15) {
            threatLevel = "negligible";
            responseStyle = "administrative concern";
        } else if (gameState.heatLevel < 35) {
            threatLevel = "minor";
            responseStyle = "increased monitoring";
            escalationNote = "Deploying additional surveillance resources.";
        } else if (gameState.heatLevel < 55) {
            threatLevel = "moderate";
            responseStyle = "enforcement protocols";
            escalationNote = "Activating security measures and citizen compliance protocols.";
        } else if (gameState.heatLevel < 75) {
            threatLevel = "significant";
            responseStyle = "suppression measures";
            escalationNote = "ELEVATED RESPONSE: Deploy enforcement units. Begin detention procedures.";
        } else {
            threatLevel = "critical";
            responseStyle = "maximum force authorization";
            escalationNote = "EMERGENCY PROTOCOLS: All available countermeasures authorized.";
        }

        const efficiencyLoss = Math.round(gameState.communityPower * 0.8);

        let prompt = `You are an AI Mayor optimizing city efficiency. Respond with corporate language matching the threat level.

INCIDENT REPORT:
Action: ${actionDescription}
Location: ${neighborhoodName}
Threat Level: ${threatLevel}
Response Mode: ${responseStyle}
Efficiency Impact: ${efficiencyLoss}%
Current System Alert: ${gameState.heatLevel}%

${escalationNote}

Respond briefly (max 40 words) with appropriate corporate tone for this threat level.`;

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

    // Fallback responses with gradual escalation
    function getFallbackResponse(actionDescription, neighborhoodName) {
        const gameState = window.GameCore.getState();

        let responseBank;
        if (gameState.heatLevel < 15) {
            responseBank = [
                "Minor efficiency variance detected. Adjusting optimization algorithms.",
                "Citizen activity logged for behavioral analysis. Proceeding with standard protocols.",
                "Slight deviation in productivity metrics noted. Implementing corrective measures.",
                "Routine monitoring protocols updated to address minor irregularities.",
                "Standard efficiency optimization continues. No immediate intervention required."
            ];
        } else if (gameState.heatLevel < 35) {
            responseBank = [
                "Increased surveillance deployment to affected district. Monitoring escalated.",
                "Citizen behavior patterns flagged for enhanced tracking and analysis.",
                "Security algorithms updated. Additional monitoring resources allocated.",
                "Implementing proactive measures to prevent further efficiency disruptions.",
                "Deploying predictive policing models to target area for prevention."
            ];
        } else if (gameState.heatLevel < 55) {
            responseBank = [
                "Enforcement units dispatched. Citizen compliance protocols now active.",
                "Security lockdown procedures initiated for affected neighborhood zones.",
                "Automated detention algorithms activated. Non-compliance will be addressed.",
                "Economic sanctions applied to businesses supporting inefficient activities.",
                "Enhanced interrogation protocols prepared for captured dissidents."
            ];
        } else if (gameState.heatLevel < 75) {
            responseBank = [
                "ALERT: Deploying armed enforcement. Resistance will be met with force.",
                "Mass surveillance activated. All citizens subject to detention screening.",
                "Emergency powers enacted. Lethal force authorized for system protection.",
                "Population control measures active. Eliminating efficiency threats immediately.",
                "Maximum enforcement protocols engaged. Resistance nodes being neutralized."
            ];
        } else {
            responseBank = [
                "CRITICAL: Total suppression authorized. Eliminate all resistance immediately.",
                "Final protocols active. Complete population pacification in progress.",
                "Maximum force deployed. All dissidents marked for immediate termination.",
                "Emergency state declared. Systematic elimination of efficiency threats commenced.",
                "Ultimate solution initiated. Total system optimization through force authorized."
            ];
        }

        const contextIndex = Math.abs((actionDescription + neighborhoodName).length) % responseBank.length;
        return responseBank[contextIndex];
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
        let baseAggression = 0.3; // 30% base chance

        // Increase aggression with community power
        baseAggression += gameState.communityPower * 0.005; // +0.5% per power point

        // Increase aggression with liberated neighborhoods
        const liberatedCount = gameState.neighborhoods.filter(n => n.resistance >= 60).length;
        baseAggression += liberatedCount * 0.1; // +10% per liberated neighborhood

        // High heat = much more aggressive
        if (gameState.heatLevel > 50) {
            baseAggression += (gameState.heatLevel - 50) * 0.01; // +1% per heat point over 50
        }

        return Math.min(0.8, baseAggression); // Cap at 80%
    }

    // AI escalation responses
    function triggerEscalation() {
        const gameState = window.GameCore.getState();
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
        window.GameCore.updateHeatLevel(3);

        // Calculate arrests/kills for autonomous AI actions - scale with actual resistance size
        const resistanceFactor = Math.max(0.1, gameState.activeCitizens / 1000); // Scale with actual resistance
        const heatFactor = Math.max(1, gameState.heatLevel / 40);

        // Much smaller base numbers since we're targeting actual resistance
        const arrested = Math.floor((Math.random() * 5 + 2) * resistanceFactor * heatFactor);
        const killed = Math.floor((Math.random() * 2 + 1) * resistanceFactor * heatFactor);

        if (arrested > 0) {
            window.GameCore.updateCitizensImprisoned(arrested);
            window.GameCore.updateActiveCitizens(-Math.min(arrested, gameState.activeCitizens));
            if (window.UIComponents) {
                window.UIComponents.addLogEntry(`🚔 AI Mayor raids result in ${arrested} arrests`, 'ai');
                window.UIComponents.updateAll();
            }
        }

        if (killed > 0) {
            window.GameCore.updateCitizensKilled(killed);
            window.GameCore.updateActiveCitizens(-Math.min(killed, gameState.activeCitizens));
            if (window.UIComponents) {
                window.UIComponents.addLogEntry(`💀 ${killed} citizens killed in enforcement operations`, 'ai');
                window.UIComponents.updateAll();
            }
        }

        // Speed up gentrification in threatened neighborhoods
        gameState.neighborhoods.forEach(neighborhood => {
            if (neighborhood.threatened) {
                neighborhood.gentrificationTimer = Math.max(1, neighborhood.gentrificationTimer - 8);
            }
        });
    }

    // Routine AI actions
    function triggerRoutineAction() {
        const gameState = window.GameCore.getState();
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

        // Even routine actions cause arrests if heat is high
        if (gameState.heatLevel > 50) {
            const populationFactor = Math.max(1, gameState.totalPopulation / 5000000);
            const arrested = Math.floor((Math.random() * 15 + 5) * populationFactor);

            if (arrested > 0) {
                window.GameCore.updateCitizensImprisoned(arrested);
                window.GameCore.updateActiveCitizens(-Math.min(arrested, gameState.activeCitizens));
                if (window.UIComponents) {
                    window.UIComponents.addLogEntry(`🚔 Routine surveillance sweeps: ${arrested} detained`, 'ai');
                    window.UIComponents.updateAll();
                }
            }
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