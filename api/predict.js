import Replicate from "replicate";
import { put, del } from "@vercel/blob";
import { v4 as uuidv4 } from "uuid";

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Only POST allowed" });
    }

    const { base64Image, version } = req.body;

    if (!base64Image || !version) {
        return res.status(400).json({ error: "Missing image or model version" });
    }

    let fileName = null;

    try {
        // Convert base64 to buffer
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        console.log("Tamaño del buffer:", buffer.length, "bytes");

        // Upload to Vercel Blob
        fileName = `uploads/${uuidv4()}.png`;
        const { url: imageUrl } = await put(fileName, buffer, {
            access: "public",
            token: process.env.BLOB_READ_WRITE_TOKEN,
        });

        // Run prediction with the image URL
        const prediction = await replicate.run(version, {
            input: { image: imageUrl },
        });

        res.status(200).json({ output: prediction });
    } catch (err) {
        console.error("Error durante la predicción:", err);
        res.status(500).json({ error: err.message || "Prediction error" });
    } finally {
        // Intentar eliminar el blob si se subió
        if (fileName) {
            try {
                await del(fileName, {
                    token: process.env.BLOB_READ_WRITE_TOKEN,
                });
                console.log("Archivo eliminado del blob:", fileName);
            } catch (deleteError) {
                console.warn("Error al eliminar el archivo del blob:", deleteError.message);
            }
        }
    }
}
