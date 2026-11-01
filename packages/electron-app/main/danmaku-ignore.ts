// ============================================================
// Danmaku Ignore - 「不回复的弹幕」规则编译与匹配
//
// 支持两种规则写法：
//   1) 动态规则：用 + 拼接占位符与文本
//        左+数字     → 匹配包含「左」+ 数字的弹幕（左1、走左3、左 12）
//        ^右+数字$   → 只匹配整条弹幕就是「右+数字」（不匹配「右边12个」）
//   2) 正则：与「无需发送标记」一致，写作 /pattern/flags
//        /^6+$/      → 匹配 6、66、666
//
// 占位符：数字 / 字母 / 英文 / 汉字 / 中文 / 任意 / * / 空格
// 默认「包含」匹配；不区分大小写；同时比对去空格后的文本，防止「左 1」绕过。
// 本模块为纯函数，不依赖 Electron，便于单独验证。
// ============================================================

/** 空白字符（含全角空格），用于生成「去空白」版本 */
const WHITESPACE_RE = /[\s\u3000]+/g;

/** 动态规则中的占位符 → 正则片段 */
const TOKEN_SOURCES: Record<string, string> = {
  数字: "[0-9０-９]+",
  字母: "[A-Za-zＡ-Ｚａ-ｚ]+",
  英文: "[A-Za-zＡ-Ｚａ-ｚ]+",
  汉字: "[\\u3400-\\u4DBF\\u4E00-\\u9FFF]+",
  中文: "[\\u3400-\\u4DBF\\u4E00-\\u9FFF]+",
  任意: "[\\s\\S]*",
  "*": "[\\s\\S]*",
  空格: "\\s+",
};

/** 正则写法：/pattern/flags（body 允许包含 /，取最后一个 / 为分隔） */
const REGEX_SOURCE_RE = /^\/(.*)\/([gimsuy]*)$/s;

/** 单条规则最大长度，避免异常配置拖慢匹配 */
const MAX_PATTERN_LENGTH = 500;

/** 编译后的忽略规则 */
export interface DanmakuIgnoreRule {
  /** 用户填写的原始规则文本（用于展示命中原因） */
  raw: string;
  /** 编译后的正则 */
  regex: RegExp;
  /** 规则来源：动态拼接 / 原生正则 */
  kind: "pattern" | "regex";
}

/** 规则编译错误 */
export interface DanmakuIgnoreCompileError {
  pattern: string;
  message: string;
}

/** 编译结果：rules 为可用规则，errors 为被跳过的非法规则 */
export interface DanmakuIgnoreCompileResult {
  rules: DanmakuIgnoreRule[];
  errors: DanmakuIgnoreCompileError[];
}

/** 转义正则元字符 */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 判断指定下标处的字符是否被反斜杠转义（奇数个反斜杠才算转义） */
function isEscaped(text: string, index: number): boolean {
  let count = 0;
  for (let i = index - 1; i >= 0 && text[i] === "\\"; i -= 1) count += 1;
  return count % 2 === 1;
}

/** 动态规则中可用的转义：\+ \^ \$ \* \/ \\（其余反斜杠按字面量处理） */
const DSL_ESCAPE_TEST_RE = /\\[+＋^$\\*/]/;
const DSL_ESCAPE_RE = /\\([+＋^$\\*/])/g;

/** 还原动态规则中的转义字符 */
function unescapeSegment(segment: string): string {
  return segment.replace(DSL_ESCAPE_RE, "$1");
}

/**
 * 按未转义的 + 切分动态规则。
 * 转义序列（如 \+）原样保留在片段内，交由后续按字面量处理。
 */
function splitSegments(input: string): string[] {
  const segments: string[] = [];
  let current = "";
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (char === "\\" && i + 1 < input.length) {
      current += char + input[i + 1];
      i += 1;
      continue;
    }
    if (char === "+" || char === "＋") {
      segments.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  segments.push(current);
  return segments;
}

/** 把动态规则编译成正则（含可选的首尾锚定） */
function compileDynamicPattern(pattern: string): { source: string; error?: string } {
  let body = pattern.trim();
  let anchorStart = false;
  let anchorEnd = false;

  if (body.startsWith("^")) {
    anchorStart = true;
    body = body.slice(1);
  }
  if (body.endsWith("$") && !isEscaped(body, body.length - 1)) {
    anchorEnd = true;
    body = body.slice(0, -1);
  }

  const segments = splitSegments(body);
  const parts: string[] = [];
  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) {
      return { source: "", error: "规则内容不完整（+ 两侧需要有内容，匹配加号本身请写 \\+）" };
    }

    // 含转义的片段按纯文本处理，避免「数\+字」被当成占位符
    if (DSL_ESCAPE_TEST_RE.test(trimmed)) {
      parts.push(escapeRegExp(unescapeSegment(trimmed)));
      continue;
    }

    const tokenSource = TOKEN_SOURCES[trimmed];
    if (tokenSource) {
      parts.push(tokenSource);
      continue;
    }
    parts.push(escapeRegExp(trimmed));
  }

  const source = `${anchorStart ? "^" : ""}${parts.join("")}${anchorEnd ? "$" : ""}`;
  if (!source) return { source: "", error: "规则为空" };
  return { source };
}

/**
 * 编译忽略规则列表。
 * 空行、重复规则会被忽略；非法正则进入 errors，不影响其它规则生效。
 */
export function compileDanmakuIgnorePatterns(
  patterns: readonly string[],
): DanmakuIgnoreCompileResult {
  const rules: DanmakuIgnoreRule[] = [];
  const errors: DanmakuIgnoreCompileError[] = [];
  const seen = new Set<string>();

  for (const input of patterns) {
    const raw = String(input ?? "").trim();
    if (!raw || seen.has(raw)) continue;
    seen.add(raw);

    if (raw.length > MAX_PATTERN_LENGTH) {
      errors.push({ pattern: raw, message: `规则过长（上限 ${MAX_PATTERN_LENGTH} 字符）` });
      continue;
    }

    const regexLiteral = REGEX_SOURCE_RE.exec(raw);
    if (regexLiteral) {
      if (!regexLiteral[1].trim()) {
        errors.push({ pattern: raw, message: "正则内容不能为空（// 会匹配所有弹幕）" });
        continue;
      }
      try {
        // 剥掉 g / y 标志：带状态的 RegExp.test() 会推进 lastIndex，导致「隔一条漏一条」
        const flags = regexLiteral[2].replace(/[gy]/g, "");
        rules.push({ raw, kind: "regex", regex: new RegExp(regexLiteral[1], flags) });
      } catch (e) {
        errors.push({ pattern: raw, message: e instanceof Error ? e.message : String(e) });
      }
      continue;
    }

    const compiled = compileDynamicPattern(raw);
    if (compiled.error) {
      errors.push({ pattern: raw, message: compiled.error });
      continue;
    }
    try {
      // 动态规则统一不区分大小写
      rules.push({ raw, kind: "pattern", regex: new RegExp(compiled.source, "i") });
    } catch (e) {
      errors.push({ pattern: raw, message: e instanceof Error ? e.message : String(e) });
    }
  }

  return { rules, errors };
}

/**
 * 在一组已编译规则中查找命中项。
 * 同时比对原文与去空白版本，避免「左 1」「6 6 6」这类拆字绕过。
 */
export function matchDanmakuIgnoreRules(
  rules: readonly DanmakuIgnoreRule[],
  content: string,
): DanmakuIgnoreRule | null {
  const text = String(content ?? "").trim();
  if (!text || rules.length === 0) return null;

  const collapsed = text.replace(WHITESPACE_RE, "");
  const candidates = collapsed && collapsed !== text ? [text, collapsed] : [text];

  for (const rule of rules) {
    for (const candidate of candidates) {
      try {
        rule.regex.lastIndex = 0;
        if (rule.regex.test(candidate)) return rule;
      } catch {
        // 正则运行异常时跳过该规则
      }
    }
  }
  return null;
}

/** 忽略弹幕匹配器：按配置构建一次，供每条弹幕复用 */
export class DanmakuIgnoreMatcher {
  private readonly rules: DanmakuIgnoreRule[];

  constructor(patterns: readonly string[] = []) {
    this.rules = compileDanmakuIgnorePatterns(patterns).rules;
  }

  get size(): number {
    return this.rules.length;
  }

  /** 返回命中的规则（未命中返回 null） */
  match(content: string): DanmakuIgnoreRule | null {
    return matchDanmakuIgnoreRules(this.rules, content);
  }
}
