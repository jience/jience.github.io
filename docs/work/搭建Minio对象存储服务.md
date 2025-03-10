## 搭建Minio对象存储服务

### 1. 使用Docker安装Minio Server

````shell
docker pull minio/minio:latest

````

### 2. 安装Minio客户端

```shell
docker pull minio/mc
docker run -it --entrypoint=/bin/sh minio/mc
```

### 3. 设置存储桶永久下载策略

```shell
# 客户端配置
mc config host add minio http://172.118.59.84:9000 admin admin123 --api S3v4
# 查看存储桶
mc ls minio
# 查看策略
mc policy get minio/test11
# 设置下载策略
mc policy set download minio/test11
```

