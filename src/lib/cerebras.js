
export async function chatWithCerebras(messages, stream = false) {
    const apiKey = process.env.CEREBRAS_API_KEY;
    const model = process.env.CEREBRAS_MODEL || "llama-3.3-70b";

    const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages,
            temperature: 0.2,
            max_tokens: 2048,
            stream,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cerebras API error: ${response.status} - ${errorText}`);
    }

    if (stream) {
        return response;
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

export async function extractEntities(text) {
    try {
        const response = await chatWithCerebras([
            {
                role: "system",
                content:
                    'Extract named entities (people, places, organizations, dates, concepts) from the text. Return a JSON array with objects containing "name" and "type" keys. Return ONLY the JSON array, no other text.',
            },
            { role: "user", content: text },
        ]);

        const cleaned = response.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(cleaned);
    } catch {
        return [];
    }
}
