import { NextRequest, NextResponse } from "next/server";

const LANGGRAPH_URL = "https://deepagents-langgraph-production.up.railway.app";
const LANGGRAPH_API_KEY = "demo-token";

// Create a new thread
export async function GET() {
  try {
    const response = await fetch(`${LANGGRAPH_URL}/threads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": LANGGRAPH_API_KEY,
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error("Failed to create thread");
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("LangGraph thread creation error:", error);
    return NextResponse.json(
      { error: "Failed to create thread" },
      { status: 500 }
    );
  }
}

// Send message to thread (streaming)
export async function POST(request: NextRequest) {
  try {
    const { thread_id, message, assistant_id = "genius_lyrics" } = await request.json();

    if (!thread_id || !message) {
      return NextResponse.json(
        { error: "Missing thread_id or message" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${LANGGRAPH_URL}/threads/${thread_id}/runs/stream`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": LANGGRAPH_API_KEY,
        },
        body: JSON.stringify({
          input: {
            messages: [
              {
                type: "human",
                content: message,
              },
            ],
          },
          assistant_id,
          stream_mode: ["values"],
          config: {
            recursion_limit: 100,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to send message");
    }

    // Return the streamed response
    const text = await response.text();

    // Parse the SSE events to get the final message
    const lines = text.split("\n");
    let lastAIMessage = "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.messages && Array.isArray(data.messages)) {
            // Look for the last AI/assistant message with actual content
            for (let i = data.messages.length - 1; i >= 0; i--) {
              const msg = data.messages[i];
              // Check various AI message formats
              const isAI = msg?.type === "ai" ||
                          msg?.type === "AIMessage" ||
                          msg?.role === "assistant" ||
                          msg?.type?.toLowerCase?.() === "ai";

              // Skip messages that are tool calls (intermediate messages)
              const hasToolCalls = msg?.tool_calls && msg.tool_calls.length > 0;

              // Check for content in various places:
              // 1. Direct content field
              // 2. additional_kwargs.reasoning (used by some models)
              const directContent = msg?.content && msg.content.trim().length > 0 ? msg.content : null;
              const reasoningContent = msg?.additional_kwargs?.reasoning &&
                                       msg.additional_kwargs.reasoning.trim().length > 0
                                       ? msg.additional_kwargs.reasoning : null;
              const messageContent = directContent || reasoningContent;

              if (isAI && messageContent && !hasToolCalls) {
                lastAIMessage = messageContent;
                break;
              }

              // Also check tool messages for lyrics JSON (fallback)
              if (msg?.type === "tool" && msg?.content && msg.content.includes('"lyrics"')) {
                lastAIMessage = msg.content;
                // Don't break - prefer AI message if found later
              }
            }
          }
        } catch {
          // Skip invalid JSON lines
        }
      }
    }

    // Log for debugging if no message found
    if (!lastAIMessage) {
      console.log("LangGraph raw response (no AI message found):", text.slice(0, 2000));
    }

    return NextResponse.json({
      message: lastAIMessage,
      raw: text
    });
  } catch (error) {
    console.error("LangGraph message error:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
