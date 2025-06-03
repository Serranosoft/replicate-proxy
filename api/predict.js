import Replicate from "replicate";
import { put } from "@vercel/blob";
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

    try {
        // Convert base64 to buffer
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        // Upload to Vercel Blob
        const fileName = `uploads/${uuidv4()}.png`;
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
        console.error(err);
        res.status(500).json({ error: err.message || "Prediction error" });
    }
}
