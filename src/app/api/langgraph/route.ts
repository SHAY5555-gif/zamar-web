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
    const { thread_id, message, assistant_id = "cerebras_zamar" } = await request.json();

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
            const lastMessage = data.messages[data.messages.length - 1];
            if (lastMessage?.type === "ai" && lastMessage?.content) {
              lastAIMessage = lastMessage.content;
            }
          }
        } catch {
          // Skip invalid JSON lines
        }
      }
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
