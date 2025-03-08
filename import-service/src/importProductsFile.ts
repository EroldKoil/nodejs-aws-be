import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const s3 = new S3Client({ region: "eu-north-1" });
const BUCKET_NAME = "mikalai-shop-bucket-files";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const fileName = event.queryStringParameters?.name;

  if (!fileName) {
      return {
          statusCode: 400,
          body: JSON.stringify({ message: "Missing 'name' query parameter" }),
      };
  }

  const params = {
      Bucket: BUCKET_NAME,
      Key: `uploaded/${fileName}`,
  };

  try {
      // Создаем команду PutObject для получения подписанного URL
      const command = new PutObjectCommand(params);
      const signedUrl = await getSignedUrl(s3, command, { expiresIn: 600 }); // Срок действия URL (10 минут)

      return {
          statusCode: 200,
          body: signedUrl, // Возвращаем URL строкой
      };
  } catch (error) {
      console.error(error);
      return {
          statusCode: 500,
          body: JSON.stringify({ message: "Failed to generate signed URL" }),
      };
  }
};