import * as AWS from "aws-sdk";
import { v4 as uuidv4 } from "uuid";
import * as Joi from "joi";
import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from "aws-lambda";

// Создаем клиента для DynamoDB
const docClient = new AWS.DynamoDB.DocumentClient();

// Определение схемы продукта
const productSchema = Joi.object({
  title: Joi.string().required(),
  price: Joi.number().positive().required(),
  count: Joi.number().integer().min(0).required(),
  description: Joi.string().allow(""),
});

export const getProductsList = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log("getProductsList request:", event);

  try {
    const products = await docClient.scan({ TableName: "products" }).promise();
    const stocks = await docClient.scan({ TableName: "stocks" }).promise();

    if(!products || !stocks || !products.Items || !stocks.Items) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Products or stocks not found" }),
      };
    }

    const productsWithStocks = products.Items.map((product) => {
      const stock = stocks?.Items?.find((stock) => stock.product_id === product.id);
      return {
        ...product,
        count: stock ? stock.count : 0,
      };
    });

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(productsWithStocks),
    };
  } catch (err) {
    console.error("Error in getProductsList:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};

export const getProductsById = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log("getProductsById request:", event);

  try {
    const productId = event.pathParameters?.productId;

    if (!productId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Product ID is required" }),
      };
    }

    const productData = await docClient
      .get({ TableName: "products", Key: { id: productId } })
      .promise();
    const stockData = await docClient
      .get({ TableName: "stocks", Key: { product_id: productId } })
      .promise();

    if (!productData.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Product not found" }),
      };
    }

    const product = {
      ...productData.Item,
      count: stockData.Item ? stockData.Item.count : 0,
    };

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(product),
    };
  } catch (err) {
    console.error("Error in getProductsById:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};

export const createProduct = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log("createProduct request:", event);

  try {
    const data = JSON.parse(event.body || "{}");

    const validationResult = productSchema.validate(data);

    if (validationResult.error) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Invalid product data",
          details: validationResult.error.details,
        }),
      };
    }

    const productId = uuidv4();
    const productInfo = {
      TableName: "products",
      Item: {
        id: productId,
        title: data.title,
        description: data.description || "",
        price: data.price,
      },
    };

    const stockInfo = {
      TableName: "stocks",
      Item: {
        product_id: productId,
        count: data.count,
      },
    };

    await docClient
      .transactWrite({
        TransactItems: [
          { Put: productInfo },
          { Put: stockInfo },
        ],
      })
      .promise();

    return {
      statusCode: 201,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Product created successfully!",
        productId: productId,
      }),
    };
  } catch (err) {
    console.error("Error in createProduct:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};