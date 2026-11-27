variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "Primary AWS region for CINEORA production deployment"
}

variable "environment" {
  type        = string
  default     = "production"
  description = "Deployment environment name"
}

variable "media_bucket_name" {
  type        = string
  description = "Globally unique Amazon S3 bucket name for CINEORA media assets and masters"
}
