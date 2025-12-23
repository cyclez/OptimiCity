// OptimiCity - AI Mayor Module
// Handles: AI Mayor responses, corporate countermeasures, escalation

window.AIMayor = (function () {
    'use strict';

    // Action visibility classification
    const stealthActions = ['meeting', 'intel', 'garden'];
    const loudActions = ['blockDemo', 'occupy', 'pirateBroad'];

    // Calculate probability AI Mayor notices action
    function calculateNoticeProbability(heatLevel, actionType) {
        let baseProbability;

        if (heatLevel < 20) baseProbability = 0.10;      // 10%
        else if (heatLevel < 40) baseProbability = 0.30;  // 30%
        else if (heatLevel < 60) baseProbability = 0.60;  // 60%
        else baseProbability = 0.90;                      // 90%

        // Apply action modifier
        let finalProbability;
        if (stealthActions.includes(actionType)) {
            finalProbability = baseProbability * 0.7;  // Harder to notice
            // Cap stealth at 50% to allow recovery at high heat
            finalProbability = Math.min(0.50, finalProbability);
        } else if (loudActions.includes(actionType)) {
            finalProbability = baseProbability * 1.5;  // Easier to notice
            // Cap at 100%
            finalProbability = Math.min(1.0, finalProbability);
        } else {
            finalProbability = baseProbability;
        }

        return finalProbability;
    }

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

    // Maybe respond to action (based on notice probability)
    async function maybeRespondToAction(actionDescription, neighborhoodName, actionType) {
        const gameState = window.GameCore.getState();
        const noticeProbability = calculateNoticeProbability(gameState.heatLevel, actionType);

        if (Math.random() < noticeProbability) {
            // AI Mayor notices and responds
            return await getResponse(actionDescription, neighborhoodName);
        }

        // Action went unnoticed
        return null;
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
    // Autonomous commentary system - AI Mayor observes city state periodically
    let autonomousTimer = null;

    async function triggerAutonomousCommentary() {
        const gameState = window.GameCore.getState();

        // Build contextual prompt about current city state
        const liberatedCount = gameState.neighborhoods.filter(n => n.resistance >= 60).length;
        const threatenedCount = gameState.neighborhoods.filter(n => n.threatened).length;
        const populationPercentage = ((gameState.activeCitizens / gameState.totalPopulation) * 100).toFixed(2);

        let situationContext = '';
        if (gameState.heatLevel < 30) {
            situationContext = 'City systems operating normally. Minor fluctuations within acceptable parameters.';
        } else if (gameState.heatLevel < 60) {
            situationContext = 'Detecting increased community organization. Monitoring protocols active.';
        } else {
            situationContext = 'Significant resistance detected. Emergency response systems engaged.';
        }

        const prompt = `You are an AI Mayor optimizing city efficiency through algorithms.

CURRENT CITY STATUS:
System Alert Level: ${gameState.heatLevel}%
Community Organization: ${populationPercentage}% of population active
Liberated Districts: ${liberatedCount}/4
Threatened Districts: ${threatenedCount}
Situation: ${situationContext}

Provide a brief, cold observation about the city's current state from your algorithmic perspective. Be corporate, technocratic, detached. No preamble. Max 30 words.`;

        try {
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
                const cleanedResponse = cleanResponse(data.response);

                if (window.UIComponents) {
                    window.UIComponents.addLogEntry(cleanedResponse, 'ai');
                }
            }
        } catch (error) {
            console.warn('Autonomous commentary failed:', error);
            // Silent fail - no fallback, just skip this commentary
        }

        // Schedule next commentary (random 30-100 seconds)
        scheduleNextCommentary();
    }

    function scheduleNextCommentary() {
        // Clear existing timer if any
        if (autonomousTimer) {
            clearTimeout(autonomousTimer);
        }

        // Random interval between 30-100 seconds
        const interval = Math.floor(Math.random() * 70000) + 30000; // 30000-100000ms

        autonomousTimer = setTimeout(() => {
            triggerAutonomousCommentary();
        }, interval);
    }

    function startAutonomousCommentary() {
        console.log('AI Mayor autonomous commentary started (30-100s intervals)');
        scheduleNextCommentary();
    }

    function stopAutonomousCommentary() {
        if (autonomousTimer) {
            clearTimeout(autonomousTimer);
            autonomousTimer = null;
        }
    }

    // Legacy function - kept for compatibility but does nothing now
    function triggerRandomAction() {
        // Disabled - autonomous commentary now handled by timer system
        // This function kept only for backwards compatibility
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
            "Traffic flow algorithms updated for 0.3% efficiency gains.",
            "Municipal budget reallocation optimized via predictive models.",
            "Surveillance network expansion proposal submitted for approval.",
            "Public sentiment analysis complete: compliance at acceptable levels.",
            "Infrastructure maintenance scheduled per cost-benefit matrices.",
            "Tax assessment algorithms recalibrated for revenue optimization.",
            "Emergency response routes recalculated for peak efficiency.",
            "Public services audit initiated: identifying cost reduction targets.",
            "Zoning variance applications processed through automated review.",
            "Waste management logistics optimized via machine learning.",
            "Street lighting patterns adjusted to reduce energy consumption.",
            "Building permit review algorithms updated with new parameters.",
            "Public transportation schedules refined for maximum throughput.",
            "Water distribution network analyzed for efficiency improvements.",
            "Parking enforcement protocols synchronized across districts.",
            "Property tax valuations updated via automated assessment tools.",
            "Code compliance monitoring expanded to additional sectors.",
            "City contract bidding system optimized for cost reduction.",
            "Public space utilization metrics analyzed and logged.",
            "Environmental sensors calibrated for regulatory compliance.",
            "Digital infrastructure maintenance cycle initiated.",
            "Citizen complaint processing queue optimized.",
            "Urban planning simulations running overnight.",
            "Public health data aggregation and analysis in progress.",
            "Economic development zones evaluated for performance.",
            "Social services resource allocation under review.",
            "Municipal communications network upgraded.",
            "Administrative efficiency benchmarks recalculated.",
            "City asset management database synchronized.",
            "Regulatory compliance checks automated across departments."
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
        maybeRespondToAction: maybeRespondToAction,
        triggerRandomAction: triggerRandomAction, // Legacy - does nothing now
        updateMetrics: updateMetrics,
        startAutonomousCommentary: startAutonomousCommentary,
        stopAutonomousCommentary: stopAutonomousCommentary
    };
})();