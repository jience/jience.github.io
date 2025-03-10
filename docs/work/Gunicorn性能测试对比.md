## Gunicorn性能测试对比

#### 使用Gevent测试worker数的性能指标

- 服务器规格环境：4C8G

| 序号 | worker class | threads | worker数量  | RPS  |
| ---- | ------------ | ------- | ----------- | ---- |
| 1    | gevent       | 1       | 1           | 1376 |
| 2    | gevent       | 1       | 2           | 2409 |
| 3    | gevent       | 1       | 4           | 2657 |
| 4    | gevent       | 1       | CPU核数*2+1 | 2425 |

