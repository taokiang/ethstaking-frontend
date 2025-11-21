# StakeRewards 前端

这是一个用于演示和管理基于以太坊的质押（staking）与奖励分发的前端项目。

该项目包含用户前端（质押、提取、查看奖励与交易历史）和管理员面板（铸币、设置奖励周期、通知奖励金额）。

## 主要功能
- 用户端
	- 连接钱包（使用浏览器钱包）
	- 选择代币并进行质押/提取
	- 周期性计算并展示未领取奖励
	- 领取奖励并在历史中记录实际链上收到的金额与交易哈希
- 管理端（仅合约 owner 可用）
	- Mint Token1（用于本地或测试环境铸币）
	- 设置奖励分发时长（setRewardsDuration）
	- 通知奖励金额（notifyRewardAmount）以启动奖励发放

## 技术栈
- 框架：Vue 3（Composition API）
- 状态管理：Pinia
- 路由：Vue Router
- UI：Ant Design Vue
- 区块链交互：ethers.js（BrowserProvider + Contract + Signer）
- Wallet 集成：基于 `@reown/appkit` 的封装（项目中使用 `useAppKitAccount()` 等 hook）
- 构建工具：Vite + TypeScript

## 项目结构（概要）
- `src/views` - 页面（Dashboard、Staking、Transactions、Admin）
- `src/stores` - Pinia store（walletStore、stakingStore 等）
- `src/utils/contract.ts` - 合约工具封装（Provider/Signer 缓存、常用合约调用封装）
- `src/abi` - 合约 ABI 工件

## 环境与地址
项目通过 Vite 环境变量提供合约地址。常见 env 变量：

- `VITE_TOKEN1_ADDRESS` - 质押代币（Token1）地址
- `VITE_TOKEN2_ADDRESS` - 奖励代币（Token2）地址
- `VITE_STAKING_REWARD_ADDRESS` - StakingRewards 合约地址

在本地开发时，仓库包含 `.env.development` / `.env.test`，你可以把本地 Hardhat/Foundry 部署得到的地址填入这些文件。

## 本地运行（开发）
1. 安装依赖：

```bash
npm install
# 或者使用 pnpm/yarn
```

2. 启动开发服务器：

```bash
npm run dev
```

3. 打开浏览器访问由 Vite 提供的地址（默认 `http://localhost:5173`）。

注意：在使用管理员操作（如 mint / notifyRewardAmount）前，需要用拥有 StakingRewards 合约 owner 私钥控制的钱包连接到前端（或在本地链中使用对应私钥）。

## 构建与预览

```bash
npm run build
npm run preview
```

## 使用说明

### 用户（普通钱包）
1. 打开应用并连接钱包（页面顶部 Wallet 控件）。
2. 到 Staking 页面选择要质押的代币。
3. 输入质押数量并点击 Stake（需要先 approve，如果合约要求）。
4. 等待区块确认后，你可以在 Rewards 标签查看未领取奖励估算与历史。
5. 点击 Claim 领取奖励，前端会读取链上奖励代币余额的变化并把实际收到的金额记录在历史中（以避免本地计算误差）。

常见用户场景与说明：
- 如果 `Rewards` 始终显示 0，请确认合约是否已经被管理员调用过 `notifyRewardAmount` 并配置了非零的 rewardRate；以及钱包地址是否正确并已质押代币。
- 前端会在钱包连接时开始轮询奖励（受 walletStore.connected 与 address 的控制），确保在连接后再查看奖励。

### 管理员（合约 owner）
只有当当前连接的钱包地址等于 StakingRewards 合约的 `owner()` 返回地址时，管理员功能才可用。

管理员可以通过 Admin 页面执行：
- Mint Token1：给某个地址铸造测试代币（token 合约必须实现 mint 接口）
- Set Rewards Duration：调用合约的 `setRewardsDuration(seconds)` 来修改奖励分发周期
- Notify Reward Amount：调用 `notifyRewardAmount(amount)` 向合约通知奖励总量，从而开始新的奖励分发周期

前端保护措施：
- 在导航层与页面层均做了权限限制：
	- 顶部导航（Admin 链接）会根据 `getStakingOwner()` 与当前地址比较而显示/隐藏；
	- 路由层实现了 `meta.requiresOwner` 的全局守卫：非 owner 直接被重定向到首页，防止通过直接访问 URL 绕过限制。

使用管理员功能的注意事项：
- 执行 `notifyRewardAmount` 前，奖励代币（Token2）需要被合约或调用者提前转入合约（具体取决于合约实现）；否则合约可能无法分配奖励或会回退。
- 管理操作会发送链上交易，请确保交易发起账号有足够的资金支付 gas。

