const { getProductsById } = require('../product-service/handler.js');

test('getProductsById returns product if found', async () => {
  const event = { pathParameters: { productId: '1' } };
  const response = await getProductsById(event);
  expect(response.statusCode).toBe(200);
});

test('getProductsById returns 404 if product not found', async () => {
  const event = { pathParameters: { productId: '999' } };
  const response = await getProductsById(event);
  expect(response.statusCode).toBe(404);
  const body = JSON.parse(response.body);
  expect(body.message).toBe('Product not found');
});