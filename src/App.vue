<template>
  <div class="app-container">
    <!-- 头部导航 -->
    <header class="app-header">
      <div class="container header-content">
        <div class="logo">
          <router-link to="/">
            <span class="logo-text">StakeRewards</span>
          </router-link>
        </div>

        <nav class="main-nav">
          <ul class="nav-links">
            <li>
              <router-link to="/" :class="{ 'nav-link-active': $route.path === '/' }">
                Dashboard
              </router-link>
            </li>
            <li>
              <router-link to="/staking" :class="{ 'nav-link-active': $route.path === '/staking' }">
                Staking
              </router-link>
            </li>
            <li>
              <router-link
                to="/transactions"
                :class="{ 'nav-link-active': $route.path === '/transactions' }"
              >
                Transactions
              </router-link>
            </li>
            <li>
              <a href="#" class="nav-link">Learn</a>
            </li>
          </ul>
        </nav>

        <div class="header-actions">
          <wallet-actions />
        </div>
      </div>
    </header>

    <!-- 主内容区 -->
    <main class="app-main">
      <div class="container">
        <router-view />
      </div>
    </main>

    <!-- 页脚 -->
    <footer class="app-footer">
      <div class="container footer-content">
        <div class="footer-section">
          <div class="footer-logo">StakeRewards</div>
          <p class="footer-description">
            Earn rewards by staking your tokens with our secure and transparent platform.
          </p>
          <div class="social-links">
            <a href="#" class="social-link"><i class="anticon anticon-twitter"></i></a>
            <a href="#" class="social-link"><i class="anticon anticon-telegram"></i></a>
            <a href="#" class="social-link"><i class="anticon anticon-discord"></i></a>
            <a href="#" class="social-link"><i class="anticon anticon-github"></i></a>
          </div>
        </div>

        <div class="footer-section">
          <h4 class="footer-title">Products</h4>
          <ul class="footer-links">
            <li><a href="#">Staking</a></li>
            <li><a href="#">Yield Farming</a></li>
            <li><a href="#">NFT Staking</a></li>
            <li><a href="#">Governance</a></li>
          </ul>
        </div>

        <div class="footer-section">
          <h4 class="footer-title">Resources</h4>
          <ul class="footer-links">
            <li><a href="#">Documentation</a></li>
            <li><a href="#">API</a></li>
            <li><a href="#">Blog</a></li>
            <li><a href="#">FAQ</a></li>
          </ul>
        </div>

        <div class="footer-section">
          <h4 class="footer-title">Company</h4>
          <ul class="footer-links">
            <li><a href="#">About Us</a></li>
            <li><a href="#">Careers</a></li>
            <li><a href="#">Terms of Service</a></li>
            <li><a href="#">Privacy Policy</a></li>
          </ul>
        </div>
      </div>

      <div class="footer-bottom">
        <div class="container">
          <p class="copyright">
            &copy; {{ new Date().getFullYear() }} StakeRewards. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import WalletActions from '@/components/WalletActions.vue'
</script>

<style lang="less" scoped>
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-header {
  background-color: @header-bg;
  box-shadow: @header-shadow;
  padding: 16px 0;

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .logo {
    .logo-text {
      font-size: 22px;
      font-weight: 700;
      color: @primary-color;
      text-decoration: none;
    }
  }

  .main-nav {
    .nav-links {
      display: flex;
      list-style: none;

      li {
        margin-left: 30px;

        a {
          color: @text-primary;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s ease;

          &:hover {
            color: @primary-color;
          }

          &.nav-link-active {
            color: @primary-color;
            position: relative;

            &::after {
              content: '';
              position: absolute;
              bottom: -6px;
              left: 0;
              width: 100%;
              height: 2px;
              background-color: @primary-color;
              border-radius: 1px;
            }
          }
        }
      }
    }
  }
}

.app-main {
  flex: 1;
  padding: 30px 0;
}

.app-footer {
  background-color: @footer-bg;
  color: white;
  padding: 60px 0 20px;

  .footer-content {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr;
    gap: 40px;
    margin-bottom: 40px;
  }

  .footer-section {
    .footer-logo {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 16px;
      color: white;
    }

    .footer-description {
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: 20px;
      line-height: 1.6;
    }

    .footer-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 16px;
    }

    .footer-links {
      list-style: none;

      li {
        margin-bottom: 10px;

        a {
          color: rgba(255, 255, 255, 0.7);
          text-decoration: none;
          transition: color 0.2s ease;

          &:hover {
            color: white;
          }
        }
      }
    }

    .social-links {
      display: flex;

      .social-link {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background-color: rgba(255, 255, 255, 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 12px;
        color: white;
        transition: background-color 0.2s ease;

        &:hover {
          background-color: @primary-color;
        }
      }
    }
  }

  .footer-bottom {
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding-top: 20px;

    .copyright {
      color: rgba(255, 255, 255, 0.5);
      font-size: 14px;
      text-align: center;
    }
  }
}
</style>
