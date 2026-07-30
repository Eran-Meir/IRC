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
variable "ssh_public_key" {}

provider "oci" {
  tenancy_ocid     = var.tenancy_ocid
  user_ocid        = var.user_ocid
  fingerprint      = var.fingerprint
  private_key_path = "${path.module}/api_key.pem"
  region           = var.region
}

module "prod_cluster" {
  source           = "../../modules/oci-k3s-cluster"
  environment      = "prod"
  compartment_ocid = var.compartment_ocid
  ssh_public_key   = var.ssh_public_key
  # HA Prod Cluster gets 2 nodes!
  instance_count   = 2
}

output "prod_node_ips" {
  value = module.prod_cluster.instance_public_ips
}
