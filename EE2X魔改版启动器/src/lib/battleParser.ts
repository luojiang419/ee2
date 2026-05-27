export interface BattleRow {
  name: string;
  team: string;
  result: string;
  game: string;
  empire: string;
  economy: string;
  military: string;
  total: string;
  spectator?: boolean;
}

export interface BattleParseResult {
  duration: string;
  csvText: string;
  notSettlement: boolean;
}

const BATTLE_HEADER = ["玩家姓名", "队伍", "获胜/落败", "游戏分数", "帝国分数", "经济分数", "军事分数", "总分数"];
export const HEADER_LINE = BATTLE_HEADER.join(",");
export const RAW_VISIBLE_HEADER = ["玩家姓名", "游戏分数", "军事分数", "经济分数", "帝国分数", "总分数"];

const TEAM_SET = new Set(["红方", "蓝方", "观战者"]);
const RESULT_SET = new Set(["获胜", "落败", "观战者", "未知"]);

function trimText(value: unknown) {
  return String(value == null ? "" : value).trim();
}

function isNumericText(value: unknown) {
  return /^-?\d+(?:\.\d+)?$/.test(trimText(value));
}

function looksLikeHeaderLine(line: string) {
  const text = trimText(line);
  return /玩家姓名/.test(text) && /(游戏分数|帝国分数|经济分数|军事分数|总分数|队伍|获胜\/落败)/.test(text);
}

function isTeamToken(value: unknown) {
  return TEAM_SET.has(trimText(value));
}

function isResultToken(value: unknown) {
  return RESULT_SET.has(trimText(value));
}

function looksLikePlayerName(value: unknown) {
  const text = trimText(value);
  if (!text) return false;
  if (text.length > 24) return false;
  if (isNumericText(text)) return false;
  if (/[,:，：;；|]/.test(text)) return false;
  if (/(玩家姓名|队伍|获胜|落败|观战|游戏|帝国|经济|军事|总分|时长|结算|截图|说明|在线|列表|摘要资讯|会战)/.test(text)) {
    return false;
  }
  if (/[。！？?]/.test(text)) return false;
  return true;
}

export function normalizeBattleDuration(value: unknown) {
  const text = trimText(value).replace(/[：]/g, ":");
  if (!text) return "";

  let match = text.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (match) {
    const h = match[3] != null ? Number(match[1]) : 0;
    const m = match[3] != null ? Number(match[2]) : Number(match[1]);
    const s = match[3] != null ? Number(match[3]) : Number(match[2]);
    if (Number.isFinite(h) && Number.isFinite(m) && Number.isFinite(s)) {
      return h > 0
        ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
        : `${m}:${String(s).padStart(2, "0")}`;
    }
  }

  match = text.match(/(?:(\d{1,2})\s*小时)?\s*(\d{1,2})\s*分(?:钟)?\s*(?:(\d{1,2})\s*秒)?/);
  if (match) {
    const h = Number(match[1] || 0);
    const m = Number(match[2] || 0);
    const s = Number(match[3] || 0);
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      : `${m}:${String(s).padStart(2, "0")}`;
  }

  return "";
}

export function extractBattleDurationFromText(text: unknown) {
  const raw = trimText(text);
  if (!raw) return "";

  const patterns = [
    /(?:总游戏时间|游戏时长|总时长)\s*[,，:：]?\s*(\d{1,2}:\d{2}(?::\d{2})?)/i,
    /(\d{1,2}:\d{2}(?::\d{2})?)\s*(?:总游戏时间|游戏时长|总时长)/i,
    /(?:总游戏时间|游戏时长|总时长)\s*[,，:：]?\s*((?:(?:\d+\s*小时)?\s*\d+\s*分(?:钟)?\s*(?:\d+\s*秒)?)|(?:\d+\s*分(?:钟)?\s*\d+\s*秒))/i
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match?.[1]) {
      const normalized = normalizeBattleDuration(match[1]);
      if (normalized) return normalized;
    }
  }

  return "";
}

export function parseCsvLine(line: string) {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  const source = trimText(line).replace(/[，]/g, ",");

  for (let index = 0; index < source.length; index += 1) {
    const ch = source[index];
    if (quoted) {
      if (ch === "\"") {
        if (source[index + 1] === "\"") {
          cur += "\"";
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === "\"") {
      quoted = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }

  out.push(cur);
  return out.map((item) => trimText(item));
}

function normalizeHeaderCell(value: unknown) {
  const text = trimText(value)
    .replace(/\s+/g, "")
    .replace(/[：:]/g, "")
    .replace(/[()（）]/g, "");

  if (!text) return "";
  if (/玩家姓名|玩家|姓名/.test(text)) return "name";
  if (/队伍|阵营|颜色/.test(text)) return "team";
  if (/获胜|落败|结果|胜负/.test(text)) return "result";
  if (/游戏分数|游戏得分|game/.test(text)) return "game";
  if (/帝国分数|帝国得分|帝国/.test(text)) return "empire";
  if (/经济分数|经济得分|经济/.test(text)) return "economy";
  if (/军事分数|军事得分|军事1|军事2|军事/.test(text)) return "military";
  if (/总分数|总分|总计/.test(text)) return "total";
  return "";
}

function parseHeaderColumns(line: string) {
  const parts = parseCsvLine(line);
  const keys = parts.map(normalizeHeaderCell);
  const metrics = ["game", "empire", "economy", "military", "total"];
  const metricCount = keys.filter((key) => metrics.includes(key)).length;
  if (!keys.includes("name") || metricCount < 4) return null;
  return keys;
}

function normalizeScoreText(value: unknown) {
  const text = trimText(value);
  if (!text) return "";
  return isNumericText(text) ? text : "";
}

function normalizeGameScore(value: unknown) {
  const text = trimText(value);
  if (!text || !isNumericText(text)) return "";
  const num = Number(text);
  if (Math.abs(num - 200) <= 1) return "200";
  if (Math.abs(num) <= 1) return "0";
  return "";
}

function normalizeTotalScore(row: BattleRow) {
  if (trimText(row.total)) return row.total;
  const game = Number(normalizeGameScore(row.game));
  const empire = Number(normalizeScoreText(row.empire));
  const economy = Number(normalizeScoreText(row.economy));
  const military = Number(normalizeScoreText(row.military));
  if ([game, empire, economy, military].every((value) => Number.isFinite(value))) {
    return (game + empire + economy + military).toFixed(1);
  }
  return "";
}

function hasVisibleGameScore(row: BattleRow) {
  return normalizeScoreText(row.game) !== "";
}

export function classifyBattleRow(row: BattleRow) {
  const values = ["game", "empire", "economy", "military", "total"].map((key) => {
    if (key === "game") return Number(normalizeGameScore(row[key]));
    const text = normalizeScoreText(row[key]);
    return text ? Number(text) : 0;
  });

  const allZero = values.every((value) => !value);
  const game = Number(normalizeGameScore(row.game));

  if (allZero) return { team: "观战者", result: "观战者", spectator: true };
  if (game === 200) return { team: "红方", result: "获胜", spectator: false };
  return { team: "蓝方", result: "落败", spectator: false };
}

function isSpectatorRow(row: BattleRow) {
  const values = ["game", "empire", "economy", "military", "total"].map((key) => {
    if (key === "game") return Number(normalizeGameScore(row[key]));
    const text = normalizeScoreText(row[key]);
    return text ? Number(text) : 0;
  });
  return values.every((value) => !value);
}

export function applyBattleOutcomeInference(rows: BattleRow[]) {
  const normalized = (rows || []).map((row) => canonicalizeBattleRow(row));
  const winners = normalized.filter((row) => !isSpectatorRow(row) && hasVisibleGameScore(row));
  const losers = normalized.filter((row) => !isSpectatorRow(row) && !hasVisibleGameScore(row));
  const hasWinnerSide = winners.length > 0;
  const hasLoserSide = losers.length > 0;

  return normalized.map((row) => {
    if (isSpectatorRow(row)) {
      return { ...row, team: "观战者", result: "观战者", spectator: true };
    }
    if (hasWinnerSide && hasLoserSide) {
      if (hasVisibleGameScore(row)) {
        return { ...row, team: "红方", result: "获胜", spectator: false };
      }
      return { ...row, team: "蓝方", result: "落败", spectator: false };
    }
    return { ...row, team: "未知", result: "未知", spectator: false };
  });
}

function battleRowQuality(row: BattleRow) {
  let score = 0;
  if (looksLikePlayerName(row.name)) score += 8;

  const numericFields: Array<keyof BattleRow> = ["game", "empire", "economy", "military", "total"];
  let numericCount = 0;
  for (const field of numericFields) {
    const value = field === "game" ? normalizeGameScore(row[field]) : normalizeScoreText(row[field]);
    if (value) {
      numericCount += 1;
      score += 2;
    } else if (trimText(row[field])) {
      score -= 4;
    }
  }

  if (numericCount >= 4) score += 4;
  if (isTeamToken(row.team)) score += 2;
  if (isResultToken(row.result)) score += 2;

  const inferred = classifyBattleRow(row);
  if (row.team && row.team === inferred.team) score += 1;
  if (row.result && row.result === inferred.result) score += 1;

  return score;
}

function buildCandidates(parts: string[]) {
  const variants: Array<{ key: string; parts: string[] }> = [];
  const compact = parts.map((value) => trimText(value));

  const addVariant = (variant: string[]) => {
    const key = JSON.stringify(variant);
    if (!variants.some((item) => item.key === key)) {
      variants.push({ key, parts: variant });
    }
  };

  addVariant(compact);
  if (compact.length > 1 && isNumericText(compact[0])) addVariant(compact.slice(1));
  if (compact.length > 8) addVariant(compact.slice(0, 8));
  if (compact.length > 8) addVariant(compact.slice(compact.length - 8));
  if (compact.length > 1 && !looksLikePlayerName(compact[0]) && looksLikePlayerName(compact[1])) {
    addVariant(compact.slice(1));
  }

  const rows: BattleRow[] = [];
  const pushCandidate = (row: Partial<BattleRow> | null) => {
    if (!row) return;
    rows.push({
      name: trimText(row.name),
      team: trimText(row.team),
      result: trimText(row.result),
      game: trimText(row.game),
      empire: trimText(row.empire),
      economy: trimText(row.economy),
      military: trimText(row.military),
      total: trimText(row.total)
    });
  };

  for (const variant of variants) {
    const item = variant.parts;
    if (item.length >= 6) {
      pushCandidate({
        name: item[0],
        team: "",
        result: "",
        game: item[1],
        empire: item[4],
        economy: item[3],
        military: item[2],
        total: item[5]
      });
      pushCandidate({
        name: item[0],
        team: "",
        result: "",
        game: item[1],
        empire: item[2],
        economy: item[3],
        military: item[4],
        total: item[5]
      });
    }
    if (item.length >= 7) {
      pushCandidate({
        name: item[0],
        team: item[1],
        result: "",
        game: item[2],
        empire: item[3],
        economy: item[4],
        military: item[5],
        total: item[6]
      });
      pushCandidate({
        name: item[0],
        team: "",
        result: item[1],
        game: item[2],
        empire: item[3],
        economy: item[4],
        military: item[5],
        total: item[6]
      });
      pushCandidate({
        name: item[1],
        team: "",
        result: item[0],
        game: item[2],
        empire: item[3],
        economy: item[4],
        military: item[5],
        total: item[6]
      });
    }
    if (item.length >= 8) {
      pushCandidate({
        name: item[0],
        team: item[1],
        result: item[2],
        game: item[3],
        empire: item[4],
        economy: item[5],
        military: item[6],
        total: item[7]
      });
      pushCandidate({
        name: item[1],
        team: item[0],
        result: item[2],
        game: item[3],
        empire: item[4],
        economy: item[5],
        military: item[6],
        total: item[7]
      });
      pushCandidate({
        name: item[0],
        team: item[2],
        result: item[1],
        game: item[3],
        empire: item[4],
        economy: item[5],
        military: item[6],
        total: item[7]
      });
    }
  }

  return rows;
}

function canonicalizeBattleRow(row: BattleRow): BattleRow {
  const result: BattleRow = {
    name: trimText(row.name),
    team: trimText(row.team),
    result: trimText(row.result),
    game: normalizeGameScore(row.game),
    empire: normalizeScoreText(row.empire),
    economy: normalizeScoreText(row.economy),
    military: normalizeScoreText(row.military),
    total: normalizeScoreText(row.total)
  };

  result.total = normalizeTotalScore(result);

  const cls = classifyBattleRow(result);
  result.team = cls.team;
  result.result = cls.result;
  result.spectator = cls.spectator;

  return result;
}

function isBattleRowUsable(row: BattleRow) {
  if (!looksLikePlayerName(row.name)) return false;

  const metrics: Array<keyof BattleRow> = ["empire", "economy", "military", "total"];
  const numericCount = metrics.filter((key) => normalizeScoreText(row[key])).length;
  if (!row.spectator && numericCount < 3) return false;

  return true;
}

function buildBestRow(parts: string[]) {
  const candidates = buildCandidates(parts)
    .map((candidate) => canonicalizeBattleRow(candidate))
    .filter((candidate) => isBattleRowUsable(candidate));

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => battleRowQuality(b) - battleRowQuality(a));
  return candidates[0];
}

export function parseCsvText(text: unknown) {
  const raw = String(text || "")
    .replace(/<\|begin_of_box\|>/g, "")
    .replace(/<\|end_of_box\|>/g, "")
    .replace(/```(?:csv|text)?/gi, "")
    .replace(/```/g, "")
    .trim();

  if (/NOT_SETTLEMENT/i.test(raw)) return "NOT_SETTLEMENT";

  const lines = raw
    .split(/\r?\n/)
    .map((line) => trimText(line).replace(/[，]/g, ","))
    .filter(Boolean);

  const expanded: string[] = [];
  for (const line of lines) {
    const headerIndex = line.indexOf("玩家姓名");
    if (headerIndex > 0) {
      const before = trimText(line.slice(0, headerIndex)).replace(/[,\s]+$/, "");
      const after = trimText(line.slice(headerIndex));
      if (before) expanded.push(before);
      if (after) expanded.push(after);
      continue;
    }
    expanded.push(line);
  }

  const useful: string[] = [];
  let started = false;

  for (const line of expanded) {
    if (/^(?:NOT_SETTLEMENT)$/i.test(line)) return "NOT_SETTLEMENT";
    if (/^(?:游戏时长|总游戏时间|总时长)\s*[,，:：]/.test(line)) continue;
    if (looksLikeHeaderLine(line)) {
      useful.push(line);
      started = true;
      continue;
    }

    const row = buildBestRow(parseCsvLine(line));
    if (row) {
      useful.push(line);
      started = true;
      continue;
    }

    if (!started && /玩家姓名/.test(line)) {
      useful.push(line);
      started = true;
    }
  }

  return useful.join("\n").trim();
}

export function parseBattleResponse(text: unknown): BattleParseResult {
  const raw = parseCsvText(text);
  if (raw === "NOT_SETTLEMENT") {
    return { duration: "", csvText: "", notSettlement: true };
  }
  const duration = extractBattleDurationFromText(text);
  return { duration, csvText: raw, notSettlement: false };
}

export function parseOcrResponse(text: unknown): BattleParseResult {
  const base = trimText(text);
  if (!base) return { duration: "", csvText: "", notSettlement: false };
  if (/[,\n]/.test(base) || /玩家姓名/.test(base)) return parseBattleResponse(base);
  if (/NOT_SETTLEMENT/i.test(base)) return { duration: "", csvText: "", notSettlement: true };

  const duration = extractBattleDurationFromText(base);
  const lines = base
    .split(/\r?\n/)
    .map((line) => trimText(line))
    .filter(Boolean);

  const csvLines: string[] = [];
  for (const line of lines) {
    if (/(总游戏时间|游戏时长|总时长)/.test(line)) continue;
    const tokens = line.split(/[\t| ]+/).map((item) => trimText(item)).filter(Boolean);
    if (tokens.length >= 6 && looksLikePlayerName(tokens[0])) {
      csvLines.push(tokens.join(","));
    }
  }

  return { duration, csvText: csvLines.join("\n"), notSettlement: false };
}

export function parseBattleRows(csvText: string) {
  const rows: BattleRow[] = [];
  const lines = String(csvText || "")
    .split(/\r?\n/)
    .map((line) => trimText(line))
    .filter(Boolean);
  let headerKeys: string[] | null = null;

  for (const line of lines) {
    if (looksLikeHeaderLine(line)) {
      headerKeys = parseHeaderColumns(line);
      continue;
    }
    if (/^(?:游戏时长|总游戏时间|总时长)\s*[,，:：]/.test(line)) continue;
    const parts = parseCsvLine(line);
    let row: BattleRow | null = null;
    if (headerKeys) {
      const mapped: Record<string, string> = {
        name: "",
        team: "",
        result: "",
        game: "",
        empire: "",
        economy: "",
        military: "",
        total: ""
      };
      for (let index = 0; index < headerKeys.length && index < parts.length; index += 1) {
        const key = headerKeys[index];
        if (!key || !Object.prototype.hasOwnProperty.call(mapped, key)) continue;
        mapped[key] = parts[index];
      }
      row = buildBestRow([
        mapped.name,
        mapped.game,
        mapped.military,
        mapped.economy,
        mapped.empire,
        mapped.total
      ]);
      if (!row) row = buildBestRow(parts);
    } else {
      row = buildBestRow(parts);
    }
    if (row) rows.push(row);
  }

  return rows;
}

function getBattleNameKey(name: unknown) {
  return trimText(name).replace(/\s+/g, "").toLowerCase();
}

export function dedupeBattleRows(rows: BattleRow[]) {
  const map = new Map<string, BattleRow>();
  for (const row of rows || []) {
    const key = getBattleNameKey(row?.name);
    if (!key) continue;
    const next = canonicalizeBattleRow(row);
    const prev = map.get(key);
    if (!prev || battleRowQuality(next) > battleRowQuality(prev)) {
      map.set(key, next);
    }
  }
  return Array.from(map.values());
}

export function sortBattleRows(rows: BattleRow[]) {
  const enrichedRows = applyBattleOutcomeInference(dedupeBattleRows(rows));
  const winners: BattleRow[] = [];
  const losers: BattleRow[] = [];
  const spectators: BattleRow[] = [];
  const unknowns: BattleRow[] = [];

  for (const row of enrichedRows) {
    if (!row) continue;
    if (row.spectator || row.result === "观战者" || row.team === "观战者") {
      spectators.push(row);
    } else if (row.result === "获胜" || row.team === "红方") {
      winners.push(row);
    } else if (row.result === "未知" || row.team === "未知") {
      unknowns.push(row);
    } else {
      losers.push(row);
    }
  }

  const byTotal = (left: BattleRow, right: BattleRow) =>
    (Number(trimText(right.total)) || 0) - (Number(trimText(left.total)) || 0);
  return [...winners.sort(byTotal), ...losers.sort(byTotal), ...unknowns.sort(byTotal), ...spectators.sort(byTotal)];
}

export function buildBattleCsv(rows: BattleRow[], duration: string) {
  const lines: string[] = [];
  const finalDuration = normalizeBattleDuration(duration);
  if (finalDuration) lines.push(`游戏时长,${finalDuration}`);
  lines.push(HEADER_LINE);

  for (const item of sortBattleRows(rows)) {
    lines.push(
      [item.name || "", item.team || "", item.result || "", item.game || "", item.empire || "", item.economy || "", item.military || "", item.total || ""]
        .map((value) => `"${String(value).replace(/"/g, "\"\"")}"`)
        .join(",")
    );
  }

  return lines.join("\n");
}
