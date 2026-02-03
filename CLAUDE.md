# Spelling Word Practice Game

## Overview
A kid-friendly spelling word practice game with a teacher/admin mode for managing word lists and a student practice mode with interactive letter tiles and text-to-speech.

## Tech Stack
- **Server**: Node.js + Express (static file server only)
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (no frameworks, no build tools)
- **APIs**: Web Speech API (text-to-speech), localStorage (persistence), File API (import/export)
- **Single dependency**: Express

## Project Structure
```
SpellingWordGame/
├── setup.ps1              # PowerShell environment setup script (requires admin)
├── server.js              # Express static file server (port 3000)
├── package.json           # Express dependency, "npm start" script
└── public/
    ├── index.html         # Single page with admin + practice sections
    ├── styles.css         # Gradient-heavy, colorful kid-friendly styling
    └── app.js             # All application logic in a single IIFE
```

## Environment Setup
Run the PowerShell setup script as Administrator to install Node.js (via winget) and project dependencies:
```powershell
.\setup.ps1
```
This will install Node.js LTS if not present, refresh the PATH, and run `npm install`.

## Running the App
```
npm install
npm start
# Open http://localhost:3000
```

## Architecture Notes
- All frontend code lives in a single IIFE in `app.js` to avoid global scope pollution
- Two UI modes toggled by hiding/showing `#admin-section` and `#practice-section` via the `hidden` attribute
- Word list is persisted in `localStorage` under the key `spellingWords` as a JSON array
- Practice mode uses a shuffled copy (`practiceWords`) so the master list order is preserved
- Tile generation: 3x the word length (correct letters + random filler), Fisher-Yates shuffled
- Scoring tracks first-try correct answers only; wrong answers clear tiles and allow retry

## Code Conventions
- ES5 syntax throughout (`var`, `function`, no arrow functions)
- Section headers use `// --- Section Name ---` delimiters
- DOM element references cached at the top of the IIFE in a "DOM refs" block
- HTML IDs use kebab-case (`word-input`, `practice-section`)
- JS variables/functions use camelCase (`renderWordList`, `practiceWords`)
- CSS uses ID selectors for unique elements, class selectors only for `.tile`, `.used`, `.correct`, `.incorrect`
- Validation regex: `/^[a-z]+$/` — words must be lowercase letters only

## Import/Export Format
```json
{
  "name": "Spelling Words",
  "words": ["cat", "dog", "sun"]
}
```

## Key Behaviors
- Words are deduplicated on add
- Imported words are sanitized (trimmed, lowercased, filtered to a-z)
- Speech uses a voice preference list (Microsoft Zira, Google US English, Samantha, etc.) with English fallback
- Speech rate is 0.65 for clarity; format is "Spell the word, [word]"
- Wrong answers do not advance — tiles reset and student retries until correct
- End-of-game shows first-try score and offers a Play Again button (re-shuffles words)
