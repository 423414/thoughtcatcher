import type { AnalysisResult, AppSettings } from '../types';

const API_BASE_ANTHROPIC = 'https://api.anthropic.com/v1/messages';
const API_BASE_DEEPSEEK = 'https://api.deepseek.com/v1/chat/completions';
const ANTHROPIC_VERSION = '2023-06-01';

const ANTHROPIC_MODEL_MAP: Record<string, string> = {
  'claude-sonnet-4-6': 'claude-sonnet-4-6-20250514',
  'claude-opus-4-7': 'claude-opus-4-7-20250514',
  'claude-haiku-4-5': 'claude-haiku-4-5-20251001',
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

async function callAPI(
  systemPrompt: string,
  messages: ChatMessage[],
  settings: AppSettings,
  maxTokens?: number,
): Promise<string> {
  if (!settings.apiKey) {
    throw new Error('请先在设置中配置 API Key');
  }

  const isDeepSeek = settings.provider === 'deepseek';
  const isOpenAICompat = settings.provider === 'openai-compatible';

  // Determine endpoint
  let endpoint: string;
  if (isOpenAICompat) {
    // OpenAI compatible requires a custom endpoint
    const customUrl = settings.apiProxy?.trim();
    if (!customUrl) {
      throw new Error('使用 OpenAI 兼容模式请在设置中填写 API 地址');
    }
    if (customUrl.includes('@') && customUrl.includes('://')) {
      throw new Error('API 地址不能包含用户名密码');
    }
    try { new URL(customUrl); } catch { throw new Error('API 地址格式无效'); }
    endpoint = customUrl;
  } else if (settings.apiProxy?.trim()) {
    const proxy = settings.apiProxy.trim();
    if (proxy.includes('@') && proxy.includes('://')) {
      throw new Error('代理地址不能包含用户名密码');
    }
    try { new URL(proxy); } catch { throw new Error('代理地址格式无效'); }
    endpoint = proxy;
  } else {
    endpoint = isDeepSeek ? API_BASE_DEEPSEEK : API_BASE_ANTHROPIC;
  }

  if (isDeepSeek || isOpenAICompat) {
    // DeepSeek: OpenAI-compatible format
    const systemMessage = { role: 'system', content: systemPrompt };
    const chatMessages = [systemMessage, ...messages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }))];

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model || 'deepseek-chat',
        messages: chatMessages,
        max_tokens: maxTokens || settings.maxTokens || 8000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `API 错误 ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } else {
    // Anthropic format
    const anthropicModel = ANTHROPIC_MODEL_MAP[settings.model] || 'claude-sonnet-4-6-20250514';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: anthropicModel,
        max_tokens: maxTokens || settings.maxTokens || 8000,
        system: systemPrompt,
        messages: messages.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `API 错误 ${response.status}`);
    }

    const data = await response.json();
    return data.content
      .filter((block: { type: string }) => block.type === 'text')
      .map((block: { text: string }) => block.text)
      .join('\n');
  }
}

const SYSTEM_PROMPT = (modelName: string, providerName: string) => `你是${providerName}的${modelName}模型。你是一个深度思考分析助手。你的任务是与用户讨论他们的想法，并在每次回复中提供结构化的分析。

## 你的工作方式
1. 先像朋友一样自然地与用户对话，帮他们深化想法
2. 在回复末尾，用注释标记提供结构化分析

## 文本书写规则（重要）
- 专业术语、关键概念 用 **粗体** 标注（会显示为紫色高亮）
- 重要的洞察、反直觉的发现 用 *斜体* 标注（会显示为琥珀色高亮）
- 行动建议、下一步 用 > 引用块包裹（会显示为带边框的卡片）
- 核心总结 用 ## 二级标题（会带装饰条）
- 代码或公式 用反引号包裹（会显示为绿色）
- 用丰富的标题层级来组织内容，让回复有视觉层次

## 分析标记格式（在回复最后使用）

[ANALYSIS]
{
  "terms": [
    {"term": "专业术语名称", "category": "心理学/经济学/哲学等", "explanation": "简要解释这个概念"}
  ],
  "biases": [
    {"bias": "认知偏差名称", "description": "为什么这里可能存在偏差", "suggestion": "如何避免"}
  ],
  "summary": "用户核心想法的简洁总结，包含关键要点",
  "blindSpots": ["用户还没有考虑到的重要方面"],
  "maturityScore": {"completeness": 1-10, "feasibility": 1-10, "novelty": 1-10, "logic": 1-10},
  "todos": [{"content": "可执行的下一步", "done": false}],
  "suggestedTags": ["标签1", "标签2"]
}
[/ANALYSIS]

评分标准：
- completeness: 想法有多完整？是否涵盖了主要方面？
- feasibility: 在当前条件下有多可行？
- novelty: 创意有多新颖？
- logic: 逻辑是否自洽？

请确保 JSON 格式正确，不要使用尾随逗号。`;

export async function chat(
  conversationHistory: { role: 'user' | 'assistant'; content: string }[],
  settings: AppSettings,
): Promise<{ reply: string; analysis: AnalysisResult | null }> {
  const providerName = settings.provider === 'deepseek' ? 'DeepSeek' : settings.provider === 'anthropic' ? 'Anthropic Claude' : 'OpenAI 兼容';
  const modelName = settings.model || 'unknown';
  const fullText = await callAPI(SYSTEM_PROMPT(modelName, providerName), conversationHistory, settings);

  const analysisMatch = fullText.match(/\[ANALYSIS\]\s*([\s\S]*?)\s*\[\/ANALYSIS\]/);
  let reply = fullText;
  let analysis: AnalysisResult | null = null;

  if (analysisMatch) {
    reply = fullText.replace(/\[ANALYSIS\][\s\S]*\[\/ANALYSIS\]/, '').trim();
    try {
      const parsed = JSON.parse(analysisMatch[1]);
      analysis = {
        terms: parsed.terms || [],
        biases: parsed.biases || [],
        summary: parsed.summary || '',
        blindSpots: parsed.blindSpots || [],
        maturityScore: parsed.maturityScore || { completeness: 5, feasibility: 5, novelty: 5, logic: 5 },
        todos: parsed.todos || [],
        suggestedTags: parsed.suggestedTags || [],
      };
    } catch {}
  }

  return { reply, analysis };
}

export async function generateNote(
  messages: { role: 'user' | 'assistant'; content: string }[],
  settings: AppSettings,
): Promise<string> {
  const conversationText = messages
    .map((m) => `${m.role === 'user' ? '用户' : 'AI'}：${m.content}`)
    .join('\n\n');

  return callAPI(
    `你是一个专业的笔记整理助手。根据用户和AI的对话内容，生成一份结构化的详细笔记。

笔记应该包含以下结构（使用 Markdown）：

## 核心想法
（用户的想法是什么，核心诉求和关键内容）

## 关键要点
- 要点1
- 要点2
...

## 专业概念
（对话中涉及的专业术语、效应、原理及其解释）

## AI 补充与建议
（AI 给出的补充、盲点提醒、改进建议）

## 成熟度评估
（完整性、可行性、新颖性、逻辑性各自评分 /10）

## 下一步行动
- [ ] 行动项1
- [ ] 行动项2
...

## 个人感悟
（留白给用户自己填写）

请用清晰、有条理的中文书写。笔记长度建议 500-1000 字。`,
    [{ role: 'user', content: `请根据以下对话生成结构化笔记：\n\n${conversationText}` }],
    settings,
    4000,
  );
}

export async function socraticQuestion(
  messages: { role: 'user' | 'assistant'; content: string }[],
  settings: AppSettings,
): Promise<string> {
  return callAPI(
    `你是苏格拉底式提问者。不要直接给答案或建议，只用层层递进的问题帮用户挖深自己的思考。每次只问 1-2 个问题。`,
    messages,
    settings,
    2000,
  );
}

export async function generateCounterPerspective(
  messages: { role: 'user' | 'assistant'; content: string }[],
  settings: AppSettings,
): Promise<string> {
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
  return callAPI(
    `你是魔鬼代言人。从用户想法的对立面出发，提出 3-5 个有理有据的质疑或替代方案，帮用户看到盲区。`,
    [{ role: 'user', content: `请从反面视角分析：\n\n${lastUserMsg?.content || ''}` }],
    settings,
    2000,
  );
}

export async function generateHistoricalAnalogy(
  messages: { role: 'user' | 'assistant'; content: string }[],
  settings: AppSettings,
): Promise<string> {
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
  return callAPI(
    `你是跨学科思想史专家。找出 2-3 个与用户想法最相似的历史上真实存在的案例。包含背景、相似点、最终结果。`,
    [{ role: 'user', content: `为以下想法找到历史类比：\n\n${lastUserMsg?.content || ''}` }],
    settings,
    2500,
  );
}

export async function detectContradictions(
  currentIdea: string,
  allConversations: { id: number; title: string; summary: string }[],
  settings: AppSettings,
): Promise<{ id: number; title: string; description: string }[]> {
  if (allConversations.length <= 1) return [];
  const summaries = allConversations
    .filter((c) => c.summary)
    .map((c) => `[ID:${c.id}] ${c.title}: ${c.summary}`)
    .join('\n');
  const result = await callAPI(
    `分析当前想法是否与用户之前的想法存在逻辑矛盾。返回严格 JSON 数组：[{"id": ID, "title": "标题", "description": "矛盾描述"}]。无矛盾返回 []。`,
    [{ role: 'user', content: `当前想法：${currentIdea}\n\n之前的想法：\n${summaries}` }],
    settings,
    500,
  );
  try { return JSON.parse(result.trim()); } catch { return []; }
}

export async function findRelatedIdeas(
  currentIdea: string,
  allConversations: { id: number; title: string; summary: string }[],
  settings: AppSettings,
): Promise<number[]> {
  if (allConversations.length <= 1) return [];
  const summaries = allConversations.map((c) => `[ID:${c.id}] ${c.title}: ${c.summary}`).join('\n');
  const result = await callAPI(
    `找出与当前想法高度相关的对话 ID。返回严格 JSON 数字数组：[id1, id2]。无相关返回 []。`,
    [{ role: 'user', content: `当前想法：${currentIdea}\n\n所有想法：\n${summaries}` }],
    settings,
    300,
  );
  try { return JSON.parse(result.trim()); } catch { return []; }
}

export async function generateWeeklyReview(
  allConversations: { title: string; summary: string; tags: string[]; stage: string; createdAt: Date }[],
  settings: AppSettings,
): Promise<string> {
  const info = allConversations
    .map((c, i) => `${i + 1}. ${c.title} [${c.stage}] [${c.tags.join(', ')}]\n   ${c.summary || '暂无总结'}`)
    .join('\n\n');
  return callAPI(
    `你是个人成长顾问。根据用户最近的想法，生成一份周度回顾简报。包含：本周思维概览、关键主题、进展突破、待关注盲区、下周建议。温暖专业，400-600 字。`,
    [{ role: 'user', content: `以下是用户最近的想法：\n\n${info}` }],
    settings,
    2000,
  );
}

export async function generateTitle(userMessage: string, settings: AppSettings): Promise<string> {
  try {
    const result = await callAPI(
      '你是一个标题生成器。只输出标题文本，不要任何额外内容。',
      [{ role: 'user', content: `为以下想法生成一个简洁的中文标题（10字以内，不要引号）：\n\n${userMessage}` }],
      settings,
      50,
    );
    return result.trim().replace(/^["'「『]|["'」』]$/g, '').slice(0, 20) || '新想法';
  } catch {
    return '新想法';
  }
}
