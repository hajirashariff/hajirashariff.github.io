// Supabase Configuration
const SUPABASE_URL = 'https://igoyibkpphrlipfofxjm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlnb3lpYmtwcGhybGlwZm9meGptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MDcxNDMsImV4cCI6MjA4NzA4MzE0M30.boZ9zGQ78ryyOC-VaWASmAmIBVMlvLj7nRSz-GlrVPI';

// Initialize Supabase client
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Guest Book functionality
class GuestBook {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadMessages();
    }

    bindEvents() {
        const form = document.getElementById('guestbook-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }
    }

    async handleSubmit(e) {
        e.preventDefault();

        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        try {
            // Show loading state
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>[SUBMITTING...]';
            submitBtn.disabled = true;

            const name = document.getElementById('guest-name').value.trim();
            const email = document.getElementById('guest-email').value.trim();
            const message = document.getElementById('guest-message').value.trim();

            // Validate inputs
            if (!name || !message) {
                throw new Error('Name and message are required');
            }

            console.log('Attempting to submit:', { name, email, message });

            // Submit to Supabase
            const { data, error } = await supabaseClient
                .from('guestbook')
                .insert([
                    {
                        name: name,
                        email: email,
                        message: message
                    }
                ]);

            if (error) {
                throw error;
            }

            // Show success message
            this.showNotification('Message submitted successfully!', 'success');

            // Reset form
            document.getElementById('guestbook-form').reset();

            // Reload messages
            await this.loadMessages();

        } catch (error) {
            console.error('Error submitting message:', error);
            console.error('Error details:', error.message);
            console.error('Supabase URL:', SUPABASE_URL);
            console.error('Supabase Key:', SUPABASE_ANON_KEY ? 'Present' : 'Missing');

            // Check for common database errors
            if (error.message.includes('relation "public.guestbook" does not exist') ||
                error.message.includes('does not exist')) {
                this.showNotification('⚠️ Database setup required! Please create the guestbook table in your Supabase dashboard.', 'error');
                this.showDatabaseInstructions();
            } else if (error.message.includes('permission denied') ||
                error.message.includes('insufficient_privilege')) {
                this.showNotification('⚠️ Permission error! Please check your database policies.', 'error');
            } else {
                this.showNotification(`Failed to submit message: ${error.message}`, 'error');
            }
        } finally {
            // Reset button state
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    async loadMessages() {
        const loadingEl = document.getElementById('messages-loading');
        const containerEl = document.getElementById('messages-container');
        const noMessagesEl = document.getElementById('no-messages');

        try {
            // Show loading state
            loadingEl.classList.remove('hidden');
            containerEl.classList.add('hidden');
            noMessagesEl.classList.add('hidden');

            // Fetch messages from Supabase
            const { data: messages, error } = await supabaseClient
                .from('guestbook')
                .select('*')
                .eq('approved', true)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) {
                throw error;
            }

            // Hide loading state
            loadingEl.classList.add('hidden');

            if (messages && messages.length > 0) {
                this.renderMessages(messages);
                containerEl.classList.remove('hidden');
            } else {
                noMessagesEl.classList.remove('hidden');
            }

        } catch (error) {
            console.error('Error loading messages:', error);
            loadingEl.classList.add('hidden');
            noMessagesEl.classList.remove('hidden');
            this.showNotification('Failed to load messages', 'error');
        }
    }

    renderMessages(messages) {
        const container = document.getElementById('messages-container');
        container.innerHTML = '';

        messages.forEach(message => {
            const messageEl = document.createElement('div');
            messageEl.className = 'retro-window p-4 mb-4';

            const date = new Date(message.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            messageEl.innerHTML = `
                <div class="flex justify-between items-start mb-3">
                    <div class="flex items-center">
                        <div class="w-10 h-10 bg-gradient-to-r from-pink-500 to-cyan-400 rounded-full flex items-center justify-center mr-3">
                            <span class="text-white font-bold text-sm">${message.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                            <h4 class="font-bold text-black retro-font">${this.escapeHtml(message.name)}</h4>
                            <p class="text-sm text-gray-600">${date}</p>
                        </div>
                    </div>
                    <div class="text-2xl">
                        <i class="fas fa-quote-left text-pink-500"></i>
                    </div>
                </div>
                <div class="bg-gray-50 p-4 border-l-4 border-pink-500">
                    <p class="text-black leading-relaxed">${this.escapeHtml(message.message)}</p>
                </div>
            `;

            container.appendChild(messageEl);
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg border-3 border-black max-w-sm ${type === 'success' ? 'bg-green-400' :
                type === 'error' ? 'bg-red-400' : 'bg-cyan-400'
            }`;

        notification.innerHTML = `
            <div class="flex items-center">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} mr-2"></i>
                <span class="retro-font font-bold">${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);

        // Add click to dismiss
        notification.addEventListener('click', () => {
            notification.remove();
        });
    }

    showDatabaseInstructions() {
        // Create instructions modal
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-black">🚀 Database Setup Required</h3>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                
                <div class="space-y-4">
                    <p class="text-gray-700">Your guest book needs a database table. Follow these simple steps:</p>
                    
                    <div class="bg-blue-50 p-4 rounded-lg">
                        <h4 class="font-bold text-blue-800 mb-2">Step 1: Open Supabase Dashboard</h4>
                        <p class="text-blue-700 mb-2">Go to: <a href="https://supabase.com/dashboard/project/ivkvadpphxpajnexgmjt" target="_blank" class="underline">https://supabase.com/dashboard/project/ivkvadpphxpajnexgmjt</a></p>
                    </div>
                    
                    <div class="bg-green-50 p-4 rounded-lg">
                        <h4 class="font-bold text-green-800 mb-2">Step 2: Run SQL Script</h4>
                        <p class="text-green-700 mb-2">1. Click "SQL Editor" in the left sidebar</p>
                        <p class="text-green-700 mb-2">2. Click "New Query"</p>
                        <p class="text-green-700 mb-2">3. Copy and paste this SQL script:</p>
                        <textarea readonly class="w-full h-32 p-3 bg-gray-100 border rounded text-sm font-mono" onclick="this.select()">CREATE TABLE IF NOT EXISTS public.guestbook (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    message TEXT NOT NULL,
    approved BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.guestbook ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to approved messages" 
    ON public.guestbook 
    FOR SELECT 
    USING (approved = true);

CREATE POLICY "Allow public insert access" 
    ON public.guestbook 
    FOR INSERT 
    WITH CHECK (true);</textarea>
                        <p class="text-green-700 mt-2">4. Click "Run" to execute</p>
                    </div>
                    
                    <div class="bg-purple-50 p-4 rounded-lg">
                        <h4 class="font-bold text-purple-800 mb-2">Step 3: Test Your Guest Book</h4>
                        <p class="text-purple-700">After running the SQL script, come back here and try submitting a message again!</p>
                    </div>
                    
                    <div class="flex justify-end space-x-2 mt-6">
                        <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
                            Close
                        </button>
                        <button onclick="window.open('https://supabase.com/dashboard/project/ivkvadpphxpajnexgmjt', '_blank')" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                            Open Supabase Dashboard
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }
}

// Code Entry functionality
class CodeEntry {
    constructor() {
        this.enteredCode = [];
        this.konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
        this.attemptCount = 0;
        this.init();
    }

    init() {
        this.bindEvents();
        // Hide the dragon quiz header initially
        const header = document.getElementById('dragon-quiz-header');
        if (header) {
            header.classList.add('hidden');
        }
    }

    bindEvents() {
        // Bind on-screen keyboard buttons
        document.querySelectorAll('.key-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const key = e.target.getAttribute('data-key');
                this.addKey(key);
            });
        });

        // Bind physical keyboard
        document.addEventListener('keydown', (e) => {
            if (document.getElementById('code-entry').classList.contains('hidden')) return;

            const key = e.key;
            if (this.konamiCode.includes(key)) {
                e.preventDefault();
                this.addKey(key);
            }
        });
    }

    addKey(key) {
        this.enteredCode.push(key);
        this.updateDisplay();

        // Check if code is complete
        if (this.enteredCode.length === this.konamiCode.length) {
            if (this.checkCode()) {
                this.unlockQuiz();
            } else {
                this.showError();
            }
        } else if (this.enteredCode.length > this.konamiCode.length) {
            this.resetCode();
        }
    }

    updateDisplay() {
        const display = document.getElementById('code-display');
        const status = document.getElementById('code-status');

        let displayText = '';
        for (let i = 0; i < this.konamiCode.length; i++) {
            if (i < this.enteredCode.length) {
                const key = this.enteredCode[i];
                switch (key) {
                    case 'ArrowUp': displayText += '↑'; break;
                    case 'ArrowDown': displayText += '↓'; break;
                    case 'ArrowLeft': displayText += '←'; break;
                    case 'ArrowRight': displayText += '→'; break;
                    default: displayText += key.toUpperCase(); break;
                }
            } else {
                displayText += '_';
            }
            if (i < this.konamiCode.length - 1) displayText += ' ';
        }

        display.textContent = displayText;

        // Update status
        if (this.enteredCode.length === 0) {
            status.textContent = '';
            status.className = 'mt-4 text-sm font-bold';
        } else if (this.enteredCode.length < this.konamiCode.length) {
            status.textContent = `Entered: ${this.enteredCode.length}/${this.konamiCode.length}`;
            status.className = 'mt-4 text-sm font-bold text-blue-600';
        }
    }

    checkCode() {
        return this.enteredCode.every((key, index) => key === this.konamiCode[index]);
    }

    unlockQuiz() {
        const status = document.getElementById('code-status');
        status.textContent = '🎉 CODE ACCEPTED! Unlocking Ancient Dragon Oracle...';
        status.className = 'mt-4 text-sm font-bold text-green-600';

        setTimeout(() => {
            // Show the dragon quiz header
            const header = document.getElementById('dragon-quiz-header');
            if (header) {
                header.classList.remove('hidden');
            }

            // Hide code entry and show quiz start
            document.getElementById('code-entry').classList.add('hidden');
            document.getElementById('quiz-start').classList.remove('hidden');
        }, 1500);
    }

    showError() {
        this.attemptCount++;
        const status = document.getElementById('code-status');
        const hintElement = document.querySelector('.hint-container');

        if (this.attemptCount >= 3) {
            // Show the actual Konami code hint after 3 attempts
            status.textContent = '💡 Hint: Try the legendary Konami code! ↑↑↓↓←→←→BA';
            status.className = 'mt-4 text-sm font-bold text-blue-600';

            // Show the Konami code hint below the existing poetic hint
            if (hintElement) {
                hintElement.innerHTML = `
                    <div class="mt-6 p-4 bg-gray-100 rounded-lg border-l-4 border-purple-500">
                        <p class="text-sm text-gray-700 italic text-center">
                            "Two calls to the heavens, two whispers to the earth. A turn to the sunset, a glance to the dawn; repeat the horizon's dance. Finally, speak the second rite before the first."
                        </p>
                    </div>
                    <div class="mt-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                        <p class="text-sm text-blue-700 font-bold text-center">
                            💡 The legendary Konami code: ↑ ↑ ↓ ↓ ← → ← → B A
                        </p>
                    </div>
                `;
            }
        } else {
            status.textContent = '❌ Invalid code! Try again...';
            status.className = 'mt-4 text-sm font-bold text-red-600';
        }

        setTimeout(() => {
            this.resetCode();
        }, 2000);
    }

    resetCode() {
        this.enteredCode = [];
        this.updateDisplay();
    }
}

// Dragon Quiz functionality
class DragonQuiz {
    constructor() {
        this.currentQuestion = 0;
        this.answers = [];
        this.questions = [
            {
                text: "How do you approach challenges in life?",
                options: [
                    { text: "Face them aggressively head-on with power", dragons: ["Vyraxion", "Velantra", "Morvax", "Eldrath"] },
                    { text: "Outsmart and outmaneuver using speed and skill", dragons: ["Aelindra", "Thaurgash", "Seraphyr", "Kryndor"] },
                    { text: "Use stealth, cunning, or unique magic", dragons: ["Dravmir", "Nyssra", "Droskan", "Zhaegan"] },
                    { text: "Plan carefully and use wisdom to prevail", dragons: ["Lysariel", "Raventhra", "Tarronax", "Calaeryn"] }
                ]
            },
            {
                text: "Which environment do you resonate with most?",
                options: [
                    { text: "Volcanic eruptions and fiery mountains", dragons: ["Vyraxion", "Velantra", "Morvax"] },
                    { text: "Snowy peaks and icy winds", dragons: ["Aelindra", "Verrex"] },
                    { text: "Shadowy ruins or drowned cities", dragons: ["Dravmir", "Quorath", "Zhaegan"] },
                    { text: "Bright sunlit peaks and golden plains", dragons: ["Solcaron", "Lysariel", "Tarronax"] }
                ]
            },
            {
                text: "How do you prefer to fight?",
                options: [
                    { text: "With overwhelming strength and fire", dragons: ["Vyraxion", "Eldrath", "Morvax"] },
                    { text: "Swift and unpredictable movements", dragons: ["Aelindra", "Thaurgash", "Kryndor"] },
                    { text: "Stealth, illusions, and cunning", dragons: ["Dravmir", "Nyssra", "Droskan"] },
                    { text: "Strategic and foresightful planning", dragons: ["Lysariel", "Raventhra", "Tarronax"] }
                ]
            },
            {
                text: "Which element or force appeals to you?",
                options: [
                    { text: "Fire and chaos", dragons: ["Vyraxion", "Velantra", "Nyssra"] },
                    { text: "Ice and storms", dragons: ["Aelindra", "Verrex", "Calaeryn"] },
                    { text: "Shadow, poison, or decay", dragons: ["Dravmir", "Quorath", "Nyssra"] },
                    { text: "Light, spirits, or cosmic energies", dragons: ["Solcaron", "Lysariel", "Tarronax"] }
                ]
            },
            {
                text: "What describes your ideal way of resting or relaxing?",
                options: [
                    { text: "Burning off energy in intense activity", dragons: ["Velantra", "Morvax", "Kryndor"] },
                    { text: "Gliding smoothly through calm skies or waters", dragons: ["Seraphyr", "Thaurgash", "Aelindra"] },
                    { text: "Retreating quietly in mist and shadows", dragons: ["Dravmir", "Nyssra", "Zhaegan"] },
                    { text: "Meditating under the stars or in peaceful nature", dragons: ["Lysariel", "Raventhra", "Calaeryn"] }
                ]
            },
            {
                text: "Which statement best reflects your worldview?",
                options: [
                    { text: "Strength and passion drive everything worthwhile", dragons: ["Vyraxion", "Velantra", "Morvax"] },
                    { text: "Speed and adaptability are key to success", dragons: ["Thaurgash", "Aelindra", "Seraphyr"] },
                    { text: "Mystery and depth hold the greatest power", dragons: ["Dravmir", "Nyssra", "Zhaegan"] },
                    { text: "Balance and wisdom create harmony in life", dragons: ["Lysariel", "Raventhra", "Tarronax"] }
                ]
            }
        ];

        this.dragons = [
            {
                name: "Vyraxion — The Ember Tyrant",
                element: "Fire / Chaos",
                origin: "Forged in the volcanoes of Valyrian ruins",
                appearance: "Black scales streaked with glowing magma veins",
                abilities: "Flame storm breath; molten shield",
                stats: { Power: 10, Speed: 7, Endurance: 9, Intelligence: 6, Mysticism: 5 },
                traits: ["fire", "chaos", "power"],
                emoji: "🔥",
                image: "Vyraxion — The Ember Tyrant final.png"
            },
            {
                name: "Aelindra — The Silver Mirage",
                element: "Air / Illusion",
                origin: "Born from northern blizzards under a blood moon",
                appearance: "Silver-white scales with translucent wings",
                abilities: "Creates blinding snow illusions, fast aerial maneuvers",
                stats: { Power: 6, Speed: 10, Endurance: 7, Intelligence: 9, Mysticism: 8 },
                traits: ["air", "illusion", "speed"],
                emoji: "❄️",
                image: "Aelindra — The Silver Mirage.png"
            },
            {
                name: "Dravmir — The Abyssal Herald",
                element: "Shadow / Death",
                origin: "Dwells beneath the ruins of drowned cities",
                appearance: "Deep indigo scales, glowing eyes",
                abilities: "Necrotic roar, devours light",
                stats: { Power: 9, Speed: 6, Endurance: 8, Intelligence: 7, Mysticism: 10 },
                traits: ["shadow", "death", "mysticism"],
                emoji: "🌑",
                image: "Dravmir — The Abyssal Herald.png"
            },
            {
                name: "Solcaron — The Dawnscale",
                element: "Light / Sunfire",
                origin: "Hatched at sunrise upon a golden peak",
                appearance: "Gold and white radiant scales",
                abilities: "Solar flare breath, can purify fire",
                stats: { Power: 8, Speed: 8, Endurance: 7, Intelligence: 9, Mysticism: 9 },
                traits: ["light", "sunfire", "intelligence"],
                emoji: "☀️",
                image: "Solcaron — The Dawnscale.png"
            },
            {
                name: "Thaurgash — The Storm Reaver",
                element: "Lightning / Sky",
                origin: "Born from thunder over the Narrow Sea",
                appearance: "Crackling azure scales",
                abilities: "Launches lightning bolts, absorbs storms",
                stats: { Power: 9, Speed: 9, Endurance: 8, Intelligence: 6, Mysticism: 7 },
                traits: ["lightning", "sky", "speed"],
                emoji: "⚡",
                image: "Thaurgash — The Storm Reaver.png"
            },
            {
                name: "Nyssra — Mistress of Smoke",
                element: "Fire / Poison",
                origin: "A failed alchemical experiment in Oldtown",
                appearance: "Crimson mist trailing from her scales",
                abilities: "Fire mixed with toxic fumes, stealth attacks",
                stats: { Power: 8, Speed: 7, Endurance: 6, Intelligence: 9, Mysticism: 8 },
                traits: ["fire", "poison", "intelligence"],
                emoji: "💨",
                image: "Nyssra — Mistress of Smoke.png"
            },
            {
                name: "Verrex — The Ice Shard Monarch",
                element: "Ice / Order",
                origin: "Frozen wastes beyond the Wall",
                appearance: "Pale blue crystalline scales",
                abilities: "Freezing breath, forms frost armor",
                stats: { Power: 8, Speed: 6, Endurance: 10, Intelligence: 7, Mysticism: 8 },
                traits: ["ice", "order", "endurance"],
                emoji: "🧊",
                image: "Verrex — The Ice Shard Monarch.jpg"
            },
            {
                name: "Quorath — The Bonewing",
                element: "Earth / Decay",
                origin: "Exhumed from ancient battlefields",
                appearance: "Bone-white skin, exposed skeleton wings",
                abilities: "Bone shards projectiles, decaying aura",
                stats: { Power: 7, Speed: 5, Endurance: 9, Intelligence: 7, Mysticism: 9 },
                traits: ["earth", "decay", "mysticism"],
                emoji: "💀",
                image: "Quorath — The Bonewing.jpg"
            },
            {
                name: "Calaeryn — The Dream Serpent",
                element: "Mind / Ether",
                origin: "Appears in dreams to the chosen few",
                appearance: "Semi-transparent, shifting colors",
                abilities: "Hypnotic stare, dream-walk control",
                stats: { Power: 6, Speed: 8, Endurance: 6, Intelligence: 10, Mysticism: 10 },
                traits: ["mind", "ether", "intelligence"],
                emoji: "💭",
                image: "Calaeryn — The Dream Serpent.jpg"
            },
            {
                name: "Morvax — The Ironclaw",
                element: "Metal / Fire",
                origin: "Born from smelted ore deep under Dragonstone",
                appearance: "Metallic scales and steel talons",
                abilities: "Metal storm breath, claws can cut armor",
                stats: { Power: 10, Speed: 5, Endurance: 9, Intelligence: 6, Mysticism: 4 },
                traits: ["metal", "fire", "power"],
                emoji: "⚔️",
                image: "Morvax — The Ironclaw.jpg"
            },
            {
                name: "Seraphyr — The Skyblessed",
                element: "Wind / Light",
                origin: "Guardian of ancient temples above the clouds",
                appearance: "Gleaming wings and bright azure eyes",
                abilities: "Healing winds, radiant dive attacks",
                stats: { Power: 7, Speed: 10, Endurance: 7, Intelligence: 8, Mysticism: 9 },
                traits: ["wind", "light", "speed"],
                emoji: "🕊️",
                image: "Seraphyr — The Skyblessed.jpg"
            },
            {
                name: "Droskan — The Night Fang",
                element: "Shadow / Blood",
                origin: "Legend of a dragon who drank starlight",
                appearance: "Black and red scales",
                abilities: "Blood magic, life drain breath",
                stats: { Power: 9, Speed: 7, Endurance: 8, Intelligence: 8, Mysticism: 9 },
                traits: ["shadow", "blood", "mysticism"],
                emoji: "🩸",
                image: "Droskan — The Night Fang.jpg"
            },
            {
                name: "Eldrath — The Stone Guardian",
                element: "Earth / Light",
                origin: "Protector of an ancient citadel",
                appearance: "Granite body with glowing runes",
                abilities: "Earthquake stomp, protective barrier",
                stats: { Power: 8, Speed: 4, Endurance: 10, Intelligence: 7, Mysticism: 8 },
                traits: ["earth", "light", "endurance"],
                emoji: "🏔️",
                image: "Eldrath — The Stone Guardian.jpg"
            },
            {
                name: "Velantra — The Emberheart Queen",
                element: "Fire / Majesty",
                origin: "Ruled a volcano lair worshiped by cults",
                appearance: "Glowing amber eyes, golden flame mane",
                abilities: "Fire nova, fiery aura charm",
                stats: { Power: 8, Speed: 8, Endurance: 7, Intelligence: 9, Mysticism: 9 },
                traits: ["fire", "majesty", "intelligence"],
                emoji: "👑",
                image: "Velantra — The Emberheart Queen.jpg"
            },
            {
                name: "Kryndor — The Tempest Maw",
                element: "Water / Storm",
                origin: "Born from whirlpools near Shipbreaker Bay",
                appearance: "Dark teal scales, luminous fins",
                abilities: "Whirlpool summoning, tidal roar",
                stats: { Power: 9, Speed: 9, Endurance: 8, Intelligence: 7, Mysticism: 6 },
                traits: ["water", "storm", "speed"],
                emoji: "🌊",
                image: "Kryndor — The Tempest Maw.jpg"
            },
            {
                name: "Raventhra — The Whispering Flame",
                element: "Fire / Spirit",
                origin: "Said to be a reincarnation of forgotten gods",
                appearance: "Golden fire that burns without smoke",
                abilities: "Fire projection through thought, can speak telepathically",
                stats: { Power: 8, Speed: 8, Endurance: 7, Intelligence: 10, Mysticism: 10 },
                traits: ["fire", "spirit", "intelligence"],
                emoji: "🔥",
                image: "Raventhra — The Whispering Flame.jpg"
            },
            {
                name: "Zhaegan — The Nether Drake",
                element: "Void / Shadow",
                origin: "Emergred when the world split open beneath Valyria",
                appearance: "Pitch-black with cracks emitting pale light",
                abilities: "Consumes energy, shadow teleportation",
                stats: { Power: 10, Speed: 6, Endurance: 9, Intelligence: 8, Mysticism: 10 },
                traits: ["void", "shadow", "power"],
                emoji: "🌌",
                image: "Zhaegan — The Nether Drake.jpg"
            },
            {
                name: "Olyssa — The Sapphire Flame",
                element: "Fire / Ice hybrid",
                origin: "Formed when fire met frost in warring realms",
                appearance: "Blue flames and frost-tipped horns",
                abilities: "Mixed flame-frost breath, temperature shockwave",
                stats: { Power: 9, Speed: 8, Endurance: 8, Intelligence: 8, Mysticism: 9 },
                traits: ["fire", "ice", "mysticism"],
                emoji: "💎",
                image: "Olyssa — The Sapphire Flame.jpg"
            },
            {
                name: "Tarronax — The Void Shepherd",
                element: "Time / Void",
                origin: "Exists between eras; seen in ancient myths",
                appearance: "Warped form flickering between states",
                abilities: "Time burst, dimensional distortion",
                stats: { Power: 10, Speed: 7, Endurance: 9, Intelligence: 10, Mysticism: 10 },
                traits: ["time", "void", "mysticism"],
                emoji: "⏰",
                image: "Tarronax — The Void Shepherd.jpg"
            },
            {
                name: "Lysariel — The Celestial Oracle",
                element: "Light / Spirit",
                origin: "Born from the first star's final breath",
                appearance: "Scales resemble the night sky, glowing constellations",
                abilities: "Foresees fate; lightstorm spell",
                stats: { Power: 8, Speed: 9, Endurance: 7, Intelligence: 10, Mysticism: 10 },
                traits: ["light", "spirit", "intelligence"],
                emoji: "⭐",
                image: "Lysariel — The Celestial Oracle.jpg"
            }
        ];

        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        const startBtn = document.getElementById('start-quiz-btn');
        const nextBtn = document.getElementById('next-question');
        const prevBtn = document.getElementById('prev-question');
        const retakeBtn = document.getElementById('retake-quiz');
        const shareBtn = document.getElementById('share-result');

        if (startBtn) startBtn.addEventListener('click', () => this.startQuiz());
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextQuestion());
        if (prevBtn) prevBtn.addEventListener('click', () => this.prevQuestion());
        if (retakeBtn) retakeBtn.addEventListener('click', () => this.resetQuiz());
        if (shareBtn) shareBtn.addEventListener('click', () => this.shareResult());
    }

    startQuiz() {
        document.getElementById('quiz-start').classList.add('hidden');
        document.getElementById('quiz-questions').classList.remove('hidden');
        this.currentQuestion = 0;
        this.answers = [];
        this.showQuestion();
    }

    showQuestion() {
        const question = this.questions[this.currentQuestion];
        const questionText = document.getElementById('question-text');
        const questionNumber = document.getElementById('question-number');
        const progressBar = document.getElementById('progress-bar');
        const optionsContainer = document.getElementById('question-options');
        const prevBtn = document.getElementById('prev-question');
        const nextBtn = document.getElementById('next-question');

        questionText.textContent = question.text;
        questionNumber.textContent = `Question ${this.currentQuestion + 1} of 6`;
        progressBar.style.width = `${((this.currentQuestion + 1) / 6) * 100}%`;

        // Clear previous options
        optionsContainer.innerHTML = '';

        // Create option buttons
        question.options.forEach((option, index) => {
            const optionBtn = document.createElement('button');
            optionBtn.className = 'w-full p-4 text-left bg-white border-2 border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all duration-300 font-sans text-base leading-relaxed';
            optionBtn.textContent = option.text;
            optionBtn.addEventListener('click', () => this.selectOption(index));
            optionsContainer.appendChild(optionBtn);
        });

        // Update navigation buttons
        prevBtn.classList.toggle('hidden', this.currentQuestion === 0);
        nextBtn.classList.toggle('hidden', this.answers[this.currentQuestion] === undefined);
        nextBtn.disabled = this.answers[this.currentQuestion] === undefined;
    }

    selectOption(optionIndex) {
        // Remove previous selection
        document.querySelectorAll('#question-options button').forEach(btn => {
            btn.classList.remove('border-purple-500', 'bg-purple-50');
            btn.classList.add('border-gray-300');
        });

        // Add selection to clicked option
        const selectedBtn = document.querySelectorAll('#question-options button')[optionIndex];
        selectedBtn.classList.remove('border-gray-300');
        selectedBtn.classList.add('border-purple-500', 'bg-purple-50');

        // Store answer
        this.answers[this.currentQuestion] = optionIndex;

        // Enable next button
        const nextBtn = document.getElementById('next-question');
        nextBtn.classList.remove('hidden');
        nextBtn.disabled = false;
    }

    nextQuestion() {
        if (this.currentQuestion < this.questions.length - 1) {
            this.currentQuestion++;
            this.showQuestion();
        } else {
            this.showResults();
        }
    }

    prevQuestion() {
        if (this.currentQuestion > 0) {
            this.currentQuestion--;
            this.showQuestion();
        }
    }

    showResults() {
        console.log('Showing results...'); // Debug log
        document.getElementById('quiz-questions').classList.add('hidden');
        document.getElementById('quiz-results').classList.remove('hidden');

        const dragon = this.calculateResult();
        console.log('Calculated dragon:', dragon); // Debug log
        this.displayDragon(dragon);
    }

    calculateResult() {
        // Count dragon preferences from answers
        const dragonCounts = {};

        this.answers.forEach((answerIndex, questionIndex) => {
            const selectedOption = this.questions[questionIndex].options[answerIndex];
            if (selectedOption && selectedOption.dragons) {
                selectedOption.dragons.forEach(dragonName => {
                    dragonCounts[dragonName] = (dragonCounts[dragonName] || 0) + 1;
                });
            }
        });

        console.log('Dragon counts:', dragonCounts); // Debug log

        // Find dragon with highest score
        let bestMatch = this.dragons[0];
        let bestScore = 0;

        this.dragons.forEach(dragon => {
            const dragonName = dragon.name.split(' — ')[0]; // Get just the name part
            const score = dragonCounts[dragonName] || 0;
            console.log(`Dragon: ${dragonName}, Score: ${score}`); // Debug log
            if (score > bestScore) {
                bestScore = score;
                bestMatch = dragon;
            }
        });

        console.log('Best match:', bestMatch.name, 'Score:', bestScore); // Debug log
        return bestMatch;
    }

    displayDragon(dragon) {
        const dragonEmojiEl = document.getElementById('dragon-emoji');
        if (dragon.image) {
            // Replace emoji with actual dragon image
            dragonEmojiEl.innerHTML = `<img src="${dragon.image}" alt="${dragon.name}" class="w-80 h-80 object-contain mx-auto rounded-lg border-2 border-purple-300 shadow-lg">`;
        } else {
            dragonEmojiEl.textContent = dragon.emoji;
        }

        document.getElementById('dragon-name').textContent = dragon.name;
        document.getElementById('dragon-element').textContent = dragon.element;
        document.getElementById('dragon-origin').textContent = dragon.origin;
        document.getElementById('dragon-appearance').textContent = dragon.appearance;
        document.getElementById('dragon-abilities').textContent = dragon.abilities;

        // Display stats
        const statsContainer = document.getElementById('dragon-stats');
        statsContainer.innerHTML = '';

        Object.entries(dragon.stats).forEach(([stat, value]) => {
            const statDiv = document.createElement('div');
            statDiv.className = 'flex justify-between items-center mb-3';
            statDiv.innerHTML = `
                    <span class="text-base font-bold text-black">${stat}:</span>
                    <div class="flex items-center">
                        <div class="w-32 bg-gray-300 rounded-full h-3 mr-3">
                            <div class="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full" style="width: ${value * 10}%"></div>
                        </div>
                        <span class="text-base font-bold text-black min-w-[40px]">${value}/10</span>
                    </div>
                `;
            statsContainer.appendChild(statDiv);
        });
    }

    resetQuiz() {
        document.getElementById('quiz-results').classList.add('hidden');
        document.getElementById('quiz-start').classList.remove('hidden');
        this.currentQuestion = 0;
        this.answers = [];
    }

    shareResult() {
        const dragon = this.calculateResult();
        const shareText = `I just discovered my dragon companion: ${dragon.name}! Take the quiz at your portfolio to find yours! 🐉`;

        if (navigator.share) {
            navigator.share({
                title: 'My Dragon Quiz Result',
                text: shareText,
                url: window.location.href
            });
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(shareText).then(() => {
                alert('Result copied to clipboard!');
            });
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new GuestBook();
    new CodeEntry(); // Initialize the Code Entry system
    new DragonQuiz();

    // Mobile menu functionality
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });

        // Close mobile menu when clicking on a link
        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.add('hidden');
            });
        });
    }

    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});
