## Redis优化

### TCP Backlog

关于 Backlog 的详细作用此处不展开，可以将它简单理解为 TCP 连接队列，用于存放待处理的请求。当服务器处理请求之后，将其从队列中移出。这个队列是有大小的，通过 `net.core.somaxconn` 参数来限制。如果队列满了，则后续的请求会被直接丢弃。

Redis 默认的 tcp-backlog 值为 511，而一般情况下，操作系统设置的值为 128。这种情况下，会限制 Redis 的性能发挥。所以在容器启动的时候，会看到如下提示：

```shell
1:M 12 May 2019 04:59:14.670 # WARNING: The TCP backlog setting of 511 cannot be enforced because /proc/sys/net/core/somaxconn is set to the lower value of 128.
```

可以用以下命令查看和设置宿主机的 tcp-backlog 参数：

```shell
cat /proc/sys/net/core/somaxconn
```



### **vm.overcommit_memory**

Redis 启动时，你可能会看到下面这种警告。

```
1:M 12 May 2019 04:59:14.670 # WARNING overcommit_memory is set to 0! Background save may fail under low memory condition. To fix this issue add 'vm.overcommit_memory = 1' to /etc/sysctl.conf
```

Memory Overcommit 的意思是操作系统承诺给进程的内存大小超过了实际可用的内存。一般来说，一个保守的操作系统一般是有多少就分配多少，不会允许 overcommit 的情况发生。

这种方式其实是比较浪费内存，因为进程实际使用到的内存往往比申请的内存少，而没有用到的内存分配不出去就闲置了。

Linux 是允许 Memory Overcommit 的，它对大部分申请内存的请求都是「同意」的，寄希望于进程实际上使用不到那么多内存，以便可以跑更多更大的程序。要注意，申请和分配是不同的概念，内存只有在使用时才会分配。

但万一用到了这么多呢？Linux 有一个 OOM（out of memory）机制来处理这种危机：挑选一个进程杀掉，腾出部分内存，如果不够就继续以上过程。

至于系统如何挑选待宰的进程，以及运维要如何保护一些特定进程，那是后话了。PS：如果说在开启了 overcommit 的机器上，频繁有服务挂掉，是时候考虑下增加机器配置了。

`overcommit_memory` 有三种取值：0、1、2。分别对应不同的内存分配策略，如下表。

| vm.overcommit_memory | 含义                                                         |
| -------------------- | ------------------------------------------------------------ |
| 0                    | 表示内核将检查是否有足够的可用内存：如果有足够的可用内存，内存申请通过，否则内存申请失败，并把错误返回给应用进程 |
| 1                    | 表示内核允许超量使用内存直到用完为止                         |
| 2                    | 表示内核绝不过量地使用内存，即系统整个内存地址空间不能超过`swap + 50%`的 RAM 值，50% 是`overcommit_ratio`默认值，此参数同样支持修改 |

Linux 上的默认取值为 0，即不开启 Memory Overcommit。Redis 建议将该值设置为 1，是为了保证后台写操作（比如重写 AOF）能够在低内存下进行。现在仔细回想下，难道是因为之前跑 Redis 的机器上同时有其它占内存的进程，导致无法正常重写 AOF？



### **Transparent Huge Pages (THP)**

Linux kernel 在 2.6.38 内核之后增加了 Transparent Huge Pages (THP) 特性 ，支持大内存页（2MB）分配，并且默认开启。而这个特性对于 Redis 而言，是弊大于利。

该特性开启时，虽然可以降低 fork 子进程的速度。但 fork 之后，每个内存页从原来 4KB 变为 2MB，会大幅增加重写期间父进程内存消耗。同时每次写命令引起的复制内存页单位放大了 512 倍，会拖慢写操作的执行时间，导致大量写操作慢查询。

执行以下命令可以禁用 THP，如果需要保证重启后也生效，建议将该命令写入 `/etc/rc.local` 文件中。

```shell
echo never > /sys/kernel/mm/transparent_hugepage/enabled
```

### **AOF 与 RDB**

Redis 之所以性能好，很大一个原因在于它是一个内存数据库，几乎所有操作都基于内存。但是内存型数据库有一个很大的弊端：当数据库进程崩溃或系统重启时，如果内存数据不保存，历史数据就会丢失不见。

这样的数据库并不可谓可靠，所以数据的持久化对于内存型数据库而言，也是至关重要的。Redis 对于数据持久化提供了两种方案：AOF 和 RDB。

RDB 相当于数据快照，与 MySQL 类比，相当于执行了 mysqldump 对数据库进行备份。可以通过手动执行 `SAVE` 或 `BGSAVE` 实现，也可以通过配置让 Redis 自动备份。

AOF 全称 Append Only File，相当于 MySQL 中的二进制操作日志。每次对数据的变更都会追加到 AOF 文件中，当服务重启时，Redis 会依次执行文件中的操作，从而恢复原始数据。

AOF 默认是关闭的，需要修改配置文件中的 `appendonly no` 为 `appendonly yes`。AOF 提供了三种同步策略，可以通过 `CONFIG GET appendfsync` 查看当前配置。

- appendfsync always，每次操作记录都同步到文件中，最低效最安全
- appendfsync everysec，每秒执行一次把操作记录同步到硬盘上，为默认选项
- appendfsync no，不执行 fysnc 调用，让操作系统自动操作把缓存数据写到硬盘上，不可靠但最快

因为 AOF 方式记录了所有的写/更新操作，时间久了，AOF 文件会越来越大。好在 Redis 提供了重写 AOF 功能，可以手动或者自动重写，压缩 AOF 文件。举个例子，在过去的一小时里，假如我对同一个 Key 写了一万次，那么压缩之后就只需要保留最后一次写操作。

AOF 重写有两个关键的配置项：`auto-aof-rewrite-percentage` 和 `auto-aof-rewrite-min-size`。当 AOF 文件超过 `auto-aof-rewrite-min-size` 时，且超过上次重写后的大小百分之 `auto-aof-rewrite-percentage` 时，会触发自动重写。

这两个方案的详细对比，以及选哪一个更合适，请看官方文档吧。如果条件允许，我建议两个同时使用。