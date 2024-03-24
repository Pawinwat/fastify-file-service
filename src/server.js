// Import the framework and instantiate it
import Fastify from "fastify";
import pg from "@fastify/postgres";
import multer from "fastify-multer";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();
const fastify = Fastify({
  logger: true,
});
fastify.register(pg, {
  connectionString: `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/${process.env.DB_DATABASE}`,
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const ext = file.originalname.split(".").pop(); 
    cb(null, `${file.fieldname}-${Date.now()}.${ext}`);
  },
});

const upload = multer({ storage: storage });
fastify.register(upload.contentParser);

fastify.get("/files/:id", async (request, reply) => {
  try {
    const fileId = request.params.id;
    const result = await fastify.pg.query("SELECT * FROM files WHERE id = $1", [
      fileId,
    ]);
    if (result.rows.length === 0) {
      return reply.code(404).send({ error: "File not found" });
    }
    return reply.code(200).send(result.rows[0]);
  } catch (error) {
    console.error("Error retrieving file:", error);
    return reply.code(500).send({ error: "Error retrieving file" });
  }
});

fastify.post(
  "/files",
  { preHandler: upload.single("files") },
  async (request, reply) => {
    try {
      const { filename, mimetype, size } = request.file;
      const fileExtension = filename.split(".").pop();
      const fileId = uuidv4();
      const filenameDisk = `${fileId}.${fileExtension}`;
      const uploadedOn = new Date().toISOString();
      await fastify.pg.query(
        `INSERT INTO files (
          id,
          filename_disk,
          filename_download,
          type,
          filesize,
          uploaded_on,
          storage,
          title,
          width,
          height,
          focal_point_x,
          focal_point_y,
          duration,
          description,
          location,
          tags,
          metadata
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
        )`,
        [
          fileId,
          filename,
          filename, // Use filename as filename_download by default
          mimetype,
          size,
          uploadedOn,
          "disk", // Provide storage adapter value
          null, // Provide title if available
          null, // Provide width if available
          null, // Provide height if available
          null, // Provide focal_point_x if available
          null, // Provide focal_point_y if available
          null, // Provide duration if available
          null, // Provide description if available
          null, // Provide location if available
          null, // Provide tags if available
          null, // Provide metadata if available
        ]
      );
      return reply
        .code(200)
        .send({ id: fileId, message: "File uploaded successfully" });
    } catch (error) {
      console.error("Error uploading file:", error);
      return reply.code(500).send({ error: "Error uploading file" });
    }
  }
);

fastify.get("/assets/:id", async (request, reply) => {
  try {
    const fileId = request.params.id;
    const result = await fastify.pg.query("SELECT * FROM files WHERE id = $1", [
      fileId,
    ]);

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: "File not found" });
    }

    const fileData = result.rows[0];
    const filename = fileData.filename_disk;
    console.log(fileData);
    const filePath = fileData.file_path;
    const fileContents = fs.readFileSync(`./uploads/${filename}`);
    if (!fileData.type.startsWith("image")) {
      return reply.code(200).header("Content-Type", `${fileData.type}`).send(fileContents);
    }

    let transformedImage = sharp(fileContents);
    if (request.query.fit) {
      transformedImage = transformedImage.resize({ fit: request.query.fit });
    }
    if (request.query.width && request.query.height) {
      const width = parseInt(request.query.width);
      const height = parseInt(request.query.height);
      transformedImage = transformedImage.resize(width, height);
    }
    if (request.query.quality) {
      const quality = parseInt(request.query.quality);
      transformedImage = transformedImage.jpeg({ quality: quality });
    }
    if (request.query.format) {
      transformedImage = transformedImage.toFormat(request.query.format);
    }
    transformedImage.toBuffer((err, data) => {
      if (err) {
        console.error("Error transforming image:", err);
        return reply.code(500).send({ error: "Error transforming image" });
      }
    });


    return reply.code(200).header("Content-Type", `${fileData.type}`).send(transformedImage);


  } catch (error) {
    console.error("Error retrieving file:", error);
    return reply.code(500).send({ error: "Error retrieving file" });
  }
});

try {
  await fastify.listen({ port: 3000 });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
