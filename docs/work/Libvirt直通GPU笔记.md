## Libvirt直通GPU笔记



### 环境

Host: Ubuntu 22.04 LTS

Arch: x86_64



检查

```shell
virt-host-validate
```



#### 1、开启IOMMU

- IOMMU: input/output memory management unit
- 控制设备dma地址映射到机器物理地址（dmar）

![img](https://img-blog.csdnimg.cn/20200606163817948.png)

修改GRUB,在 `GRUB_CMDLINE_LINUX_DEFAULT` 的值的后面添加参数：intel_iommu=on iommu=pt

***注意：centos下是GRUB_CMDLINE_LINUX，ubuntu是GRUB_CMDLINE_LINUX_DEFAULT***

```shell
sudo vim /etc/default/grub

#添加如下配置
GRUB_CMDLINE_LINUX="modprobe.blacklist='nouveau' intel_iommu=on iommu=pt"
```

然后保存

```shell
sudo update-grub
```

重启系统

```shell
sudo reboot now
```

检查IOMMU是否开启

```shell
sudo dmesg | grep -i -e DMAR -e IOMMU
```





#### 2、配置VFIO

- 检查是否有配置

```shell
grep vfio-pci /lib/modules/"$(uname -r)"/modules.builtin || echo CONFIG_VFIO_PCI=m
```

- 如果没有，则创建

```shell
ubuntu
echo "vfio
vfio-pci
vfio-iommu-type1" | sudo tee -a /etc/modules

sudo update-initramfs -u -k all


Centos
touch /etc/modprobe.d/01-vfio-pci.conf
vim /etc/modprobe.d/01-vfio-pci.conf

vfio-pci写入文件
```



验证是否配置成功

- 查看显卡所在的PCIE总线和产品型号：

```shell
sudo lspci -nnv | grep -i nvidia
```

- 查看显卡设备所在的immou group:

```shell
sudo dmesg | grep iommu | grep 01:00.0
```

- 查看iommu group中的所有设备：

```shell
sudo dmesg | grep "iommu group 17"
```





查看设备信息

```shell
virsh modedev-dumpxml pci_0000_01_00_0
```



参考：

[GPU-Passthrough-On-Ubuntu-22.04.2-for-Beginners]([GitHub - Andrew-Willms/GPU-Passthrough-On-Ubuntu-22.04.2-for-Beginners](https://github.com/Andrew-Willms/GPU-Passthrough-On-Ubuntu-22.04.2-for-Beginners))