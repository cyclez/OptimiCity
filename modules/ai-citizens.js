// OptimiCity - AI Citizens Module
// Handles: Community responses, solidarity, mutual aid coordination

window.AICitizens = (function () {
    'use strict';

    // AI Citizens Response System
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
                        temperature: 0.7,
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
            console.warn('Citizen response failed:', error);
        }

        // Fallback to predefined responses
        return getFallbackResponse(actionDescription, neighborhoodName);
    }

    // Build contextual prompt for Citizens
    function buildPrompt(actionDescription, neighborhoodName) {
        const gameState = window.GameCore.getState();
        const morale = gameState.communityPower < 20 ? "struggling but determined" :
            gameState.communityPower < 50 ? "building solidarity" : "strong and unified";

        const liberatedCount = gameState.neighborhoods.filter(n => n.resistance >= 60).length;

        let prompt = `You represent diverse community organizers, families, local businesses, and activists fighting against algorithmic urban control. You believe in mutual aid, grassroots democracy, and community self-determination.

COMMUNITY ACTION UPDATE:
Action: ${actionDescription}
Location: ${neighborhoodName}
Community Morale: ${morale}
Active Organizers: ${gameState.activeCitizens}
Liberated Neighborhoods: ${liberatedCount}
Collective Power: ${gameState.communityPower}

Someone just took action in the resistance. Respond with brief community solidarity and mutual aid (max 40 words).`;

        // Add context based on community strength
        if (gameState.communityPower > 40) {
            prompt += `\n\nOUR MOVEMENT IS GROWING: The community has strong networks. How do we build on this momentum?`;
        } else if (gameState.communityPower < 20) {
            prompt += `\n\nWE NEED SUPPORT: The community is under pressure. How do we care for each other and keep organizing?`;
        }

        return prompt;
    }

    // Clean and format Citizen response
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
        const moraleLevel = gameState.communityPower > 50 ? 'high' :
            gameState.communityPower > 20 ? 'medium' : 'low';

        const fallbackResponses = {
            low: [
                "Community center organizing emergency response meeting tonight.",
                "Neighbors sharing resources and child care for organizers.",
                "Local business offering safe space for resistance planning.",
                "Elders sharing organizing wisdom and historical strategies.",
                "Youth setting up secure communication networks for coordination."
            ],
            medium: [
                "Mutual aid network expanding to support more families.",
                "Local artists creating solidarity murals across the neighborhood.",
                "Community kitchen providing free meals for all organizers.",
                "Residents documenting police misconduct and sharing evidence.",
                "Small businesses coordinating boycott of corporate developments."
            ],
            high: [
                "Multiple neighborhoods coordinating simultaneous resistance actions.",
                "Community land trust forming to protect affordable housing.",
                "Neighborhood assemblies planning participatory democracy structures.",
                "Cross-community solidarity networks sharing successful strategies.",
                "Alternative economic systems emerging through mutual aid networks."
            ]
        };

        const responses = fallbackResponses[moraleLevel];
        const contextIndex = Math.abs((actionDescription + neighborhoodName).length) % responses.length;
        return responses[contextIndex];
    }

    // Community autonomous actions (called from game loop)
    function triggerCommunityAction() {
        if (Math.random() < getCommunityActivityLevel()) {
            const communityActions = getCommunityActionsByMorale();
            const action = communityActions[Math.floor(Math.random() * communityActions.length)];

            if (window.UIComponents) {
                window.UIComponents.addLogEntry(action, 'citizen');
            }

            // Small community power boost for autonomous organizing
            const gameState = window.GameCore.getState();
            if (gameState.communityPower < 90) {
                window.GameCore.updateCommunityPower(1);
            }
        }
    }

    // Calculate community activity level based on game state
    function getCommunityActivityLevel() {
        const gameState = window.GameCore.getState();
        let baseActivity = 0.05; // 5% base chance

        // Increase activity with community power (organized communities do more)
        baseActivity += gameState.communityPower * 0.001; // +0.1% per power point

        // Increase activity when under threat (solidarity in crisis)
        const threatenedCount = gameState.neighborhoods.filter(n => n.threatened).length;
        baseActivity += threatenedCount * 0.02; // +2% per threatened neighborhood

        // Decrease activity with high heat (suppression effect)
        if (gameState.heatLevel > 70) {
            baseActivity *= 0.7; // 30% reduction under heavy surveillance
        }

        return Math.min(0.2, baseActivity); // Cap at 20%
    }

    // Get community actions based on current morale/power
    function getCommunityActionsByMorale() {
        const gameState = window.GameCore.getState();

        if (gameState.communityPower > 50) {
            return [
                "Neighborhood assembly discussing participatory budgeting proposals.",
                "Community land trust organizing to prevent further gentrification.",
                "Multiple blocks coordinating resistance strategy sharing.",
                "Local businesses forming cooperative network for mutual support.",
                "Residents establishing community-controlled broadband infrastructure."
            ];
        } else if (gameState.communityPower > 20) {
            return [
                "Community garden providing fresh food for organizing meetings.",
                "Local clinic offering free healthcare for resistance members.",
                "Neighbor-to-neighbor wellness checks ensuring everyone's safety.",
                "Community tool library opening for neighborhood infrastructure projects.",
                "Residents creating phone trees for rapid emergency response."
            ];
        } else {
            return [
                "Families sharing meals and child care during difficult times.",
                "Elderly residents offering homes as safe meeting spaces.",
                "Community members quietly documenting surveillance and harassment.",
                "Local volunteers providing transportation for those in need.",
                "Neighbors creating informal support networks for basic needs."
            ];
        }
    }

    // Boost community response based on recent actions
    function boostCommunityMorale(actionType, neighborhood) {
        // Community responds more strongly to certain types of actions
        const mobilizingActions = ['protest', 'festival', 'meeting', 'recruit'];

        if (mobilizingActions.includes(actionType)) {
            const gameState = window.GameCore.getState();

            // Boost morale in nearby neighborhoods
            gameState.neighborhoods.forEach(n => {
                if (n.id !== neighborhood.id && !n.threatened) {
                    const distance = calculateNeighborhoodDistance(neighborhood, n);
                    if (distance < 200) { // Nearby neighborhoods
                        n.resistance += 1; // Small solidarity boost
                    }
                }
            });

            if (window.UIComponents) {
                window.UIComponents.addLogEntry(`${neighborhood.name}'s action inspires solidarity in nearby areas.`, 'citizen');
            }
        }
    }

    // Calculate distance between neighborhoods (simple 2D distance)
    function calculateNeighborhoodDistance(n1, n2) {
        const dx = (n1.x + n1.width / 2) - (n2.x + n2.width / 2);
        const dy = (n1.y + n1.height / 2) - (n2.y + n2.height / 2);
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Community response to AI Mayor escalation
    function respondToAIEscalation() {
        const gameState = window.GameCore.getState();

        if (gameState.heatLevel > 70) {
            const escalationResponses = [
                "Emergency mutual aid networks activating across all neighborhoods.",
                "Community members going underground to protect organizing infrastructure.",
                "Rapid response teams forming to document and resist police actions.",
                "Alternative communication networks bypassing monitored channels.",
                "Community defense groups organizing know-your-rights trainings."
            ];

            const response = escalationResponses[Math.floor(Math.random() * escalationResponses.length)];

            if (window.UIComponents) {
                window.UIComponents.addLogEntry(response, 'citizen');
            }

            // Resistance hardens under pressure
            if (gameState.communityPower > 30) {
                window.GameCore.updateCommunityPower(2); // Solidarity bonus under repression
            }
        }
    }

    // Show community support for liberated neighborhoods
    function celebrateLiberation(neighborhoodName) {
        const celebrationMessages = [
            `Block parties erupting across the city celebrating ${neighborhoodName}'s liberation!`,
            `Communities citywide inspired by ${neighborhoodName}'s successful resistance.`,
            `${neighborhoodName} shares organizing strategies with other neighborhoods.`,
            `Liberation of ${neighborhoodName} proves community power can defeat algorithms.`,
            `Mutual aid networks strengthened by ${neighborhoodName}'s victory example.`
        ];

        const message = celebrationMessages[Math.floor(Math.random() * celebrationMessages.length)];

        if (window.UIComponents) {
            window.UIComponents.addLogEntry(message, 'citizen');
        }

        // Liberation inspires other communities
        const gameState = window.GameCore.getState();
        gameState.activeCitizens += 1;
        window.GameCore.updateCommunityPower(5);
    }

    // Public API
    return {
        init: function () {
            console.log('AICitizens initialized');
        },

        getResponse: getResponse,
        triggerCommunityAction: triggerCommunityAction,
        boostCommunityMorale: boostCommunityMorale,
        respondToAIEscalation: respondToAIEscalation,
        celebrateLiberation: celebrateLiberation
    };
})();