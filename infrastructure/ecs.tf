resource "aws_ecr_repository" "trail_mate_repository" {
  name = "trail-mate-repository"
}

resource "aws_ecr_repository_policy" "ecr_policy" {
  repository = aws_ecr_repository.trail_mate_repository.name

  policy = jsonencode({
    Version   = "2008-10-17",
    Statement = [
      {
        Sid       = "AllowECSExecutionRolePull",
        Effect    = "Allow",
        Principal = {
          AWS = aws_iam_role.ecs_execution_role.arn
        },
        Action = [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability"
        ]
      }
    ]
  })
}


resource "aws_iam_role" "ecs_execution_role" {
  name = "trail-mate-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version   = "2012-10-17",
    Statement = [
      {
        Action    = "sts:AssumeRole",
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
    Version   = "2012-10-17",
    Statement = [
      {
        Action    = "sts:AssumeRole",
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
    Version   = "2012-10-17",
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
  name          = "trail-mate-service"
  cluster       = aws_ecs_cluster.trail_mate_cluster.id
  desired_count = 1
  launch_type   = "FARGATE"

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



