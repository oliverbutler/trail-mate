resource "aws_iam_policy" "github_actions_ecs_deploy" {
  name        = "GitHubActionsECSDeployPolicy"
  description = "Allows GitHub Actions to deploy to ECS and manage ECR repositories"

  policy = jsonencode({
    Version   = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability",
          "ecr:CompleteLayerUpload",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:PutImage"
        ],
        Resource = aws_ecr_repository.trail_mate_repository.arn
      },
      {
        Effect   = "Allow",
        Action   = ["logs:CreateLogStream", "logs:PutLogEvents"],
        Resource = aws_cloudwatch_log_group.trail_mate_logs.arn
      },
      {
        "Sid" : "RegisterTaskDefinition",
        "Effect" : "Allow",
        "Action" : [
          "ecs:RegisterTaskDefinition",
          # Not 100% sure why this needed, but the login to ECR action complains
          "ecr:GetAuthorizationToken",
        ],
        "Resource" : "*"
      },
      {
        "Sid" : "PassRolesInTaskDefinition",
        "Effect" : "Allow",
        "Action" : [
          "iam:PassRole"
        ],
        "Resource" : [
          aws_iam_role.ecs_execution_role.arn,
          aws_iam_role.ecs_task_role.arn
        ]
      },
      {
        "Sid" : "DeployService",
        "Effect" : "Allow",
        "Action" : [
          "ecs:UpdateService",
          "ecs:DescribeServices"
        ],
        "Resource" : [
          "arn:aws:ecs:eu-west-2:${data.aws_caller_identity.current.account_id}:service/${aws_ecs_cluster.trail_mate_cluster.name}/${aws_ecs_service.trail_mate_service.name}"
        ]
      }
    ]
  })
}

data "aws_caller_identity" "current" {}

resource "aws_iam_user" "github_actions_user" {
  name = "github-actions-user"
}

resource "aws_iam_user_policy_attachment" "github_actions_user_ecs_deploy" {
  user       = aws_iam_user.github_actions_user.name
  policy_arn = aws_iam_policy.github_actions_ecs_deploy.arn
}
