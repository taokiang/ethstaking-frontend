<template>
	<div class="admin-container">
		<h1 class="page-title">Admin Panel</h1>

        <!-- 钱包未连接状态 -->
        <div
            v-if="!walletStore.connected"
            class="no-wallet-state custom-card p-30 text-center slide-up"
        >
            <div class="no-wallet-icon mb-20">
                <i class="anticon anticon-wallet" style="font-size: 48px"></i>
            </div>
            <h3 class="mb-10">Connect Your Wallet</h3>
            <p class="mb-20 text-secondary">Connect your wallet to start staking and earning rewards</p>
            <a-button type="primary" @click="walletStore.connectWallet()">
                <i class="anticon anticon-link mr-2"></i>Connect Wallet
            </a-button>
        </div>

        <!-- 钱包已连接状态 -->
        <div v-else class="admin-content">
            <div class="cards-grid">
                <!-- Mint Token1 -->
                <a-card class="custom-card">
                    <h3 class="card-title mb-12">Mint Token1</h3>
                    <p class="text-secondary mb-12">Mint Token1 to a wallet address (for testing / admin)</p>
                    <div class="form-row mb-12">
                        <label class="form-label">Recipient Address</label>
                        <a-input class="custom-input" v-model:value="mintRecipient" placeholder="0x... (default: connected wallet)" />
                    </div>
                    <div class="form-row mb-12">
                        <label class="form-label">Amount</label>
                        <a-input-number style="width: 100%" v-model:value="mintAmount" placeholder="Amount (e.g. 100)" />
                    </div>
                    <a-button type="primary" class="primary-btn" :loading="mintLoading" @click="handleMint">Mint</a-button>
                </a-card>

                <!-- Set Rewards Duration -->
                <a-card class="custom-card">
                    <h3 class="card-title mb-12">Set Rewards Duration</h3>
                    <p class="text-secondary mb-12">Set the reward distribution duration (seconds) on the StakingRewards contract</p>
                    <div class="form-row mb-12">
                        <label class="form-label">Duration (seconds)</label>
                        <a-input class="custom-input" v-model:value="rewardDuration" placeholder="Duration in seconds (e.g. 86400)" />
                    </div>
                    <a-button class="primary-btn" type="primary" :loading="durationLoading" @click="handleSetDuration">Set Duration</a-button>
                </a-card>

                <!-- Notify Reward Amount -->
                <a-card class="custom-card">
                    <h3 class="card-title mb-12">Notify Reward Amount</h3>
                    <p class="text-secondary mb-12">Notify the staking contract of the reward amount to distribute</p>
                    <div class="form-row mb-12">
                        <label class="form-label">Reward Amount</label>
                        <a-input-number style="width: 100%" class="custom-input" v-model:value="notifyAmount" placeholder="Amount (e.g. 1000)" />
                    </div>
                    <a-button class="primary-btn" type="primary" :loading="notifyLoading" @click="handleNotify">Notify</a-button>
                </a-card>
            </div>
        </div>
        
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { message } from 'ant-design-vue'
import { useWalletStore } from '@/stores/walletStore'
import { mintToken, setRewardsDuration, notifyRewardAmount, getStakingOwner } from '@/utils/contract'
import { parseEther } from 'ethers'

const walletStore = useWalletStore()

// Mint
const mintRecipient = ref<string | null>(null)
const mintAmount = ref<string>('')
const mintLoading = ref(false)

// Duration
const rewardDuration = ref<string>('')
const durationLoading = ref(false)

// Notify
const notifyAmount = ref<string>('')
const notifyLoading = ref(false)

// Owner check
const ownerAddress = ref<string | null>(null)
const isOwner = ref(false)

async function refreshOwnerStatus() {
	try {
		if (!walletStore.connected || !walletStore.address) {
			ownerAddress.value = null
			isOwner.value = false
			return
		}
		const owner = await getStakingOwner()
		ownerAddress.value = owner
		isOwner.value = owner && walletStore.address
			? owner.toLowerCase() === walletStore.address.toLowerCase()
			: false
	} catch (err: any) {
		console.error('Failed to get staking owner:', err)
		ownerAddress.value = null
		isOwner.value = false
	}
}

// refresh when wallet connects or changes
watch(() => walletStore.address, () => {
	refreshOwnerStatus()
})
onMounted(() => {
	refreshOwnerStatus()
})

const handleMint = async () => {
	if (!walletStore.connected) {
		message.error('Please connect wallet as admin')
		return
	}

	if (!isOwner.value) {
		message.error('Only the staking contract owner can perform this action')
		return
	}

	const recipient = (mintRecipient.value && mintRecipient.value.trim()) || walletStore.address
	if (!recipient) {
		message.error('Recipient address is required')
		return
	}

	const amountNum = Number(mintAmount.value)
	if (isNaN(amountNum) || amountNum <= 0) {
		message.error('Please enter a valid amount')
		return
	}

	mintLoading.value = true
	try {
		const amountWei = parseEther(amountNum.toString())
		const receipt = await mintToken(recipient, amountWei)
		message.success('Mint successful: ' + (receipt?.transactionHash || receipt?.hash || ''))
	} catch (err: any) {
		console.error('Mint error:', err)
		message.error(err?.message || String(err))
	} finally {
		mintLoading.value = false
	}
}

const handleSetDuration = async () => {
	if (!walletStore.connected) {
		message.error('Please connect wallet as admin')
		return
	}

	if (!isOwner.value) {
		message.error('Only the staking contract owner can perform this action')
		return
	}

	const d = Number(rewardDuration.value)
	if (isNaN(d) || d <= 0) {
		message.error('Please enter a valid duration in seconds')
		return
	}

	durationLoading.value = true
	try {
		const receipt = await setRewardsDuration(d)
		message.success('Set duration successful: ' + (receipt?.transactionHash || receipt?.hash || ''))
	} catch (err: any) {
		console.error('Set duration error:', err)
		message.error(err?.message || String(err))
	} finally {
		durationLoading.value = false
	}
}

const handleNotify = async () => {
	if (!walletStore.connected) {
		message.error('Please connect wallet as admin')
		return
	}

	if (!isOwner.value) {
		message.error('Only the staking contract owner can perform this action')
		return
	}

	const amountNum = Number(notifyAmount.value)
	if (isNaN(amountNum) || amountNum <= 0) {
		message.error('Please enter a valid reward amount')
		return
	}

	notifyLoading.value = true
	try {
		const amountWei = parseEther(amountNum.toString())
		const receipt = await notifyRewardAmount(amountWei)
		message.success('Notify reward successful: ' + (receipt?.transactionHash || receipt?.hash || ''))
	} catch (err: any) {
		console.error('Notify reward error:', err)
		message.error(err?.message || String(err))
	} finally {
		notifyLoading.value = false
	}
}
</script>

<style lang="less" scoped>
.admin-container {
	padding: 20px 0;

	.page-title {
		font-size: 28px;
		font-weight: 600;
		margin-bottom: 20px;
	}

	.cards-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
		gap: 16px;
	}

	.custom-card {
		padding: 16px;
	}

	.card-title {
		font-size: 18px;
		font-weight: 600;
	}

	.form-row {
		margin-bottom: 12px;

		.form-label {
			display: block;
			margin-bottom: 6px;
			font-weight: 500;
		}
	}
    .custom-input {
        padding: 0 11px;
        height: 30px;
    }
}
</style>