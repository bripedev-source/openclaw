import { fetch } from "undici";
import { parseHTML } from "linkedom";

const DUCKDUCKGO_HTML_ENDPOINT = "https://html.duckduckgo.com/html/";

async function runDuckDuckGoSearch(query) {
    console.log(`Searching for: ${query}`);
    const url = new URL(DUCKDUCKGO_HTML_ENDPOINT);
    url.searchParams.set("q", query);

    const headers = {
        "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://html.duckduckgo.com/",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-User": "?1",
    };

    try {
        const res = await fetch(url.toString(), {
            headers,
        });

        if (!res.ok) {
            throw new Error(`DuckDuckGo HTML search failed: ${res.status} ${res.statusText}`);
        }

        const html = await res.text();
        const { document } = parseHTML(html);

        // Check for bot challenge or error
        if (html.includes("anomaly-modal") || html.includes("bots use DuckDuckGo too")) {
            console.error("BLOCKED: Bot challenge detected!");
            return;
        }

        const results = [];

        // Selectors for html.duckduckgo.com
        const resultNodes = document.querySelectorAll(".result");

        for (const result of resultNodes) {
            const titleLink = result.querySelector(".result__a");
            const snippetLink = result.querySelector(".result__snippet");

            if (!titleLink) continue;

            const title = titleLink.textContent?.trim() ?? "";
            let rawUrl = titleLink.getAttribute("href") ?? "";

            // Decode uddg parameter if present
            if (rawUrl.includes("uddg=")) {
                try {
                    const u = new URL(rawUrl, "https://duckduckgo.com");
                    const uddg = u.searchParams.get("uddg");
                    if (uddg) {
                        rawUrl = decodeURIComponent(uddg);
                    }
                } catch {
                    // Keep rawUrl if parsing fails
                }
            }

            const description = snippetLink?.textContent?.trim() ?? "";

            if (title && rawUrl) {
                results.push({
                    title,
                    url: rawUrl,
                    description,
                });
            }
        }

        console.log(`Found ${results.length} results:`);
        if (results.length === 0) {
            console.log("HTML Preview (first 500 chars):", html.slice(0, 500));
        }

        results.slice(0, 3).forEach((r, i) => {
            console.log(`\n[${i + 1}] ${r.title}\n    ${r.url}\n    ${r.description}`);
        });

    } catch (error) {
        console.error("Search failed:", error);
    }
}

runDuckDuckGoSearch("DuckDuckGo scraping blocking issues");
