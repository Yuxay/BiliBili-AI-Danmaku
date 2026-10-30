// ============================================================
// AI Context - 弹幕格式化 / 唤醒词 / 滚动上下文 / 回复去重
//
// 纯函数与无副作用类，供 ai-relay 复用：
//   1) 把弹幕格式化为模型输入，并标记 [主播] / [对你]
//   2) 维护最近几条弹幕 + 自己回复的滚动上下文
//   3) 判断回复是否与最近发送重复
//   4) 按标点安全截断回复
// ============================================================

/** 去重/唤醒词匹配用的归一化字符：@、空白、下划线、常见中英文标点 */
const IGNORED_CHARS_RE = /[@＠\s_＿·・,，.。!！?？、~～…:：;；"'“”‘’()（）\[\]【】{}<>《》]/g;

/**
 * 归一化文本，用于唤醒词与重复回复匹配。
 * 去掉 @、空白、下划线、标点并转小写，避免“@比小哩_ ”和“比小哩”匹配不上。
 */
export function normalizeMatchText(text: string): string {
  return String(text ?? "").replace(IGNORED_CHARS_RE, "").toLowerCase();
}

/** 编译唤醒词：归一化、去重，并丢弃长度小于 2 的词（避免单字误判） */
export function compileWakeWords(words: readonly string[]): string[] {
  const out: string[] = [];
  for (const raw of words) {
    const word = normalizeMatchText(raw);
    if (word.length < 2) continue;
    if (!out.includes(word)) out.push(word);
  }
  return out;
}

/** 唤醒词匹配器：判断一条弹幕是否在叫 AI */
export class WakeWordMatcher {
  private readonly words: string[];

  constructor(words: readonly string[] = []) {
    this.words = compileWakeWords(words);
  }

  get size(): number {
    return this.words.length;
  }

  matches(content: string): boolean {
    if (this.words.length === 0) return false;
    const hay = normalizeMatchText(content);
    if (!hay) return false;
    return this.words.some((word) => hay.includes(word));
  }
}

/** 用于格式化的弹幕最小字段集 */
export interface DanmakuForModel {
  content: string;
  username?: string;
  uid?: number;
  guardTitle?: string;
  medal?: { name?: string; level?: number } | null;
}

export interface FormatDanmakuOptions {
  /** 主播 uid：命中时加 [主播] 标记 */
  anchorUid?: number;
  /** 唤醒词匹配器：命中时加 [对你] 标记 */
  wakeMatcher?: WakeWordMatcher;
}

/**
 * 把一条弹幕格式化为模型输入。
 * 输出形如：`[主播][对你] 舰长 | 粉丝牌:xxx 12 | 用户名:yyy | 弹幕:zzz`
 */
export function formatDanmakuForModel(
  danmaku: DanmakuForModel,
  options: FormatDanmakuOptions = {},
): string {
  const tags: string[] = [];
  const uid = Number(danmaku.uid || 0);
  const anchorUid = Number(options.anchorUid || 0);
  if (anchorUid > 0 && uid === anchorUid) tags.push("主播");
  if (options.wakeMatcher?.matches(danmaku.content ?? "")) tags.push("对你");

  const medalName = String(danmaku.medal?.name || "").trim();
  const medalLevel = Number(danmaku.medal?.level || 0);
  const medal = medalName ? `${medalName}${medalLevel > 0 ? ` ${medalLevel}` : ""}` : "无粉丝牌";
  const guard = String(danmaku.guardTitle || "").trim();
  const username = String(danmaku.username || "").trim() || "匿名用户";
  const prefix = tags.length > 0 ? `[${tags.join("][")}] ` : "";
  const guardPart = guard ? `${guard} | ` : "";

  return `${prefix}${guardPart}粉丝牌:${medal} | 用户名:${username} | 弹幕:${danmaku.content ?? ""}`;
}

/** 滚动上下文中的一轮：弹幕 + 当时的回复（未回复为 null） */
export interface ChatLogTurn {
  input: string;
  reply?: string | null;
}

/**
 * 滚动上下文缓冲区。
 * 只保留最近 limit 条，limit<=0 时退化为“每次只看当前一条”。
 */
export class DanmakuContextBuffer {
  private turns: ChatLogTurn[] = [];
  private readonly limit: number;

  constructor(limit = 0) {
    const normalized = Number(limit);
    this.limit = Number.isFinite(normalized) ? Math.max(0, Math.min(50, Math.floor(normalized))) : 0;
  }

  get size(): number {
    return this.turns.length;
  }

  get capacity(): number {
    return this.limit;
  }

  push(turn: ChatLogTurn): void {
    if (this.limit <= 0) return;
    this.turns.push({ input: String(turn.input || ""), reply: turn.reply ? String(turn.reply) : null });
    while (this.turns.length > this.limit) this.turns.shift();
  }

  clear(): void {
    this.turns.length = 0;
  }

  /** 把历史与当前弹幕拼成一次请求的 user 内容 */
  buildUserContent(currentInput: string): string {
    if (this.turns.length === 0) return currentInput;
    const lines: string[] = ["【最近聊天】"];
    for (const turn of this.turns) {
      lines.push(`· ${turn.input}`);
      if (turn.reply) lines.push(`  你：${turn.reply}`);
    }
    lines.push("", "【当前弹幕】", currentInput);
    return lines.join("\n");
  }
}

/** 判断回复是否与最近发送过的回复重复（忽略 @/空白/标点/大小写） */
export function isRepeatedReply(reply: string, recentReplies: readonly string[]): boolean {
  const target = normalizeMatchText(reply);
  if (!target) return false;
  return recentReplies.some((item) => normalizeMatchText(item) === target);
}

/** 断句标点：超长时优先在这些位置收尾，避免把一句话砍成两半 */
const BREAK_CHARS = ["。", "！", "？", "…", "!", "?", "~", "～", "，", "、", ",", "；", ";", "：", ":"];
/** 以这些标点收尾时把标点去掉（弹幕以逗号结尾很像被截断） */
const SOFT_BREAK_RE = /[，、,；;：:]$/;

/**
 * 按弹幕长度上限截断回复。
 * 若在前 40% 之后能遇到断句标点，则在标点处收尾；否则硬截断。
 * 在逗号/顿号处收尾时去掉该标点，避免看起来像说到一半。
 */
export function trimReplyForDanmaku(text: string, maxLen = 40): string {
  const normalized = String(text ?? "").replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLen) return normalized;

  const head = normalized.slice(0, maxLen);
  let cut = -1;
  for (const mark of BREAK_CHARS) {
    const index = head.lastIndexOf(mark);
    if (index > cut) cut = index;
  }
  if (cut >= Math.floor(maxLen * 0.4)) {
    return head.slice(0, cut + 1).trim().replace(SOFT_BREAK_RE, "").trim();
  }
  return head.trimEnd();
}

export interface SystemPromptOptions {
  /** 唤醒词原文列表（用于提示观众怎么称呼你） */
  wakeWords?: readonly string[];
  /** 主播昵称 */
  anchorName?: string;
}

/**
 * 在用户提示词后追加一小段运行时身份信息：
 *   - 观众可能用哪些名字叫你（配合 [对你] 标记）
 *   - 本场主播昵称（配合 [主播] 标记）
 * 没有可追加内容时原样返回。
 */
export function buildSystemPrompt(basePrompt: string, options: SystemPromptOptions = {}): string {
  const base = String(basePrompt || "").trim();
  const blocks: string[] = [];

  const names = (options.wakeWords ?? [])
    .map((word) => String(word || "").trim())
    .filter(Boolean);
  if (names.length > 0) {
    blocks.push(
      [
        "【直播间身份】",
        `观众可能用这些名字叫你：${names.join("、")}。弹幕里出现这些词、或用 @ 带上你的昵称，通常就是在对你说话。`,
      ].join("\n"),
    );
  }

  const anchorName = String(options.anchorName || "").trim();
  if (anchorName) {
    blocks.push(
      [
        "【本场主播】",
        `主播昵称是「${anchorName}」。这条信息只用来分清谁在说话，不必主动提起。`,
      ].join("\n"),
    );
  }

  if (blocks.length === 0) return base;
  return `${base}\n\n${blocks.join("\n\n")}`;
}
