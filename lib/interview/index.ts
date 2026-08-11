import { registerSource, retrieve, scanTopics } from "@/lib/context/client";
import { createHyperfusionProvider } from "@/lib/intelligence/hyperfusion";
import {
  addEvidence,
  attachContextSource,
  createRule,
  listEvidence,
  listRules,
  setRuleStatus,
} from "@/lib/rules/repository";
import {
  addMessage,
  createInterview,
  getInterview,
  listMessages,
  recentMessages,
  setCrawlStatus,
  setInterviewStatus,
} from "./store";
import { processTurn, type OrchestratorDeps } from "./orchestrator";

export { createInterview, getInterview, setInterviewStatus, setCrawlStatus, registerSource };

function realDeps(): OrchestratorDeps {
  return {
    intelligence: createHyperfusionProvider(),
    retrieveEvidence: retrieve,
    scanTopics,
    store: {
      getInterview: async (id) => {
        const row = await getInterview(id);
        return row ? { agentDescription: row.agentDescription } : undefined;
      },
      addMessage: async (input) => {
        const row = await addMessage(input);
        return { turnIndex: row.turnIndex, speaker: row.speaker, content: row.content };
      },
      listMessages: async (interviewId) =>
        (await listMessages(interviewId)).map((m) => ({
          turnIndex: m.turnIndex,
          speaker: m.speaker,
          content: m.content,
        })),
      recentMessages: async (interviewId, count) =>
        (await recentMessages(interviewId, count)).map((m) => ({
          turnIndex: m.turnIndex,
          speaker: m.speaker,
          content: m.content,
        })),
    },
    rules: {
      create: async (interviewId, rule) => {
        const [row] = await createRule(interviewId, rule);
        return row;
      },
      list: listRules,
      setStatus: async (id, status) => {
        await setRuleStatus(id, status);
      },
      attachContextSource,
    },
    evidence: {
      add: async (input) => {
        const [row] = await addEvidence(input);
        return row;
      },
      list: listEvidence,
    },
  };
}

export function runTurn(interviewId: string, expertContent: string) {
  return processTurn(realDeps(), interviewId, expertContent);
}
