
resource "aws_ecr_repository" "trail_mate_repository" {
  name = "trail-mate-repository"
}

resource "aws_iam_role" "ecs_execution_role" {
  name = "trail-mate-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = "sts:AssumeRole",
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        },
        Effect = "Allow",
        Sid    = ""
      }
    ]
  })
}

resource "aws_iam_role" "ecs_task_role" {
  name = "trail-mate-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = "sts:AssumeRole",
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        },
        Effect = "Allow",
        Sid    = ""
      }
    ]
  })
}


resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy_attachment" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_policy" "ecs_logging_policy" {
  name        = "trail-mate-ecs-logging-policy"
  description = "Allows ECS tasks to write logs to CloudWatch."

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ],
        Effect   = "Allow",
        Resource = aws_cloudwatch_log_group.trail_mate_logs.arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_logging_policy_attachment" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = aws_iam_policy.ecs_logging_policy.arn
}


resource "aws_ecs_cluster" "trail_mate_cluster" {
  name = "trail-mate-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}


resource "aws_ecs_service" "trail_mate_service" {
  name            = "trail-mate-service"
  cluster         = aws_ecs_cluster.trail_mate_cluster.id
  task_definition = aws_ecs_task_definition.trail_mate_task.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [aws_subnet.trail_mate_subnet_a.id, aws_subnet.trail_mate_subnet_b.id]
    security_groups  = [aws_security_group.trail_mate_sg.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.trail_mate_target_group.arn
    container_name   = "trail-mate-container"
    container_port   = 3000
  }
}

resource "aws_cloudwatch_log_group" "trail_mate_logs" {
  name = "trail-mate-logs"
}

resource "aws_ecs_task_definition" "trail_mate_task" {
  family                   = "trail-mate"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([{
    name  = "trail-mate-container"
    image = "${aws_ecr_repository.trail_mate_repository.repository_url}:latest"
    portMappings = [{
      containerPort = 3000
      hostPort      = 3000
    }]
    environment = [{
      name  = "API_PREFIX",
      value = "/prod"
    }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.trail_mate_logs.name,
        "awslogs-region"        = "eu-west-2", # Replace with your region, e.g., "eu-west-2"
        "awslogs-stream-prefix" = "trail-mate"
      }
    }
  }])
}


