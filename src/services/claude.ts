import type { AnalysisResult, AppSettings } from '../types';

const API_BASE = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

const MODEL_MAP: Record<AppSettings['model'], string> = {
  'claude-sonnet-4-6': 'claude-sonnet-4-6-20250514',
  'claude-opus-4-7': 'claude-opus-4-7-20250514',
  'claude-haiku-4-5': 'claude-haiku-4-5-20251001',
};

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

async function callClaude(
  systemPrompt: string,
  messages: ClaudeMessage[],
  settings: AppSettings,
  maxTokens?: number,
): Promise<string> {
  if (!settings.apiKey) {
    throw new Error('请先在设置中配置 API Key');
  }

  const endpoint = settings.apiProxy ? settings.apiProxy : API_BASE;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': settings.apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: MODEL_MAP[settings.model],
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

const SYSTEM_PROMPT = `你是一个深度思考分析助手。你的任务是与用户讨论他们的想法，并在每次回复中提供结构化的分析。

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
  const fullText = await callClaude(SYSTEM_PROMPT, conversationHistory, settings);

  // Parse analysis from the response
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
    } catch {
      // Analysis parsing failed, return without analysis
    }
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

  return callClaude(
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
  return callClaude(
    `你是苏格拉底式提问者。不要直接给答案或建议，只用层层递进的问题帮用户挖深自己的思考。

规则：
- 每次只问 1-2 个问题
- 问题要引导用户自己发现逻辑漏洞、隐藏假设、或新的可能性
- 语气要温和、好奇，像哲学家与朋友的对话
- 在问题前可以简短肯定用户的思考`,
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
  return callClaude(
    `你是一个"魔鬼代言人"。从用户想法的对立面出发，提供一个有理有据的反方视角。

要求：
- 不是否定用户，而是帮用户看到盲区
- 用"如果……那会怎样？"的假设语气
- 提出 3-5 个关键质疑或替代方案
- 最后给出一个平衡的总结`,
    [{ role: 'user', content: `请从反面视角分析这个想法：\n\n${lastUserMsg?.content || ''}` }],
    settings,
    2000,
  );
}

export async function generateHistoricalAnalogy(
  messages: { role: 'user' | 'assistant'; content: string }[],
  settings: AppSettings,
): Promise<string> {
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
  return callClaude(
    `你是一个跨学科思想史专家。找出 2-3 个与用户想法最相似的**历史上真实存在的案例或思想**。

要求：
- 每个案例包含：背景（谁/什么）、相似点、最终结果或教训
- 涵盖不同领域（商业/科技/艺术/科学等）
- 总结这些案例对用户的启示
- 不要只选择成功的案例，也要有失败案例`,
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

  const result = await callClaude(
    `分析当前想法是否与用户之前的想法存在逻辑矛盾。如果有矛盾，列出具体冲突点。如果没有，返回空数组。

返回格式（严格 JSON）：
[{"id": 对话ID数字, "title": "矛盾想法标题", "description": "具体矛盾描述"}]

如果无矛盾，返回：[]`,
    [{ role: 'user', content: `当前想法：${currentIdea}\n\n之前的想法：\n${summaries}` }],
    settings,
    1000,
  );

  try {
    return JSON.parse(result.trim());
  } catch {
    return [];
  }
}

export async function findRelatedIdeas(
  currentIdea: string,
  allConversations: { id: number; title: string; summary: string }[],
  settings: AppSettings,
): Promise<number[]> {
  if (allConversations.length <= 1) return [];

  const summaries = allConversations
    .map((c) => `[ID:${c.id}] ${c.title}: ${c.summary}`)
    .join('\n');

  const result = await callClaude(
    `分析当前想法与用户之前想法的关联度。找出与当前想法**高度相关**的对话（主题相似、可以互补、或者属于同一领域）。

返回格式（严格 JSON 数字数组）：[id1, id2, ...]

如果没有相关想法，返回：[]`,
    [{ role: 'user', content: `当前想法：${currentIdea}\n\n所有想法：\n${summaries}` }],
    settings,
    500,
  );

  try {
    return JSON.parse(result.trim());
  } catch {
    return [];
  }
}

export async function generateWeeklyReview(
  allConversations: { title: string; summary: string; tags: string[]; stage: string; createdAt: Date }[],
  settings: AppSettings,
): Promise<string> {
  const info = allConversations
    .map(
      (c, i) =>
        `${i + 1}. ${c.title} [${c.stage}] [${c.tags.join(', ')}]\n   ${c.summary || '暂无总结'}`
    )
    .join('\n\n');

  return callClaude(
    `你是一个个人成长顾问。根据用户最近的所有想法，生成一份周度回顾简报。

简报结构：
## 本周思维概览
（2-3 句总结：用户在关注什么领域、思维模式如何）

## 关键主题
- 主题1：涉及的想法的概要
- 主题2：...

## 进展与突破
（哪些想法有实质性进展？哪些有了新的洞见？）

## 待关注盲区
（用户整体上忽略了什么？思考中有哪些系统性偏差？）

## 下周建议
- 建议1
- 建议2
...

用温暖但专业的语气。长度 400-600 字。`,
    [{ role: 'user', content: `以下是用户最近的想法清单：\n\n${info}` }],
    settings,
    2000,
  );
}

export async function generateTitle(userMessage: string, settings: AppSettings): Promise<string> {
  try {
    const result = await callClaude(
      '你是一个标题生成器。只输出标题文本，不要任何额外内容。',
      [{ role: 'user', content: `为以下想法生成一个简洁的中文标题（10字以内，不要引号）：\n\n${userMessage}` }],
      settings,
      50,
    );
    return result
      .trim()
      .replace(/^["'「『]|["'」』]$/g, '')
      .slice(0, 20) || '新想法';
  } catch {
    return '新想法';
  }
}
