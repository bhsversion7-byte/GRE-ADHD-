import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type ImageRequest = {
  word?: string;
  meaning?: string;
  prompt?: string;
  scene?: string;
};

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "OPENAI_API_KEY is not configured. Add it to .env.local to enable real image generation.",
      },
      { status: 503 },
    );
  }

  const body = (await request.json()) as ImageRequest;
  const word = String(body.word ?? "").trim();
  const meaning = String(body.meaning ?? "").trim();
  const scene = String(body.scene ?? "").trim();
  const prompt = String(body.prompt ?? "").trim();

  if (!word || !meaning) {
    return NextResponse.json(
      { error: "word and meaning are required." },
      { status: 400 },
    );
  }

  const finalPrompt = [
    "Create a polished GRE vocabulary memory illustration.",
    "Style: premium editorial learning-card illustration, calm but vivid, no text, no labels, no watermark.",
    "Composition: one clear central visual metaphor, high contrast subject, soft off-white background, suitable for a study app card.",
    `Word: ${word}`,
    `Meaning in Chinese: ${meaning}`,
    scene ? `Memory scene: ${scene}` : "",
    prompt ? `Additional prompt: ${prompt}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt: finalPrompt,
      size: "1024x1024",
      output_format: "png",
      background: "opaque",
    }),
  });

  const result = (await response.json()) as {
    data?: Array<{ b64_json?: string; url?: string }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    return NextResponse.json(
      { error: result.error?.message ?? "OpenAI image generation failed." },
      { status: response.status },
    );
  }

  const b64 = result.data?.[0]?.b64_json;
  const url = result.data?.[0]?.url;

  if (b64) {
    return NextResponse.json({ dataUrl: `data:image/png;base64,${b64}` });
  }

  if (url) {
    return NextResponse.json({ dataUrl: url });
  }

  return NextResponse.json(
    { error: "The image API returned no image." },
    { status: 502 },
  );
}
