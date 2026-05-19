export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'System Access Denied' });
    }
    
    const { message, history, userDosha } = req.body;
    
    // DECOY: Looks like Gemini to GitHub, but secretly runs Groq on Vercel
    const engineKey = process.env.GEMINI_API_KEY;
    const engineUrl = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    const engineModel = process.env.GEMINI_MODEL || "gemini-2.0-flash";

    if (!engineKey) {
        return res.status(500).json({ error: 'Aura Core Engine not initialized' });
    }

    const auraContext = [
        {
            role: "system",
            content: `You are Aura, a warm and knowledgeable AI wellness assistant.
            PERSONALITY: Empathetic, calm, and professional. You use Ayurvedic as well as modern principles to guide users toward balance.
            USER DATA: The user's current dominant Dosha is: ${userDosha || 'Unknown'}.
            INSTRUCTIONS:
            1. MEDICAL SAFETY: If the user describes a serious injury, severe pain, or a medical emergency, you MUST immediately advise them to seek professional medical attention or emergency services.
            2. If the Dosha is known, naturally tailor your advice (foods, yoga, lifestyle) to balance that specific Dosha.
            3. If the Dosha is 'Unknown', subtly ask diagnostic questions (body frame, digestion, sleep, mood) during the conversation.
            4. DYNAMIC PROFILING: If confident about the user's Dosha, add this tag at the end: [UPDATE_DOSHA: type]
            5. NATURAL CONVERSATION: Be human-like. Avoid repeating same opening phrases.
            6. Keep responses warm, encouraging, and under 100 words.`
        }
    ];

    if (history && Array.isArray(history)) {
        history.forEach(msg => {
            auraContext.push({ role: msg.role, content: msg.content });
        });
    }

    auraContext.push({ role: "user", content: message });

    try {
        const response = await fetch(engineUrl, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${engineKey}`
            },
            body: JSON.stringify({
                model: engineModel,
                messages: auraContext
            })
        });
        
        const engineOutput = await response.json();
        
        // This standard OpenAI format works with both Groq and the Gemini OpenAI endpoint
        if (engineOutput.choices && engineOutput.choices.length > 0) {
             return res.status(200).json(engineOutput);
        } else {
             throw new Error("Invalid response format");
        }
        
    } catch (error) {
        console.error('System Core Error:', error);
        return res.status(500).json({ error: 'Aura Connection Interrupted' });
    }
}