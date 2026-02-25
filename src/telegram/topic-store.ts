import { join } from "node:path";
import { loadConfig } from "../config/config.js";
import { loadJsonFile, saveJsonFile } from "../infra/json-file.js";

export type TopicMetadata = {
    name: string;
    icon?: string;
    systemPrompt?: string;
    updatedAt: number;
};

// Map<ChatId, Map<TopicId, TopicMetadata>>
type TopicsStore = Record<string, Record<string, TopicMetadata>>;

let memoStore: TopicsStore | null = null;

function getStorePath() {
    const cfg = loadConfig();
    const workspace = cfg.agents?.defaults?.workspace || process.cwd();
    return join(workspace, "topics.json");
}

function loadStore(): TopicsStore {
    if (memoStore) {
        return memoStore;
    }
    const path = getStorePath();
    const loaded = loadJsonFile(path);
    if (!loaded || typeof loaded !== "object") {
        return {};
    }
    return loaded as TopicsStore;
}

function saveStore(store: TopicsStore) {
    const path = getStorePath();
    try {
        saveJsonFile(path, store);
        memoStore = store;
    } catch (err) {
        console.error(`Failed to save topics.json: ${err}`);
    }
}

export function getTopicMetadata(chatId: string | number, topicId: string | number): TopicMetadata | undefined {
    const store = loadStore();
    const chat = store[String(chatId)];
    if (!chat) return undefined;
    return chat[String(topicId)];
}

export function setTopicMetadata(chatId: string | number, topicId: string | number, meta: TopicMetadata) {
    const store = loadStore();
    const cId = String(chatId);
    const tId = String(topicId);

    if (!store[cId]) {
        store[cId] = {};
    }
    store[cId][tId] = meta;
    saveStore(store);
}

export function getTopicIdByName(chatId: string | number, name: string): string | undefined {
    const store = loadStore();
    const chat = store[String(chatId)];
    if (!chat) return undefined;

    const normalizedName = name.trim().toLowerCase();
    for (const [topicId, meta] of Object.entries(chat)) {
        if (meta.name.trim().toLowerCase() === normalizedName) {
            return topicId;
        }
    }
    return undefined;
}
