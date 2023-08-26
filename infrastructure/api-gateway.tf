
resource "aws_api_gateway_rest_api" "trail_mate_api" {
  name        = "trail-mate-api"
  description = "API for trail-mate"
}

resource "aws_api_gateway_deployment" "trail_mate_api_deployment" {
  depends_on = [
    aws_api_gateway_integration.trail_mate_integration
  ]

  rest_api_id = aws_api_gateway_rest_api.trail_mate_api.id
  stage_name  = "prod"
}


resource "aws_api_gateway_resource" "trail_mate_resource" {
  rest_api_id = aws_api_gateway_rest_api.trail_mate_api.id
  parent_id   = aws_api_gateway_rest_api.trail_mate_api.root_resource_id
  path_part   = "{proxy+}"  # This allows for any path to be proxied to your ECS service
}

resource "aws_api_gateway_method" "trail_mate_proxy_method" {
  rest_api_id   = aws_api_gateway_rest_api.trail_mate_api.id
  resource_id   = aws_api_gateway_resource.trail_mate_resource.id
  http_method   = "ANY"
  authorization = "NONE"

  request_parameters = {
    "method.request.path.proxy" = true
  }
}

resource "aws_api_gateway_integration" "trail_mate_integration" {
  rest_api_id = aws_api_gateway_rest_api.trail_mate_api.id
  resource_id = aws_api_gateway_resource.trail_mate_resource.id
  http_method = aws_api_gateway_method.trail_mate_proxy_method.http_method

  type                    = "HTTP_PROXY"
  integration_http_method = "ANY"
  uri                     = "http://${aws_lb.trail_mate_lb.dns_name}/{proxy}"

  request_parameters = {
    "integration.request.path.proxy" = "method.request.path.proxy"
  }
}
