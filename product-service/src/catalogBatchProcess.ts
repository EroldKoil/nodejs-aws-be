import { SQSHandler } from "aws-lambda";
import * as AWS from "aws-sdk";

const docClient = new AWS.DynamoDB.DocumentClient();
const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE!;
const STOCKS_TABLE = process.env.STOCKS_TABLE!;

export const handler: SQSHandler = async (event) => {
  console.log("catalogBatchProcess event:", JSON.stringify(event));

  try {
    for (const record of event.Records) {
      // Парсим тело сообщения
      const messageBody = JSON.parse(record.body);

      console.log("Processing message:", messageBody);

      const { id, title, description, price, count } = messageBody;

      // Проверяем, что все необходимые данные присутствуют
      if (!id || !title || price === undefined || count === undefined) {
        console.error("Invalid message format:", messageBody);
        continue;
      }

      // Добавляем продукт и его остаток в DynamoDB
      const product = {
        id,
        title,
        description,
        price,
      };

      const stock = {
        product_id: id,
        count,
      };

      // Используем транзакцию для записи
      await docClient.transactWrite({
        TransactItems: [
          {
            Put: {
              TableName: PRODUCTS_TABLE,
              Item: product,
            },
          },
          {
            Put: {
              TableName: STOCKS_TABLE,
              Item: stock,
            },
          },
        ],
      }).promise();

      console.log(`Product ${title} successfully added`);
    }
  } catch (error) {
    console.error("Error processing batch:", error);
    throw error; // Бросаем ошибку, чтобы SQS повторно обработала сообщения
  }
};