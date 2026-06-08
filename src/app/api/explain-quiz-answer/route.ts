import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type BlankPayload = {
  id: string;
  label: string;
  choices: Array<{ key: string; word: string }>;
  answerKeys?: string[];
};

type ReadingPayload = {
  passageText: string;
  question: string;
  choices: Array<{ key: string; text: string }>;
  answerKeys: string[];
  selectedKeys?: string[];
  correct?: boolean;
};

type ExplainRequest = {
  prompt?: string;
  type?: string;
  blanks?: BlankPayload[];
  placements?: Record<string, string[]>;
  correct?: boolean;
  reading?: ReadingPayload;
};

function fallbackExplanation(body: ExplainRequest) {
  if (body.reading) {
    const answer = body.reading.answerKeys.join("/") || "对应选项";
    return `这题要先用题干定位原文，再检查选项是否完整贴合原文范围和作者语气。正确答案是 ${answer}；错选通常来自把局部信息扩大成全文结论，或忽略限定词。`;
  }

  const blanks = body.blanks ?? [];
  const answerParts = blanks.map((blank) => {
    const words = blank.choices
      .filter((choice) => blank.answerKeys?.includes(choice.key))
      .map((choice) => choice.word);
    return `${blank.label} 选 ${words.join(" / ") || "对应答案"}`;
  });
  return `这题要先看句子逻辑、空格前后的评价方向和转折/并列关系。正确答案是 ${answerParts.join("；")}。如果选错，通常是只看局部词义，没有把整句关系一起判断。`;
}

function extractResponseText(result: unknown): string {
  if (
    typeof result === "object" &&
    result &&
    "output_text" in result &&
    typeof (result as { output_text?: unknown }).output_text === "string"
  ) {
    return (result as { output_text: string }).output_text;
  }

  const output = (result as { output?: Array<{ content?: Array<unknown> }> })
    ?.output;
  if (!Array.isArray(output)) return "";
  return output
    .flatMap((item) => item.content ?? [])
    .map((content) => {
      if (
        typeof content === "object" &&
        content &&
        "text" in content &&
        typeof (content as { text?: unknown }).text === "string"
      ) {
        return (content as { text: string }).text;
      }
      return "";
    })
    .join("")
    .trim();
}

function buildFillSummary(body: ExplainRequest) {
  return (body.blanks ?? [])
    .map((blank) => {
      const choices = blank.choices
        .map((choice) => `${choice.key}. ${choice.word}`)
        .join(", ");
      const answers = (blank.answerKeys ?? []).join("/");
      const selected = (body.placements?.[blank.id] ?? []).join("/") || "未选";
      return `${blank.label}: choices=[${choices}], correct=${answers}, user=${selected}`;
    })
    .join("\n");
}

function buildMessages(body: ExplainRequest) {
  if (body.reading) {
    const reading = body.reading;
    const choices = reading.choices
      .map((choice) => `${choice.key}. ${choice.text}`)
      .join("\n");
    return [
      {
        role: "developer",
        content:
          "You are a GRE reading tutor. Explain in concise Chinese. Do not mention answer sources. Use the passage evidence, question task, option elimination, and why the correct answer fits. Keep it 120-180 Chinese characters.",
      },
      {
        role: "user",
        content: `Passage:\n${reading.passageText}\n\nQuestion:\n${reading.question}\n\nChoices:\n${choices}\n\nCorrect answer: ${reading.answerKeys.join("/")}\nUser answer: ${(reading.selectedKeys ?? []).join("/") || "未选"}\nUser correct: ${reading.correct ? "yes" : "no"}\n请生成一段精准解析。`,
      },
    ];
  }

  return [
    {
      role: "developer",
      content:
        "You are a GRE verbal tutor. Explain text completion and sentence equivalence questions in concise Chinese. Do not mention answer sources. Do not say you are an AI. Focus on sentence logic, contrast/support markers, tone, and why the correct option fits. Keep it 90-150 Chinese characters.",
    },
    {
      role: "user",
      content: `题型：${body.type ?? "GRE verbal"}\n题干：${body.prompt}\n选项和答案：\n${buildFillSummary(body)}\n用户是否答对：${body.correct ? "是" : "否"}\n请生成解析。`,
    },
  ];
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as ExplainRequest;
  const apiKey = process.env.OPENAI_API_KEY;
  const hasFillPayload = Boolean(body.prompt && body.blanks?.length);
  const hasReadingPayload = Boolean(body.reading?.passageText && body.reading.question);

  if (!hasFillPayload && !hasReadingPayload) {
    return NextResponse.json(
      { error: "fill or reading payload is required" },
      { status: 400 },
    );
  }

  if (!apiKey) {
    return NextResponse.json({ explanation: fallbackExplanation(body) });
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_TEXT_MODEL ?? "gpt-4.1-mini",
      input: buildMessages(body),
      max_output_tokens: body.reading ? 360 : 260,
    }),
  });

  const result = await response.json();
  if (!response.ok) {
    return NextResponse.json({ explanation: fallbackExplanation(body) });
  }

  const explanation = extractResponseText(result) || fallbackExplanation(body);
  return NextResponse.json({ explanation });
}
