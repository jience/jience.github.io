## 通过noVNC连接QEMU/KVM虚机



### 概述

[noVNC](https://novnc.com/info.html) 是一个 HTML5 VNC 客户端，采用 HTML 5 WebSockets, Canvas 和 JavaScript 实现，noVNC 被普遍用在各大云计算、虚拟机控制面板中，比如 OpenStack Dashboard 和 OpenNebula Sunstone 都用的是 noVNC。

noVNC采用WebSockets实现，但是目前大多数VNC服务器都不支持 WebSockets，所以noVNC是不能直接连接 VNC 服务器的，需要一个代理来做WebSockets和TCP sockets 之间的转换。这个代理在noVNC的目录里，叫做websockify。

### 环境

QEMU/KVM主机：10.52.0.221

客户机(虚拟机)： Ubuntu20.04 LTS

### 安装

#### 1. 安装novnc

```shell
git clone https://github.com/novnc/noVNC
```

#### 2. 启动noVNC

```shell
cd noVMC/utils

# Encrypted WebSocket connections (wss://)
openssl req -new -x509 -days 365 -nodes -out self.pem -keyout self.pem

# Quick start noVNC
./utils/novnc_proxy --vnc localhost:5901 --listen localhost:6080
```

*注：此处已经提前使用QEMU/KVM开通好了客户机，并且客户机的vnc端口就是5901*

#### 3.通过浏览器访问客户机

https://localhost:6080/vnc.html

### 独立websockify实现一个端口，多个代理

在 websockify 项目的 [Wiki 主页](https://github.com/novnc/websockify/wiki/Token-based-target-selection)介绍了实现一个端口，多个代理的方法。

#### 1. 生成token文件

token文件内容：

```shell
cd /home/jie/noVNC/utils/websockify
mkdir token
vim generic
# generic: 10.52.0.221:5901
```

#### 2. 启动

```shell
./run --web=/home/jie/noVNC --token-plugin TokenFile --token-source /home/jie/noVNC/utils/websockify/token/ 6080
```

*注：token文件的名称和内部token的值必须一致*

#### 3. 浏览器访问

https://localhost:6080/vnc.html?path=?token=generic

*注：一定要带上 path= 这个参数*

