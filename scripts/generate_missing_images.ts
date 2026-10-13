import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const geminiKey = process.env.GEMINI_API_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);
const ai = new GoogleGenAI({ apiKey: geminiKey });

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateMissingImages() {
  console.log("Fetching products missing images...");
  const { data: produtos, error } = await supabase
    .from("produtos")
    .select("id, nome, imagem_url")
    .is("imagem_url", null);

  if (error) {
    console.error("Error fetching products:", error);
    return;
  }

  if (!produtos || produtos.length === 0) {
    console.log("All products have images!");
    return;
  }

  console.log(`Found ${produtos.length} products without images. Proceeding to generate in the background...`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < produtos.length; i++) {
    const p = produtos[i];
    console.log(`[${i + 1}/${produtos.length}] Generating image for: ${p.nome}...`);

    let retries = 3;
    let success = false;

    while (retries > 0 && !success) {
      try {
        // 1. Generate image using Gemini
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-image",
          contents: {
            parts: [{ text: `A high quality, extremely realistic photograph of a supermarket product: ${p.nome}. Clean studio lighting, completely plain bright white background.` }]
          }
        });

        const parts = response.candidates?.[0]?.content?.parts;
        if (!parts) throw new Error("No parts in response");

        let base64Data = null;
        for (const part of parts) {
          if (part.inlineData) {
            base64Data = part.inlineData.data;
            break;
          }
        }

        if (!base64Data) throw new Error("No inlineData (image) found in response");

        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `produtos/${p.id}.png`;

        // 2. Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from("uploads")
          .upload(filename, buffer, { contentType: "image/png", upsert: true });
          
        if (uploadError) throw new Error(`Supabase upload error: ${uploadError.message}`);

        // 3. Get Public URL and update product
        const { data: publicData } = supabase.storage.from("uploads").getPublicUrl(filename);
        
        const { error: updateError } = await supabase
          .from("produtos")
          .update({ imagem_url: publicData.publicUrl })
          .eq("id", p.id);

        if (updateError) throw new Error(`Product update error: ${updateError.message}`);

        console.log(` -> Success! Uploaded to ${publicData.publicUrl}`);
        successCount++;
        success = true;

      } catch (e: any) {
        console.error(` -> Failed to generate/upload for ${p.nome} (Retries left: ${retries - 1}): ${e.message}`);
        
        if (e.message.includes("429") || e.message.includes("quota")) {
          console.log(" -> Hit rate limit or quota. Waiting 30 seconds before retrying...");
          await sleep(30000); // wait 30 seconds on rate limit
        } else {
          await sleep(5000); // wait 5 seconds for other errors
        }
        retries--;
      }
    }

    if (!success) {
      failCount++;
      console.log(` -> Giving up on ${p.nome} after 3 retries.`);
    }

    // Delay between normal requests to be nice to the API (since generation already takes ~20s, 2s is fine)
    await sleep(2000);
  }

  console.log(`Finished generation task. Success: ${successCount}, Failed/Skipped: ${failCount}`);
}

generateMissingImages();
