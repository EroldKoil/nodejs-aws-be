'use strict';
const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');

const productSchema = Joi.object({
  title: Joi.string().required(),
  price: Joi.number().positive().required(),
  count: Joi.number().integer().min(0).required(),
  description: Joi.string().allow('')
});

module.exports.getProductsList = async (event) => {
  console.log('getProductsList request:', event);
  try {
    const products = await docClient.scan({ TableName: 'products' }).promise();
    const stocks = await docClient.scan({ TableName: 'stocks' }).promise();

    const productsWithStocks = products.Items.map(product => {
      const stock = stocks.Items.find(stock => stock.product_id === product.id);
      return {
        ...product,
        count: stock ? stock.count : 0
      };
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(productsWithStocks),
    };
  } catch (err) {
    console.error('Error in getProductsList:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};

module.exports.getProductsById = async (event) => {
  console.log('getProductsById request:', event);
  try {
    const productId = event.pathParameters.productId;

    const productData = await docClient.get({ TableName: 'products', Key: { id: productId } }).promise();
    const stockData = await docClient.get({ TableName: 'stocks', Key: { product_id: productId } }).promise();

    if (!productData.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Product not found' })
      };
    }

    const product = {
      ...productData.Item,
      count: stockData.Item ? stockData.Item.count : 0
    };

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(product),
    };
  } catch (err) {
    console.error('Error in getProductsById:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};

module.exports.createProduct = async (event) => {
  console.log('createProduct request:', event);
  try {
    const data = JSON.parse(event.body);
    const validationResult = productSchema.validate(data);

    if (validationResult.error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid product data', details: validationResult.error.details })
      };
    }

    const productId = uuidv4();
    const productInfo = {
      TableName: 'products',
      Item: {
        id: productId,
        title: data.title,
        description: data.description || '',
        price: data.price,
      }
    };

    const stockInfo = {
      TableName: 'stocks',
      Item: {
        product_id: productId,
        count: data.count
      }
    };

    await docClient.transactWrite({
      TransactItems: [
        { Put: productInfo },
        { Put: stockInfo }
      ]
    }).promise();

    return {
      statusCode: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Product created successfully!',
        productId: productId
      }),
    };
  } catch (err) {
    console.error('Error in createProduct:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};