variable "subscription_id" {
  type = string
}
variable "resource_group_name" {
  type        = string
  description = "Grupo dedicado já criado pelo bootstrap. Não usar grupo de outros trabalhos."
}
variable "location" {
  type    = string
  default = "centralus"
}
variable "name_prefix" {
  type    = string
  default = "sonora-gs"
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,19}$", var.name_prefix))
    error_message = "Use 3–20 caracteres: letras minúsculas, números e hífen."
  }
}
variable "vm_size" {
  type    = string
  default = "Standard_B2pls_v2"
}
variable "architecture" {
  type    = string
  default = "arm64"
  validation {
    condition     = contains(["arm64", "x64"], var.architecture)
    error_message = "architecture deve ser arm64 ou x64."
  }
}
variable "admin_ssh_public_key" {
  type        = string
  description = "Somente chave pública OpenSSH; nunca chave privada."
  validation {
    condition     = can(regex("^ssh-(ed25519|rsa) ", var.admin_ssh_public_key))
    error_message = "Forneça uma chave pública OpenSSH."
  }
}
variable "admin_cidr" {
  type        = string
  default     = null
  nullable    = true
  description = "IPv4 /32 para SSH opcional. Nulo mantém SSH fechado; administrar via Azure Run Command."
  validation {
    condition     = var.admin_cidr == null ? true : can(regex("^[0-9.]+/32$", var.admin_cidr)) && can(cidrnetmask(var.admin_cidr))
    error_message = "SSH permite somente um endereço IPv4 /32."
  }
}
variable "github_repository" {
  type    = string
  default = "peguidotte/sonora"
}
