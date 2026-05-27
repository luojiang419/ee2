import type { AppConfig, BattleRunResult, BattleRuntimeState } from "./types";
import {
  battleCaptureScreenshot,
  battleGetState,
  battleStoreAndSubmit,
  battleUpdateState
} from "./tauri";
import {
  buildBattleCsv,
  extractBattleDurationFromText,
  normalizeBattleDuration,
  parseBattleResponse,
  parseBattleRows,
  parseOcrResponse
} from "./battleParser";

interface BattleCompletionResponse {
  status: number;
  text: string;
}

export interface BattleApiTestResult {
  ok: boolean;
  status?: number;
  text?: string;
  shotPath?: string;
  error?: string;
}

function buildBattlePrompt() {
  return "请识别这张游戏结算截图。如果这不是游戏结算页面，只输出 NOT_SETTLEMENT。否则第一行输出游戏时长，格式：游戏时长,<时长值>。然后只输出 CSV 文本，表头固定为：玩家姓名,游戏分数,军事分数,经济分数,帝国分数,总分数。每行一位玩家。只提取图片里直接可见的原始数据，不要推断队伍，不要判断获胜/落败，不要输出颜色名、序号、说明文字、Markdown 或任何额外解释。";
}

function buildBattleDurationPrompt() {
  return "请只识别这张游戏结算截图底部的总游戏时间。如果不是结算页面，只输出 NOT_SETTLEMENT；如果能识别到时长，只输出类似 45:18 或 1:25:41 的时间文本，不要解释。";
}

function resolveBattleApiUrl(apiBase: string) {
  const raw = String(apiBase || "http://192.168.0.211:1234/v1/responses").trim();
  if (/\/chat\/completions$/i.test(raw)) return raw;
  if (/\/responses$/i.test(raw)) return raw.replace(/\/responses$/i, "/chat/completions");
  return raw;
}

function extractResponsesText(out: unknown): string {
  if (
    out &&
    typeof out === "object" &&
    "output" in out &&
    Array.isArray((out as { output?: unknown[] }).output)
  ) {
    return (out as { output: Array<{ type?: string; content?: Array<{ text?: string }>; text?: string }> }).output
      .filter((item) => item && item.type === "message")
      .map((item) =>
        Array.isArray(item.content)
          ? item.content.map((content) => content.text || "").join("")
          : item.text || ""
      )
      .join("\n");
  }

  if (out && typeof out === "object") {
    const candidate = out as { output_text?: string; text?: string };
    return String(candidate.output_text || candidate.text || JSON.stringify(out));
  }

  return String(out || "");
}

function isBattleOcrModel(model: string) {
  return /ocr/i.test(String(model || ""));
}

async function requestBattleCompletion(
  imageBase64: string,
  config: AppConfig,
  prompt: string,
  maxTokens = 2000
): Promise<BattleCompletionResponse> {
  const apiUrl = resolveBattleApiUrl(config.battleApiUrl);
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  if (config.battleApiKey.trim()) {
    headers.Authorization = `Bearer ${config.battleApiKey.trim()}`;
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 120_000);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: config.battleApiModel.trim() || "qwen3.5-9b-vlm",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: `data:image/png;base64,${imageBase64}` } }
            ]
          }
        ],
        max_tokens: maxTokens
      }),
      signal: controller.signal
    });

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      output?: unknown[];
      output_text?: string;
      text?: string;
    };
    const text =
      payload.choices?.[0]?.message?.content ||
      extractResponsesText(payload);

    return {
      status: response.status,
      text: String(text || "")
    };
  } finally {
    window.clearTimeout(timer);
  }
}

function buildErrorState(message: string, previous: BattleRuntimeState, shotPath = previous.shotPath) {
  return {
    ...previous,
    status: "error" as const,
    message,
    shotPath
  };
}

async function requestBattleDurationOnly(imageBase64: string, config: AppConfig) {
  try {
    const result = await requestBattleCompletion(imageBase64, config, buildBattleDurationPrompt(), 64);
    if (/NOT_SETTLEMENT/i.test(String(result.text || ""))) {
      return "";
    }
    return normalizeBattleDuration(extractBattleDurationFromText(result.text) || result.text);
  } catch {
    return "";
  }
}

export async function testBattleApi(config: AppConfig): Promise<BattleApiTestResult> {
  try {
    const capture = await battleCaptureScreenshot();
    const result = await requestBattleCompletion(
      capture.imageBase64,
      config,
      "请只回复OK，用于测试游戏结算识别 API 是否正常响应。",
      64
    );

    await battleUpdateState({
      status: "success",
      message: "结算识别接口测试成功。",
      shotPath: capture.shotPath,
      csvPath: "",
      submittedAt: "",
      reportUrl: config.battleReportUrl
    });

    return {
      ok: true,
      status: result.status,
      text: String(result.text || "").trim().slice(0, 500),
      shotPath: capture.shotPath
    };
  } catch (error) {
    const current = await battleGetState().catch((): BattleRuntimeState => ({
      status: "idle",
      message: "",
      shotPath: "",
      csvPath: "",
      submittedAt: "",
      reportUrl: config.battleReportUrl
    }));
    await battleUpdateState(buildErrorState(`结算识别接口测试失败：${String(error)}`, current));
    return {
      ok: false,
      error: String(error)
    };
  }
}

export async function runBattleSettlementFlow(config: AppConfig): Promise<BattleRunResult> {
  const capture = await battleCaptureScreenshot();

  try {
    const completion = await requestBattleCompletion(
      capture.imageBase64,
      config,
      buildBattlePrompt(),
      2000
    );
    const parsed = isBattleOcrModel(config.battleApiModel)
      ? parseOcrResponse(completion.text)
      : parseBattleResponse(completion.text);

    if (parsed.notSettlement) {
      const current = await battleGetState();
      await battleUpdateState(buildErrorState("当前截图不是游戏结算页面。", current, capture.shotPath));
      return {
        ok: false,
        message: "当前截图不是游戏结算页面。",
        shotPath: capture.shotPath,
        csvPath: "",
        submittedAt: "",
        reportUrl: config.battleReportUrl,
        duplicate: false,
        matched: 0,
        unmatched: 0
      };
    }

    const rows = parseBattleRows(parsed.csvText);
    if (rows.length === 0) {
      const current = await battleGetState();
      await battleUpdateState(buildErrorState("识别结果未通过结算校验，未解析到有效玩家数据。", current, capture.shotPath));
      return {
        ok: false,
        message: "识别结果未通过结算校验，未解析到有效玩家数据。",
        shotPath: capture.shotPath,
        csvPath: "",
        submittedAt: "",
        reportUrl: config.battleReportUrl,
        duplicate: false,
        matched: 0,
        unmatched: 0
      };
    }

    let duration = normalizeBattleDuration(parsed.duration || extractBattleDurationFromText(completion.text));
    if (!duration) {
      duration = await requestBattleDurationOnly(capture.imageBase64, config);
    }

    const csvContent = buildBattleCsv(rows, duration);
    return battleStoreAndSubmit({
      shotPath: capture.shotPath,
      csvContent
    });
  } catch (error) {
    const current = await battleGetState();
    const message = `游戏结算识别失败：${String(error)}`;
    await battleUpdateState(buildErrorState(message, current, capture.shotPath));
    return {
      ok: false,
      message,
      shotPath: capture.shotPath,
      csvPath: "",
      submittedAt: "",
      reportUrl: config.battleReportUrl,
      duplicate: false,
      matched: 0,
      unmatched: 0
    };
  }
}
