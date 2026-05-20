# config — 游戏配置文件

## 基本信息
- **路径**: `Empire Earth II\config.cfg` 和 `config_EE2X.cfg`
- **类型**: 游戏全局参数配置
- **修改优先级**: 🔴 最高
- **修改方式**: 文本编辑器直接编辑

## 两个配置文件

| 文件 | 大小 | 用途 |
|:-----|:-----|:-----|
| `config.cfg` | 32,679 B | 基础版游戏配置 |
| `config_EE2X.cfg` | 33,638 B | 资料片游戏配置（**实际生效**） |
| `myconfig.cfg` | 412 B | 用户自定义覆盖配置 |
| `myconfig_EE2X.cfg` | 432 B | 资料片用户自定义覆盖配置 |
| `myconfig_sim.cfg` | 3,265 B | 模拟模式配置 |
| `myconfig_sim_EE2X.cfg` | 3,300 B | 资料片模拟模式配置 |

## config_EE2X.cfg 内容结构

### 游戏基础参数
- 摄像机参数（视角范围、缩放）
- 地形渲染设置
- 单位缩放比例
- 帧率相关

### AI参数
- AI思考间隔 (thinking intervals)
- AI姿态（Stance）关联长度
- 战略营级部队集结周期
- AI决策频率

### 难度系统 (Handicap)
按玩家难度等级（Newbie/Easy/Medium/Hard/Hardest）分别设置：
- **建造时间倍率** (build time multiplier)
- **资源采集倍率** (resource gather rate)
- **伤害倍率** (damage multiplier)
- **移动速度倍率** (movement speed)
- **治疗速度倍率** (heal rate)
- **转化成功率倍率** (convert success)

### 战役难度倍率
- 按战役关卡分别设置各种乘数

### 游戏速度 (Game Pace)
| 模式 | 说明 |
|:-----|:-----|
| Slow | 慢速参数 |
| Medium | 中速参数（基准） |
| Fast | 快速参数 |

### 其他
- 同步日志配置
- 科技树设置
- 贸易参数
- 气候/天气预报系统

## config.cfg vs config_EE2X.cfg 差异
- 结构相同，但数值不同
- 例如 Newbie 难度伤害倍率: config.cfg=1.3, config_EE2X.cfg=1.0
- **资料片运行时以 config_EE2X.cfg 为准**

## 修改用途
- 调整游戏全局难度平衡
- 修改AI行为频率和力度
- 调整游戏速度节奏
- 设置handicap补偿值

## 注意事项
- `myconfig_EE2X.cfg` 中的设置会覆盖 `config_EE2X.cfg`
- 用户可以在游戏内UI界面修改的设置会保存到 `settings\settings.cfg`

## 关联文件
- 快捷键配置: `hotkeys.cfg`
- 用户设置: `settings\settings.cfg`
- AI人格: `aips\` / `aips_ee2x\`
- 游戏速度分析: `地2方案文档\游戏节奏倍率范围分析.md`
