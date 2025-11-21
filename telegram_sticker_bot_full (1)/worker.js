export default {
  async fetch(request, env) {
    if (request.method === "POST") {
      try {
        const update = await request.json();

        if (!update.message) {
          return new Response("No message", { status: 200 });
        }

        const chatId = update.message.chat.id;

        // FEATURE 1: If photo → convert to sticker
        if (update.message.photo) {
          const fileId =
            update.message.photo[update.message.photo.length - 1].file_id;

          const getFile = await fetch(
            `https://api.telegram.org/bot${env.BOT_TOKEN}/getFile?file_id=${fileId}`
          );
          const fileJson = await getFile.json();
          const filePath = fileJson.result.file_path;

          const fileUrl = `https://api.telegram.org/file/bot${env.BOT_TOKEN}/${filePath}`;

          // Convert to WEBP using Cloudflare Image Resizing
          const webpImage = await fetch(fileUrl, {
            cf: {
              image: {
                format: "webp",
                quality: 90,
                width: 512,
                height: 512
              }
            }
          });

          const stickerBuffer = await webpImage.arrayBuffer();
          const form = new FormData();
          form.append("chat_id", chatId);
          form.append("sticker", new Blob([stickerBuffer], { type: "image/webp" }), "sticker.webp");

          await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendSticker`, {
            method: "POST",
            body: form
          });

          return new Response("Sticker sent", { status: 200 });
        }

        // Feature 2: Text response
        if (update.message.text) {
          const text = update.message.text;

          await fetch(
            `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: chatId,
                text: "Kirim foto untuk dijadikan stiker 😊"
              })
            }
          );
        }

        return new Response("OK", { status: 200 });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.toString() }), {
          status: 500
        });
      }
    }

    return new Response("Bot is running.");
  }
};
