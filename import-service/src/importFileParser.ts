import { S3Client, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { S3Event, Context } from "aws-lambda";
import * as csv from "csv-parser";
import { Readable } from "stream";

const s3 = new S3Client({ region: "eu-north-1" });
const BUCKET_NAME = "mikalai-shop-bucket-files";

export const handler = async (event: S3Event): Promise<void> => {
  for (const record of event.Records) {
    const key = record.s3.object.key;

    try {
      // Логируем ключ для проверки
      console.log(`Processing file with key: ${key}`);

      // Чтение объекта из S3
      const getObjectParams = { Bucket: BUCKET_NAME, Key: key };
      const getObjectCommand = new GetObjectCommand(getObjectParams);
      const data = await s3.send(getObjectCommand);

      const fileStream = data.Body as Readable;
      fileStream
        .pipe(csv())
        .on("data", (row: any) => {
          console.log("Parsed Row:", row); // Логируем каждую строку из CSV для проверки
        })
        .on("end", async () => {
          console.log(`Finished processing ${key}`); // Лог о завершении обработки файла

          // Перемещаем файл в папку `parsed`
          const copyParams = {
            Bucket: BUCKET_NAME,
            CopySource: `${BUCKET_NAME}/${key}`,
            Key: key.replace("uploaded/", "parsed/"),
          };
          console.log("Attempting to copy file with parameters:", copyParams);
          await s3.send(new CopyObjectCommand(copyParams));
          console.log(`File copied to parsed folder: ${key.replace("uploaded/", "parsed/")}`);

          // Удаляем файл из папки `uploaded`
          const deleteParams = {
            Bucket: BUCKET_NAME,
            Key: key,
          };
          await s3.send(new DeleteObjectCommand(deleteParams));
          console.log(`File deleted from uploaded folder: ${key}`);
        })
        .on("error", (error: any) => {
          console.error(`Error processing file ${key}:`, error);
        });
    } catch (error) {
      console.error(`Error processing file ${key}:`, error);
    }
  }
};