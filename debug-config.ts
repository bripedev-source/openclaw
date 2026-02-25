
import { loadConfig } from "./src/config/config.js";
import { resolveDefaultModelForAgent } from "./src/agents/model-selection.js";
import { resolveSessionAgentId } from "./src/agents/agent-scope.js";
import { resolveDefaultModel } from "./src/auto-reply/reply/directive-handling.js";

async function run() {
    console.log("Loading config...");
    const cfg = loadConfig();
    console.log("Config loaded.");

    if (!cfg.agents?.defaults?.model) {
        console.log("cfg.agents.defaults.model is missing!");
    } else {
        console.log("cfg.agents.defaults.model:", JSON.stringify(cfg.agents.defaults.model, null, 2));
    }

    const agentId = "main";
    console.log(`Resolving default model for agent '${agentId}'...`);
    const modelRef = resolveDefaultModelForAgent({ cfg, agentId });
    console.log("Resolved model ref:", modelRef);

    console.log("Testing resolveSessionAgentId...");
    const sessionKey = "agent:main:telegram:group:-1003856569776:topic:94";
    const resolvedAgentId = resolveSessionAgentId({ sessionKey, config: cfg });
    console.log(`Resolved agent ID for sessionKey '${sessionKey}': '${resolvedAgentId}'`);

    console.log("Testing resolveDefaultModel (full pipeline)...");
    const defaultModelRes = resolveDefaultModel({ cfg, agentId: resolvedAgentId });
    console.log("defaultModelRes:", {
        defaultProvider: defaultModelRes.defaultProvider,
        defaultModel: defaultModelRes.defaultModel
    });
}

run().catch(console.error);
