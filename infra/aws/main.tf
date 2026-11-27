terraform {
  required_version = ">= 1.7.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.80"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# 1. Private Amazon S3 Bucket for raw AI scenes, audio tracks, and final FFmpeg masters
resource "aws_s3_bucket" "media" {
  bucket = var.media_bucket_name
}

resource "aws_s3_bucket_public_access_block" "media" {
  bucket                  = aws_s3_bucket.media.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "media" {
  bucket = aws_s3_bucket.media.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# 2. Amazon CloudFront Distribution with Origin Access Control (OAC)
resource "aws_cloudfront_origin_access_control" "media_oac" {
  name                              = "cineora-${var.environment}-media-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "media_cdn" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "CINEORA ${var.environment} Global Video & Media CDN"
  price_class         = "PriceClass_All"

  origin {
    domain_name              = aws_s3_bucket.media.bucket_regional_domain_name
    origin_id                = "cineora-s3-media"
    origin_access_control_id = aws_cloudfront_origin_access_control.media_oac.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "cineora-s3-media"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

# 3. AWS Secrets Manager (zero hardcoded AI provider or JWT credentials)
resource "aws_secretsmanager_secret" "app_secrets" {
  name        = "cineora/${var.environment}/runtime-secrets"
  description = "JWT secrets, DATABASE_URL, and live AI provider API keys for CINEORA"
}

# 4. ECS Fargate Cluster for horizontally scalable stateless services
resource "aws_ecs_cluster" "cineora" {
  name = "cineora-${var.environment}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_cloudwatch_log_group" "services" {
  for_each          = toset(["api", "ai-orchestrator", "media-worker", "web"])
  name              = "/cineora/${var.environment}/${each.key}"
  retention_in_days = 30
}

output "cloudfront_domain" {
  value = aws_cloudfront_distribution.media_cdn.domain_name
}

output "media_bucket" {
  value = aws_s3_bucket.media.bucket
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.cineora.name
}
