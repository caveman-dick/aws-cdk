import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as cdk from 'aws-cdk-lib';
import * as integ from '@aws-cdk/integ-tests-alpha';
import { DatabaseCluster, EngineVersion, InstanceType, ParameterGroupFamily } from '../lib';
import { ClusterParameterGroup } from '../lib/parameter-group';

/*
 * Test creating a cluster with engine version 1.4.0.0 and associated parameter group with family neptune1.4
 *
 * Stack verification steps:
 * * aws docdb describe-db-clusters --db-cluster-identifier <deployed db cluster identifier>
 */

const app = new cdk.App();

const stack = new cdk.Stack(app, 'aws-cdk-neptune-integ');

const vpc = new ec2.Vpc(stack, 'VPC', { maxAzs: 2, restrictDefaultSecurityGroup: false });

const kmsKey = new kms.Key(stack, 'DbSecurity', {
  removalPolicy: cdk.RemovalPolicy.DESTROY,
});

const role = new iam.Role(stack, 'Role', {
  assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
  description: 'AWS Sagemaker notebooks role example for interacting with Neptune Database Cluster',
});

const clusterParameterGroup = new ClusterParameterGroup(stack, 'Params', {
  description: 'A nice parameter group',
  family: ParameterGroupFamily.NEPTUNE_1_4,
  parameters: {
    neptune_enable_audit_log: '1',
    neptune_query_timeout: '100000',
  },
});

const cluster = new DatabaseCluster(stack, 'Database', {
  vpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  instanceType: InstanceType.R5_LARGE,
  engineVersion: EngineVersion.V1_4_0_0,
  clusterParameterGroup,
  kmsKey,
  removalPolicy: cdk.RemovalPolicy.DESTROY,
  autoMinorVersionUpgrade: true,
});

cluster.connections.allowDefaultPortFromAnyIpv4('Open to the world');

cluster.grant(role, 'neptune-db:ReadDataViaQuery', 'neptune-db:GetEngineStatus');

new integ.IntegTest(app, 'ClusterTest', {
  testCases: [stack],
});
