'use strict';

const products = [
  {
    description: "Product 1",
    id: "1",
    price: 24,
    title: "ProductOne"
  },
  {
    description: "Product 2",
    id: "2",
    price: 24,
    title: "ProductTwo"
  },
  {
    description: "Product 3",
    id: "3",
    price: 24,
    title: "ProductThree"
  }
];

// getProductsList
module.exports.getProductsList = async (event) => {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(products),
  };
};

// getProductsById
module.exports.getProductsById = async (event) => {
  const { productId } = event.pathParameters;
  const product = products.find(p => p.id === productId);

  if (!product) {
    return {
      statusCode: 404,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ message: 'Product not found' }),
    };
  }

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(product),
  };
};