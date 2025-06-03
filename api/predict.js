import Replicate from "replicate";

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Only POST allowed" });
    }

    if (!process.env.REPLICATE_API_TOKEN) {
        return res.status(500).json({ error: "No API token configured" });
    }

    const { base64Image, version } = req.body;

    try {
        const output = await replicate.run(version, {
            input: {
                image: base64Image,
            },
        });

        res.status(200).json({ output });
    } catch (error) {
        console.error("Prediction error:", error);
        res.status(500).json({ error: error.message || "Error interno" });
    }
}
