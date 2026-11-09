data "azurerm_resource_group" "project" {
  name = var.resource_group_name
}

locals {
  suffix = substr(sha256("${var.subscription_id}/${var.resource_group_name}"), 0, 10)
  tags = {
    project    = "Sonora"
    course     = "FIAP-GS-2026-02"
    managed_by = "Terraform"
  }
  bootstrap_files = {
    "provision.sh"      = file("${path.module}/../../linux/provision.sh")
    "monitor.sh"        = file("${path.module}/../../linux/monitor.sh")
    "deploy-release.py" = file("${path.module}/../../linux/deploy-release.py")
  }
}

resource "azurerm_virtual_network" "project" {
  name                = "${var.name_prefix}-vnet"
  location            = var.location
  resource_group_name = data.azurerm_resource_group.project.name
  address_space       = ["10.42.0.0/16"]
  tags                = local.tags
}
resource "azurerm_subnet" "apps" {
  name                 = "apps"
  resource_group_name  = data.azurerm_resource_group.project.name
  virtual_network_name = azurerm_virtual_network.project.name
  address_prefixes     = ["10.42.1.0/24"]
}
resource "azurerm_public_ip" "apps" {
  name                = "${var.name_prefix}-ip"
  resource_group_name = data.azurerm_resource_group.project.name
  location            = var.location
  allocation_method   = "Static"
  sku                 = "Standard"
  domain_name_label   = "${var.name_prefix}-${local.suffix}"
  tags                = local.tags
}
resource "azurerm_network_security_group" "apps" {
  name                = "${var.name_prefix}-nsg"
  resource_group_name = data.azurerm_resource_group.project.name
  location            = var.location
  tags                = local.tags
  security_rule {
    name                       = "https-and-acme"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_ranges    = ["80", "443"]
    source_address_prefix      = "Internet"
    destination_address_prefix = "*"
  }
  dynamic "security_rule" {
    for_each = var.admin_cidr == null ? [] : [var.admin_cidr]
    content {
      name                       = "admin-ssh"
      priority                   = 110
      direction                  = "Inbound"
      access                     = "Allow"
      protocol                   = "Tcp"
      source_port_range          = "*"
      destination_port_range     = "22"
      source_address_prefix      = security_rule.value
      destination_address_prefix = "*"
    }
  }
  security_rule {
    name                       = "deny-other-inbound"
    priority                   = 4000
    direction                  = "Inbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}
resource "azurerm_network_interface" "apps" {
  name                = "${var.name_prefix}-nic"
  resource_group_name = data.azurerm_resource_group.project.name
  location            = var.location
  tags                = local.tags
  ip_configuration {
    name                          = "apps"
    subnet_id                     = azurerm_subnet.apps.id
    private_ip_address_allocation = "Static"
    private_ip_address            = "10.42.1.10"
    public_ip_address_id          = azurerm_public_ip.apps.id
  }
}
resource "azurerm_network_interface_security_group_association" "apps" {
  network_interface_id      = azurerm_network_interface.apps.id
  network_security_group_id = azurerm_network_security_group.apps.id
}

resource "azurerm_storage_account" "releases" {
  name                            = "sonora${local.suffix}rel"
  resource_group_name             = data.azurerm_resource_group.project.name
  location                        = var.location
  account_tier                    = "Standard"
  account_replication_type        = "LRS"
  min_tls_version                 = "TLS1_2"
  shared_access_key_enabled       = false
  allow_nested_items_to_be_public = false
  tags                            = local.tags
  blob_properties {
    versioning_enabled = true
    delete_retention_policy { days = 7 }
  }
}
resource "azurerm_storage_container" "releases" {
  name                  = "releases"
  storage_account_id    = azurerm_storage_account.releases.id
  container_access_type = "private"
}

resource "azurerm_linux_virtual_machine" "apps" {
  name                            = "${var.name_prefix}-vm"
  computer_name                   = "sonora"
  resource_group_name             = data.azurerm_resource_group.project.name
  location                        = var.location
  size                            = var.vm_size
  admin_username                  = "sonoraadmin"
  disable_password_authentication = true
  network_interface_ids           = [azurerm_network_interface.apps.id]
  patch_mode                      = "AutomaticByPlatform"
  tags                            = local.tags
  identity { type = "SystemAssigned" }
  admin_ssh_key {
    username   = "sonoraadmin"
    public_key = var.admin_ssh_public_key
  }
  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "StandardSSD_LRS"
    disk_size_gb         = 32
  }
  source_image_reference {
    publisher = "Canonical"
    offer     = "ubuntu-24_04-lts"
    sku       = var.architecture == "arm64" ? "server-arm64" : "server"
    version   = "latest"
  }
  custom_data = base64encode(templatefile("${path.module}/cloud-init.yaml.tftpl", {
    files = local.bootstrap_files
    fqdn  = azurerm_public_ip.apps.fqdn
  }))
  lifecycle {
    prevent_destroy = true
    # Mudanças nos scripts são aplicadas pelo workflow de infraestrutura sem recriar a VM.
    ignore_changes = [custom_data]
  }
  depends_on = [azurerm_network_interface_security_group_association.apps]
}
resource "azurerm_role_assignment" "vm_read_releases" {
  scope                = azurerm_storage_container.releases.id
  role_definition_name = "Storage Blob Data Reader"
  principal_id         = azurerm_linux_virtual_machine.apps.identity[0].principal_id
}

resource "azurerm_user_assigned_identity" "deploy" {
  name                = "${var.name_prefix}-deploy"
  location            = var.location
  resource_group_name = data.azurerm_resource_group.project.name
  tags                = local.tags
}
resource "azurerm_federated_identity_credential" "deploy" {
  name                      = "github-sonora"
  user_assigned_identity_id = azurerm_user_assigned_identity.deploy.id
  audience                  = ["api://AzureADTokenExchange"]
  issuer                    = "https://token.actions.githubusercontent.com"
  subject                   = "repo:${var.github_repository}:ref:refs/heads/main"
}
resource "azurerm_role_assignment" "deploy_vm" {
  scope                = azurerm_linux_virtual_machine.apps.id
  role_definition_name = "Virtual Machine Contributor"
  principal_id         = azurerm_user_assigned_identity.deploy.principal_id
}
resource "azurerm_role_assignment" "deploy_releases" {
  scope                = azurerm_storage_container.releases.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.deploy.principal_id
}
