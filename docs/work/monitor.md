# 服务监控

> 通过`exporter`采集节点和容器的监控数据，并推送到`prometheus` \
> 根据各服务设置的告警规则，`prometheus`通过`alertmanager`实现告警信息推送 \
> 同时可通过`grafana`实现可视化

### 预研环境

1. http://178.103.224.129:3000/dashboards admin/123qwe
2. http://178.103.224.129:9090

### 相关镜像

1. harbor.archeros.cn/library/prometheus/prometheus:v2.43.0-x86
    - 基于prometheus 2.43.0
2. harbor.archeros.cn/library/prometheus/alertmanager:v0.25.0-x86
    - 基于alertmanager 0.25.0
3. harbor.archeros.cn/library/prometheus/grafana:9.4.7-x86
    - 基于grafana 9.4.7
4. harbor.archeros.cn/library/prometheus/node-docker-exporter:latest-x86
    - 基于node-exporter 1.5.0 + cadvisor 0.47.1

### 目录

```
.

├── /opt/haihe/monitor              // 配置文件目录
│   │── monitor.yml                 // docker-compose部署文件
│   │── alertmanager.yml            // alertmanager配置文件
│   │── prometheus.yml              // prometheus配置文件
│   └── rules.yaml                  // 告警规则文件
│ 
├── /var/log/haihe/monitor          // 数据文件目录
│   ├── grafana                     // grafana数据目录
│   └── prometheus                  // prometheus数据目录
```

### 服务部署

> prometheus + alertmanager + node-docker-exporter \
> 可选项: grafana

```yaml
version: "2.4"

services:

  prometheus:
    image: harbor.archeros.cn/library/prometheus/prometheus:v2.43.0-x86
    restart: always
    network_mode: "host"
    command:
      - --config.file=/etc/prometheus/prometheus.yml
      - --web.enable-lifecycle
      - --storage.tsdb.retention=30d
    volumes:
      - /etc/hosts:/etc/hosts
      - /usr/share/zoneinfo/Asia/Shanghai:/etc/localtime
      - /opt/haihe/monitor/prometheus.yml:/etc/prometheus/prometheus.yml
      - /opt/haihe/monitor/rules.yaml:/etc/prometheus/rules.yaml
      - /var/log/haihe/monitor/prometheus:/prometheus
    healthcheck:
      test: [ "CMD", "wget", "--spider", "http://127.0.0.1:9090/-/ready" ]
      interval: 10s
      timeout: 10s
      retries: 3
      start_period: 30s
    sysctls:
      net.core.somaxconn: 1024
    ulimits:
      nproc: 65535
      nofile:
        soft: 20000
        hard: 40000

  alertmanager:
    image: harbor.archeros.cn/library/prometheus/alertmanager:v0.25.0-x86
    restart: always
    network_mode: "host"
    volumes:
      - /etc/hosts:/etc/hosts
      - /usr/share/zoneinfo/Asia/Shanghai:/etc/localtime
      - /opt/haihe/monitor/alertmanager.yml:/etc/alertmanager/alertmanager.yml
    healthcheck:
      test: [ "CMD", "wget", "--spider", "http://127.0.0.1:9093/-/ready" ]
      interval: 10s
      timeout: 10s
      retries: 3
      start_period: 30s
    sysctls:
      net.core.somaxconn: 1024
    ulimits:
      nproc: 65535
      nofile:
        soft: 20000
        hard: 40000

  exporter:
    image: harbor.archeros.cn/library/prometheus/node-docker-exporter:latest-x86
    restart: always
    network_mode: "host"
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:rw
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
      - /dev/disk/:/dev/disk:ro
      - /:/host:ro,rslave
    devices:
      - /dev/kmsg:/dev/kmsg
    healthcheck:
      test: [ "CMD", "wget", "--spider", "http://127.0.0.1:9100/metrics" ]
      interval: 10s
      timeout: 10s
      retries: 3
      start_period: 30s
    sysctls:
      net.core.somaxconn: 1024
    ulimits:
      nproc: 65535
      nofile:
        soft: 20000
        hard: 40000

  grafana:
    image: harbor.archeros.cn/library/prometheus/grafana:9.4.7-x86
    restart: always
    network_mode: "host"
    volumes:
      - /var/log/haihe/monitor/grafana:/var/lib/grafana
    healthcheck:
      test: [ "CMD", "wget", "--spider", "http://127.0.0.1:3000/api/health" ]
      interval: 10s
      timeout: 10s
      retries: 3
      start_period: 30s
    sysctls:
      net.core.somaxconn: 1024
    ulimits:
      nproc: 65535
      nofile:
        soft: 20000
        hard: 40000
```

### Prometheus配置文件

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - 127.0.0.1:9093

rule_files:
  - "rules.yaml"

scrape_configs:
  - job_name: 'node-exporter'
    static_configs:
      - targets:
          - 127.0.0.1:9100
        labels:
          instance: 178.103.224.129
          job: node-exporter

  - job_name: 'docker-exporter'
    static_configs:
      - targets:
          - 127.0.0.1:8080
        labels:
          instance: 178.103.224.129
          job: docker-exporter
```

#### 告警项

| 告警类型 | 指标                 | 告警值             |
|:-----|:-------------------|:----------------|
| 主机告警 | 主机宕机               |                 |
| 主机告警 | CPU负载过高            | 5分钟内CPU负载超过10   |
| 主机告警 | CPU使用率过高           | 5分钟内CPU使用率超过80% |
| 主机告警 | 内存使用率过高            | 80%             |
| 主机告警 | 磁盘空间剩余不足           | 30%             |
| 主机告警 | 主机磁盘读取速率过高         | 50 MB/s         |
| 主机告警 | 主机磁盘写入速率过高         | 50 MB/s         |
| 主机告警 | 主机磁盘读取延迟过高         | 100ms           |
| 主机告警 | 主机磁盘写入延迟过高         | 100ms           |
| 主机告警 | 主机网卡入口流量过高         | 100 MB/s        |
| 主机告警 | 主机网卡出口流量过高         | 100 MB/s        |
| 主机告警 | 主机ESTABLISHED连接数过高 | 1000            |
| 主机告警 | 主机TIME_WAIT连接数过高   | 1000            |
| 容器告警 | 容器实例宕机             |                 |
| 容器告警 | 容器被杀死              | 1m              |
| 容器告警 | 容器CPU使用率过高         | 80%             |
| 容器告警 | 容器内存使用率过高          | 80%             |
| 容器告警 | 容器磁盘空间使用率过高        | 80%             |

### 告警规则 rules.yaml

```yaml
groups:
  - name: Docker.rules
    rules:
      - alert: DockerInstanceDown
        expr: up{job="docker-exporter"} == 0
        for: 0m
        labels:
          severity: critical
        annotations:
          title: 'Docker Instance down'
          description: "容器实例: 【{{ $labels.instance }}】已停机"

      - alert: ContainerKilled
        expr: time() - container_last_seen > 60
        for: 1m
        labels:
          severity: critical
        annotations:
          title: "A Container has been killed"
          description: "容器【{{ $labels.name }}】 has has been killed"

      - alert: ContainerCpuUsage
        expr: (sum by(instance, name) (rate(container_cpu_usage_seconds_total{name!=""}[3m])) * 100) > 80
        for: 2m
        labels:
          severity: warning
        annotations:
          title: "容器CPU使用率过高"
          description: "容器【{{ $labels.name }}】 CPU使用率已超过 80%, 当前值: {{ $value }}"

      - alert: ContainerMemoryUsage
        expr: (sum by(instance, name) (container_memory_working_set_bytes{name!=""}) / sum by(instance, name) (container_spec_memory_limit_bytes{name!=""} > 0) * 100)  > 80
        for: 2m
        labels:
          severity: warning
        annotations:
          title: "容器内存使用率过高"
          description: "容器【{{ $labels.name }}】 内存使用率已超过 80%, 当前值: {{ $value }}"
      - alert: ContainerVolumeUsage
        expr: (1 - (sum(container_fs_inodes_free) BY (instance) / sum(container_fs_inodes_total) BY (instance))) * 100 > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          title: "容器磁盘空间使用率过高"
          description: "容器【{{ $labels.name }}】 磁盘空间使用率已超过 80%, 当前值: {{ $value }}"

  - name: Node.rules
    rules:
      - alert: HostDown
        expr: up{job="node-exporter"} == 0
        for: 0m
        labels:
          severity: critical
        annotations:
          title: 'Host Instance down'
          description: "主机: 【{{ $labels.instance }}】已停机"

      - alert: HostCpuLoadAvage
        expr: sum(node_load5) by (instance) > 10
        for: 1m
        annotations:
          title: "5分钟内CPU负载过高"
          description: "主机: 【{{ $labels.instance }}】 5分钟内CPU负载超过10, 当前值：{{ $value }}"
        labels:
          severity: 'warning'

      - alert: HostCpuUsage
        expr: (1-((sum(increase(node_cpu_seconds_total{mode="idle"}[5m])) by (instance))/ (sum(increase(node_cpu_seconds_total[5m])) by (instance))))*100 > 80
        for: 1m
        annotations:
          title: "CPU使用率过高"
          description: "主机: 【{{ $labels.instance }}】 5分钟内CPU使用率超过80%, 当前值：{{ $value }}"
        labels:
          severity: 'warning'

      - alert: HostMemoryUsage
        expr: (1-((node_memory_Buffers_bytes + node_memory_Cached_bytes + node_memory_MemFree_bytes)/node_memory_MemTotal_bytes))*100 > 80
        for: 1m
        annotations:
          title: "内存使用率过高"
          description: "主机: 【{{ $labels.instance }}】 内存使用率超过80%, 当前使用率：{{ $value }}%"
        labels:
          severity: 'warning'

      - alert: HostFileSystemUsage
        expr: (1-(node_filesystem_free_bytes{fstype=~"ext4|xfs",mountpoint!~".*tmp|.*boot" }/node_filesystem_size_bytes{fstype=~"ext4|xfs",mountpoint!~".*tmp|.*boot" }))*100 > 70
        for: 1m
        annotations:
          title: "磁盘空间剩余不足"
          description: "主机: 【{{ $labels.instance }}】 {{ $labels.mountpoint }}分区使用率超过70%, 当前值使用率：{{ $value }}%"
        labels:
          severity: 'warning'

      - alert: HostUnusualDiskReadRate
        expr: sum by (instance, device) (rate(node_disk_read_bytes_total{device!~"sr.*"}[2m])) / 1024 / 1024 > 50
        for: 5m
        labels:
          severity: 'warning'
        annotations:
          title: "主机磁盘读取速率过高"
          description: "主机: 【{{ $labels.instance }}】, 磁盘: {{ $labels.device }} 读取速度超过(50 MB/s), 当前值: {{ $value }} MB/s"

      - alert: HostUnusualDiskWriteRate
        expr: sum by (instance, device) (rate(node_disk_written_bytes_total{device!~"sr.*"}[2m])) / 1024 / 1024 > 50
        for: 2m
        labels:
          severity: 'warning'
        annotations:
          title: "主机磁盘写入速率过高"
          description: "主机: 【{{ $labels.instance }}】, 磁盘: {{ $labels.device }} 写入速度超过(50 MB/s), 当前值: {{ $value }} MB/s"


      - alert: HostUnusualDiskReadLatency
        expr: rate(node_disk_read_time_seconds_total{device!~"sr.*"}[1m]) / rate(node_disk_reads_completed_total{device!~"sr.*"}[1m]) > 0.1 and rate(node_disk_reads_completed_total{device!~"sr.*"}[1m]) > 0
        for: 2m
        labels:
          severity: 'warning'
        annotations:
          title: "主机磁盘读取延迟过高"
          description: "主机: 【{{ $labels.instance }}】, 磁盘: {{ $labels.device }} 读取延迟过高 (> 100ms), 当前延迟值: {{ $value }}ms"

      - alert: HostUnusualDiskWriteLatency
        expr: rate(node_disk_write_time_seconds_total{device!~"sr.*"}[1m]) / rate(node_disk_writes_completed_total{device!~"sr.*"}[1m]) > 0.1 and rate(node_disk_writes_completed_total{device!~"sr.*"}[1m]) > 0
        for: 2m
        labels:
          severity: 'warning'
        annotations:
          title: "主机磁盘写入延迟过高"
          description: "主机: 【{{ $labels.instance }}】, 磁盘: {{ $labels.device }} 写入延迟过高 (> 100ms), 当前延迟值: {{ $value }}ms"


      - alert: HostNetworkConnection-ESTABLISHED
        expr: sum(node_netstat_Tcp_CurrEstab) by (instance) > 1000
        for: 5m
        labels:
          severity: 'warning'
        annotations:
          title: "主机ESTABLISHED连接数过高"
          description: "主机: 【{{ $labels.instance }}】 ESTABLISHED连接数超过1000, 当前ESTABLISHED连接数: {{ $value }}"

      - alert: HostNetworkConnection-TIME_WAIT
        expr: sum(node_sockstat_TCP_tw) by (instance) > 1000
        for: 5m
        labels:
          severity: 'warning'
        annotations:
          title: "主机TIME_WAIT连接数过高"
          description: "主机: 【{{ $labels.instance }}】 TIME_WAIT连接数超过1000, 当前TIME_WAIT连接数: {{ $value }}"

      - alert: HostUnusualNetworkThroughputIn
        expr: sum by (instance, device) (rate(node_network_receive_bytes_total{device!~"docker0|lo"}[2m])) / 1024 / 1024 > 100
        for: 5m
        labels:
          severity: 'warning'
        annotations:
          title: "主机网卡入口流量过高"
          description: "主机: 【{{ $labels.instance }}】, 网卡: {{ $labels.device }} 入口流量超过 (> 100 MB/s), 当前值: {{ $value }}"

      - alert: HostUnusualNetworkThroughputOut
        expr: sum by (instance, device) (rate(node_network_transmit_bytes_total{device!~"docker0|lo"}[2m])) / 1024 / 1024 > 100
        for: 5m
        labels:
          severity: 'warning'
        annotations:
          title: "主机网卡出口流量过高"
          description: "主机: 【{{ $labels.instance }}】, 网卡: {{ $labels.device }} 出口流量超过 (> 100 MB/s), 当前值: {{ $value }}"

```

#### 告警配置

> todo: 目前webhook所指的url只是打印告警信息，尚未接入管控平台

```yaml
global:
  resolve_timeout: 5m

route:
  group_by: [ 'alertname' ]
  group_wait: 10s
  group_interval: 1m
  receiver: webhook
  repeat_interval: 1h # 发送重复告警的周期。如果已经发送了通知，再次发送之前需要等待多长时间。

receivers:
  - name: 'webhook'
    webhook_configs:
      - url: 'http://178.103.224.129:11623/putPrometheusAlert'

```

#### 展监控数据

> api-gateway网关提供接口 /getPrometheusMetric \
> 参数 {"range":0,"metrics":["cpu.used.percent"]} \
> range表示数据范围，单位天，默认值0则返回最近2h数据 \
> metrics表示指标列表，可选值见下表，默认空值则返回所有指标

##### metrics参数列表

| 参数                    | 说明        |
|:----------------------|:----------|
| cpu.used.percent      | CPU使用率    |
| mem.used.percent      | 内存使用率     |
| df.bytes.used.percent | 磁盘使用率     |
| disk.io.write.bytes   | 磁盘吞吐量(写)  |
| disk.io.read.bytes    | 磁盘吞吐量(读)  |
| disk.io.write.sec     | 磁盘IOPS(写) |
| disk.io.read.sec      | 磁盘IOPS(读) |
| disk.io.write.delay   | 磁盘延迟(写)   |
| disk.io.read.delay    | 磁盘延迟(读)   |
| net.bytes.write       | 网络吞吐量(发送) |
| net.bytes.read        | 网络吞吐量(接受) |

##### 返回值示例

> 返回值中的metric值属性见下表

| 属性         | 说明            | 是否必有 |
|:-----------|:--------------|:-----|
| instance   | 主机实例名         | 是    |
| metric     | 指标            | 是    |
| device     | 设备名(磁盘/分区/网卡) | 否    |
| mountpoint | 挂载目录          | 否    |

```json
{
  "requestId": "d8c7d47c-9f81-4908-a2c8-3733fa9ec233",
  "data": [
    {
      "metric": {
        "instance": "178.103.224.129",
        "metric": "cpu.used.percent"
      },
      "values": [
        [
          1681105845,
          "37.500000000000014"
        ],
        [
          1681105905,
          "32.01666666665308"
        ],
        [
          1681105965,
          "29.233333333298404"
        ]
      ]
    }
  ]
}
```

#### 已知问题

1. 告警信息尚未接入管控平台
2. 容器告警项 `ContainerKilled` 存在已知问题
    - 告警语法 `time() - container_last_seen > 60`在容器killed 60秒之后会触发告警提示
    - 如果此容器长时间未恢复正常或未重启，容器相关数据会从监控数据中消失，导致告警条件不再满足，触发告警已恢复的条件
    - 解决方案: 告警语法使用 `absent(container_last_seen{device="容器名"})` 代替 `time() - container_last_seen > 60`，
        - 新语法的问题:
            1. 无通用规则可监控所有容器，需按`容器名`一个容器写一个规则
            2. 告警时数据无法获取labels信息，无主机实例instance信息，高可用环境下无法知道是哪台主机的容器被kill了
