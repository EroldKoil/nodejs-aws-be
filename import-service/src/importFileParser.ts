import { S3Client, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { S3Event, Context } from "aws-lambda";
import * as csv from "csv-parser";
import { Readable } from "stream";

const s3 = new S3Client({ region: "eu-north-1" });
const BUCKET_NAME = "mikalai-shop-bucket-files";

export const handler = async (event: S3Event, context: Context): Promise<void> => {
    for (const record of event.Records) {
        const key = record.s3.object.key;

        try {
            const getObjectParams = { Bucket: BUCKET_NAME, Key: key };
            const getObjectCommand = new GetObjectCommand(getObjectParams);
            const data = await s3.send(getObjectCommand);

            const fileStream = data.Body as Readable;
            fileStream.pipe(csv())
                .on("data", (row) => {
                    console.log("Parsed Row:", row);
                })
                .on("end", async () => {
                    console.log(`Finished processing ${key}`);

                    // Перемещаем файл в папку `parsed`
                    const copyParams = {
                        Bucket: BUCKET_NAME,
                        CopySource: `${BUCKET_NAME}/${key}`,
                        Key: key.replace("uploaded/", "parsed/"),
                    };
                    await s3.send(new CopyObjectCommand(copyParams));

                    // Удаляем оригинальный файл
                    const deleteParams = { Bucket: BUCKET_NAME, Key: key };
                    await s3.send(new DeleteObjectCommand(deleteParams));

                    console.log(`Processed and moved file: ${key}`);
                });
        } catch (error) {
            console.error(`Error processing file ${key}:`, error);
        }
    }
};