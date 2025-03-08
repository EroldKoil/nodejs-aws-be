import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Notifications from 'aws-cdk-lib/aws-s3-notifications';

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Импортируем существующий S3 бакет
    const bucket = s3.Bucket.fromBucketName(this, 'ImportServiceBucket', 'mikalai-shop-bucket-files');

    // Лямбда для importProductsFile
    const importProductsFileLambda = new lambda.Function(this, 'ImportProductsFileHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('dist'),
      handler: 'importProductsFile.handler',
      environment: {
        BUCKET_NAME: bucket.bucketName, // Имя бакета из окружения
      },
    });

    // Даём Lambda-функции права на взаимодействие с S3
    bucket.grantReadWrite(importProductsFileLambda);

    // Создаем API Gateway
    const api = new apigateway.RestApi(this, 'ImportServiceApi', {
      restApiName: 'Import Service API',
    });

    // Добавляем маршрут `/import`
    const importResource = api.root.addResource('import');
    importResource.addMethod('GET', new apigateway.LambdaIntegration(importProductsFileLambda));
  
    // Lambda для importFileParser
    const importFileParserLambda = new lambda.Function(this, 'ImportFileParserHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('dist'),
      handler: 'importFileParser.handler',
      environment: {
        BUCKET_NAME: bucket.bucketName,
      },
    });

    // Добавляем разрешение на чтение/запись в S3 бакет
    bucket.grantReadWrite(importFileParserLambda);

    // Добавляем триггер для папки uploaded
    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3Notifications.LambdaDestination(importFileParserLambda),
      { prefix: 'uploaded/' } // Событие только для папки uploaded
    );

  }
}