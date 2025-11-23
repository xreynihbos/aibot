export default {
  async fetch(request, env) {
    if (request.method === "POST") {
      try {
        const update = await request.json();
        console.log("Update received:", JSON.stringify(update));

        // ===== Handle text messages =====
        if (update.message && update.message.text) {
          const chatId = update.message.chat.id;
          const prompt = update.message.text;

          // Balas sementara
          await sendMessage(chatId, "⏳ Prompt diterima ✅", env);

          // Tambah ke queue
          addToQueue({ chatId, prompt, env });

          // Kirim tombol inline
          await sendMessage(chatId, `Prompt: <b>${prompt}</b>`, env, generateButtons(prompt));
        }

        // ===== Handle callback buttons =====
        if (update.callback_query) {
          const [action, prompt] = update.callback_query.data.split("|");
          const chatId = update.callback_query.message.chat.id;

          if (action === "retry") {
            await sendMessage(chatId, "🔁 Mengulang... masuk antrean lagi.", env);
            addToQueue({ chatId, prompt, env });
          }
        }

        return new Response("OK");
      } catch (err) {
        console.error(err);
        return new Response("Error processing update", { status: 500 });
      }
    }

    return new Response("Worker is running");
  }
};

// ===== Queue system =====
const queue = [];
let isProcessing = false;

function addToQueue(task) {
  queue.push(task);
  processQueue();
}

async function processQueue() {
  if (isProcessing || queue.length === 0) return;

  isProcessing = true;
  const task = queue.shift();

  try {
    const imgArrayBuffer = await generateImage(task.prompt, task.env);
    await sendPhoto(task.chatId, imgArrayBuffer, `Prompt: ${task.prompt}`, task.env);
  } catch (err) {
    console.error(err);
    await sendMessage(task.chatId, `❌ Gagal generate gambar: ${err.message}`, task.env);
  }

  isProcessing = false;
  setTimeout(processQueue, 500);
}

// ===== Functions =====
async function sendMessage(chatId, text, env, extra = {}) {
  return fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: "HTML", ...extra })
  });
}

async function sendPhoto(chatId, arrayBuffer, caption, env) {
  const formData = new FormData();
  formData.append("chat_id", chatId);
  formData.append("caption", caption);
  formData.append("photo", new Blob([arrayBuffer]), "image.png");

  return fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendPhoto`, {
    method: "POST",
    body: formData
  });
}

// ===== Generate image using router HF (rupeshs/LCM-runwayml-stable-diffusion-v1-5) =====
async function generateImage(prompt, env) {
  const res = await fetch("https://router.huggingface.co/v1/models/rupeshs/LCM-runwayml-stable-diffusion-v1-5", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.HF_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      inputs: prompt,
      options: { wait_for_model: true }
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HF fetch failed: ${text}`);
  }

  const json = await res.json();

  if (!json.data || !json.data[0] || !json.data[0].image) {
    throw new Error("HF response invalid: no image data");
  }

  const base64 = json.data[0].image;
  const binary = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  return binary.buffer;
}

// ===== Inline button =====
function generateButtons(prompt) {
  return {
    reply_markup: {
      inline_keyboard: [[{ text: "🔄 Ulangi", callback_data: `retry|${prompt}` }]]
    }
  };
}
