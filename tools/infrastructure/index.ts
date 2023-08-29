import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as std from "@pulumi/std";


const warning = new aws.budgets.Budget("warning", {
  budgetType: "COST",
  limitAmount: "10",
  limitUnit: "USD",
  timePeriodStart: "2023-08-01_00:00",
  timeUnit: "MONTHLY"
});

const config = new pulumi.Config();
const environment = config.get("environment") || "prod";
const current = aws.getCallerIdentityOutput({});

const dbConnectionString = new aws.secretsmanager.Secret("dbConnectionString", {
  name: "db_connection_string",
  description: "DB credentials as JSON"
});

const trailMateVpc = new aws.ec2.Vpc("trailMateVpc", {
  cidrBlock: "10.8.0.0/16",
  enableDnsSupport: true,
  enableDnsHostnames: true,
  tags: {
    Name: "trail-mate-vpc"
  }
});

const trailMateSubnetA = new aws.ec2.Subnet("trailMateSubnetA", {
  vpcId: trailMateVpc.id,
  cidrBlock: "10.8.1.0/24",
  availabilityZone: "eu-west-2a",
  mapPublicIpOnLaunch: true,
  tags: {
    Name: "trail-mate-subnet-a"
  }
});

const trailMateSubnetB = new aws.ec2.Subnet("trailMateSubnetB", {
  vpcId: trailMateVpc.id,
  cidrBlock: "10.8.2.0/24",
  availabilityZone: "eu-west-2b",
  mapPublicIpOnLaunch: true,
  tags: {
    Name: "trail-mate-subnet-b"
  }
});

const trailMateIgw = new aws.ec2.InternetGateway("trailMateIgw", { vpcId: trailMateVpc.id });

const trailMateRt = new aws.ec2.RouteTable("trailMateRt", {
  vpcId: trailMateVpc.id,
  routes: [{
    cidrBlock: "0.0.0.0/0",
    gatewayId: trailMateIgw.id
  }],
  tags: {
    Name: "trail-mate-route-table"
  }
});

const trailMateSubnetAAssociation = new aws.ec2.RouteTableAssociation("trailMateSubnetAAssociation", {
  subnetId: trailMateSubnetA.id,
  routeTableId: trailMateRt.id
});

const trailMateSubnetBAssociation = new aws.ec2.RouteTableAssociation("trailMateSubnetBAssociation", {
  subnetId: trailMateSubnetB.id,
  routeTableId: trailMateRt.id
});

// const bastionKey = new aws.ec2.KeyPair("bastionKey", {
//   keyName: "bastion_key",
//   publicKey: std.fileOutput({
//     input: "~/.ssh/olly.pub"
//   }).apply(invoke => invoke.result)
// });

const trailMateBastionSg = new aws.ec2.SecurityGroup("trailMateBastionSg", {
  name: "trail-mate-bastion-sg",
  description: "Bastion Security Group",
  vpcId: trailMateVpc.id,
  ingress: [{
    fromPort: 41641,
    toPort: 41641,
    protocol: "udp",
    cidrBlocks: ["0.0.0.0/0"],
    description: "Tailscale"
  }],
  egress: [{
    fromPort: 0,
    toPort: 0,
    protocol: "-1",
    cidrBlocks: ["0.0.0.0/0"]
  }]
});

const tailMateBastion = new aws.ec2.Instance("tailMateBastion", {
  ami: "ami-062ec2beae7c79c8e",
  instanceType: "t4g.nano",
  // keyName: bastionKey.keyName,
  vpcSecurityGroupIds: [trailMateBastionSg.id],
  associatePublicIpAddress: true,
  subnetId: trailMateSubnetA.id,
  tags: {
    Name: "Bastion"
  }
});

const bastionEip = new aws.ec2.Eip("bastionEip", { instance: tailMateBastion.id });

export const bastionIp = bastionEip.publicIp;

const trailMateRepository = new aws.ecr.Repository("trailMateRepository", { name: "trail-mate-repository" });

const trailMateAlbSg = new aws.ec2.SecurityGroup("trailMateAlbSg", {
  name: "trail-mate-alb-sg",
  description: "Security group for ALB",
  vpcId: trailMateVpc.id,
  ingress: [
    {
      description: "Allow HTTPS inbound traffic",
      fromPort: 443,
      toPort: 443,
      protocol: "tcp",
      cidrBlocks: ["0.0.0.0/0"]
    },
    {
      description: "Allow HTTP inbound traffic",
      fromPort: 80,
      toPort: 80,
      protocol: "tcp",
      cidrBlocks: ["0.0.0.0/0"]
    }
  ],
  egress: [{
    fromPort: 0,
    toPort: 0,
    protocol: "-1",
    cidrBlocks: ["0.0.0.0/0"]
  }]
});

const trailMateAlb = new aws.lb.LoadBalancer("trailMateAlb", {
  name: "trail-mate-lb",
  internal: false,
  loadBalancerType: "application",
  securityGroups: [trailMateAlbSg.id],
  subnets: [
    trailMateSubnetA.id,
    trailMateSubnetB.id
  ]
});

// Redirect HTTP to HTTPS for the LB
const trailMateListener = new aws.lb.Listener("trailMateListener", {
  loadBalancerArn: trailMateAlb.arn,
  port: 80,
  protocol: "HTTP",
  defaultActions: [{
    type: "redirect",
    redirect: {
      port: "443",
      protocol: "HTTPS",
      statusCode: "HTTP_301"
    }
  }]
});

const trailMateTargetGroup = new aws.lb.TargetGroup("trailMateTargetGroup", {
  name: "trail-mate-target-group",
  port: 3000,
  protocol: "HTTP",
  vpcId: trailMateVpc.id,
  targetType: "ip",
  healthCheck: {
    enabled: true,
    interval: 30,
    path: "/health",
    protocol: "HTTP",
    timeout: 5,
    healthyThreshold: 3,
    unhealthyThreshold: 3,
    matcher: "200-299"
  }
});

const rootDomainName = config.get("rootDomainName") || "trail-mate.com";

const trailMateApiCert = new aws.acm.Certificate("trailMateApiCert", {
  domainName: `api.${rootDomainName}`,
  validationMethod: "DNS"
});

const httpsListener = new aws.lb.Listener("httpsListener", {
  loadBalancerArn: trailMateAlb.arn,
  port: 443,
  protocol: "HTTPS",
  sslPolicy: "ELBSecurityPolicy-2016-08",
  certificateArn: trailMateApiCert.arn,
  defaultActions: [{
    type: "forward",
    targetGroupArn: trailMateTargetGroup.arn
  }]
});

const ecsExecutionRole = new aws.iam.Role("ecsExecutionRole", {
  name: "trail-mate-ecs-execution-role",
  assumeRolePolicy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [{
      Action: "sts:AssumeRole",
      Principal: {
        Service: "ecs-tasks.amazonaws.com"
      },
      Effect: "Allow",
      Sid: ""
    }]
  })
});

const ecsExecutionSecretsAccess = new aws.iam.RolePolicy("ecsExecutionSecretsAccess", {
  name: "trail-mate-ecs-execution-secrets-access",
  role: ecsExecutionRole.id,
  policy: current.apply(current => JSON.stringify({
    Version: "2012-10-17",
    Statement: [{
      Effect: "Allow",
      Action: ["secretsmanager:GetSecretValue"],
      Resource: [`arn:aws:secretsmanager:eu-west-2:${current.accountId}:secret:*`]
    }]
  }))
});

const ecsTaskRole = new aws.iam.Role("ecsTaskRole", {
    name: "trail-mate-ecs-task-role",
    assumeRolePolicy: JSON.stringify({
      Version: "2012-10-17",
      Statement: [{
        Action: "sts:AssumeRole",
        Principal: {
          Service: "ecs-tasks.amazonaws.com"
        },
        Effect: "Allow",
        Sid: ""
      }]
    })
  }
);

const ecsExecutionRolePolicyAttachment = new aws.iam.RolePolicyAttachment("ecsExecutionRolePolicyAttachment", {
  role: ecsExecutionRole.name,
  policyArn: "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
});

const trailMateLogs = new aws.cloudwatch.LogGroup("trailMateLogs", { name: "trail-mate-logs" });

const ecsLoggingPolicy = new aws.iam.Policy("ecsLoggingPolicy", {
  name: "trail-mate-ecs-logging-policy",
  description: "Allows ECS tasks to write logs to CloudWatch.",
  policy: trailMateLogs.arn.apply(arn => JSON.stringify({
    version: "2012-10-17",
    statement: [{
      action: [
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      effect: "Allow",
      resource: arn
    }]
  }))
});

const ecsExecutionLoggingPolicyAttachment = new aws.iam.RolePolicyAttachment("ecsExecutionLoggingPolicyAttachment", {
  role: ecsExecutionRole.name,
  policyArn: ecsLoggingPolicy.arn
});

const trailMateCluster = new aws.ecs.Cluster("trailMateCluster", {
  name: "trail-mate-cluster",
  settings: [{
    name: "containerInsights",
    value: "enabled"
  }],
  tags: {
    Name: "trail-mate-cluster"
  }
});

const trailMateSg = new aws.ec2.SecurityGroup("trailMateSg", {
  name: "trail-mate-sg",
  vpcId: trailMateVpc.id,
  description: "Allow inbound traffic on port 3000",
  ingress: [{
    fromPort: 3000,
    toPort: 3000,
    protocol: "tcp",
    securityGroups: [trailMateAlbSg.id]
  }],
  egress: [{
    fromPort: 0,
    toPort: 0,
    protocol: "-1",
    cidrBlocks: ["0.0.0.0/0"]
  }],
  tags: {
    Name: "trail-mate-sg"
  }
});

const trailMateService = new aws.ecs.Service("trailMateService", {
  name: "trail-mate-service",
  cluster: trailMateCluster.id,
  desiredCount: 1,
  launchType: "FARGATE",
  taskDefinition: "trail-mate:25",
  networkConfiguration: {
    subnets: [
      trailMateSubnetA.id,
      trailMateSubnetB.id
    ],
    securityGroups: [trailMateSg.id],
    assignPublicIp: true
  },
  loadBalancers: [{
    targetGroupArn: trailMateTargetGroup.arn,
    containerName: "trail-mate-container",
    containerPort: 3000
  }]
});

const githubActionsEcsDeploy = new aws.iam.Policy("githubActionsEcsDeploy", {
  name: "GitHubActionsECSDeployPolicy",
  description: "Allows GitHub Actions to deploy to ECS and manage ECR repositories",
  policy: pulumi.all([trailMateRepository.arn, trailMateLogs.arn, ecsExecutionRole.arn, ecsTaskRole.arn, current, trailMateCluster.name, trailMateService.name]).apply(([trailMateRepositoryArn, trailMateLogsArn, ecsExecutionRoleArn, ecsTaskRoleArn, current, trailMateClusterName, trailMateServiceName]) => JSON.stringify({
    version: "2012-10-17",
    statement: [
      {
        effect: "Allow",
        action: [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability",
          "ecr:CompleteLayerUpload",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:PutImage"
        ],
        resource: trailMateRepositoryArn
      },
      {
        effect: "Allow",
        action: [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ],
        resource: trailMateLogsArn
      },
      {
        Sid: "RegisterTaskDefinition",
        Effect: "Allow",
        Action: [
          "ecs:RegisterTaskDefinition",
          "ecr:GetAuthorizationToken"
        ],
        Resource: "*"
      },
      {
        Sid: "PassRolesInTaskDefinition",
        Effect: "Allow",
        Action: ["iam:PassRole"],
        Resource: [
          ecsExecutionRoleArn,
          ecsTaskRoleArn
        ]
      },
      {
        Sid: "DeployService",
        Effect: "Allow",
        Action: [
          "ecs:UpdateService",
          "ecs:DescribeServices"
        ],
        Resource: [`arn:aws:ecs:eu-west-2:${current.accountId}:service/${trailMateClusterName}/${trailMateServiceName}`]
      }
    ]
  }))
});

const githubActionsUser = new aws.iam.User("githubActionsUser", { name: "github-actions-user" });

const githubActionsUserEcsDeploy = new aws.iam.UserPolicyAttachment("githubActionsUserEcsDeploy", {
  user: githubActionsUser.name,
  policyArn: githubActionsEcsDeploy.arn
}, {});

const trailMateDbSg = new aws.ec2.SecurityGroup("trailMateDbSg", {
  vpcId: trailMateVpc.id,
  name: "trail-mate-db-sg",
  description: "Managed by Terraform",
  ingress: [
    {
      fromPort: 5432,
      toPort: 5432,
      protocol: "tcp",
      securityGroups: [trailMateSg.id],
      description: "Allow ECS to access RDS"
    },
    {
      fromPort: 5432,
      toPort: 5432,
      protocol: "tcp",
      securityGroups: [trailMateBastionSg.id],
      description: "Allow bastion to access RDS"
    }
  ]
});

const trailMateDbSubnetGroup = new aws.rds.SubnetGroup("trailMateDbSubnetGroup", {
  name: "trail-mate-db-subnet-group",
  description: "Managed by Terraform",
  subnetIds: [
    trailMateSubnetA.id,
    trailMateSubnetB.id
  ]
});

const trailMateDb = new aws.rds.Instance("trailMateDb", {
  allocatedStorage: 20,
  storageType: "gp2",
  engine: "postgres",
  engineVersion: "15.4",
  instanceClass: "db.t3.micro",
  username: "trailmate",
  dbName: "trailmatedb",
  publiclyAccessible: false,
  caCertIdentifier: "rds-ca-rsa2048-g1",
  identifier: "trail-mate-db",
  skipFinalSnapshot: true,
  vpcSecurityGroupIds: [trailMateDbSg.id],
  dbSubnetGroupName: trailMateDbSubnetGroup.name
});

export const dbEndpoint = trailMateDb.endpoint;

const trailMateZone = new aws.route53.Zone("trailMateZone", { name: rootDomainName });

const trailMateCert = new aws.acm.Certificate("trailMateCert", {
  domainName: rootDomainName,
  validationMethod: "DNS"
});

// Point `api.trail-mate.com` to the ALB for API traffic
const trailMateApi = new aws.route53.Record("trailMateApi", {
  name: `api.${rootDomainName}`,
  type: "A",
  zoneId: trailMateZone.zoneId,
  aliases: [{
    name: trailMateAlb.dnsName,
    zoneId: trailMateAlb.zoneId,
    evaluateTargetHealth: false
  }]
});

