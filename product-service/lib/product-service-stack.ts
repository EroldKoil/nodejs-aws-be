import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as eventsources from 'aws-cdk-lib/aws-lambda-event-sources';

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Создаём таблицу для хранения продуктов (если её нет)
    const productsTable = new dynamodb.Table(this, 'ProductsTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    // Создаём таблицу для хранения остатков (stocks)
    const stocksTable = new dynamodb.Table(this, 'StocksTable', {
      partitionKey: { name: 'product_id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    // Lambda-функция для обработки сообщений из SQS (catalogBatchProcess)
    const catalogBatchProcessLambda = new lambda.Function(this, 'CatalogBatchProcess', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('dist'), // Обратите внимание: исходный код TypeScript должен быть скомпилирован в dist
      handler: 'catalogBatchProcess.handler',
      environment: {
        PRODUCTS_TABLE: productsTable.tableName,
        STOCKS_TABLE: stocksTable.tableName,
      },
    });

    // Даем Lambda права на запись в таблицы DynamoDB
    productsTable.grantWriteData(catalogBatchProcessLambda);
    stocksTable.grantWriteData(catalogBatchProcessLambda);

    // Создаём SQS очередь
    const catalogItemsQueue = new sqs.Queue(this, 'CatalogItemsQueue', {
      visibilityTimeout: cdk.Duration.seconds(30), // Время, за которое сообщение должно быть обработано
      receiveMessageWaitTime: cdk.Duration.seconds(20), // Долгое опрашивание
    });

    // Привязываем SQS очередь к Lambda с batchSize = 5
    catalogBatchProcessLambda.addEventSource(new eventsources.SqsEventSource(catalogItemsQueue, {
      batchSize: 5, // Обрабатываем 5 сообщений за вызов функции
    }));
  }
}