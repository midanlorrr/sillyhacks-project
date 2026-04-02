SillyKitty 🐱💥

A chaotic, adorable desktop cat that walks, screams, pees, and talks back with its own AI personality.

🚀 Features
- Interactive desktop pet: feed, pet, or put SillyKitty to sleep.
- AI personality: responds to your messages in silly, confident, chaotic ways.
- Animations & movement: walks around, sits, naps, gets hungry, and reacts to you.
- Chaos effects: full-screen “pee” overlay, loud screaming when annoyed.
- Hunger & mood system: SillyKitty complains if ignored, demanding attention.
- Sound effects: generated via Web Audio API, no external files needed.


📦 Installation
1. Clone the repo
```
git clone https://github.com/yourusername/sillykitty.git
cd sillykitty
```

2. Install dependencies
```
npm install
```

3. Start the app
```
npm start
```

⚠️ On Windows, if you get an execution policy error:
```
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

SillyKitty should now appear on your desktop.

🛠 How It Works
- Built with Electron, HTML, CSS, and JS.
- Main.js: creates the always-on-top, transparent window for the cat.
- Renderer.js: handles animations, movement, hunger, moods, AI responses, and interactions.
- Styles.css: all pixel-art styling, animations, and visual effects.
- Full-screen overlay: used for chaotic pee effect.
- Web Audio API: generates silly sounds for actions and moods.

🎨 Customization
- Change cat sprite by replacing assets/cat.png
- Adjust AI responses in renderer.js
- Tweak hunger timers, animation speed, and behaviors in renderer.js

🏆 Challenges
- Smooth movement and natural animations
- Designing chaotic behaviors without making the app unplayable
- Building a convincing AI personality without using external APIs
- Handling multiple overlapping windows for full-screen effects

💡 Future Plans
- Smarter AI personality that remembers past interactions
- More animations and cat behaviors (chasing cursor, jumping)
- Customizable skins and pets
- Save pet state over time

📄 File Structure
sillykitty/
│
├─ assets/               # cat sprite, sound effects
├─ main.js               # Electron main process
├─ renderer.js           # pet behavior, AI, and interactions
├─ styles.css            # styling and animations
├─ index.html            # UI: speech bubble, chat, menu
└─ package.json          # npm configuration

🎉 Credits
- Pixel cat sprite inspired by Bongo Cat
- Built for hackathon fun & chaos

🐾 License
Feel free to adopt, modify, or unleash SillyKitty on your own desktop.
