export type ImportedSignal = {
  text: string;
  source?: string;
  sourceId?: string;
  userKey?: string;
  occurredAt?: string;
  redacted?: boolean;
};

export const CSV_TEMPLATE =
  '\uFEFFtext,source,sourceId,userKey,occurredAt,redacted\r\n"希望能在手机上快速查看项目进展",用户访谈,interview-001,anonymous-001,2026-10-19T08:00:00+08:00,true\r\n';

const HEADERS: Record<string, keyof ImportedSignal> = {
  text: "text",
  source: "source",
  sourceId: "sourceId",
  userKey: "userKey",
  occurredAt: "occurredAt",
  redacted: "redacted",
  created_at: "occurredAt",
  author_type: "source",
  user_key: "userKey",
  正文: "text",
  来源: "source",
  来源ID: "sourceId",
  用户标识: "userKey",
  发生时间: "occurredAt",
  已脱敏: "redacted",
};

/** Parse CSV records without splitting quoted fields on commas or line breaks. */
function csvRows(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let state: "start" | "plain" | "quoted" | "closed" = "start";
  let recordStarted = false;
  let line = 1;
  const endField = () => {
    row.push(field);
    field = "";
    state = "start";
  };

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (state === "quoted") {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          state = "closed";
        }
      } else {
        field += char;
        if (char === "\n" || (char === "\r" && input[i + 1] !== "\n")) line += 1;
      }
      continue;
    }

    if (char === ",") {
      endField();
      recordStarted = true;
    } else if (char === "\n" || char === "\r") {
      endField();
      rows.push(row);
      row = [];
      recordStarted = false;
      if (char === "\r" && input[i + 1] === "\n") i += 1;
      line += 1;
    } else if (char === '"' && state === "start") {
      state = "quoted";
      recordStarted = true;
    } else if (state === "closed") {
      throw new Error(`CSV 第 ${line} 行的引号结束后只能有逗号或换行。`);
    } else if (char === '"') {
      throw new Error(`CSV 第 ${line} 行包含未转义的引号，请用双引号包裹整个字段，并将内部引号写为两个双引号。`);
    } else {
      field += char;
      state = "plain";
      recordStarted = true;
    }
  }

  if (state === "quoted") throw new Error("CSV 存在未闭合的双引号，请检查文件内容。");
  if (recordStarted || row.length > 0) {
    endField();
    rows.push(row);
  }
  return rows;
}

function validateItem(item: unknown, index: number): ImportedSignal {
  const prefix = `第 ${index + 1} 条反馈`;
  if (item === null || typeof item !== "object" || Array.isArray(item)) {
    throw new Error(`${prefix}必须是对象。`);
  }
  const value = item as Record<string, unknown>;
  if (typeof value.text !== "string" || !value.text.trim()) {
    throw new Error(`${prefix}的 text（正文）必须是非空字符串。`);
  }
  const result: ImportedSignal = { text: value.text.trim() };
  for (const key of ["source", "sourceId", "userKey", "occurredAt"] as const) {
    if (value[key] === undefined) continue;
    if (typeof value[key] !== "string") throw new Error(`${prefix}的 ${key} 必须是字符串。`);
    const cleaned = value[key].trim();
    if (cleaned) result[key] = cleaned;
  }
  if (value.redacted !== undefined) {
    if (typeof value.redacted !== "boolean") throw new Error(`${prefix}的 redacted 必须是布尔值 true 或 false。`);
    result.redacted = value.redacted;
  }
  return result;
}

/** All records are validated before return; callers can import atomically. */
export function parseSignals(input: string): ImportedSignal[] {
  if (typeof input !== "string" || !input.trim()) throw new Error("导入内容为空，请选择 CSV 或 JSON 文件。");
  const clean = input.replace(/^\uFEFF/, "");

  if (/^\s*[\[{]/.test(clean)) {
    let json: unknown;
    try {
      json = JSON.parse(clean);
    } catch {
      throw new Error("JSON 格式错误，请检查引号、逗号和括号是否完整。");
    }
    const records = Array.isArray(json)
      ? json
      : json !== null && typeof json === "object"
        ? (json as Record<string, unknown>).items
        : undefined;
    if (!Array.isArray(records)) throw new Error('JSON 须为反馈数组，或包含 items 数组的对象，例如 {"items":[{"text":"反馈正文"}]}。');
    if (records.length === 0) throw new Error("JSON 反馈数组为空，请至少提供一条反馈。");
    return records.map(validateItem);
  }

  const rows = csvRows(clean);
  if (rows.length === 0) throw new Error("CSV 内容为空。");
  const seen = new Set<string>();
  const headers = rows[0].map((header) => {
    const name = header.trim();
    const key = Object.prototype.hasOwnProperty.call(HEADERS, name) ? HEADERS[name] : undefined;
    if (!key) throw new Error(`CSV 包含不支持的表头「${name || "空表头"}」，请使用下载的模板。`);
    if (seen.has(key)) throw new Error(`CSV 表头「${name}」重复，请每个字段只保留一列。`);
    seen.add(key);
    return key;
  });
  if (!seen.has("text")) throw new Error("CSV 缺少 text（正文）表头。");
  if (rows.length === 1) throw new Error("CSV 只有表头，请至少提供一条反馈。");

  return rows.slice(1).map((row, index) => {
    if (row.length !== headers.length) {
      throw new Error(`第 ${index + 1} 条反馈的列数为 ${row.length}，与表头的 ${headers.length} 列不一致；正文中的逗号请放在双引号内。`);
    }
    const item: Record<string, unknown> = {};
    headers.forEach((key, column) => {
      const value = row[column].trim();
      if (key === "redacted") {
        if (!value) return;
        if (["true", "1", "是"].includes(value.toLowerCase())) item[key] = true;
        else if (["false", "0", "否"].includes(value.toLowerCase())) item[key] = false;
        else throw new Error(`第 ${index + 1} 条反馈的 redacted 请填写 true 或 false。`);
      } else {
        item[key] = value;
      }
    });
    return validateItem(item, index);
  });
}
