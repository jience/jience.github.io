## Libvirt学习笔记



### 概述

磁盘的置备方式：瘦置备模式（thin-provision disk），厚置备模式（thick-provision disk）也称为预分配磁盘；





### 使用virt-install安装Windows 7操作系统0

1. 创建所需大小的虚拟磁盘。例如，我们将使用raw磁盘格式创建一个20GB磁盘：

   ```shell
   qemu-img create -f raw /var/lib/libvirt/images/win10.img 20G
   ```

2. 通过以下命令启动 virt-install：

   ```shell
   virt-install \
   --name win10 \
   --ram 2048 \
   --vcpus=1 \
   --os-type=windows \
   --os-variant=win10 \
   --disk path=/var/lib/libvirt/images/win10.img \
   --cdrom=/var/lib/libvirt/images/cn_windows_7.iso \
   --network network=default \
   --debug
   ```

3. 使用virt-viewer 启动虚拟机：

   ```shell
   virt-viewer win10
   ```

   

