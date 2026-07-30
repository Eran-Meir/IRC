terraform {
  backend "s3" {
    # The actual bucket name, region, endpoints, and credentials
    # will be injected via `terraform init -backend-config="..."` in GitHub Actions
    # to keep this file clean and environment-agnostic.
    skip_region_validation      = true
    skip_credentials_validation = true
    skip_requesting_account_id  = true
    use_path_style              = true
    skip_s3_checksum            = true
    key                         = "test/terraform.tfstate"
  }
}
