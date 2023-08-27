import { writeFileSync } from "fs"

const IMAGE_TAG = process.env.IMAGE_TAG;

const ecrRepositoryUrl = '123809683522.dkr.ecr.eu-west-2.amazonaws.com/trail-mate-repository';
const cloudwatchLogGroupName = 'trail-mate-logs';

const taskDefinition = {
    family: 'trail-mate',
    networkMode: 'awsvpc',
    requiresCompatibilities: ['FARGATE'],
    cpu: '256',
    memory: '512',
    executionRoleArn: 'arn:aws:iam::123809683522:role/trail-mate-ecs-execution-role',
    taskRoleArn: 'arn:aws:iam::123809683522:role/trail-mate-ecs-task-role',
    containerDefinitions: [{
        name: 'trail-mate-container',
        image: `${ecrRepositoryUrl}:${IMAGE_TAG}`,
        portMappings: [{
            containerPort: 3000,
            hostPort: 3000
        }],
        environment: [{
            name: 'IMAGE_TAG',
            value: IMAGE_TAG
        }],
        logConfiguration: {
            logDriver: 'awslogs',
            options: {
                'awslogs-group': cloudwatchLogGroupName,
                'awslogs-region': 'eu-west-2',
                'awslogs-stream-prefix': 'trail-mate'
            }
        }
    }]
};


writeFileSync("./task-definition.json", JSON.stringify(taskDefinition, null, 2));
