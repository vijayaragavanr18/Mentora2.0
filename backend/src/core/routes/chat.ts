import { handleAsk } from "../../lib/ai/ask";
import { parseMultipart, handleUpload } from "../../lib/parser/upload";
import {
  mkChat,
  getChat,
  addMsg,
  listChats,
  getMsgs,
} from "../../utils/chat/chat";
import { emitToAll } from "../../utils/chat/ws";

type UpFile = { path: string; filename: string; mimeType: string };

const chatSockets = new Map<string, Set<any>>();

/**
 * Chat routes - Ollama-optimized for deployment
 * Handles real-time chat with WebSocket streaming
 */
export function chatRoutes(app: any) {
  // Health check endpoint for monitoring
  app.get("/health", (_req: any, res: any) => {
    res.json({
      status: "ok",
      provider: "ollama",
      timestamp: Date.now()
    });
  });

  // WebSocket endpoint for real-time chat streaming
  app.ws("/ws/chat", (ws: any, req: any) => {
    const url = new URL(req.url, "http://localhost");
    const chatId = url.searchParams.get("chatId");

    if (!chatId) {
      console.warn('[WebSocket] Connection rejected: chatId required');
      return ws.close(1008, "chatId required");
    }

    let set = chatSockets.get(chatId);
    if (!set) {
      set = new Set();
      chatSockets.set(chatId, set);
    }
    set.add(ws);

    console.log(`[WebSocket] Client connected to chat ${chatId}`);

    ws.on("close", (code: number, reason: string) => {
      set!.delete(ws);
      if (set!.size === 0) chatSockets.delete(chatId);
      console.log(`[WebSocket] Client disconnected from chat ${chatId}`);
    });

    ws.send(JSON.stringify({ type: "ready", chatId }));
  });

  // Main chat endpoint - handles text and file uploads
  app.post("/chat", async (req: any, res: any, next: any) => {
    const requestStartTime = Date.now();
    const REQUEST_TIMEOUT = 180000; // 3 minutes max

    try {
      const ct = String(req.headers["content-type"] || "");
      const isMp = ct.includes("multipart/form-data");

      let q = "";
      let chatId: string | undefined;
      let files: UpFile[] = [];

      // Parse request body (multipart or JSON)
      if (isMp) {
        console.log('[Chat] Parsing multipart form data...');
        const { q: mq, chatId: mcid, files: mf } = await parseMultipart(req);
        q = mq;
        chatId = mcid;
        files = mf || [];
        if (!q) {
          console.warn('[Chat] Multipart request missing query');
          return res.status(400).json({ ok: false, error: "q required for file uploads" });
        }
        console.log(`[Chat] Parsed ${files.length} file(s)`);
      } else {
        // Parse JSON body - already parsed by express.json() middleware
        q = req.body?.q || "";
        chatId = req.body?.chatId;

        if (!q) {
          console.warn('[Chat] Request missing query');
          return res.status(400).json({ ok: false, error: "q required" });
        }
      }

      // Get or create chat
      let chat = chatId ? await getChat(chatId) : undefined;
      if (!chat) {
        console.log('[Chat] Creating new chat...');
        chat = await mkChat(q);
      }
      const id = chat.id;
      const ns = `chat:${id}`;

      console.log(`[Chat] Processing request for chat ${id}`);
      console.log(`[Chat] Query: "${q.slice(0, 100)}${q.length > 100 ? '...' : ''}"`);

      // Send 202 Accepted - processing asynchronously
      res
        .status(202)
        .json({ ok: true, chatId: id, stream: `/ws/chat?chatId=${id}` });

      // Process chat asynchronously with comprehensive error handling
      (async () => {
        let processingComplete = false;
        let timeoutHandle: NodeJS.Timeout | null = null;
        const asyncStartTime = Date.now();

        // Set timeout to prevent infinite hanging
        timeoutHandle = setTimeout(() => {
          if (!processingComplete) {
            processingComplete = true;
            const elapsed = Date.now() - asyncStartTime;
            console.error(`[Chat] Request timeout for chat ${id} after ${elapsed}ms`);
            emitToAll(chatSockets.get(id), {
              type: "error",
              error: "Request timeout. The Ollama model may be loading or overloaded. Please wait and try again."
            });
          }
        }, REQUEST_TIMEOUT);

        try {
          // Handle file uploads if present
          if (isMp && files.length > 0) {
            console.log(`[Chat] Processing ${files.length} file upload(s)...`);
            emitToAll(chatSockets.get(id), {
              type: "phase",
              value: "upload_start",
            });

            for (const f of files) {
              console.log(`[Chat] Uploading file: ${f.filename} (${f.mimeType})`);
              emitToAll(chatSockets.get(id), {
                type: "file",
                filename: f.filename,
                mime: f.mimeType,
              });
              await handleUpload({
                filePath: f.path,
                filename: f.filename,
                contentType: f.mimeType,
                namespace: ns,
              });
            }

            emitToAll(chatSockets.get(id), {
              type: "phase",
              value: "upload_done",
            });
            console.log('[Chat] File uploads completed');
          }

          // Add user message to chat history
          await addMsg(id, { role: "user", content: q, at: Date.now() });

          emitToAll(chatSockets.get(id), {
            type: "phase",
            value: "generating",
          });

          // Get recent message history (last 20 messages)
          const msgHistory = await getMsgs(id);
          const relevantHistory = msgHistory.slice(-20);

          console.log(`[Chat] Calling Ollama LLM for chat ${id}...`);
          console.log(`[Chat] Message history: ${relevantHistory.length} messages`);

          const llmStartTime = Date.now();

          // Call LLM with timeout protection
          const answer = await Promise.race([
            handleAsk({
              q,
              namespace: ns,
              history: relevantHistory,
            }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('LLM call timeout after 150s')), 150000)
            )
          ]);

          const llmDuration = Date.now() - llmStartTime;
          const totalDuration = Date.now() - requestStartTime;

          console.log(`[Chat] LLM responded in ${llmDuration}ms`);
          console.log(`[Chat] Total request duration: ${totalDuration}ms`);

          // Save assistant response
          await addMsg(id, {
            role: "assistant",
            content: answer,
            at: Date.now(),
          });

          // Send response to client
          emitToAll(chatSockets.get(id), { type: "answer", answer });
          emitToAll(chatSockets.get(id), { type: "done" });

          processingComplete = true;
          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
            timeoutHandle = null;
          }

          console.log(`[Chat] Successfully completed chat ${id}`);
        } catch (err: any) {
          processingComplete = true;
          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
            timeoutHandle = null;
          }

          const msg = err?.message || "Processing failed";
          const stack = err?.stack || String(err);

          console.error(`[Chat] Error processing chat ${id}:`, msg);
          console.error('[Chat] Stack trace:', stack);

          // Send appropriate error message to client
          let errorMessage = msg;
          if (msg.includes('timeout')) {
            errorMessage = 'Request timed out. Try using a smaller Ollama model or increase timeout settings.';
          } else if (msg.includes('ECONNREFUSED')) {
            errorMessage = 'Cannot connect to Ollama. Please ensure Ollama is running at ' + (process.env.OLLAMA_BASE_URL || 'http://localhost:11434');
          } else if (msg.includes('model')) {
            errorMessage = 'Model error. Please check that the Ollama model is installed and available.';
          }

          emitToAll(chatSockets.get(id), {
            type: "error",
            error: errorMessage
          });
        }
      })().catch((e: any) => {
        console.error("[Chat] Unexpected error in async runner:", e?.message || e);
        console.error(e?.stack);
      });
    } catch (e: any) {
      const errorMsg = e?.message || String(e);
      console.error("[Chat] Error in request handler:", errorMsg, e?.stack);
      next(e);
    }
  });

  // Get list of all chats
  app.get("/chats", async (_: any, res: any) => {
    try {
      console.log('[Chat] Fetching chat list...');
      const chats = await listChats();
      console.log(`[Chat] Retrieved ${chats.length} chat(s)`);
      res.json({ ok: true, chats });
    } catch (e: any) {
      console.error('[Chat] Error listing chats:', e?.message || e);
      res.status(500).json({ ok: false, error: 'Failed to list chats' });
    }
  });

  // Get specific chat with messages
  app.get("/chats/:id", async (req: any, res: any) => {
    try {
      const id = req.params.id;
      console.log(`[Chat] Fetching chat ${id}...`);

      const chat = await getChat(id);
      if (!chat) {
        console.warn(`[Chat] Chat ${id} not found`);
        return res.status(404).json({ ok: false, error: "Chat not found" });
      }

      const messages = await getMsgs(id);
      console.log(`[Chat] Retrieved chat ${id} with ${messages.length} message(s)`);

      res.json({ ok: true, chat, messages });
    } catch (e: any) {
      console.error(`[Chat] Error fetching chat:`, e?.message || e);
      res.status(500).json({ ok: false, error: 'Failed to fetch chat' });
    }
  });
}
