// PromptVault Content Script
// 注入到每个页面中，用于捕获选中的文本

(function() {
  'use strict';
  
  // 避免重复注入
  if (window.promptVaultInjected) return;
  window.promptVaultInjected = true;
  
  console.log('[PromptVault] 内容脚本已加载');
  
  // 监听来自背景脚本的消息
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getSelectedText') {
      const selectedText = window.getSelection().toString().trim();
      sendResponse({ text: selectedText });
    }
    
    if (request.action === 'showCaptureNotification') {
      showNotification('已捕获选中内容', 'success');
    }
  });
  
  // 快捷键支持
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Shift + S 保存选中内容
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      const selectedText = window.getSelection().toString().trim();
      if (selectedText) {
        chrome.runtime.sendMessage({
          action: 'captureSelection'
        });
        showNotification('正在保存到 PromptVault...', 'info');
      } else {
        showNotification('请先选中要保存的文本', 'warning');
      }
    }
  });
  
  // 显示通知
  function showNotification(message, type = 'info') {
    const colors = {
      success: '#00ffa3',
      warning: '#ffb800',
      error: '#ff4757',
      info: '#3498db'
    };
    
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(10, 10, 15, 0.95);
      border: 1px solid ${colors[type]};
      border-radius: 12px;
      padding: 16px 20px;
      color: ${colors[type]};
      font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
      z-index: 2147483647;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(12px);
      display: flex;
      align-items: center;
      gap: 10px;
      animation: slideIn 0.3s ease-out;
    `;
    
    const icon = type === 'success' ? '✓' : type === 'warning' ? '⚠' : type === 'error' ? '✗' : 'ℹ';
    notification.innerHTML = `
      <span style="font-size: 18px;">${icon}</span>
      <span>${message}</span>
    `;
    
    // 添加动画样式
    if (!document.getElementById('promptvault-styles')) {
      const style = document.createElement('style');
      style.id = 'promptvault-styles';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // 3秒后自动移除
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-in forwards';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
  
  // 监听选中文本变化
  let lastSelection = '';
  document.addEventListener('selectionchange', () => {
    const selection = window.getSelection().toString().trim();
    if (selection && selection !== lastSelection) {
      lastSelection = selection;
      // 可选：显示浮动按钮
      // showFloatingButton();
    }
  });
  
})();
