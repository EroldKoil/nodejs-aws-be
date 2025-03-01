const AWS = require('aws-sdk');
AWS.config.update({ region: 'eu-north-1' });

const dynamodb = new AWS.DynamoDB();

const createTable = (params) => new Promise((resolve, reject) => {
  dynamodb.createTable(params, (err, data) => {
    if (err) reject(err);
    else resolve(data);
  });
});

const productsTableParams = {
  TableName: "products",
  KeySchema: [
      { AttributeName: "id", KeyType: "HASH" }
  ],
  AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
  ],
  ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
  }
};

const stocksTableParams = {
  TableName : "stocks",
  KeySchema: [
      { AttributeName: "product_id", KeyType: "HASH"},
  ],
  AttributeDefinitions: [
      { AttributeName: "product_id", AttributeType: "S" },
  ],
  ProvisionedThroughput: {
      ReadCapacityUnits: 5, 
      WriteCapacityUnits: 5
  }
};

(async () => {
  try {
    await createTable(productsTableParams);
    console.log("Products table created successfully.");
    await createTable(stocksTableParams);
    console.log("Stocks table created successfully.");
  } catch (error) {
    console.error(error);
  }
})();