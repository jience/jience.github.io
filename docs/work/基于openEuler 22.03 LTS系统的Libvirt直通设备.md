## 基于openEuler 22.03 LTS系统的Libvirt直通设备管理



> 设备直通技术是指将host上的物理设备直接呈现给一台虚拟机，虚拟机可以直接访问该设备资源的一种使用方式。使用设备直通的方式可以让虚拟机获得良好的I/O性能。
>
> 当前设备直通使用的是VFIO方式，按照直通的设备类型可以分为PCI直通和SR-IOV直通两种类型。



#### 环境

Host OS: openEuler 22.03 (LTS-SP3)

Qemu: 6.2.0

Libvirt: 6.2.0

Arch: x86_64



#### 前提条件

##### 开启IOMMU

- 检查内核是否开启IOMMU功能，注意区分Intel和AMD的CPU，以下时IntelCPU为示例

方式一

```shell
dmesg | grep -E "DMAR|IOMMU"
```

方式二

```
virt-host-validate
```

- 如果未开启，进行如下操作开启

  在如下配置项中添加intel_iommu=on, iommu=pt

```shell
# Add intel_iommu=on to kernel cmdline
vim /etc/default/grub
# 添加如下配置 GRUB_CMDLINE_LINUX末尾添加intel_iommu=on, iommu=pt
GRUB_CMDLINE_LINUX="intel_iommu=on iommu=pt"

# 重新创建引导
# UEFI启动
grub2-mkconfig -o /boot/efi/EFI/openEuler/grub.cfg
# BiOS启动
# grub2-mkconfig -o /boot/grub2/grub.cfg

# 重启host节点
reboot now
```

##### 启用 vfio-pci 内核模块

- 临时加载

  ```shell
  modprobe vfio-pci
  ```

  

- 永久加载（推荐）

  ```shell
  vim /etc/modprobe.d/vfio.conf
  # 添加如下配置
  options vfio-pci ids=10de:1d01,10de:0fb8,10de:1c31,10de:10f1
  # 注：以上意思是当vfio-pci模块被加载时，它应该接管所有设备ID为10de:1d01的设备。
  
  # 验证
  dmesg | grep -i vfio
  
  vim /etc/modules-load.d/vfio-pci.conf
  # 添加如下配置
  vfio
  vfio-pci
  vfio-iommu-type1
  # 注：/etc/modules-load.d/目录下的配置文件用于定义在系统启动时自动加载的内核模块。因此该命令的功能是让系统在下次启动时，自动加载vfio-pci模块。
  
  # 重启host节点
  reboot now
  
  # 查看
  lsmod | grep vfio_pci
  ```

  



### 查看PCI设备信息

- 查看显卡所在的PCIE总线和产品型号

```shell
lspci -nnv | grep -i nvidia
```

- 查看显卡设备所在的immou group

```she
dmesg | grep iommu | grep 65:00.0
```

- 查看iommu group中的所有设备

```shell
dmesg | grep "iommu group 66"
```



#### 将PCI设备从主机解绑，重新绑定到vfio-pci驱动

当我们把一个设备直通给虚拟机时，首先要做的就是将这个设备从host上进行**解**绑，即解除host上此设备的驱动，然后将设备驱动绑定为“vfio-pci”，在完成绑定后会新增一个 /dev/vfio/$groupid 的文件，其中$groupid为此PCI设备的iommu group id， 这个id号是在操作系统加载iommu driver遍历扫描host上的PCI设备的时候就已经分配好的，可以使用 readlink -f /sys/bus/pci/devices/$bdf/iommu_group 来查询。

设备挂载在pci bus下，可以使用 vfio-pci 来管理这个group。使用vfio-pci来管理设备时，首先从原来的驱动里unbind该PCI设备，然后将id写入新的vfio-pci路径下，会为这个group创建一个字符设备。

```shell
lspci -n -s 0000:65:00.0

# 将PCI设备从主机解绑，注意,不仅要将要透传的设备解绑,还要将与设备同iommu_group的设备都解绑,才能透传成功.
echo 0000:65:00.0 > /sys/bus/pci/devices/0000:65:00.0/driver/unbind

# 将该PCI设备重新绑定到vfio-pci驱动
lspci -ns 0000:65:00.0 |awk -F':| ' '{print 5" "6}' > /sys/bus/pci/drivers/vfio-pci/new_id
# echo 10de 1c31 > /sys/bus/pci/drivers/vfio-pci/new_id

# 将该PCI设备从vfio-pci驱动解绑
# echo 0000:65:00.0 > /sys/bus/pci/devices/0000:65:00.0/driver/bind
# echo 10de 1c31 > /sys/bus/pci/drivers/vfio-pci/remove_id

# 查看是否绑定vfio成功 如果绑定成功,/dev/vfio 目录下会出现该device所属的iommu_group号.
ls /dev/vfio
```

将PCI设备绑定到vfio-pci驱动后，在主机上无法查询到对应信息，只能查询到对应的PCI设备信息。



##### 查看PCI设备使用的驱动

```shell
lspci -nnk -d 10de:1c31
# lspci -vv -s 65:00.0 | grep driver
# lspci -v | grep -A 10 "NVIDIA"
```

如果输出Kernel driver in use: vfio-pci 则表示成功。



#### 虚机配置PCI直通设备

- 识别设备

  ```shell
  virsh nodedev-list --tree
  ```

- 获取设备xml

  ```shell
  virsh nodedev-dumpxml <pcidev>
  # 示例：virsh nodedev-dumpxml pci_0000_65_00_0
  ```

- detach分离设备(待确认是否执行)

  ```shell
  virsh nodedev-dettach <pcidev>
  ```

- 在KVM通过修改xml文件或virt-manager管理工具给虚拟机添加PCI设备

  

  第一种方式：修改xml文件

  ```shell
  virsh edit --domain win10
  ```

  第二种方式：virt-manager管理工具

  虚拟机配置项下选择“Add Hardware>PCI Host Device”,将PCI设备添加到VM中，启动虚拟机在设备管理器中查看对应的设备。

  



#### 概念介绍

##### VFIO

> Virtual Function I/O (VFIO) 是一种现代化的设备直通方案，它充分利用了VT-d/AMD-Vi技术提 供的DMA Remapping和Interrupt Remapping特性， 在保证直通设备的DMA安全性同时可以达到 接近物理设备的I/O的性能。 用户态进程可以直接使用VFIO驱动直接访问硬件，并且由于整个过程 是在IOMMU的保护下进行因此十分安全， 而且非特权用户也是可以直接使用。 换句话说，VFIO是 一套完整的用户态驱动(userspace driver)方案，因为它可以安全地把设备I/O、中断、DMA等能力呈 现给用户空间。
>
> 为了达到最高的IO性能，虚拟机就需要VFIO这种设备直通方式，因为它具有低延时、高带宽的 特点，并且guest也能够直接使用设备的原生驱动。 这些优异的特点得益于VFIO对VT-d/AMD-Vi所提 供的DMA Remapping和Interrupt Remapping机制的应用。 VFIO使用DMA Remapping为每个 Domain建立独立的IOMMU Page Table将直通设备的DMA访问限制在Domain的地址空间之内保证 了用户态DMA的安全性， 使用Interrupt Remapping来完成中断重映射和Interrupt Posting来达到中 断隔离和中断直接投递的目的





### 参考

[管理设备 (openeuler.org)](https://docs.openeuler.org/zh/docs/22.03_LTS_SP4/docs/Virtualization/管理设备.html)

[GPU virtualization with QEMU/KVM | Ubuntu](https://ubuntu.com/server/docs/gpu-virtualization-with-qemu-kvm)

[GPU Passthrough on GNU/Linux | gpu-passthrough (clayfreeman.github.io)](https://clayfreeman.github.io/gpu-passthrough/)

[虚拟机显卡直通 (PCI passthrough via OVMF) | 林伟源的技术博客 (linweiyuan.github.io)](https://linweiyuan.github.io/2022/11/25/虚拟机显卡直通-PCI-passthrough-via-OVMF.html)

[VFIO概述 - EwanHai - 博客园 (cnblogs.com)](https://www.cnblogs.com/haiyonghao/p/14440944.html)

https://wiki.archlinux.org/title/PCI_passthrough_via_OVMF



