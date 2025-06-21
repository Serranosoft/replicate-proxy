import Replicate from "replicate";
import { put, del } from "@vercel/blob";
import { v4 as uuidv4 } from "uuid";
import formidable from "formidable";
import fs from "fs";

export const config = {
    api: {
        bodyParser: false, // Necesario para manejar multipart/form-data
    },
};

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Only POST allowed" });
    }

    // Parsear el formulario
    const form = formidable();

    form.parse(req, async (err, fields, files) => {
        if (err) {
            console.error("Error al parsear el formulario:", err);
            return res.status(400).json({ error: "Form parsing error" });
        }

        const imageFile = files.image;

        if (!imageFile) {
            return res.status(400).json({ error: "Image file is missing" });
        }

        let fileName = null;

        try {
            // Leer el archivo recibido como buffer
            const buffer = fs.readFileSync(imageFile[0].filepath); // usar [0] si es un array

            console.log("Tamaño del buffer:", buffer.length, "bytes");

            // Subir a Vercel Blob
            fileName = `uploads/${uuidv4()}.png`;
            const { url: imageUrl } = await put(fileName, buffer, {
                access: "public",
                token: process.env.BLOB_READ_WRITE_TOKEN,
            });

            // Ejecutar PHOTO ENHANCER
            const prediction = await replicate.predictions.create({
                version: "0fbacf7afc6c144e5be9767cff80f25aff23e52b0708f17e20f9879b2f21516c",
                input: { img: imageUrl },
            });


            let result = prediction;
            while (
                result.status !== "succeeded" &&
                result.status !== "failed" &&
                result.status !== "canceled"
            ) {
                await new Promise((resolve) => setTimeout(resolve, 500));
                result = await replicate.predictions.get(result.id);
            }

            if (result.status === "succeeded") {
                console.log("Resultado recibido:", result.output);
                res.status(200).json({ output: result.output });
            } else {
                console.error("Error en la predicción:", result.error);
                res.status(500).json({ error: result.error || "Prediction failed" });
            }
        } catch (err) {
            console.error("Error durante la predicción:", err);
            res.status(500).json({ error: err.message || "Prediction error" });
        } finally {
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
    });
}
