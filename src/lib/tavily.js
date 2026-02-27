
export async function webSearch(query) {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
        return { answer: "Web search not configured.", results: [] };
    }

    try {
        const response = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                api_key: apiKey,
                query,
                search_depth: "basic",
                include_answer: true,
                max_results: 5,
            }),
        });

        if (!response.ok) {
            throw new Error(`Tavily API error: ${response.status}`);
        }

        const data = await response.json();
        return {
            answer: data.answer || null,
            results: (data.results || []).map((r) => ({
                title: r.title,
                url: r.url,
                content: r.content?.substring(0, 300),
            })),
        };
    } catch (error) {
        console.error("Tavily search error:", error.message);
        return { answer: null, results: [], error: error.message };
    }
}
