openEuler 22.03 LTS SP3 安装 Docker



## 配置软件源

#### 下载repo文件

```shell
curl -fsSL https://mirrors.tuna.tsinghua.edu.cn/docker-ce/linux/centos/docker-ce.repo -o /etc/yum.repos.d/docker-ce.repo
```

#### 修改repo文件

```shell
sed -i 's#https://download.docker.com#https://mirrors.tuna.tsinghua.edu.cn/docker-ce#' /etc/yum.repos.d/docker-ce.repo
```

#### 修改软件源

- openEuler 的使用方式近似 CentOS，因此，修改软件源的配置，使用 centos 7 的软件源

```shell
sed -i 's#$releasever#7#g' /etc/yum.repos.d/docker-ce.repo
```

## 建立缓存

```shell
dnf clean all
dnf makecache
```



## 安装Docker

#### 安装最新版本(默认使用yum安装的时最新版本，如果需要指定版本可以跳过这一步)

```shell
yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```



#### 安装指定版本(推荐)

##### 查看版本

```shell
yum list docker-ce --showduplicates | sort -r
```

##### 安装指定版本

```shell
yum install docker-ce-20.10.2 docker-ce-cli-20.10.2 docker-ce-rootless-extras-20.10.2 containerd.io docker-buildx-plugin docker-compose-plugin -y
```

注：如果遇到安装`docker-buildx-plugin`冲突，请先卸载。

## 启动Docker

#### 设置开机自启

```shell
systemctl enable docker --now
```



#### 查看docker信息

```shell
docker info
```

