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
        const prediction = await replicate.predictions.create({
            version,
            input: { image: base64Image },
        });

        // Esperar a que la predicción termine (polling)
        let status = prediction.status;
        let output = null;
        while (status !== "succeeded" && status !== "failed") {
            await new Promise((r) => setTimeout(r, 1000));
            const updated = await replicate.predictions.get(prediction.id);
            status = updated.status;
            output = updated.output;
            if (status === "failed") throw new Error(updated.error);
        }

        if (status === "succeeded") {
            res.status(200).json({ output });
        } else {
            res.status(500).json({ error: "Prediction failed" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message || "Error interno" });
    }
}
