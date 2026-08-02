terraform {
  required_version = ">= 1.5.0"
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = ">= 5.0.0"
    }
  }
}

variable "tenancy_ocid" {}
variable "user_ocid" {}
variable "fingerprint" {}

variable "region" {}
variable "compartment_ocid" {}
variable "grafana_admin_password" {
  default   = ""
  sensitive = true
}

provider "oci" {
  tenancy_ocid     = var.tenancy_ocid
  user_ocid        = var.user_ocid
  fingerprint      = var.fingerprint
  private_key_path = "${path.module}/api_key.pem"
  region           = var.region
}

module "test_cluster" {
  source                 = "../../modules/oci-k3s-cluster"
  environment            = "test"
  compartment_ocid       = var.compartment_ocid
  instance_count         = 1
  grafana_admin_password = var.grafana_admin_password
}

output "test_node_ips" {
  value = module.test_cluster.instance_public_ips
}

output "ssh_private_key" {
  value     = module.test_cluster.ssh_private_key
  sensitive = true
}

output "grafana_url" {
  value       = "http://${module.test_cluster.instance_public_ips[0]}:3000"
  description = "Grafana Observability Dashboard URL (Port 3000)"
}

output "web_client_url_reserved" {
  value       = "https://${module.test_cluster.instance_public_ips[0]}"
  description = "Reserved Web Client UI URL (Ports 80/443)"
}
