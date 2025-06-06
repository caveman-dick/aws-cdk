#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as glue from '../lib';

/**
 * Stack verification steps:
 * * aws cloudformation describe-stacks --stack-name aws-cdk-glue --query Stacks[0].Outputs[0].OutputValue
 * * aws glue get-partition-indexes --catalog-id <output-from-above> --database-name database --table-name csv_table
 * returns two indexes named 'index1' and 'index2'
 * * aws glue get-partition-indexes --catalog-id <output-from-above> --database-name database --table-name json_table
 * returns an index with name 'year-month...'
 */

const app = new cdk.App({
  postCliContext: {
    '@aws-cdk/aws-lambda:useCdkManagedLogGroup': false,
  },
});
const stack = new cdk.Stack(app, 'aws-cdk-glue');
const bucket = new s3.Bucket(stack, 'DataBucket');
const database = new glue.Database(stack, 'MyDatabase', {
  databaseName: 'database',
});

const columns = [{
  name: 'col1',
  type: glue.Schema.STRING,
}, {
  name: 'col2',
  type: glue.Schema.STRING,
}, {
  name: 'col3',
  type: glue.Schema.STRING,
}];

const partitionKeys = [{
  name: 'year',
  type: glue.Schema.SMALL_INT,
}, {
  name: 'month',
  type: glue.Schema.BIG_INT,
}];

const csvTable = new glue.S3Table(stack, 'CSVTable', {
  database,
  bucket,
  tableName: 'csv_table',
  columns,
  partitionKeys,
  partitionIndexes: [{
    indexName: 'index1',
    keyNames: ['month'],
  }],
  dataFormat: glue.DataFormat.CSV,
});

csvTable.addPartitionIndex({
  indexName: 'index2',
  keyNames: ['month', 'year'],
});

const jsonTable = new glue.S3Table(stack, 'JSONTable', {
  database,
  bucket,
  tableName: 'json_table',
  columns,
  partitionKeys,
  dataFormat: glue.DataFormat.JSON,
});

jsonTable.addPartitionIndex({
  keyNames: ['year', 'month'],
});

// output necessary for stack verification
new cdk.CfnOutput(stack, 'CatalogId', {
  value: database.catalogId,
});

app.synth();
