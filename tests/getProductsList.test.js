const { getProductsList } = require('../product-service/handler.js');

test('getProductsList returns all products', async () => {
  const response = await getProductsList();
  expect(response.statusCode).toBe(200);
  const products = JSON.parse(response.body);
  expect(Array.isArray(products)).toBe(true);
});