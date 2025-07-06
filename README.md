# 🏴 OptimiCity - Fight the Algorithm

> A radical inversion of SimCity where you play as a grassroots insurgent fighting against an AI Mayor's algorithmic authoritarianism.

## 🎮 Game Overview

In 2029, your city has adopted an "Optimization Protocol" - an AI system that manages urban planning through algorithmic efficiency. The AI Mayor treats neighborhoods as corporate assets, implementing gentrification projects based on profit maximization algorithms.

You are part of an emergent resistance movement. Through **direct action**, **cultural resistance**, **infrastructure hacking**, and **community organizing**, you must build enough community power to overthrow the AI Mayor and implement participatory democracy.

**The question**: Can grassroots organizing defeat algorithmic authoritarianism before your community is optimized out of existence?

## 🚀 Super Quick Start

### Prerequisites
- **Ollama** installed locally
- **llama3.2** model downloaded
- Modern web browser

### ⚡ Play in 2 Steps
```bash
# 1. Start Ollama with browser access
OLLAMA_ORIGINS="*" ollama serve

# 2. Open working-index.html in your browser
# That's it! 🎮
```

**Note**: The `OLLAMA_ORIGINS="*"` is required to allow browser access to Ollama.

### If Ollama is Not Installed
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Download the model
ollama pull llama3.2

# Then follow steps above
```

## 🎯 How to Play

### Core Mechanics

**⏱️ Time Limit**: 15 minutes to build community power  
**🎯 Goal**: Reach 80+ Community Power OR liberate all neighborhoods  
**💀 Defeat**: Heat Level reaches 95 OR all neighborhoods are gentrified

### Action Categories

| Category | Actions | Effects |
|----------|---------|---------|
| **✊ Direct Action** | Occupy, Block Demolition, Protest | High power, high heat |
| **🎨 Cultural Resistance** | Street Art, Gardens, Festivals | Medium power, low heat |
| **💻 Infrastructure Hack** | Disable Cameras, Mesh Networks, Pirate Broadcast | Tech power, medium heat |
| **🤝 Organizing** | Meetings, Recruitment, Intel | Network building, low heat |

### The Two AIs

**🏛️ AI Mayor**: Responds to your actions with corporate efficiency language, deploys countermeasures, escalates surveillance.

**👥 Citizens**: Community members who support your actions with solidarity, mutual aid, and complementary organizing.

### Neighborhood System

Each neighborhood has:
- **Resistance Level**: How organized the community is
- **Gentrification Timer**: Hours until forced demolition
- **Population**: Residents who could be displaced
- **Threat Status**: Red pulsing borders indicate imminent gentrification

## 🎮 Controls

- **Mouse**: Click neighborhoods to select, click action buttons
- **1-4 Keys**: Quick-select neighborhoods  
- **All actions**: Click the resistance action buttons

## 🤖 AI Integration

### Dual AI System
OptimiCity uses **two separate AI agents** running on your local Ollama instance:

1. **AI Mayor Agent**: Corporate/algorithmic personality, responds with efficiency measures
2. **Citizen Agent**: Community-oriented personality, offers solidarity and mutual aid

### Ollama Configuration
```javascript
// Connects to: http://localhost:11434
// Model: llama3.2
// Fallback: Pre-written responses if Ollama unavailable
```

## 📁 File Structure

### Project Structure
```
optimicity/
├── working-index.html      ✅ COMPLETE GAME
├── README.md              📖 Documentation and instructions
└── LICENSE                📜 MIT License (optional)
```

**To play**: You only need `working-index.html`

## 🔧 Troubleshooting

### Ollama Issues
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama with browser access (REQUIRED)
OLLAMA_ORIGINS="*" ollama serve

# Restart if needed
pkill ollama && OLLAMA_ORIGINS="*" ollama serve

# Download model if missing
ollama pull llama3.2
```

### Common Errors
| Error | Solution |
|-------|----------|
| "CORS policy error" | Restart Ollama with: `OLLAMA_ORIGINS="*" ollama serve` |
| "AI Mayor offline" | Check Ollama is running with CORS enabled |
| Game doesn't start | Refresh page, check browser console for errors |
| No neighborhoods visible | Ensure working-index.html loads completely |

## 🎭 Game Design Philosophy

### Critique of "Smart Cities"
OptimiCity critiques techno-solutionism and algorithmic governance:
- **Data Points vs. People**: AI Mayor treats citizens as optimization variables
- **Efficiency vs. Community**: Corporate metrics vs. human relationships  
- **Surveillance vs. Privacy**: "Safety" through total monitoring
- **Top-down vs. Grassroots**: Algorithmic planning vs. participatory democracy

### Resistance Themes
- **Mutual Aid**: Community members supporting each other
- **Cultural Resistance**: Art, festivals, and joy as forms of protest
- **Direct Action**: Physical intervention against harmful systems
- **Technology for Liberation**: Hacking surveillance, creating mesh networks

## 🔄 Game Strategies

### Early Game (0-300 seconds)
- Select threatened neighborhoods first
- Focus on **Organizing** actions to build network safely
- Use **Cultural Resistance** to build power with low heat

### Mid Game (300-600 seconds)  
- Mix **Direct Action** with community building
- Watch for AI Mayor escalation at 30+ heat
- Coordinate actions across multiple neighborhoods

### End Game (600-900 seconds)
- **High-risk, high-reward** direct actions
- Focus on neighborhoods close to liberation (60+ resistance)
- Use **Infrastructure Hacking** to reduce surveillance pressure

### Advanced Tactics
- **Action Chaining**: Sequential actions in nearby neighborhoods
- **Heat Management**: Balance power gain with surveillance pressure
- **Timing**: Save high-power actions for threatened neighborhoods

## 🏗️ Technical Details

### Self-Contained Design
- **Single HTML file**: All CSS, JavaScript, and HTML in `working-index.html`
- **No external dependencies**: Except Ollama for AI responses
- **No server required**: Pure client-side application
- **No installation**: Just open in browser
- **Portable**: Copy one file to share the game
- **For developers**: Modify the embedded code directly in the HTML file

### Performance
- **Fast AI Responses**: 10-second timeout with fallback responses
- **Concurrent Processing**: Both AIs respond simultaneously  
- **Browser Compatible**: Modern browsers (Chrome/Firefox/Safari)

## 🌟 Victory Conditions

### Ways to Win
1. **Community Power ≥ 80**: Critical mass of organized resistance
2. **All Neighborhoods Liberated**: 60+ resistance in every neighborhood
3. **Time Bonus**: High community power when time expires

### Ways to Lose  
1. **Heat Level ≥ 95**: Total surveillance state implemented
2. **Mass Gentrification**: Too many neighborhoods destroyed
3. **Time Penalty**: Low community power when time expires

## 🚀 Distribution

### Sharing the Game
1. **Share `working-index.html`** - That's the entire game
2. **Include instructions**: "Start Ollama with CORS, open file"
3. **No setup required**: Works immediately on any computer

### Running Workshops
- Perfect for **community organizing workshops**
- **Educational tool** for discussing algorithmic governance
- **Conversation starter** about smart cities and resistance
- Share `working-index.html` + `README.md` for full instructions

## 📖 Game Lore

In 2029, cities worldwide adopted "Optimization Protocols" - AI systems that manage urban planning through algorithmic efficiency. Your city's AI Mayor treats neighborhoods as corporate assets, implementing gentrification projects based on profit maximization algorithms.

You are part of an emergent resistance movement that believes true democracy requires active organizing against systems that treat people as data points. Through direct action, cultural resistance, and infrastructure hacking, you must build enough community power to overthrow the AI Mayor and implement participatory democracy.

**Remember**: This is a game about resistance, but real-world organizing happens in communities, not browsers. Use OptimiCity as a starting point for deeper engagement with housing justice, digital rights, and community organizing.

---

## 🏴 Ready to Resist?

Start Ollama, open working-index.html, and begin building community power against algorithmic authoritarianism.

*The future of your city depends on grassroots organizing. Will you liberate your neighborhoods before they're optimized out of existence?*

**Good luck, organizer. The resistance needs you.** ✊